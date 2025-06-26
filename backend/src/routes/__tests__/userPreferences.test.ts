import request from 'supertest';
import express from 'express';
import { PrismaClient } from '@prisma/client';
import userPreferencesRoutes, { initializePrisma } from '../userPreferences';

// Mock Prisma Client
jest.mock('@prisma/client');

const MockedPrismaClient = PrismaClient as jest.MockedClass<typeof PrismaClient>;

// Create test app
const createTestApp = (mockSessionData?: any) => {
  const app = express();
  app.use(express.json());
  
  // Mock session middleware
  app.use((req: any, res: any, next: any) => {
    req.session = mockSessionData || {};
    next();
  });
  
  app.use('/user-preferences', userPreferencesRoutes);
  return app;
};

// Factory functions for test data
const getMockUser = (overrides?: Partial<any>) => ({
  id: 'user-123',
  email: 'test@example.com',
  name: 'Test User',
  subscriptionTier: 'free',
  subscriptionStatus: 'free',
  ...overrides,
});

const getMockIndicator = (overrides?: Partial<any>) => ({
  id: 'indicator-123',
  name: 'Test Indicator',
  description: 'Test Description',
  category: 'Economic',
  frequency: 'Monthly',
  unit: '%',
  source: 'FRED',
  isActive: true,
  data: [
    {
      value: 5.2,
      date: new Date('2024-01-01'),
    }
  ],
  ...overrides,
});

const getMockUserPreference = (overrides?: Partial<any>) => ({
  id: 'pref-123',
  userId: 'user-123',
  indicatorId: 'indicator-123',
  isFavorite: true,
  displayOrder: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
  indicator: getMockIndicator(),
  ...overrides,
});

const getMockDashboardFilter = (overrides?: Partial<any>) => ({
  id: 'filter-123',
  userId: 'user-123',
  categories: '["Economic"]',
  sources: '["FRED"]',
  frequencies: '["Monthly"]',
  showFavoritesOnly: false,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});


