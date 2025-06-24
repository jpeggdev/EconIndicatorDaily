import { PrismaClient } from '@prisma/client';

export class UserService {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  async createUser(userData: {
    email: string;
    name?: string;
    image?: string;
  }) {
    return this.prisma.user.create({
      data: {
        ...userData,
        subscriptionStatus: 'free',
        subscriptionTier: 'free',
        indicatorAccessCount: 5,
        lastLoginAt: new Date(),
      },
    });
  }

  async findOrCreateUser(userData: {
    email: string;
    name?: string;
    image?: string;
  }) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: userData.email },
    });

    if (existingUser) {
      // Update last login
      return this.prisma.user.update({
        where: { email: userData.email },
        data: { lastLoginAt: new Date() },
      });
    }

    return this.createUser(userData);
  }

  async getUserById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      include: {
        preferences: {
          include: {
            indicator: true,
          },
        },
      },
    });
  }

  async getUserByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
      include: {
        preferences: {
          include: {
            indicator: true,
          },
        },
      },
    });
  }

  async updateSubscription(userId: string, subscriptionData: {
    subscriptionStatus: string;
    subscriptionTier: string;
    stripeCustomerId?: string;
    stripeSubscriptionId?: string;
    subscriptionStartDate?: Date;
    subscriptionEndDate?: Date;
    indicatorAccessCount?: number;
  }) {
    return this.prisma.user.update({
      where: { id: userId },
      data: subscriptionData,
    });
  }

  async upgradeToPro(userId: string, stripeData?: {
    customerId?: string;
    subscriptionId?: string;
  }) {
    const subscriptionStartDate = new Date();
    const subscriptionEndDate = new Date();
    subscriptionEndDate.setMonth(subscriptionEndDate.getMonth() + 1);

    return this.prisma.user.update({
      where: { id: userId },
      data: {
        subscriptionStatus: 'pro',
        subscriptionTier: 'pro',
        indicatorAccessCount: 50,
        subscriptionStartDate,
        subscriptionEndDate,
        weeklyEmailEnabled: true,
        dailyEmailEnabled: true,
        stripeCustomerId: stripeData?.customerId,
        stripeSubscriptionId: stripeData?.subscriptionId,
      },
    });
  }

  async downgradeToFree(userId: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        subscriptionStatus: 'free',
        subscriptionTier: 'free',
        indicatorAccessCount: 5,
        subscriptionEndDate: null,
        weeklyEmailEnabled: false,
        dailyEmailEnabled: false,
        stripeSubscriptionId: null,
        subscriptionCancelAtPeriodEnd: false,
      },
    });
  }

  async updateEmailPreferences(userId: string, preferences: {
    emailNotificationsEnabled?: boolean;
    weeklyEmailEnabled?: boolean;
    dailyEmailEnabled?: boolean;
  }) {
    return this.prisma.user.update({
      where: { id: userId },
      data: preferences,
    });
  }

  async canAccessIndicator(userId: string, indicatorCount: number): Promise<boolean> {
    const user = await this.getUserById(userId);
    
    if (!user) return false;
    
    // Pro users can access unlimited indicators
    if (user.subscriptionStatus === 'pro' || user.subscriptionStatus === 'enterprise') {
      return true;
    }
    
    // Free users are limited by indicatorAccessCount
    return indicatorCount <= user.indicatorAccessCount;
  }

  async getSubscriptionLimits(userId: string) {
    const user = await this.getUserById(userId);
    
    if (!user) {
      return {
        maxIndicators: 0,
        weeklyEmail: false,
        dailyEmail: false,
        subscriptionStatus: 'free',
      };
    }

    return {
      maxIndicators: user.indicatorAccessCount,
      weeklyEmail: user.weeklyEmailEnabled,
      dailyEmail: user.dailyEmailEnabled,
      subscriptionStatus: user.subscriptionStatus,
      subscriptionTier: user.subscriptionTier,
      subscriptionEndDate: user.subscriptionEndDate,
    };
  }

  async isSubscriptionActive(userId: string): Promise<boolean> {
    const user = await this.getUserById(userId);
    
    if (!user) return false;
    
    // Free tier is always "active"
    if (user.subscriptionStatus === 'free') return true;
    
    // Check if paid subscription is still active
    if (user.subscriptionEndDate) {
      return new Date() < user.subscriptionEndDate;
    }
    
    // If no end date but has pro status, consider active
    return user.subscriptionStatus === 'pro' || user.subscriptionStatus === 'enterprise';
  }

  async getActiveUsers() {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    return this.prisma.user.findMany({
      where: {
        lastLoginAt: {
          gte: thirtyDaysAgo,
        },
      },
      orderBy: {
        lastLoginAt: 'desc',
      },
    });
  }

  async getSubscriptionStats() {
    const totalUsers = await this.prisma.user.count();
    const freeUsers = await this.prisma.user.count({
      where: { subscriptionStatus: 'free' },
    });
    const proUsers = await this.prisma.user.count({
      where: { subscriptionStatus: 'pro' },
    });

    return {
      totalUsers,
      freeUsers,
      proUsers,
      conversionRate: totalUsers > 0 ? (proUsers / totalUsers) * 100 : 0,
    };
  }
}