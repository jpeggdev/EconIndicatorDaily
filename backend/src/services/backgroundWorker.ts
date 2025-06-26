import { spawn } from 'child_process';
import * as cron from 'node-cron';
import * as path from 'path';

export interface WorkerConfig {
  enabled: boolean;
  schedules: {
    // Different sync frequencies for different data sources
    fred: string;        // FRED data - every 2 hours during business hours
    alphaVantage: string; // Market data - every 30 minutes during market hours
    bls: string;         // BLS data - once daily at 8:30 AM ET
    worldBank: string;   // World Bank data - once weekly
    full: string;        // Full sync - once daily at 6 AM ET
  };
  timezone: string;
  retryAttempts: number;
  retryDelay: number; // milliseconds
}

export interface SyncJob {
  id: string;
  name: string;
  schedule: string;
  command: string[];
  enabled: boolean;
  lastRun?: Date;
  lastResult?: 'success' | 'failure';
  nextRun?: Date;
}

export class BackgroundWorker {
  private config: WorkerConfig;
  private jobs: Map<string, cron.ScheduledTask> = new Map();
  private syncResults: Map<string, any> = new Map();

  constructor(config?: Partial<WorkerConfig>) {
    this.config = {
      enabled: true,
      schedules: {
        // FRED: Every 2 hours, Mon-Fri 6 AM - 8 PM ET
        fred: '0 6,8,10,12,14,16,18,20 * * 1-5',
        
        // Alpha Vantage: Every 30 minutes, Mon-Fri 9:30 AM - 4 PM ET (market hours)
        alphaVantage: '30,0 9-16 * * 1-5',
        
        // BLS: Once daily at 8:30 AM ET (typical BLS release time)
        bls: '30 8 * * *',
        
        // World Bank: Once weekly on Sunday at 2 AM ET
        worldBank: '0 2 * * 0',
        
        // Full sync: Once daily at 6 AM ET
        full: '0 6 * * *'
      },
      timezone: 'America/New_York',
      retryAttempts: 3,
      retryDelay: 30000, // 30 seconds
      ...config
    };
  }

  start(): void {
    if (!this.config.enabled) {
      console.log('📴 Background worker is disabled');
      return;
    }

    console.log('🚀 Starting background worker...');

    const cliScript = path.join(__dirname, '..', 'cli', 'syncData.ts');

    // Schedule FRED data sync
    this.scheduleJob('fred-sync', 'FRED Data Sync', this.config.schedules.fred, [
      cliScript,
      '--source', 'fred',
      '--verbose'
    ]);

    // Schedule Alpha Vantage data sync
    this.scheduleJob('alpha-vantage-sync', 'Market Data Sync', this.config.schedules.alphaVantage, [
      cliScript,
      '--source', 'alpha_vantage',
      '--verbose'
    ]);

    // Schedule BLS data sync
    this.scheduleJob('bls-sync', 'BLS Data Sync', this.config.schedules.bls, [
      cliScript,
      '--source', 'bls',
      '--verbose'
    ]);

    // Schedule World Bank data sync
    this.scheduleJob('world-bank-sync', 'World Bank Data Sync', this.config.schedules.worldBank, [
      cliScript,
      '--source', 'world_bank',
      '--verbose'
    ]);

    // Schedule full sync (backup)
    this.scheduleJob('full-sync', 'Full Data Sync', this.config.schedules.full, [
      cliScript,
      '--force',
      '--verbose'
    ]);

    console.log(`✅ Background worker started with ${this.jobs.size} jobs`);
    this.printSchedule();
  }

  stop(): void {
    console.log('🛑 Stopping background worker...');
    
    this.jobs.forEach((task, jobId) => {
      task.destroy();
      console.log(`  Stopped job: ${jobId}`);
    });
    
    this.jobs.clear();
    console.log('✅ Background worker stopped');
  }

  private scheduleJob(id: string, name: string, schedule: string, command: string[]): void {
    try {
      const task = cron.schedule(schedule, async () => {
        await this.executeJob(id, name, command);
      }, {
        timezone: this.config.timezone
      });

      this.jobs.set(id, task);
      console.log(`📅 Scheduled job: ${name} (${schedule})`);
    } catch (error) {
      console.error(`❌ Failed to schedule job ${id}:`, error);
    }
  }

