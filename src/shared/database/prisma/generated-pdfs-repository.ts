import { GeneratedPdf, Prisma } from '@prisma/client';
import { prisma, paginate, PaginatedResult } from './client';

/**
 * Generated PDFs Repository using Prisma ORM
 * Handles CRUD operations for generated PDF metadata and tracking
 */
export class GeneratedPdfsRepository {
  /**
   * Create a new generated PDF record
   */
  async create(pdfData: {
    userId: string;
    templateId: string;
    originalFileId?: string;
    generatedFilename: string;
    filePath: string;
    s3Bucket: string;
    s3Key: string;
    fileSize: bigint;
    generationData: any;
    expiresAt?: Date;
  }): Promise<GeneratedPdf> {
    // Default expiry to 30 days from now
    const defaultExpiresAt = new Date();
    defaultExpiresAt.setDate(defaultExpiresAt.getDate() + 30);

    return prisma.generatedPdf.create({
      data: {
        userId: pdfData.userId,
        templateId: pdfData.templateId,
        originalFileId: pdfData.originalFileId,
        generatedFilename: pdfData.generatedFilename,
        filePath: pdfData.filePath,
        s3Bucket: pdfData.s3Bucket,
        s3Key: pdfData.s3Key,
        fileSize: pdfData.fileSize,
        generationData: pdfData.generationData,
        downloadCount: 0,
        expiresAt: pdfData.expiresAt || defaultExpiresAt,
      },
    });
  }

  /**
   * Find generated PDF by ID
   */
  async findById(id: string): Promise<GeneratedPdf | null> {
    return prisma.generatedPdf.findUnique({
      where: { id },
      include: {
        user: {
          select: { id: true, email: true, name: true },
        },
        originalFile: {
          select: { id: true, originalFilename: true, s3Key: true },
        },
      },
    });
  }

  /**
   * Find generated PDFs by user ID
   */
  async findByUserId(
    userId: string,
    options?: {
      page?: number;
      limit?: number;
      templateId?: string;
      includeExpired?: boolean;
    }
  ): Promise<PaginatedResult<GeneratedPdf>> {
    const whereClause: Prisma.GeneratedPdfWhereInput = {
      userId,
    };

    if (options?.templateId) {
      whereClause.templateId = options.templateId;
    }

    if (!options?.includeExpired) {
      whereClause.OR = [
        { expiresAt: null },
        { expiresAt: { gt: new Date() } },
      ];
    }

    return paginate(prisma.generatedPdf, {
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      include: {
        originalFile: {
          select: { id: true, originalFilename: true },
        },
      },
      page: options?.page,
      limit: options?.limit,
    });
  }

