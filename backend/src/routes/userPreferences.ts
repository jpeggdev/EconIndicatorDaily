import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();

// Allow Prisma client to be injected for testing
let prisma: PrismaClient = new PrismaClient();

// Initialize with default client or use injected one
export const initializePrisma = (client?: PrismaClient) => {
  prisma = client || new PrismaClient();
};

// Get user's favorite indicators
router.get('/favorites', async (req: any, res: any) => {
  try {
    const userId = req.session?.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    const favorites = await prisma.userPreference.findMany({
      where: {
        userId,
        isFavorite: true
      },
      include: {
        indicator: {
          include: {
            data: {
              orderBy: { date: 'desc' },
              take: 1
            }
          }
        }
      },
      orderBy: [
        { displayOrder: 'asc' },
        { createdAt: 'asc' }
      ]
    });

    const favoriteIndicators = favorites.map(fav => ({
      id: fav.indicator.id,
      name: fav.indicator.name,
      description: fav.indicator.description,
      category: fav.indicator.category,
      frequency: fav.indicator.frequency,
      unit: fav.indicator.unit,
      source: fav.indicator.source,
      latestValue: fav.indicator.data[0]?.value || null,
      latestDate: fav.indicator.data[0]?.date || null,
      displayOrder: fav.displayOrder
    }));

    res.json({ success: true, data: favoriteIndicators });
  } catch (error) {
    console.error('Error fetching favorites:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch favorites' });
  }
});

// Toggle favorite status
router.post('/favorites/:indicatorId/toggle', async (req: any, res: any) => {
  try {
    const userId = req.session?.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    const { indicatorId } = req.params;

    // Find existing preference or create new one
    const existingPreference = await prisma.userPreference.findUnique({
      where: {
        userId_indicatorId: {
          userId,
          indicatorId
        }
      }
    });

    let isFavorite: boolean;

    if (existingPreference) {
      // Toggle existing preference
      isFavorite = !existingPreference.isFavorite;
      await prisma.userPreference.update({
        where: {
          userId_indicatorId: {
            userId,
            indicatorId
          }
        },
        data: {
          isFavorite,
          updatedAt: new Date()
        }
      });
    } else {
      // Create new preference as favorite
      isFavorite = true;
      await prisma.userPreference.create({
        data: {
          userId,
          indicatorId,
          isFavorite: true
        }
      });
    }

    res.json({ success: true, data: { isFavorite } });
  } catch (error) {
    console.error('Error toggling favorite:', error);
    res.status(500).json({ success: false, message: 'Failed to toggle favorite' });
  }
});

// Update favorite display order
router.put('/favorites/order', async (req: any, res: any) => {
  try {
    const userId = req.session?.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    const { orderedIndicatorIds } = req.body;

    if (!Array.isArray(orderedIndicatorIds)) {
      return res.status(400).json({ success: false, message: 'Invalid order data' });
    }

    // Update display order for each favorite
    const updatePromises = orderedIndicatorIds.map((indicatorId: string, index: number) =>
      prisma.userPreference.updateMany({
        where: {
          userId,
          indicatorId,
          isFavorite: true
        },
        data: {
          displayOrder: index,
          updatedAt: new Date()
        }
      })
    );

    await Promise.all(updatePromises);

    res.json({ success: true, message: 'Favorite order updated' });
  } catch (error) {
    console.error('Error updating favorite order:', error);
    res.status(500).json({ success: false, message: 'Failed to update favorite order' });
  }
});

// Get user's dashboard filters
router.get('/filters', async (req: any, res: any) => {
  try {
    const userId = req.session?.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    const filter = await prisma.userDashboardFilter.findUnique({
      where: { userId }
    });

    const filterData = {
      categories: filter?.categories ? JSON.parse(filter.categories) : [],
      sources: filter?.sources ? JSON.parse(filter.sources) : [],
      frequencies: filter?.frequencies ? JSON.parse(filter.frequencies) : [],
      showFavoritesOnly: filter?.showFavoritesOnly || false
    };

    res.json({ success: true, data: filterData });
  } catch (error) {
    console.error('Error fetching filters:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch filters' });
  }
});

// Update user's dashboard filters
router.put('/filters', async (req: any, res: any) => {
  try {
    const userId = req.session?.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    const { categories, sources, frequencies, showFavoritesOnly } = req.body;

    await prisma.userDashboardFilter.upsert({
      where: { userId },
      update: {
        categories: categories ? JSON.stringify(categories) : null,
        sources: sources ? JSON.stringify(sources) : null,
        frequencies: frequencies ? JSON.stringify(frequencies) : null,
        showFavoritesOnly: showFavoritesOnly || false,
        updatedAt: new Date()
      },
      create: {
        userId,
        categories: categories ? JSON.stringify(categories) : null,
        sources: sources ? JSON.stringify(sources) : null,
        frequencies: frequencies ? JSON.stringify(frequencies) : null,
        showFavoritesOnly: showFavoritesOnly || false
      }
    });

    res.json({ success: true, message: 'Filters updated' });
  } catch (error) {
    console.error('Error updating filters:', error);
    res.status(500).json({ success: false, message: 'Failed to update filters' });
  }
});

// Get available filter options
router.get('/filter-options', async (req: any, res: any) => {
  try {
    const categories = await prisma.economicIndicator.findMany({
      where: { isActive: true },
      select: { category: true },
      distinct: ['category']
    });

    const sources = await prisma.economicIndicator.findMany({
      where: { isActive: true },
      select: { source: true },
      distinct: ['source']
    });

    const frequencies = await prisma.economicIndicator.findMany({
      where: { isActive: true },
      select: { frequency: true },
      distinct: ['frequency']
    });

    res.json({
      success: true,
      data: {
        categories: categories.map(c => c.category).sort(),
        sources: sources.map(s => s.source).sort(),
        frequencies: frequencies.map(f => f.frequency).sort()
      }
    });
  } catch (error) {
    console.error('Error fetching filter options:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch filter options' });
  }
});

export default router;