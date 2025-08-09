import { User, UserProfile, UserStatus, Prisma } from '@prisma/client';
import { prisma, paginate, PaginatedResult, withTransaction } from './client';
import bcrypt from 'bcrypt';

/**
 * Users Repository using Prisma ORM
 * Handles CRUD operations for user authentication and management
 */
export class UsersRepository {
  /**
   * Create a new user with profile
   */
  async create(userData: {
    email: string;
    password: string;
    name?: string;
    profile?: {
      company?: string;
      timezone?: string;
      language?: string;
      preferences?: any;
    };
  }): Promise<any> {
    const passwordHash = await bcrypt.hash(userData.password, 12);

    return withTransaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: userData.email.toLowerCase(),
          passwordHash,
          name: userData.name,
          profile: userData.profile
            ? {
                create: {
                  company: userData.profile.company,
                  timezone: userData.profile.timezone || 'UTC',
                  language: userData.profile.language || 'en',
                  preferences: userData.profile.preferences || {},
                },
              }
            : undefined,
        },
        include: {
          profile: true,
        },
      });

      return user;
    });
  }

  /**
   * Find user by ID with optional profile
   */
  async findById(
    id: string,
    includeProfile: boolean = false
  ): Promise<any> {
    return prisma.user.findFirst({
      where: {
        id,
        status: {
          not: UserStatus.DELETED,
        },
      },
      include: {
        profile: includeProfile,
      },
    });
  }

  /**
   * Find user by email with optional profile
   */
  async findByEmail(
    email: string,
    includeProfile: boolean = false
  ): Promise<any> {
    return prisma.user.findFirst({
      where: {
        email: email.toLowerCase(),
        status: {
          not: UserStatus.DELETED,
        },
      },
      include: {
        profile: includeProfile,
      },
    });
  }

  /**
   * Update user
   */
  async update(
    id: string,
    updates: Partial<Omit<User, 'id' | 'createdAt' | 'updatedAt'>>
  ): Promise<User> {
    const user = await prisma.user.update({
      where: {
        id,
        status: {
          not: UserStatus.DELETED,
        },
      },
      data: updates,
    });

    if (!user) {
      throw new Error('User not found or update failed');
    }

    return user;
  }

  /**
   * Update user profile
   */
  async updateProfile(
    userId: string,
    profileUpdates: any
  ): Promise<UserProfile> {
    return prisma.userProfile.upsert({
      where: {
        userId,
      },
      update: profileUpdates,
      create: {
        userId,
        ...profileUpdates,
      },
    });
  }

  /**
   * Soft delete user (set status to deleted)
   */
  async delete(id: string): Promise<void> {
    await prisma.user.update({
      where: { id },
      data: {
        status: UserStatus.DELETED,
      },
    });
  }

  /**
   * Verify user password
   */
  async verifyPassword(email: string, password: string): Promise<User | null> {
    const user = await prisma.user.findFirst({
      where: {
        email: email.toLowerCase(),
        status: {
          not: UserStatus.DELETED,
        },
      },
    });

    if (!user) {
      return null;
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      return null;
    }

    return user;
  }

  /**
   * Update password
   */
  async updatePassword(id: string, newPassword: string): Promise<void> {
    const passwordHash = await bcrypt.hash(newPassword, 12);

    await prisma.user.update({
      where: {
        id,
        status: {
          not: UserStatus.DELETED,
        },
      },
      data: {
        passwordHash,
      },
    });
  }

  /**
   * Mark email as verified
   */
  async verifyEmail(id: string): Promise<User> {
    return this.update(id, { emailVerified: true });
  }

  /**
   * Get user count by status
   */
  async countByStatus(status: UserStatus): Promise<number> {
    return prisma.user.count({
      where: { status },
    });
  }

  /**
   * List users with pagination
   */
  async list(options?: {
    page?: number;
    limit?: number;
    status?: UserStatus;
    search?: string;
    includeProfile?: boolean;
  }): Promise<PaginatedResult<any>> {
    const whereClause: Prisma.UserWhereInput = {
      status: options?.status || { not: UserStatus.DELETED },
    };

    if (options?.search) {
      whereClause.OR = [
        { email: { contains: options.search, mode: 'insensitive' } },
        { name: { contains: options.search, mode: 'insensitive' } },
      ];
    }

    return paginate(prisma.user, {
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      include: {
        profile: options?.includeProfile || false,
      },
      page: options?.page,
      limit: options?.limit,
    });
  }

  /**
   * Check if email exists
   */
  async emailExists(email: string, excludeUserId?: string): Promise<boolean> {
    const whereClause: Prisma.UserWhereInput = {
      email: email.toLowerCase(),
      status: { not: UserStatus.DELETED },
    };

    if (excludeUserId) {
      whereClause.id = { not: excludeUserId };
    }

    const user = await prisma.user.findFirst({
      where: whereClause,
      select: { id: true },
    });

    return !!user;
  }

  /**
   * Get user statistics
   */
  async getStats(): Promise<{
    total: number;
    active: number;
    inactive: number;
    suspended: number;
    recentSignups: number; // Last 7 days
  }> {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const [total, active, inactive, suspended, recentSignups] = await Promise.all([
      this.countByStatus(UserStatus.ACTIVE),
      this.countByStatus(UserStatus.ACTIVE),
      this.countByStatus(UserStatus.INACTIVE),
      this.countByStatus(UserStatus.SUSPENDED),
      prisma.user.count({
        where: {
          createdAt: { gte: sevenDaysAgo },
          status: { not: UserStatus.DELETED },
        },
      }),
    ]);

    return {
      total: total + inactive + suspended,
      active,
      inactive,
      suspended,
      recentSignups,
    };
  }

  /**
   * Bulk update user status
   */
  async bulkUpdateStatus(userIds: string[], status: UserStatus): Promise<number> {
    const result = await prisma.user.updateMany({
      where: {
        id: { in: userIds },
        status: { not: UserStatus.DELETED },
      },
      data: { status },
    });

    return result.count;
  }
}

// Export singleton instance
export const usersRepository = new UsersRepository();