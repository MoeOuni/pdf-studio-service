import { eq, and, desc } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { db } from './client';
import { users, type User, type UserStatus } from './schema';

/**
 * Simplified Users Repository using Drizzle ORM
 * Basic CRUD operations for user authentication and management
 */
export class UsersRepository {
  /**
   * Create a new user
   */
  async create(userData: {
    email: string;
    password: string;
    name?: string;
  }): Promise<User> {
    const passwordHash = await bcrypt.hash(userData.password, 12);

    const result = await db.insert(users).values({
      email: userData.email.toLowerCase(),
      passwordHash,
      name: userData.name,
    }).returning();

    if (!result[0]) {
      throw new Error('Failed to create user');
    }

    return result[0];
  }

  /**
   * Find user by ID
   */
  async findById(id: string): Promise<User | null> {
    const result = await db
      .select()
      .from(users)
      .where(and(
        eq(users.id, id),
        eq(users.status, 'ACTIVE')
      ))
      .limit(1);

    return result[0] || null;
  }

  /**
   * Find user by email
   */
  async findByEmail(email: string): Promise<User | null> {
    const result = await db
      .select()
      .from(users)
      .where(and(
        eq(users.email, email.toLowerCase()),
        eq(users.status, 'ACTIVE')
      ))
      .limit(1);

    return result[0] || null;
  }

  /**
   * Update user
   */
  async update(
    id: string,
    updates: Partial<Omit<User, 'id' | 'createdAt' | 'updatedAt'>>
  ): Promise<User | null> {
    const result = await db
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

    return result[0] || null;
  }

  /**
   * Soft delete user
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
    const user = await this.findByEmail(email);
    if (!user) return null;

    const isValid = await bcrypt.compare(password, user.passwordHash);
    return isValid ? user : null;
  }

  /**
   * Update password
   */
  async updatePassword(id: string, newPassword: string): Promise<void> {
    const passwordHash = await bcrypt.hash(newPassword, 12);
    await this.update(id, { passwordHash });
  }

  /**
   * Mark email as verified
   */
  async verifyEmail(id: string): Promise<User | null> {
    return this.update(id, { emailVerified: true });
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

    const result = await db
      .select({ id: users.id })
      .from(users)
      .where(and(...conditions))
      .limit(1);

    return result.length > 0;
  }

  /**
   * List users
   */
  async list(options?: {
    limit?: number;
    offset?: number;
    status?: UserStatus;
  }): Promise<User[]> {
    const conditions = [];
    
    if (options?.status) {
      conditions.push(eq(users.status, options.status));
    } else {
      conditions.push(eq(users.status, 'ACTIVE'));
    }

    const result = await db
      .select()
      .from(users)
      .where(and(...conditions))
      .orderBy(desc(users.createdAt))
      .limit(options?.limit || 10)
      .offset(options?.offset || 0);

    return result;
  }
}

// Export singleton instance
export const usersRepository = new UsersRepository();