  private async executeJob(id: string, name: string, command: string[]): Promise<void> {
    const startTime = Date.now();
    console.log(`🔄 Starting job: ${name} (${new Date().toISOString()})`);

    try {
      const result = await this.executeCommand(command);
      const duration = Date.now() - startTime;

      this.syncResults.set(id, {
        name,
        lastRun: new Date(),
        result: 'success',
        duration,
        output: result.stdout,
        command: command.join(' ')
      });

      console.log(`✅ Job completed: ${name} (${duration}ms)`);
      
      // Log key metrics from the sync
      if (result.stdout) {
        const lines = result.stdout.split('\n');
        const summaryLine = lines.find(line => line.includes('Total data points:'));
        if (summaryLine) {
          console.log(`   ${summaryLine.trim()}`);
        }
      }

    } catch (error) {
      const duration = Date.now() - startTime;
      
      this.syncResults.set(id, {
        name,
        lastRun: new Date(),
        result: 'failure',
        duration,
        error: error instanceof Error ? error.message : String(error),
        command: command.join(' ')
      });

      console.error(`❌ Job failed: ${name} (${duration}ms)`);
      console.error(`   Error: ${error instanceof Error ? error.message : error}`);

      // Retry logic
      if (this.config.retryAttempts > 0) {
        console.log(`🔄 Scheduling retry in ${this.config.retryDelay / 1000}s...`);
        setTimeout(() => {
          this.retryJob(id, name, command, 1);
        }, this.config.retryDelay);
      }
    }
  }

  private async retryJob(id: string, name: string, command: string[], attempt: number): Promise<void> {
    if (attempt > this.config.retryAttempts) {
      console.error(`❌ Job ${name} failed after ${this.config.retryAttempts} retries`);
      return;
    }

    console.log(`🔄 Retry ${attempt}/${this.config.retryAttempts}: ${name}`);
    
    try {
      const result = await this.executeCommand(command);
      console.log(`✅ Job succeeded on retry ${attempt}: ${name}`);
      
      // Update result with retry info
      const existing = this.syncResults.get(id);
      this.syncResults.set(id, {
        ...existing,
        result: 'success',
        retryAttempt: attempt,
        output: result.stdout
      });

    } catch (error) {
      console.error(`❌ Retry ${attempt} failed: ${name}`);
      
      if (attempt < this.config.retryAttempts) {
        setTimeout(() => {
          this.retryJob(id, name, command, attempt + 1);
        }, this.config.retryDelay * attempt); // Exponential backoff
      }
    }
  }

  private executeCommand(command: string[]): Promise<{ stdout: string; stderr: string }> {
    return new Promise((resolve, reject) => {
      const [scriptPath, ...args] = command;
      const childProcess = spawn('npx', ['ts-node', scriptPath, ...args], {
        cwd: path.join(__dirname, '..', '..'),
        stdio: 'pipe'
      });

      let stdout = '';
      let stderr = '';

      childProcess.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      childProcess.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      childProcess.on('close', (code) => {
        if (code === 0) {
          resolve({ stdout, stderr });
        } else {
          reject(new Error(`Command failed with code ${code}\nStderr: ${stderr}`));
        }
      });

      childProcess.on('error', (error) => {
        reject(error);
      });

      // Set timeout for long-running commands (5 minutes)
      setTimeout(() => {
        childProcess.kill();
        reject(new Error('Command timeout after 5 minutes'));
      }, 5 * 60 * 1000);
    });
  }

  // Manual sync trigger
  async triggerSync(source?: string): Promise<any> {
    const cliScript = path.join(__dirname, '..', 'cli', 'syncData.ts');
    const command = [cliScript, '--verbose'];
    if (source) {
      command.push('--source', source);
    }

    console.log(`🔄 Manual sync triggered: ${source || 'all'}`);
    
    try {
      const result = await this.executeCommand(command);
      console.log(`✅ Manual sync completed: ${source || 'all'}`);
      return { success: true, output: result.stdout };
    } catch (error) {
      console.error(`❌ Manual sync failed: ${source || 'all'}`, error);
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  }

  // Get sync status and results
  getStatus(): any {
    const jobs: SyncJob[] = [];
    
    this.jobs.forEach((task, id) => {
      const result = this.syncResults.get(id);
      
      jobs.push({
        id,
        name: result?.name || id,
        schedule: '', // Would need to store schedule separately to display
        command: result?.command || '',
        enabled: true,
        lastRun: result?.lastRun,
        lastResult: result?.result,
        nextRun: undefined // Node-cron doesn't expose next run time easily
      });
    });

    return {
      enabled: this.config.enabled,
      jobCount: this.jobs.size,
      jobs,
      results: Array.from(this.syncResults.values())
    };
  }

  private printSchedule(): void {
    console.log('\n📅 Scheduled Jobs:');
    console.log('─'.repeat(60));
    
    const schedules = [
      { name: 'FRED Data Sync', schedule: this.config.schedules.fred },
      { name: 'Market Data Sync', schedule: this.config.schedules.alphaVantage },
      { name: 'BLS Data Sync', schedule: this.config.schedules.bls },
      { name: 'World Bank Sync', schedule: this.config.schedules.worldBank },
      { name: 'Full Sync', schedule: this.config.schedules.full }
    ];

    schedules.forEach(({ name, schedule }) => {
      console.log(`${name.padEnd(20)} : ${schedule}`);
    });
    
    console.log(`\nTimezone: ${this.config.timezone}`);
    console.log('─'.repeat(60));
  }
}

// Export singleton instance
export const backgroundWorker = new BackgroundWorker();