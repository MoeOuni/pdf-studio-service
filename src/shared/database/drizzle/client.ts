import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

/**
 * Drizzle Database Client Configuration for AWS RDS PostgreSQL
 * Optimized for serverless environments with connection pooling
 */
class DrizzleClientSingleton {
  private static instance: ReturnType<typeof drizzle>;
  private static pool: Pool;

  /**
   * Get or create the Drizzle client instance
   */
  public static getInstance() {
    if (!DrizzleClientSingleton.instance) {
      try {
        // Create connection pool for better performance in serverless
        DrizzleClientSingleton.pool = new Pool({
          connectionString: process.env['DATABASE_URL'],
          ssl: process.env['NODE_ENV'] === 'production' ? { rejectUnauthorized: false } : false,
          // Optimize for serverless
          max: 2, // Maximum connections in pool
          idleTimeoutMillis: 30000, // Close idle connections after 30s
          connectionTimeoutMillis: 10000, // Wait max 10s for connection
        });

        DrizzleClientSingleton.instance = drizzle(DrizzleClientSingleton.pool, {
          schema,
          logger: process.env['NODE_ENV'] === 'development',
        });

        console.log('Drizzle client initialized successfully');
      } catch (error) {
        console.error('Failed to initialize Drizzle client:', error);
        throw error;
      }
    }
    
    return DrizzleClientSingleton.instance;
  }

  /**
   * Gracefully close database connections
   */
  public static async disconnect() {
    if (DrizzleClientSingleton.pool) {
      try {
        await DrizzleClientSingleton.pool.end();
        console.log('Database connections closed');
      } catch (error) {
        console.error('Error closing database connections:', error);
      }
    }
  }
}

// Export singleton instance
export const db = DrizzleClientSingleton.getInstance();

// Export for cleanup in serverless environments
export const disconnectDb = DrizzleClientSingleton.disconnect;

/**
 * Transaction helper for complex operations
 */
export async function withTransaction<T>(
  callback: (tx: Parameters<Parameters<typeof db.transaction>[0]>[0]) => Promise<T>
): Promise<T> {
  return await db.transaction(callback);
}

/**
 * Pagination helper for list queries
 */
export interface PaginationOptions {
  page?: number;
  limit?: number;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export function getPaginationParams(options: PaginationOptions = {}) {
  const page = Math.max(1, options.page || 1);
  const limit = Math.min(100, Math.max(1, options.limit || 10));
  const offset = (page - 1) * limit;
  
  return { page, limit, offset };
}

export function buildPaginatedResult<T>(
  data: T[], 
  total: number, 
  page: number, 
  limit: number
): PaginatedResult<T> {
  const totalPages = Math.ceil(total / limit);
  
  return {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
  };
}