  /**
   * Find generated PDFs by template ID
   */
  async findByTemplateId(
    templateId: string,
    options?: {
      page?: number;
      limit?: number;
      userId?: string;
    }
  ): Promise<PaginatedResult<GeneratedPdf>> {
    const whereClause: Prisma.GeneratedPdfWhereInput = {
      templateId,
    };

    if (options?.userId) {
      whereClause.userId = options.userId;
    }

    return paginate(prisma.generatedPdf, {
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: { id: true, email: true, name: true },
        },
      },
      page: options?.page,
      limit: options?.limit,
    });
  }

  /**
   * Increment download count
   */
  async incrementDownloadCount(id: string): Promise<GeneratedPdf> {
    return prisma.generatedPdf.update({
      where: { id },
      data: {
        downloadCount: {
          increment: 1,
        },
      },
    });
  }

  /**
   * Get recent generated PDFs for a user
   */
  async findRecentByUserId(userId: string, limit: number = 10): Promise<GeneratedPdf[]> {
    return prisma.generatedPdf.findMany({
      where: {
        userId,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } },
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        originalFile: {
          select: { id: true, originalFilename: true },
        },
      },
    });
  }

  /**
   * Get PDF generation statistics for a user
   */
  async getStatsByUserId(userId: string): Promise<{
    totalGenerated: number;
    totalDownloads: number;
    totalFileSize: bigint;
    recentGenerations: number; // Last 7 days
    averageFileSize: number;
  }> {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const [stats, recentCount] = await Promise.all([
      prisma.generatedPdf.aggregate({
        where: { userId },
        _count: { id: true },
        _sum: { downloadCount: true, fileSize: true },
        _avg: { fileSize: true },
      }),
      prisma.generatedPdf.count({
        where: {
          userId,
          createdAt: { gte: sevenDaysAgo },
        },
      }),
    ]);

    return {
      totalGenerated: stats._count.id,
      totalDownloads: stats._sum.downloadCount || 0,
      totalFileSize: stats._sum.fileSize || BigInt(0),
      recentGenerations: recentCount,
      averageFileSize: stats._avg.fileSize || 0,
    };
  }

  /**
   * Get PDF generation statistics for a template
   */
  async getStatsByTemplateId(templateId: string): Promise<{
    totalGenerated: number;
    totalDownloads: number;
    averageFileSize: number;
    lastGenerated?: Date;
    uniqueUsers: number;
  }> {
    const [stats, uniqueUsersResult, lastGenerated] = await Promise.all([
      prisma.generatedPdf.aggregate({
        where: { templateId },
        _count: { id: true },
        _sum: { downloadCount: true },
        _avg: { fileSize: true },
      }),
      prisma.generatedPdf.groupBy({
        by: ['userId'],
        where: { templateId },
        _count: { userId: true },
      }),
      prisma.generatedPdf.findFirst({
        where: { templateId },
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true },
      }),
    ]);

    return {
      totalGenerated: stats._count.id,
      totalDownloads: stats._sum.downloadCount || 0,
      averageFileSize: stats._avg.fileSize || 0,
      lastGenerated: lastGenerated?.createdAt,
      uniqueUsers: uniqueUsersResult.length,
    };
  }

  /**
   * Find PDFs that are about to expire
   */
  async findExpiringPdfs(daysUntilExpiry: number = 7): Promise<GeneratedPdf[]> {
    const expiryThreshold = new Date();
    expiryThreshold.setDate(expiryThreshold.getDate() + daysUntilExpiry);

    return prisma.generatedPdf.findMany({
      where: {
        expiresAt: {
          lte: expiryThreshold,
          gt: new Date(),
        },
      },
      include: {
        user: {
          select: { id: true, email: true, name: true },
        },
      },
      orderBy: { expiresAt: 'asc' },
    });
  }

  /**
   * Search PDFs by filename
   */
  async searchByFilename(
    userId: string,
    searchTerm: string,
    options?: {
      page?: number;
      limit?: number;
    }
  ): Promise<PaginatedResult<GeneratedPdf>> {
    return paginate(prisma.generatedPdf, {
      where: {
        userId,
        generatedFilename: {
          contains: searchTerm,
          mode: 'insensitive',
        },
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } },
        ],
      },
      orderBy: { createdAt: 'desc' },
      page: options?.page,
      limit: options?.limit,
    });
  }

  /**
   * Delete expired PDFs (cleanup job)
   */
  async deleteExpiredPdfs(): Promise<{ deletedCount: number; errors: string[] }> {
    const now = new Date();
    const errors: string[] = [];
    let deletedCount = 0;

    try {
      const expiredPdfs = await prisma.generatedPdf.findMany({
        where: {
          expiresAt: { lte: now },
        },
        select: { id: true },
      });

      // Delete in batches to avoid overwhelming the database
      const batchSize = 100;
      for (let i = 0; i < expiredPdfs.length; i += batchSize) {
        const batch = expiredPdfs.slice(i, i + batchSize);
        const ids = batch.map((pdf: any) => pdf.id);

        try {
          const result = await prisma.generatedPdf.deleteMany({
            where: { id: { in: ids } },
          });
          deletedCount += result.count;
        } catch (error) {
          errors.push(`Failed to delete batch ${i / batchSize + 1}: ${(error as Error).message}`);
        }
      }
    } catch (error) {
      errors.push(`Failed to fetch expired PDFs: ${(error as Error).message}`);
    }

    return { deletedCount, errors };
  }

  /**
   * Extend expiry date for a PDF
   */
  async extendExpiry(id: string, additionalDays: number = 30): Promise<GeneratedPdf> {
    const pdf = await this.findById(id);
    if (!pdf) {
      throw new Error(`Generated PDF ${id} not found`);
    }

    const currentExpiry = pdf.expiresAt || new Date();
    const newExpiry = new Date(currentExpiry);
    newExpiry.setDate(newExpiry.getDate() + additionalDays);

    return prisma.generatedPdf.update({
      where: { id },
      data: { expiresAt: newExpiry },
    });
  }

  /**
   * Get generation history for a template
   */
  async getGenerationHistory(
    templateId: string,
    options?: {
      page?: number;
      limit?: number;
      userId?: string;
      startDate?: Date;
      endDate?: Date;
    }
  ): Promise<PaginatedResult<GeneratedPdf>> {
    const whereClause: Prisma.GeneratedPdfWhereInput = {
      templateId,
    };

    if (options?.userId) {
      whereClause.userId = options.userId;
    }

    if (options?.startDate || options?.endDate) {
      whereClause.createdAt = {};
      if (options.startDate) {
        whereClause.createdAt.gte = options.startDate;
      }
      if (options.endDate) {
        whereClause.createdAt.lte = options.endDate;
      }
    }

    return paginate(prisma.generatedPdf, {
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: { id: true, email: true, name: true },
        },
      },
      page: options?.page,
      limit: options?.limit,
    });
  }

  /**
   * Delete PDF record (soft delete by removing from database)
   */
  async delete(id: string): Promise<void> {
    await prisma.generatedPdf.delete({
      where: { id },
    });
  }
}

// Export singleton instance
export const generatedPdfsRepository = new GeneratedPdfsRepository();