#!/usr/bin/env ts-node

import { PrismaClient } from '@prisma/client';
import { IndicatorService } from '../services/indicatorService';
import { coreIndicators } from '../services/fredService';
import { coreMarketIndicators } from '../services/alphaVantageService';
import { coreBlsIndicators } from '../services/blsService';
import { coreWorldBankIndicators } from '../services/indicatorService';
import * as dotenv from 'dotenv';
import axios from 'axios';

// Load environment variables
dotenv.config();

interface SyncOptions {
  source?: 'all' | 'fred' | 'alpha_vantage' | 'bls' | 'world_bank' | 'finnhub' | 'fmp' | 'ecb' | 'imf' | 'polygon' | 'treasury';
  indicators?: string[];
  dryRun?: boolean;
  force?: boolean;
  verbose?: boolean;
}

interface SyncResult {
  source: string;
  indicator: string;
  success: boolean;
  dataPoints: number;
  error?: string;
  duration: number;
}

class DataSyncer {
  private prisma: PrismaClient;
  private indicatorService: IndicatorService;
  private verbose: boolean = false;

  constructor() {
    this.prisma = new PrismaClient();
    
    const fredApiKey = process.env.FRED_API_KEY;
    const alphaVantageApiKey = process.env.ALPHA_VANTAGE_API_KEY;
    const blsApiKey = process.env.BLS_API_KEY;
    const finnhubApiKey = process.env.FINNHUB_API_KEY; // Optional
    const fmpApiKey = process.env.FINANCIAL_MODELING_PREP_API_KEY; // Optional

    if (!fredApiKey || !alphaVantageApiKey || !blsApiKey) {
      throw new Error('Missing required API keys: FRED_API_KEY, ALPHA_VANTAGE_API_KEY, BLS_API_KEY');
    }

    this.indicatorService = new IndicatorService(this.prisma, fredApiKey, alphaVantageApiKey, blsApiKey, finnhubApiKey, fmpApiKey);
  }

