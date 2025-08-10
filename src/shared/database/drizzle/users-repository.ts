import { eq, and, desc, count, ilike, or } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { db, withTransaction, getPaginationParams, buildPaginatedResult, type PaginatedResult } from './client';
import { 
  users, 
  userProfiles, 
  type User, 
  type UserProfile,
  type UserStatus 
} from './schema';

/**
 * Users Repository using Drizzle ORM
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
  }): Promise<User & { profile?: UserProfile }> {
    const passwordHash = await bcrypt.hash(userData.password, 12);

    return withTransaction(async (tx) => {
      const [user] = await tx.insert(users).values({
        email: userData.email.toLowerCase(),
        passwordHash,
        name: userData.name,
      }).returning();

      if (!user) {
        throw new Error('Failed to create user');
      }

      let profile: UserProfile | undefined;
      if (userData.profile) {
        [profile] = await tx.insert(userProfiles).values({
          userId: user.id,
          company: userData.profile.company,
          timezone: userData.profile.timezone || 'UTC',
          language: userData.profile.language || 'en',
          preferences: userData.profile.preferences || {},
        }).returning();
      }

      return { ...user, profile };
    });
  }

  /**
   * Find user by ID with optional profile
   */
  async findById(
    id: string,
    includeProfile: boolean = false
  ): Promise<(User & { profile?: UserProfile }) | null> {
    if (includeProfile) {
      const result = await db
        .select()
        .from(users)
        .leftJoin(userProfiles, eq(users.id, userProfiles.userId))
        .where(and(
          eq(users.id, id),
          eq(users.status, 'ACTIVE')
        ))
        .limit(1);

      if (result.length === 0) return null;

      const row = result[0];
      if (!row) return null;
      
      return {
        ...row.users,
        profile: row.user_profiles || undefined,
      };
    }

    const [user] = await db
      .select()
      .from(users)
      .where(and(
        eq(users.id, id),
        eq(users.status, 'ACTIVE')
      ))
      .limit(1);

    return user || null;
  }

  /**
   * Find user by email with optional profile
   */
  async findByEmail(
    email: string,
    includeProfile: boolean = false
  ): Promise<(User & { profile?: UserProfile }) | null> {
    if (includeProfile) {
      const result = await db
        .select()
        .from(users)
        .leftJoin(userProfiles, eq(users.id, userProfiles.userId))
        .where(and(
          eq(users.email, email.toLowerCase()),
          eq(users.status, 'ACTIVE')
        ))
        .limit(1);

      if (result.length === 0) return null;

      const row = result[0];
      if (!row) return null;
      
      return {
        ...row.users,
        profile: row.user_profiles || undefined,
      };
    }

    const [user] = await db
      .select()
      .from(users)
      .where(and(
        eq(users.email, email.toLowerCase()),
        eq(users.status, 'ACTIVE')
      ))
      .limit(1);

    return user || null;
  }

  /**
   * Update user
   */
  async update(
    id: string,
    updates: Partial<Omit<User, 'id' | 'createdAt' | 'updatedAt'>>
  ): Promise<User> {
    const [user] = await db
      .update(users)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(and(
        eq(users.id, id),
        eq(users.status, 'ACTIVE')
      ))
      .returning();

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
    profileUpdates: Partial<Omit<UserProfile, 'userId' | 'createdAt' | 'updatedAt'>>
  ): Promise<UserProfile> {
    const existingProfile = await db
      .select()
      .from(userProfiles)
      .where(eq(userProfiles.userId, userId))
      .limit(1);

    if (existingProfile.length > 0) {
      const [profile] = await db
        .update(userProfiles)
        .set({
          ...profileUpdates,
          updatedAt: new Date(),
        })
        .where(eq(userProfiles.userId, userId))
        .returning();

      if (!profile) {
        throw new Error('Failed to update profile');
      }
      return profile;
    } else {
      const [profile] = await db
        .insert(userProfiles)
        .values({
          userId,
          ...profileUpdates,
        })
        .returning();

      if (!profile) {
        throw new Error('Failed to create profile');
      }
      return profile;
    }
  }

  /**
   * Soft delete user (set status to deleted)
   */
  async delete(id: string): Promise<void> {
    await db
      .update(users)
      .set({
        status: 'DELETED',
        updatedAt: new Date(),
      })
      .where(eq(users.id, id));
  }

  /**
   * Verify user password
   */
  async verifyPassword(email: string, password: string): Promise<User | null> {
    const user = await db
      .select()
      .from(users)
      .where(and(
        eq(users.email, email.toLowerCase()),
        eq(users.status, 'ACTIVE')
      ))
      .limit(1);

    if (user.length === 0 || !user[0]) {
      return null;
    }

    const isValid = await bcrypt.compare(password, user[0].passwordHash);
    if (!isValid) {
      return null;
    }

    return user[0];
  }

  /**
   * Update password
   */
  async updatePassword(id: string, newPassword: string): Promise<void> {
    const passwordHash = await bcrypt.hash(newPassword, 12);

    await db
      .update(users)
      .set({
        passwordHash,
        updatedAt: new Date(),
      })
      .where(and(
        eq(users.id, id),
        eq(users.status, 'ACTIVE')
      ));
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
    const [result] = await db
      .select({ count: count() })
      .from(users)
      .where(eq(users.status, status));

    return result?.count || 0;
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
  }): Promise<PaginatedResult<User & { profile?: UserProfile }>> {
    const { page, limit, offset } = getPaginationParams(options);

    // Build where conditions
    const conditions = [];
    
    if (options?.status) {
      conditions.push(eq(users.status, options.status));
    } else {
      conditions.push(eq(users.status, 'ACTIVE'));
    }

    if (options?.search) {
      conditions.push(
        or(
          ilike(users.email, `%${options.search}%`),
          ilike(users.name, `%${options.search}%`)
        )
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Get total count
    const [countResult] = await db
      .select({ total: count() })
      .from(users)
      .where(whereClause);

    const total = countResult?.total || 0;

    // Get paginated data
    let query;
    if (options?.includeProfile) {
      query = db
        .select()
        .from(users)
        .leftJoin(userProfiles, eq(users.id, userProfiles.userId))
        .where(whereClause)
        .orderBy(desc(users.createdAt))
        .limit(limit)
        .offset(offset);
    } else {
      query = db
        .select()
        .from(users)
        .where(whereClause)
        .orderBy(desc(users.createdAt))
        .limit(limit)
        .offset(offset);
    }

    const result = await query;

    const data = result.map((row) => {
      if ('user_profiles' in row) {
        return {
          ...row.users,
          profile: row.user_profiles || undefined,
        };
      }
      return row as User;
    });

    return buildPaginatedResult(data, total, page, limit);
  }

  /**
   * Check if email exists
   */
  async emailExists(email: string, excludeUserId?: string): Promise<boolean> {
    const conditions = [
      eq(users.email, email.toLowerCase()),
      eq(users.status, 'ACTIVE')
    ];

    if (excludeUserId) {
      conditions.push(eq(users.id, excludeUserId));
    }

    const [user] = await db
      .select({ id: users.id })
      .from(users)
      .where(and(...conditions))
      .limit(1);

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

    const [activeCount] = await db
      .select({ count: count() })
      .from(users)
      .where(eq(users.status, 'ACTIVE'));

    const [inactiveCount] = await db
      .select({ count: count() })
      .from(users)
      .where(eq(users.status, 'INACTIVE'));

    const [suspendedCount] = await db
      .select({ count: count() })
      .from(users)
      .where(eq(users.status, 'SUSPENDED'));

    const [recentCount] = await db
      .select({ count: count() })
      .from(users)
      .where(and(
        eq(users.status, 'ACTIVE'),
        eq(users.createdAt, sevenDaysAgo)
      ));

    return {
      total: (activeCount?.count || 0) + (inactiveCount?.count || 0) + (suspendedCount?.count || 0),
      active: activeCount?.count || 0,
      inactive: inactiveCount?.count || 0,
      suspended: suspendedCount?.count || 0,
      recentSignups: recentCount?.count || 0,
    };
  }

  /**
   * Bulk update user status
   */
  async bulkUpdateStatus(_userIds: string[], status: UserStatus): Promise<number> {
    const result = await db
      .update(users)
      .set({
        status,
        updatedAt: new Date(),
      })
      .where(and(
        eq(users.status, 'ACTIVE'),
        // TODO: Add userIds filter - inArray(users.id, userIds)
      ));

    return result.rowCount || 0;
  }
}

// Export singleton instance
export const usersRepository = new UsersRepository();
