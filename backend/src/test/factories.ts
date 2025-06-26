/**
 * Test data factories for creating mock objects with overrides
 * Follow the pattern: getMockX(overrides?: Partial<X>): X
 */

export type MockUser = {
  id: string;
  email: string;
  name: string;
  subscriptionTier: 'FREE' | 'PRO';
  createdAt: Date;
  updatedAt: Date;
};

export const getMockUser = (overrides?: Partial<MockUser>): MockUser => ({
  id: 'test-user-123',
  email: 'test@example.com',
  name: 'Test User',
  subscriptionTier: 'FREE',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  ...overrides,
});

export type MockIndicator = {
  id: string;
  name: string;
  description: string;
  value: number;
  unit: string;
  frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY';
  lastUpdated: Date;
  isPremium: boolean;
};

export const getMockIndicator = (overrides?: Partial<MockIndicator>): MockIndicator => ({
  id: 'test-indicator-123',
  name: 'Test Indicator',
  description: 'A test economic indicator',
  value: 100.5,
  unit: '%',
  frequency: 'MONTHLY',
  lastUpdated: new Date('2024-01-01'),
  isPremium: false,
  ...overrides,
});