  async sync(options: SyncOptions = {}): Promise<SyncResult[]> {
    const { source = 'all', indicators, dryRun = false, force = false, verbose = false } = options;
    this.verbose = verbose;

    if (this.verbose) {
      console.log('🚀 Starting data synchronization...');
      console.log(`📊 Source: ${source}`);
      console.log(`🔍 Dry run: ${dryRun}`);
      console.log(`⚡ Force: ${force}`);
    }

    const results: SyncResult[] = [];

    try {
      // Initialize indicators if not already done
      if (!dryRun) {
        if (this.verbose) console.log('📝 Initializing indicators...');
        await this.indicatorService.initializeCoreIndicators();
      }

      // Get indicators to sync based on source filter
      const indicatorsToSync = await this.getIndicatorsToSync(source, indicators);

      if (this.verbose) {
        console.log(`\n📈 Found ${indicatorsToSync.length} indicators to sync:`);
        indicatorsToSync.forEach(ind => console.log(`  - ${ind.name} (${ind.source})`));
      }

      // Sync each indicator
      for (const indicator of indicatorsToSync) {
        const result = await this.syncIndicator(indicator, { dryRun, force });
        results.push(result);

        if (this.verbose) {
          const status = result.success ? '✅' : '❌';
          console.log(`${status} ${result.indicator}: ${result.dataPoints} points (${result.duration}ms)`);
          if (result.error) {
            console.log(`   Error: ${result.error}`);
          }
        }

        // Rate limiting: small delay between requests
        if (!dryRun && indicatorsToSync.length > 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

      // Summary
      const successful = results.filter(r => r.success).length;
      const totalDataPoints = results.reduce((sum, r) => sum + r.dataPoints, 0);
      const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);

      if (this.verbose) {
        console.log(`\n📊 Sync Summary:`);
        console.log(`  Successful: ${successful}/${results.length}`);
        console.log(`  Total data points: ${totalDataPoints}`);
        console.log(`  Total duration: ${totalDuration}ms`);
      }

    } catch (error) {
      console.error('❌ Sync failed:', error);
      throw error;
    } finally {
      await this.prisma.$disconnect();
    }

    return results;
  }

  private async getIndicatorsToSync(source: string, indicatorNames?: string[]): Promise<any[]> {
    const whereClause: any = { isActive: true };

    if (source !== 'all') {
      whereClause.source = source.toUpperCase();
    }

    if (indicatorNames && indicatorNames.length > 0) {
      whereClause.name = { in: indicatorNames };
    }

    return this.prisma.economicIndicator.findMany({
      where: whereClause,
      orderBy: [
        { source: 'asc' },
        { name: 'asc' }
      ]
    });
  }

  private async syncIndicator(
    indicator: any, 
    options: { dryRun: boolean; force: boolean }
  ): Promise<SyncResult> {
    const startTime = Date.now();
    
    try {
      if (options.dryRun) {
        return {
          source: indicator.source,
          indicator: indicator.name,
          success: true,
          dataPoints: 0,
          duration: Date.now() - startTime
        };
      }

      // Check if we need to sync (unless forced)
      if (!options.force) {
        const lastUpdate = await this.prisma.indicatorData.findFirst({
          where: { indicatorId: indicator.id },
          orderBy: { createdAt: 'desc' }
        });

        // Skip if updated within last 6 hours (unless it's a daily indicator)
        if (lastUpdate) {
          const hoursSinceUpdate = (Date.now() - lastUpdate.createdAt.getTime()) / (1000 * 60 * 60);
          const minHours = indicator.frequency === 'daily' ? 1 : 6;
          
          if (hoursSinceUpdate < minHours) {
            return {
              source: indicator.source,
              indicator: indicator.name,
              success: true,
              dataPoints: 0,
              duration: Date.now() - startTime
            };
          }
        }
      }

      // Count existing data points before sync
      const beforeCount = await this.prisma.indicatorData.count({
        where: { indicatorId: indicator.id }
      });

      // Perform the sync with error handling
      try {
        await this.indicatorService.fetchAndStoreIndicatorData(indicator.name);
      } catch (syncError) {
        // Handle specific API errors gracefully
        if (this.isRetryableError(syncError)) {
          if (this.verbose) {
            console.log(`   Retryable error for ${indicator.name}, skipping...`);
          }
          return {
            source: indicator.source,
            indicator: indicator.name,
            success: false,
            dataPoints: 0,
            error: 'API rate limit or temporary error - skipped',
            duration: Date.now() - startTime
          };
        }
        throw syncError; // Re-throw non-retryable errors
      }

      // Count data points after sync
      const afterCount = await this.prisma.indicatorData.count({
        where: { indicatorId: indicator.id }
      });

      return {
        source: indicator.source,
        indicator: indicator.name,
        success: true,
        dataPoints: afterCount - beforeCount,
        duration: Date.now() - startTime
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      // Log detailed error for debugging but don't fail the entire sync
      if (this.verbose) {
        console.error(`   Detailed error for ${indicator.name}:`, error);
      }

      return {
        source: indicator.source,
        indicator: indicator.name,
        success: false,
        dataPoints: 0,
        error: this.sanitizeErrorMessage(errorMessage),
        duration: Date.now() - startTime
      };
    }
  }

  private isRetryableError(error: any): boolean {
    if (axios.isAxiosError(error)) {
      // Treat 403 (rate limit/quota exceeded) and 429 (too many requests) as retryable
      return error.response?.status === 403 || 
             error.response?.status === 429 ||
             error.response?.status === 400; // Some APIs return 400 for invalid series
    }
    return false;
  }

  private sanitizeErrorMessage(message: string): string {
    // Truncate very long error messages
    if (message.length > 200) {
      return message.substring(0, 200) + '...';
    }
    return message;
  }

  async getLastSyncStatus(): Promise<any> {
    const indicators = await this.prisma.economicIndicator.findMany({
      where: { isActive: true },
      include: {
        data: {
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      }
    });

    return indicators.map(indicator => ({
      name: indicator.name,
      source: indicator.source,
      lastUpdate: indicator.data[0]?.createdAt || null,
      totalDataPoints: indicator.data.length || 0,
      lastValue: indicator.data[0]?.value || null,
      lastDate: indicator.data[0]?.date || null
    }));
  }
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2);
  
  // Parse arguments
  const options: SyncOptions = {};
  let command = 'sync';

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    switch (arg) {
      case '--source':
        options.source = args[++i] as any;
        break;
      case '--indicators':
        options.indicators = args[++i]?.split(',');
        break;
      case '--dry-run':
        options.dryRun = true;
        break;
      case '--force':
        options.force = true;
        break;
      case '--verbose':
        options.verbose = true;
        break;
      case 'status':
        command = 'status';
        break;
      case 'help':
        command = 'help';
        break;
    }
  }

  const syncer = new DataSyncer();

  try {
    if (command === 'help') {
      printHelp();
      return;
    }

    if (command === 'status') {
      const status = await syncer.getLastSyncStatus();
      console.log('📊 Current sync status:');
      console.table(status);
      return;
    }

    // Default: sync command
    const results = await syncer.sync(options);
    
    // Report failures but don't exit with error code for API rate limits
    const failed = results.filter(r => !r.success);
    const criticalFailures = failed.filter(f => 
      !f.error?.includes('API rate limit') && 
      !f.error?.includes('temporary error')
    );
    
    if (failed.length > 0) {
      console.log(`⚠️  ${failed.length} indicators had issues (${criticalFailures.length} critical)`);
      if (criticalFailures.length > 0) {
        console.error(`❌ Critical failures:`);
        criticalFailures.forEach(f => console.error(`   - ${f.indicator}: ${f.error}`));
      }
    }
    
    // Only exit with error if we have critical failures
    if (criticalFailures.length > 0) {
      process.exit(1);
    }

  } catch (error) {
    console.error('❌ CLI Error:', error);
    process.exit(1);
  }
}

function printHelp() {
  console.log(`
📊 EconIndicatorDaily Data Sync CLI

USAGE:
  npx ts-node src/cli/syncData.ts [command] [options]

COMMANDS:
  sync     Synchronize indicator data (default)
  status   Show last sync status for all indicators
  help     Show this help message

OPTIONS:
  --source <source>         Sync specific source: all, fred, alpha_vantage, bls, world_bank, finnhub, fmp, ecb, imf, polygon, treasury
  --indicators <list>       Sync specific indicators (comma-separated names)
  --dry-run                 Show what would be synced without actually syncing
  --force                   Force sync even if recently updated
  --verbose                 Show detailed output

EXAMPLES:
  # Sync all indicators
  npx ts-node src/cli/syncData.ts

  # Sync only ECB indicators
  npx ts-node src/cli/syncData.ts --source ecb --verbose

  # Sync only IMF indicators
  npx ts-node src/cli/syncData.ts --source imf --verbose

  # Sync only Polygon indicators
  npx ts-node src/cli/syncData.ts --source polygon --verbose

  # Sync only Treasury indicators
  npx ts-node src/cli/syncData.ts --source treasury --verbose

  # Sync specific indicators
  npx ts-node src/cli/syncData.ts --indicators "Unemployment Rate,Consumer Price Index"

  # Dry run to see what would be synced
  npx ts-node src/cli/syncData.ts --dry-run --verbose

  # Force sync all indicators
  npx ts-node src/cli/syncData.ts --force

  # Check sync status
  npx ts-node src/cli/syncData.ts status
`);
}

// Run CLI if called directly
if (require.main === module) {
  main();
}

export { DataSyncer, SyncOptions, SyncResult };