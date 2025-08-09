import { PrismaClient } from '@prisma/client';

/**
 * Prisma Client Configuration for AWS RDS PostgreSQL
 * Handles connection pooling and query optimization
 */
class PrismaClientSingleton {
  private static instance: PrismaClient;

  private constructor() {}

  public static getInstance(): PrismaClient {
    if (!PrismaClientSingleton.instance) {
      PrismaClientSingleton.instance = new PrismaClient({
        log: process.env['NODE_ENV'] === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
        datasources: {
          db: {
            url: process.env['DATABASE_URL'],
          },
        },
        // Connection pool configuration for AWS RDS
        datasourceUrl: process.env['DATABASE_URL'],
      });

      // Handle graceful shutdown
      process.on('beforeExit', async () => {
        await PrismaClientSingleton.instance.$disconnect();
      });

      process.on('SIGINT', async () => {
        await PrismaClientSingleton.instance.$disconnect();
        process.exit(0);
      });

      process.on('SIGTERM', async () => {
        await PrismaClientSingleton.instance.$disconnect();
        process.exit(0);
      });
    }

    return PrismaClientSingleton.instance;
  }

  public static async disconnect(): Promise<void> {
    if (PrismaClientSingleton.instance) {
      await PrismaClientSingleton.instance.$disconnect();
    }
  }
}

// Export singleton instance
export const prisma = PrismaClientSingleton.getInstance();

// Health check function
export async function checkDatabaseHealth(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    console.error('Database health check failed:', error);
    return false;
  }
}

// Transaction helper
export async function withTransaction<T>(
  callback: (tx: Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>) => Promise<T>
): Promise<T> {
  return prisma.$transaction(callback);
}

// Pagination helper
export interface PaginationOptions {
  page?: number;
  limit?: number;
  cursor?: string;
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
    nextCursor?: string;
    prevCursor?: string;
  };
}

export async function paginate<T>(
  model: any,
  options: PaginationOptions & {
    where?: any;
    orderBy?: any;
    include?: any;
    select?: any;
  }
): Promise<PaginatedResult<T>> {
  const page = options.page || 1;
  const limit = Math.min(options.limit || 50, 100); // Max 100 items per page
  const skip = (page - 1) * limit;

  const [data, total] = await Promise.all([
    model.findMany({
      where: options.where,
      orderBy: options.orderBy,
      include: options.include,
      select: options.select,
      skip,
      take: limit,
    }),
    model.count({
      where: options.where,
    }),
  ]);

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
      nextCursor: data.length === limit ? data[data.length - 1]?.id : undefined,
      prevCursor: page > 1 ? data[0]?.id : undefined,
    },
  };
}