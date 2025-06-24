import { PrismaClient } from '@prisma/client';
import { FredService, coreIndicators } from './fredService';

export class IndicatorService {
  private prisma: PrismaClient;
  private fredService: FredService;

  constructor(prisma: PrismaClient, fredApiKey: string) {
    this.prisma = prisma;
    this.fredService = new FredService(fredApiKey);
  }

  async initializeCoreIndicators(): Promise<void> {
    for (const indicator of coreIndicators) {
      try {
        const seriesInfo = await this.fredService.getSeriesInfo(indicator.seriesId);
        
        await this.prisma.economicIndicator.upsert({
          where: { name: indicator.name },
          update: {
            description: seriesInfo.title,
            source: 'FRED',
            category: indicator.category,
            frequency: indicator.frequency,
            unit: seriesInfo.units
          },
          create: {
            name: indicator.name,
            description: seriesInfo.title,
            source: 'FRED',
            category: indicator.category,
            frequency: indicator.frequency,
            unit: seriesInfo.units
          }
        });
      } catch (error) {
        console.error(`Failed to initialize indicator ${indicator.name}:`, error);
      }
    }
  }

  async fetchAndStoreIndicatorData(indicatorName: string): Promise<void> {
    const indicator = await this.prisma.economicIndicator.findUnique({
      where: { name: indicatorName }
    });

    if (!indicator) {
      throw new Error(`Indicator ${indicatorName} not found`);
    }

    const coreIndicator = coreIndicators.find(ci => ci.name === indicatorName);
    if (!coreIndicator) {
      throw new Error(`Core indicator configuration not found for ${indicatorName}`);
    }

    try {
      const fredData = await this.fredService.getSeriesObservations(coreIndicator.seriesId, 50);
      
      for (const observation of fredData.observations) {
        if (observation.value !== '.') {
          await this.prisma.indicatorData.upsert({
            where: {
              indicatorId_date: {
                indicatorId: indicator.id,
                date: new Date(observation.date)
              }
            },
            update: {
              value: parseFloat(observation.value)
            },
            create: {
              indicatorId: indicator.id,
              date: new Date(observation.date),
              value: parseFloat(observation.value),
              rawData: observation as any
            }
          });
        }
      }
    } catch (error) {
      console.error(`Failed to fetch data for ${indicatorName}:`, error);
      throw error;
    }
  }

  async getAllIndicators() {
    return this.prisma.economicIndicator.findMany({
      where: { isActive: true },
      include: {
        data: {
          orderBy: { date: 'desc' },
          take: 1
        }
      }
    });
  }

  async getIndicatorWithData(indicatorId: string, limit = 30) {
    return this.prisma.economicIndicator.findUnique({
      where: { id: indicatorId },
      include: {
        data: {
          orderBy: { date: 'desc' },
          take: limit
        },
        explanations: {
          orderBy: { date: 'desc' },
          take: 5
        }
      }
    });
  }
}