describe('User Preferences Routes', () => {
  let mockPrisma: jest.Mocked<PrismaClient>;

  beforeEach(() => {
    // Create a proper mock Prisma client
    mockPrisma = {
      userPreference: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      userDashboardFilter: {
        findUnique: jest.fn(),
        upsert: jest.fn(),
      },
      economicIndicator: {
        findMany: jest.fn(),
      },
    } as any;
    
    // Mock the constructor to return our mock instance
    (MockedPrismaClient as any).mockImplementation(() => mockPrisma);
    
    // Inject the mocked Prisma client into the routes
    initializePrisma(mockPrisma);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /favorites', () => {
    describe('Authentication', () => {
      it('should return 401 when user is not authenticated', async () => {
        const testApp = createTestApp();
        const response = await request(testApp)
          .get('/user-preferences/favorites');

        expect(response.status).toBe(401);
        expect(response.body).toEqual({
          success: false,
          message: 'Not authenticated'
        });
      });

      it('should return 401 when session exists but user is missing', async () => {
        const testApp = createTestApp({ user: null });
        const response = await request(testApp)
          .get('/user-preferences/favorites');

        expect(response.status).toBe(401);
        expect(response.body).toEqual({
          success: false,
          message: 'Not authenticated'
        });
      });

      it('should return 401 when session exists but user.id is missing', async () => {
        const testApp = createTestApp({ user: { email: 'test@example.com' } });
        const response = await request(testApp)
          .get('/user-preferences/favorites');

        expect(response.status).toBe(401);
        expect(response.body).toEqual({
          success: false,
          message: 'Not authenticated'
        });
      });
    });

    describe('Data Isolation', () => {
      it('should only return favorites for the authenticated user', async () => {
        const userFavorites = [getMockUserPreference()];
        
        mockPrisma.userPreference.findMany = jest.fn().mockResolvedValue(userFavorites);

        const testApp = createTestApp({ user: { id: 'user-123' } });
        const response = await request(testApp)
          .get('/user-preferences/favorites');

        expect(response.status).toBe(200);
        expect(mockPrisma.userPreference.findMany).toHaveBeenCalledWith({
          where: {
            userId: 'user-123',
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
      });

      it('should not leak other users data when user ID is different', async () => {
        mockPrisma.userPreference.findMany = jest.fn().mockResolvedValue([]);

        const testApp = createTestApp({ user: { id: 'different-user' } });
        const response = await request(testApp)
          .get('/user-preferences/favorites');

        expect(response.status).toBe(200);
        expect(mockPrisma.userPreference.findMany).toHaveBeenCalledWith({
          where: {
            userId: 'different-user',
            isFavorite: true
          },
          include: expect.any(Object),
          orderBy: expect.any(Array)
        });
      });
    });

    describe('Success Cases', () => {
      it('should return empty array when user has no favorites', async () => {
        mockPrisma.userPreference.findMany = jest.fn().mockResolvedValue([]);

        const testApp = createTestApp({ user: { id: 'user-123' } });
        const response = await request(testApp)
          .get('/user-preferences/favorites');

        expect(response.status).toBe(200);
        expect(response.body).toEqual({
          success: true,
          data: []
        });
      });

      it('should return formatted favorites with latest data', async () => {
        const favorites = [getMockUserPreference({
          displayOrder: 5,
          indicator: getMockIndicator({
            data: [{ value: 3.5, date: new Date('2024-02-01') }]
          })
        })];
        
        mockPrisma.userPreference.findMany = jest.fn().mockResolvedValue(favorites);

        const testApp = createTestApp({ user: { id: 'user-123' } });
        const response = await request(testApp)
          .get('/user-preferences/favorites');

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveLength(1);
        expect(response.body.data[0]).toEqual({
          id: 'indicator-123',
          name: 'Test Indicator',
          description: 'Test Description',
          category: 'Economic',
          frequency: 'Monthly',
          unit: '%',
          source: 'FRED',
          latestValue: 3.5,
          latestDate: new Date('2024-02-01'),
          displayOrder: 5
        });
      });

      it('should handle indicators with no data gracefully', async () => {
        const favorites = [getMockUserPreference({
          indicator: getMockIndicator({ data: [] })
        })];
        
        mockPrisma.userPreference.findMany = jest.fn().mockResolvedValue(favorites);

        const testApp = createTestApp({ user: { id: 'user-123' } });
        const response = await request(testApp)
          .get('/user-preferences/favorites');

        expect(response.status).toBe(200);
        expect(response.body.data[0].latestValue).toBeNull();
        expect(response.body.data[0].latestDate).toBeNull();
      });
    });

    describe('Error Handling', () => {
      it('should handle database errors gracefully', async () => {
        mockPrisma.userPreference.findMany = jest.fn().mockRejectedValue(new Error('Database error'));

        const testApp = createTestApp({ user: { id: 'user-123' } });
        const response = await request(testApp)
          .get('/user-preferences/favorites');

        expect(response.status).toBe(500);
        expect(response.body).toEqual({
          success: false,
          message: 'Failed to fetch favorites'
        });
      });
    });
  });

  describe('POST /favorites/:indicatorId/toggle', () => {
    describe('Authentication', () => {
      it('should return 401 when user is not authenticated', async () => {
        const testApp = createTestApp();
        const response = await request(testApp)
          .post('/user-preferences/favorites/indicator-123/toggle');

        expect(response.status).toBe(401);
        expect(response.body).toEqual({
          success: false,
          message: 'Not authenticated'
        });
      });
    });

    describe('Input Validation', () => {
      it('should handle valid indicator IDs', async () => {
        mockPrisma.userPreference.findUnique = jest.fn().mockResolvedValue(null);
        mockPrisma.userPreference.create = jest.fn().mockResolvedValue(getMockUserPreference());

        const testApp = createTestApp({ user: { id: 'user-123' } });
        const response = await request(testApp)
          .post('/user-preferences/favorites/valid-indicator-id/toggle');

        expect(response.status).toBe(200);
        expect(mockPrisma.userPreference.findUnique).toHaveBeenCalledWith({
          where: {
            userId_indicatorId: {
              userId: 'user-123',
              indicatorId: 'valid-indicator-id'
            }
          }
        });
      });

      it('should handle potentially malicious indicator IDs safely', async () => {
        const maliciousId = "'; DROP TABLE users; --";
        
        mockPrisma.userPreference.findUnique = jest.fn().mockResolvedValue(null);
        mockPrisma.userPreference.create = jest.fn().mockResolvedValue(getMockUserPreference());

        const testApp = createTestApp({ user: { id: 'user-123' } });
        const response = await request(testApp)
          .post(`/user-preferences/favorites/${encodeURIComponent(maliciousId)}/toggle`);

        expect(response.status).toBe(200);
        expect(mockPrisma.userPreference.findUnique).toHaveBeenCalledWith({
          where: {
            userId_indicatorId: {
              userId: 'user-123',
              indicatorId: maliciousId
            }
          }
        });
      });
    });

    describe('Data Isolation', () => {
      it('should only toggle preferences for the authenticated user', async () => {
        const existingPreference = getMockUserPreference({ isFavorite: false });
        
        mockPrisma.userPreference.findUnique = jest.fn().mockResolvedValue(existingPreference);
        mockPrisma.userPreference.update = jest.fn().mockResolvedValue({
          ...existingPreference,
          isFavorite: true
        });

        const testApp = createTestApp({ user: { id: 'user-123' } });
        const response = await request(testApp)
          .post('/user-preferences/favorites/indicator-123/toggle');

        expect(response.status).toBe(200);
        expect(mockPrisma.userPreference.update).toHaveBeenCalledWith({
          where: {
            userId_indicatorId: {
              userId: 'user-123',
              indicatorId: 'indicator-123'
            }
          },
          data: {
            isFavorite: true,
            updatedAt: expect.any(Date)
          }
        });
      });

      it('should prevent cross-user preference modification', async () => {
        mockPrisma.userPreference.findUnique = jest.fn().mockResolvedValue(null);
        mockPrisma.userPreference.create = jest.fn().mockResolvedValue(getMockUserPreference());

        // User A tries to modify preferences
        const testApp = createTestApp({ user: { id: 'user-a' } });
        const response = await request(testApp)
          .post('/user-preferences/favorites/indicator-123/toggle');

        expect(response.status).toBe(200);
        expect(mockPrisma.userPreference.create).toHaveBeenCalledWith({
          data: {
            userId: 'user-a', // Should only affect user-a, not any other user
            indicatorId: 'indicator-123',
            isFavorite: true
          }
        });
      });
    });

    describe('Business Logic', () => {
      it('should create new favorite when preference does not exist', async () => {
        mockPrisma.userPreference.findUnique = jest.fn().mockResolvedValue(null);
        mockPrisma.userPreference.create = jest.fn().mockResolvedValue(getMockUserPreference());

        const testApp = createTestApp({ user: { id: 'user-123' } });
        const response = await request(testApp)
          .post('/user-preferences/favorites/indicator-123/toggle');

        expect(response.status).toBe(200);
        expect(response.body).toEqual({
          success: true,
          data: { isFavorite: true }
        });
        expect(mockPrisma.userPreference.create).toHaveBeenCalledWith({
          data: {
            userId: 'user-123',
            indicatorId: 'indicator-123',
            isFavorite: true
          }
        });
      });

      it('should toggle favorite from false to true', async () => {
        const existingPreference = getMockUserPreference({ isFavorite: false });
        
        mockPrisma.userPreference.findUnique = jest.fn().mockResolvedValue(existingPreference);
        mockPrisma.userPreference.update = jest.fn().mockResolvedValue({
          ...existingPreference,
          isFavorite: true
        });

        const testApp = createTestApp({ user: { id: 'user-123' } });
        const response = await request(testApp)
          .post('/user-preferences/favorites/indicator-123/toggle');

        expect(response.status).toBe(200);
        expect(response.body).toEqual({
          success: true,
          data: { isFavorite: true }
        });
      });

      it('should toggle favorite from true to false', async () => {
        const existingPreference = getMockUserPreference({ isFavorite: true });
        
        mockPrisma.userPreference.findUnique = jest.fn().mockResolvedValue(existingPreference);
        mockPrisma.userPreference.update = jest.fn().mockResolvedValue({
          ...existingPreference,
          isFavorite: false
        });

        const testApp = createTestApp({ user: { id: 'user-123' } });
        const response = await request(testApp)
          .post('/user-preferences/favorites/indicator-123/toggle');

        expect(response.status).toBe(200);
        expect(response.body).toEqual({
          success: true,
          data: { isFavorite: false }
        });
      });
    });

    describe('Error Handling', () => {
      it('should handle database errors during lookup', async () => {
        mockPrisma.userPreference.findUnique = jest.fn().mockRejectedValue(new Error('Database error'));

        const testApp = createTestApp({ user: { id: 'user-123' } });
        const response = await request(testApp)
          .post('/user-preferences/favorites/indicator-123/toggle');

        expect(response.status).toBe(500);
        expect(response.body).toEqual({
          success: false,
          message: 'Failed to toggle favorite'
        });
      });

      it('should handle database errors during creation', async () => {
        mockPrisma.userPreference.findUnique = jest.fn().mockResolvedValue(null);
        mockPrisma.userPreference.create = jest.fn().mockRejectedValue(new Error('Database error'));

        const testApp = createTestApp({ user: { id: 'user-123' } });
        const response = await request(testApp)
          .post('/user-preferences/favorites/indicator-123/toggle');

        expect(response.status).toBe(500);
        expect(response.body).toEqual({
          success: false,
          message: 'Failed to toggle favorite'
        });
      });
    });
  });

  describe('PUT /favorites/order', () => {
    describe('Authentication', () => {
      it('should return 401 when user is not authenticated', async () => {
        const testApp = createTestApp();
        const response = await request(testApp)
          .put('/user-preferences/favorites/order')
          .send({ orderedIndicatorIds: ['id1', 'id2'] });

        expect(response.status).toBe(401);
        expect(response.body).toEqual({
          success: false,
          message: 'Not authenticated'
        });
      });
    });

    describe('Input Validation', () => {
      it('should return 400 when orderedIndicatorIds is not an array', async () => {
        const testApp = createTestApp({ user: { id: 'user-123' } });
        const response = await request(testApp)
          .put('/user-preferences/favorites/order')
          .send({ orderedIndicatorIds: 'not-an-array' });

        expect(response.status).toBe(400);
        expect(response.body).toEqual({
          success: false,
          message: 'Invalid order data'
        });
      });

      it('should return 400 when orderedIndicatorIds is null', async () => {
        const testApp = createTestApp({ user: { id: 'user-123' } });
        const response = await request(testApp)
          .put('/user-preferences/favorites/order')
          .send({ orderedIndicatorIds: null });

        expect(response.status).toBe(400);
        expect(response.body).toEqual({
          success: false,
          message: 'Invalid order data'
        });
      });

      it('should return 400 when orderedIndicatorIds is undefined', async () => {
        const testApp = createTestApp({ user: { id: 'user-123' } });
        const response = await request(testApp)
          .put('/user-preferences/favorites/order')
          .send({});

        expect(response.status).toBe(400);
        expect(response.body).toEqual({
          success: false,
          message: 'Invalid order data'
        });
      });

      it('should accept empty arrays', async () => {
        mockPrisma.userPreference.updateMany = jest.fn().mockResolvedValue({ count: 0 });

        const testApp = createTestApp({ user: { id: 'user-123' } });
        const response = await request(testApp)
          .put('/user-preferences/favorites/order')
          .send({ orderedIndicatorIds: [] });

        expect(response.status).toBe(200);
        expect(response.body).toEqual({
          success: true,
          message: 'Favorite order updated'
        });
      });

      it('should handle indicator IDs with special characters safely', async () => {
        const specialIds = ["id'with'quotes", 'id"with"double', 'id;with;semicolon'];
        
        mockPrisma.userPreference.updateMany = jest.fn().mockResolvedValue({ count: 1 });

        const testApp = createTestApp({ user: { id: 'user-123' } });
        const response = await request(testApp)
          .put('/user-preferences/favorites/order')
          .send({ orderedIndicatorIds: specialIds });

        expect(response.status).toBe(200);
        
        // Verify each ID was handled safely
        specialIds.forEach((id, index) => {
          expect(mockPrisma.userPreference.updateMany).toHaveBeenCalledWith({
            where: {
              userId: 'user-123',
              indicatorId: id,
              isFavorite: true
            },
            data: {
              displayOrder: index,
              updatedAt: expect.any(Date)
            }
          });
        });
      });
    });

    describe('Data Isolation', () => {
      it('should only update preferences for the authenticated user', async () => {
        const orderedIds = ['id1', 'id2', 'id3'];
        
        mockPrisma.userPreference.updateMany = jest.fn().mockResolvedValue({ count: 1 });

        const testApp = createTestApp({ user: { id: 'user-123' } });
        const response = await request(testApp)
          .put('/user-preferences/favorites/order')
          .send({ orderedIndicatorIds: orderedIds });

        expect(response.status).toBe(200);
        
        orderedIds.forEach((id, index) => {
          expect(mockPrisma.userPreference.updateMany).toHaveBeenCalledWith({
            where: {
              userId: 'user-123', // Only affects this user
              indicatorId: id,
              isFavorite: true
            },
            data: {
              displayOrder: index,
              updatedAt: expect.any(Date)
            }
          });
        });
      });

      it('should prevent cross-user order modification', async () => {
        const orderedIds = ['id1', 'id2'];
        
        mockPrisma.userPreference.updateMany = jest.fn().mockResolvedValue({ count: 1 });

        // User A updates order
        const testApp = createTestApp({ user: { id: 'user-a' } });
        const response = await request(testApp)
          .put('/user-preferences/favorites/order')
          .send({ orderedIndicatorIds: orderedIds });

        expect(response.status).toBe(200);
        
        // Verify only user-a's preferences are affected
        orderedIds.forEach((id, index) => {
          expect(mockPrisma.userPreference.updateMany).toHaveBeenCalledWith({
            where: {
              userId: 'user-a',
              indicatorId: id,
              isFavorite: true
            },
            data: {
              displayOrder: index,
              updatedAt: expect.any(Date)
            }
          });
        });
      });
    });

    describe('Business Logic', () => {
      it('should update display order correctly', async () => {
        const orderedIds = ['indicator1', 'indicator2', 'indicator3'];
        
        mockPrisma.userPreference.updateMany = jest.fn().mockResolvedValue({ count: 1 });

        const testApp = createTestApp({ user: { id: 'user-123' } });
        const response = await request(testApp)
          .put('/user-preferences/favorites/order')
          .send({ orderedIndicatorIds: orderedIds });

        expect(response.status).toBe(200);
        expect(response.body).toEqual({
          success: true,
          message: 'Favorite order updated'
        });

        // Verify correct display order assignment
        expect(mockPrisma.userPreference.updateMany).toHaveBeenCalledTimes(3);
        expect(mockPrisma.userPreference.updateMany).toHaveBeenNthCalledWith(1, {
          where: { userId: 'user-123', indicatorId: 'indicator1', isFavorite: true },
          data: { displayOrder: 0, updatedAt: expect.any(Date) }
        });
        expect(mockPrisma.userPreference.updateMany).toHaveBeenNthCalledWith(2, {
          where: { userId: 'user-123', indicatorId: 'indicator2', isFavorite: true },
          data: { displayOrder: 1, updatedAt: expect.any(Date) }
        });
        expect(mockPrisma.userPreference.updateMany).toHaveBeenNthCalledWith(3, {
          where: { userId: 'user-123', indicatorId: 'indicator3', isFavorite: true },
          data: { displayOrder: 2, updatedAt: expect.any(Date) }
        });
      });

      it('should only update favorites (isFavorite: true)', async () => {
        const orderedIds = ['indicator1'];
        
        mockPrisma.userPreference.updateMany = jest.fn().mockResolvedValue({ count: 1 });

        const testApp = createTestApp({ user: { id: 'user-123' } });
        const response = await request(testApp)
          .put('/user-preferences/favorites/order')
          .send({ orderedIndicatorIds: orderedIds });

        expect(response.status).toBe(200);
        expect(mockPrisma.userPreference.updateMany).toHaveBeenCalledWith({
          where: {
            userId: 'user-123',
            indicatorId: 'indicator1',
            isFavorite: true // Only updates favorites
          },
          data: {
            displayOrder: 0,
            updatedAt: expect.any(Date)
          }
        });
      });
    });

    describe('Error Handling', () => {
      it('should handle database errors gracefully', async () => {
        mockPrisma.userPreference.updateMany = jest.fn().mockRejectedValue(new Error('Database error'));

        const testApp = createTestApp({ user: { id: 'user-123' } });
        const response = await request(testApp)
          .put('/user-preferences/favorites/order')
          .send({ orderedIndicatorIds: ['id1'] });

        expect(response.status).toBe(500);
        expect(response.body).toEqual({
          success: false,
          message: 'Failed to update favorite order'
        });
      });

      it('should handle partial update failures gracefully', async () => {
        mockPrisma.userPreference.updateMany = jest.fn()
          .mockResolvedValueOnce({ count: 1 })
          .mockRejectedValueOnce(new Error('Database error'));

        const testApp = createTestApp({ user: { id: 'user-123' } });
        const response = await request(testApp)
          .put('/user-preferences/favorites/order')
          .send({ orderedIndicatorIds: ['id1', 'id2'] });

        expect(response.status).toBe(500);
        expect(response.body).toEqual({
          success: false,
          message: 'Failed to update favorite order'
        });
      });
    });
  });

  describe('GET /filters', () => {
    describe('Authentication', () => {
      it('should return 401 when user is not authenticated', async () => {
        const testApp = createTestApp();
        const response = await request(testApp)
          .get('/user-preferences/filters');

        expect(response.status).toBe(401);
        expect(response.body).toEqual({
          success: false,
          message: 'Not authenticated'
        });
      });
    });

    describe('Data Isolation', () => {
      it('should only return filters for the authenticated user', async () => {
        const mockFilter = getMockDashboardFilter();
        
        mockPrisma.userDashboardFilter.findUnique = jest.fn().mockResolvedValue(mockFilter);

        const testApp = createTestApp({ user: { id: 'user-123' } });
        const response = await request(testApp)
          .get('/user-preferences/filters');

        expect(response.status).toBe(200);
        expect(mockPrisma.userDashboardFilter.findUnique).toHaveBeenCalledWith({
          where: { userId: 'user-123' }
        });
      });

      it('should not leak other users filter data', async () => {
        mockPrisma.userDashboardFilter.findUnique = jest.fn().mockResolvedValue(null);

        const testApp = createTestApp({ user: { id: 'different-user' } });
        const response = await request(testApp)
          .get('/user-preferences/filters');

        expect(response.status).toBe(200);
        expect(mockPrisma.userDashboardFilter.findUnique).toHaveBeenCalledWith({
          where: { userId: 'different-user' }
        });
      });
    });

    describe('Success Cases', () => {
      it('should return default filters when user has no saved filters', async () => {
        mockPrisma.userDashboardFilter.findUnique = jest.fn().mockResolvedValue(null);

        const testApp = createTestApp({ user: { id: 'user-123' } });
        const response = await request(testApp)
          .get('/user-preferences/filters');

        expect(response.status).toBe(200);
        expect(response.body).toEqual({
          success: true,
          data: {
            categories: [],
            sources: [],
            frequencies: [],
            showFavoritesOnly: false
          }
        });
      });

      it('should return parsed JSON filters when user has saved filters', async () => {
        const mockFilter = getMockDashboardFilter({
          categories: '["Economic", "Market"]',
          sources: '["FRED", "Alpha Vantage"]',
          frequencies: '["Daily", "Monthly"]',
          showFavoritesOnly: true
        });
        
        mockPrisma.userDashboardFilter.findUnique = jest.fn().mockResolvedValue(mockFilter);

        const testApp = createTestApp({ user: { id: 'user-123' } });
        const response = await request(testApp)
          .get('/user-preferences/filters');

        expect(response.status).toBe(200);
        expect(response.body).toEqual({
          success: true,
          data: {
            categories: ["Economic", "Market"],
            sources: ["FRED", "Alpha Vantage"],
            frequencies: ["Daily", "Monthly"],
            showFavoritesOnly: true
          }
        });
      });

      it('should handle null JSON fields gracefully', async () => {
        const mockFilter = getMockDashboardFilter({
          categories: null,
          sources: null,
          frequencies: null,
          showFavoritesOnly: false
        });
        
        mockPrisma.userDashboardFilter.findUnique = jest.fn().mockResolvedValue(mockFilter);

        const testApp = createTestApp({ user: { id: 'user-123' } });
        const response = await request(testApp)
          .get('/user-preferences/filters');

        expect(response.status).toBe(200);
        expect(response.body.data).toEqual({
          categories: [],
          sources: [],
          frequencies: [],
          showFavoritesOnly: false
        });
      });
    });

    describe('Error Handling', () => {
      it('should handle database errors gracefully', async () => {
        mockPrisma.userDashboardFilter.findUnique = jest.fn().mockRejectedValue(new Error('Database error'));

        const testApp = createTestApp({ user: { id: 'user-123' } });
        const response = await request(testApp)
          .get('/user-preferences/filters');

        expect(response.status).toBe(500);
        expect(response.body).toEqual({
          success: false,
          message: 'Failed to fetch filters'
        });
      });

      it('should handle malformed JSON in database gracefully', async () => {
        const mockFilter = getMockDashboardFilter({
          categories: 'invalid-json{',
          sources: '["valid"]',
          frequencies: '["valid"]'
        });
        
        mockPrisma.userDashboardFilter.findUnique = jest.fn().mockResolvedValue(mockFilter);

        const testApp = createTestApp({ user: { id: 'user-123' } });
        const response = await request(testApp)
          .get('/user-preferences/filters');

        expect(response.status).toBe(500);
        expect(response.body).toEqual({
          success: false,
          message: 'Failed to fetch filters'
        });
      });
    });
  });

  describe('PUT /filters', () => {
    describe('Authentication', () => {
      it('should return 401 when user is not authenticated', async () => {
        const testApp = createTestApp();
        const response = await request(testApp)
          .put('/user-preferences/filters')
          .send({
            categories: ['Economic'],
            sources: ['FRED'],
            frequencies: ['Monthly'],
            showFavoritesOnly: true
          });

        expect(response.status).toBe(401);
        expect(response.body).toEqual({
          success: false,
          message: 'Not authenticated'
        });
      });
    });

    describe('Input Validation & Sanitization', () => {
      it('should handle valid filter data', async () => {
        mockPrisma.userDashboardFilter.upsert = jest.fn().mockResolvedValue(getMockDashboardFilter());

        const filterData = {
          categories: ['Economic', 'Market'],
          sources: ['FRED', 'Alpha Vantage'],
          frequencies: ['Daily', 'Monthly'],
          showFavoritesOnly: true
        };

        const testApp = createTestApp({ user: { id: 'user-123' } });
        const response = await request(testApp)
          .put('/user-preferences/filters')
          .send(filterData);

        expect(response.status).toBe(200);
        expect(mockPrisma.userDashboardFilter.upsert).toHaveBeenCalledWith({
          where: { userId: 'user-123' },
          update: {
            categories: JSON.stringify(['Economic', 'Market']),
            sources: JSON.stringify(['FRED', 'Alpha Vantage']),
            frequencies: JSON.stringify(['Daily', 'Monthly']),
            showFavoritesOnly: true,
            updatedAt: expect.any(Date)
          },
          create: {
            userId: 'user-123',
            categories: JSON.stringify(['Economic', 'Market']),
            sources: JSON.stringify(['FRED', 'Alpha Vantage']),
            frequencies: JSON.stringify(['Daily', 'Monthly']),
            showFavoritesOnly: true
          }
        });
      });

      it('should handle null/undefined values safely', async () => {
        mockPrisma.userDashboardFilter.upsert = jest.fn().mockResolvedValue(getMockDashboardFilter());

        const filterData = {
          categories: null,
          sources: undefined,
          frequencies: null,
          showFavoritesOnly: false
        };

        const testApp = createTestApp({ user: { id: 'user-123' } });
        const response = await request(testApp)
          .put('/user-preferences/filters')
          .send(filterData);

        expect(response.status).toBe(200);
        expect(mockPrisma.userDashboardFilter.upsert).toHaveBeenCalledWith({
          where: { userId: 'user-123' },
          update: {
            categories: null,
            sources: null,
            frequencies: null,
            showFavoritesOnly: false,
            updatedAt: expect.any(Date)
          },
          create: {
            userId: 'user-123',
            categories: null,
            sources: null,
            frequencies: null,
            showFavoritesOnly: false
          }
        });
      });

      it('should handle empty arrays', async () => {
        mockPrisma.userDashboardFilter.upsert = jest.fn().mockResolvedValue(getMockDashboardFilter());

        const filterData = {
          categories: [],
          sources: [],
          frequencies: [],
          showFavoritesOnly: false
        };

        const testApp = createTestApp({ user: { id: 'user-123' } });
        const response = await request(testApp)
          .put('/user-preferences/filters')
          .send(filterData);

        expect(response.status).toBe(200);
        expect(mockPrisma.userDashboardFilter.upsert).toHaveBeenCalledWith({
          where: { userId: 'user-123' },
          update: {
            categories: JSON.stringify([]),
            sources: JSON.stringify([]),
            frequencies: JSON.stringify([]),
            showFavoritesOnly: false,
            updatedAt: expect.any(Date)
          },
          create: {
            userId: 'user-123',
            categories: JSON.stringify([]),
            sources: JSON.stringify([]),
            frequencies: JSON.stringify([]),
            showFavoritesOnly: false
          }
        });
      });

      it('should sanitize potentially malicious input', async () => {
        mockPrisma.userDashboardFilter.upsert = jest.fn().mockResolvedValue(getMockDashboardFilter());

        const maliciousData = {
          categories: ['<script>alert("xss")</script>', "'; DROP TABLE users; --"],
          sources: ['FRED</script><script>alert("xss")</script>'],
          frequencies: ['<img src=x onerror=alert("xss")>'],
          showFavoritesOnly: true
        };

        const testApp = createTestApp({ user: { id: 'user-123' } });
        const response = await request(testApp)
          .put('/user-preferences/filters')
          .send(maliciousData);

        expect(response.status).toBe(200);
        
        // Verify malicious input is stored as-is (JSON.stringify will escape it)
        expect(mockPrisma.userDashboardFilter.upsert).toHaveBeenCalledWith({
          where: { userId: 'user-123' },
          update: {
            categories: JSON.stringify(maliciousData.categories),
            sources: JSON.stringify(maliciousData.sources),
            frequencies: JSON.stringify(maliciousData.frequencies),
            showFavoritesOnly: true,
            updatedAt: expect.any(Date)
          },
          create: {
            userId: 'user-123',
            categories: JSON.stringify(maliciousData.categories),
            sources: JSON.stringify(maliciousData.sources),
            frequencies: JSON.stringify(maliciousData.frequencies),
            showFavoritesOnly: true
          }
        });
      });

      it('should handle non-array values gracefully', async () => {
        mockPrisma.userDashboardFilter.upsert = jest.fn().mockResolvedValue(getMockDashboardFilter());

        const invalidData = {
          categories: 'not-an-array',
          sources: { invalid: 'object' },
          frequencies: 123,
          showFavoritesOnly: 'true'
        };

        const testApp = createTestApp({ user: { id: 'user-123' } });
        const response = await request(testApp)
          .put('/user-preferences/filters')
          .send(invalidData);

        expect(response.status).toBe(200);
        
        // Should still JSON.stringify the values (even if they're not arrays)
        expect(mockPrisma.userDashboardFilter.upsert).toHaveBeenCalledWith({
          where: { userId: 'user-123' },
          update: {
            categories: JSON.stringify('not-an-array'),
            sources: JSON.stringify({ invalid: 'object' }),
            frequencies: JSON.stringify(123),
            showFavoritesOnly: 'true', // Will be truthy
            updatedAt: expect.any(Date)
          },
          create: {
            userId: 'user-123',
            categories: JSON.stringify('not-an-array'),
            sources: JSON.stringify({ invalid: 'object' }),
            frequencies: JSON.stringify(123),
            showFavoritesOnly: 'true'
          }
        });
      });
    });

    describe('Data Isolation', () => {
      it('should only update filters for the authenticated user', async () => {
        mockPrisma.userDashboardFilter.upsert = jest.fn().mockResolvedValue(getMockDashboardFilter());

        const filterData = {
          categories: ['Economic'],
          sources: ['FRED'],
          frequencies: ['Monthly'],
          showFavoritesOnly: true
        };

        const testApp = createTestApp({ user: { id: 'user-123' } });
        const response = await request(testApp)
          .put('/user-preferences/filters')
          .send(filterData);

        expect(response.status).toBe(200);
        expect(mockPrisma.userDashboardFilter.upsert).toHaveBeenCalledWith({
          where: { userId: 'user-123' }, // Only affects this user
          update: expect.any(Object),
          create: expect.objectContaining({
            userId: 'user-123' // Only creates for this user
          })
        });
      });

      it('should prevent cross-user filter modification', async () => {
        mockPrisma.userDashboardFilter.upsert = jest.fn().mockResolvedValue(getMockDashboardFilter());

        const filterData = { categories: ['Economic'] };

        // User A updates filters
        const testApp = createTestApp({ user: { id: 'user-a' } });
        const response = await request(testApp)
          .put('/user-preferences/filters')
          .send(filterData);

        expect(response.status).toBe(200);
        expect(mockPrisma.userDashboardFilter.upsert).toHaveBeenCalledWith({
          where: { userId: 'user-a' },
          update: expect.any(Object),
          create: expect.objectContaining({
            userId: 'user-a'
          })
        });
      });
    });

    describe('Business Logic', () => {
      it('should create new filter if it does not exist', async () => {
        const createdFilter = getMockDashboardFilter();
        mockPrisma.userDashboardFilter.upsert = jest.fn().mockResolvedValue(createdFilter);

        const filterData = {
          categories: ['Economic'],
          sources: ['FRED'],
          frequencies: ['Monthly'],
          showFavoritesOnly: true
        };

        const testApp = createTestApp({ user: { id: 'user-123' } });
        const response = await request(testApp)
          .put('/user-preferences/filters')
          .send(filterData);

        expect(response.status).toBe(200);
        expect(response.body).toEqual({
          success: true,
          message: 'Filters updated'
        });
      });

      it('should update existing filter if it exists', async () => {
        const updatedFilter = getMockDashboardFilter();
        mockPrisma.userDashboardFilter.upsert = jest.fn().mockResolvedValue(updatedFilter);

        const filterData = {
          categories: ['Market'],
          sources: ['Alpha Vantage'],
          frequencies: ['Daily'],
          showFavoritesOnly: false
        };

        const testApp = createTestApp({ user: { id: 'user-123' } });
        const response = await request(testApp)
          .put('/user-preferences/filters')
          .send(filterData);

        expect(response.status).toBe(200);
        expect(mockPrisma.userDashboardFilter.upsert).toHaveBeenCalledWith({
          where: { userId: 'user-123' },
          update: {
            categories: JSON.stringify(['Market']),
            sources: JSON.stringify(['Alpha Vantage']),
            frequencies: JSON.stringify(['Daily']),
            showFavoritesOnly: false,
            updatedAt: expect.any(Date)
          },
          create: {
            userId: 'user-123',
            categories: JSON.stringify(['Market']),
            sources: JSON.stringify(['Alpha Vantage']),
            frequencies: JSON.stringify(['Daily']),
            showFavoritesOnly: false
          }
        });
      });
    });

    describe('Error Handling', () => {
      it('should handle database errors gracefully', async () => {
        mockPrisma.userDashboardFilter.upsert = jest.fn().mockRejectedValue(new Error('Database error'));

        const testApp = createTestApp({ user: { id: 'user-123' } });
        const response = await request(testApp)
          .put('/user-preferences/filters')
          .send({
            categories: ['Economic'],
            sources: ['FRED'],
            frequencies: ['Monthly'],
            showFavoritesOnly: true
          });

        expect(response.status).toBe(500);
        expect(response.body).toEqual({
          success: false,
          message: 'Failed to update filters'
        });
      });
    });
  });

  describe('GET /filter-options', () => {
    describe('Public Endpoint', () => {
      it('should return filter options without authentication', async () => {
        const mockCategories = [{ category: 'Economic' }, { category: 'Market' }];
        const mockSources = [{ source: 'FRED' }, { source: 'Alpha Vantage' }];
        const mockFrequencies = [{ frequency: 'Daily' }, { frequency: 'Monthly' }];

        mockPrisma.economicIndicator.findMany = jest.fn()
          .mockResolvedValueOnce(mockCategories)
          .mockResolvedValueOnce(mockSources)
          .mockResolvedValueOnce(mockFrequencies);

        const testApp = createTestApp();
        const response = await request(testApp)
          .get('/user-preferences/filter-options');

        expect(response.status).toBe(200);
        expect(response.body).toEqual({
          success: true,
          data: {
            categories: ['Economic', 'Market'],
            sources: ['Alpha Vantage', 'FRED'], // Should be sorted
            frequencies: ['Daily', 'Monthly']
          }
        });
      });

      it('should only return active indicators', async () => {
        mockPrisma.economicIndicator.findMany = jest.fn()
          .mockResolvedValueOnce([{ category: 'Economic' }])
          .mockResolvedValueOnce([{ source: 'FRED' }])
          .mockResolvedValueOnce([{ frequency: 'Daily' }]);

        const testApp = createTestApp();
        const response = await request(testApp)
          .get('/user-preferences/filter-options');

        expect(response.status).toBe(200);
        
        // Verify all queries filter for active indicators
        expect(mockPrisma.economicIndicator.findMany).toHaveBeenCalledTimes(3);
        expect(mockPrisma.economicIndicator.findMany).toHaveBeenNthCalledWith(1, {
          where: { isActive: true },
          select: { category: true },
          distinct: ['category']
        });
        expect(mockPrisma.economicIndicator.findMany).toHaveBeenNthCalledWith(2, {
          where: { isActive: true },
          select: { source: true },
          distinct: ['source']
        });
        expect(mockPrisma.economicIndicator.findMany).toHaveBeenNthCalledWith(3, {
          where: { isActive: true },
          select: { frequency: true },
          distinct: ['frequency']
        });
      });

      it('should sort results alphabetically', async () => {
        const mockCategories = [{ category: 'Zebra' }, { category: 'Alpha' }, { category: 'Beta' }];
        const mockSources = [{ source: 'ZZZ' }, { source: 'AAA' }, { source: 'BBB' }];
        const mockFrequencies = [{ frequency: 'Yearly' }, { frequency: 'Daily' }, { frequency: 'Monthly' }];

        mockPrisma.economicIndicator.findMany = jest.fn()
          .mockResolvedValueOnce(mockCategories)
          .mockResolvedValueOnce(mockSources)
          .mockResolvedValueOnce(mockFrequencies);

        const testApp = createTestApp();
        const response = await request(testApp)
          .get('/user-preferences/filter-options');

        expect(response.status).toBe(200);
        expect(response.body.data).toEqual({
          categories: ['Alpha', 'Beta', 'Zebra'],
          sources: ['AAA', 'BBB', 'ZZZ'],
          frequencies: ['Daily', 'Monthly', 'Yearly']
        });
      });

      it('should handle empty results', async () => {
        mockPrisma.economicIndicator.findMany = jest.fn()
          .mockResolvedValueOnce([])
          .mockResolvedValueOnce([])
          .mockResolvedValueOnce([]);

        const testApp = createTestApp();
        const response = await request(testApp)
          .get('/user-preferences/filter-options');

        expect(response.status).toBe(200);
        expect(response.body).toEqual({
          success: true,
          data: {
            categories: [],
            sources: [],
            frequencies: []
          }
        });
      });
    });

    describe('Error Handling', () => {
      it('should handle database errors gracefully', async () => {
        mockPrisma.economicIndicator.findMany = jest.fn().mockRejectedValue(new Error('Database error'));

        const testApp = createTestApp();
        const response = await request(testApp)
          .get('/user-preferences/filter-options');

        expect(response.status).toBe(500);
        expect(response.body).toEqual({
          success: false,
          message: 'Failed to fetch filter options'
        });
      });

      it('should handle partial database errors', async () => {
        mockPrisma.economicIndicator.findMany = jest.fn()
          .mockResolvedValueOnce([{ category: 'Economic' }])
          .mockRejectedValueOnce(new Error('Database error'))
          .mockResolvedValueOnce([{ frequency: 'Daily' }]);

        const testApp = createTestApp();
        const response = await request(testApp)
          .get('/user-preferences/filter-options');

        expect(response.status).toBe(500);
        expect(response.body).toEqual({
          success: false,
          message: 'Failed to fetch filter options'
        });
      });
    });
  });
});