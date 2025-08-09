import { UploadedFile, UploadStatus, Prisma } from '@prisma/client';
import { prisma, paginate, PaginatedResult } from './client';
import crypto from 'crypto';

/**
 * Uploaded Files Repository using Prisma ORM
 * Handles CRUD operations for file uploads and metadata
 */
export class FilesRepository {
  /**
   * Create a new uploaded file record
   */
  async create(fileData: {
    userId: string;
    originalFilename: string;
    storedFilename: string;
    filePath: string;
    s3Bucket: string;
    s3Key: string;
    fileSize: bigint;
    mimeType?: string;
    fileBuffer?: Buffer; // For hash calculation
    metadata?: any;
  }): Promise<UploadedFile> {
    // Calculate file hash if buffer provided
    let fileHash: string | undefined;
    if (fileData.fileBuffer) {
      fileHash = crypto.createHash('sha256').update(fileData.fileBuffer).digest('hex');
    }

    return prisma.uploadedFile.create({
      data: {
        userId: fileData.userId,
        originalFilename: fileData.originalFilename,
        storedFilename: fileData.storedFilename,
        filePath: fileData.filePath,
        s3Bucket: fileData.s3Bucket,
        s3Key: fileData.s3Key,
        fileSize: fileData.fileSize,
        mimeType: fileData.mimeType,
        fileHash,
        uploadStatus: UploadStatus.COMPLETED,
        metadata: fileData.metadata || {},
      },
    });
  }

  /**
   * Find file by ID
   */
  async findById(id: string): Promise<UploadedFile | null> {
    return prisma.uploadedFile.findFirst({
      where: {
        id,
        uploadStatus: { not: UploadStatus.DELETED },
      },
    });
  }

  /**
   * Find files by user ID
   */
  async findByUserId(
    userId: string,
    options?: {
      page?: number;
      limit?: number;
      status?: UploadStatus;
      mimeType?: string;
    }
  ): Promise<PaginatedResult<UploadedFile>> {
    const whereClause: Prisma.UploadedFileWhereInput = {
      userId,
      uploadStatus: options?.status || { not: UploadStatus.DELETED },
    };

    if (options?.mimeType) {
      whereClause.mimeType = { contains: options.mimeType };
    }

    return paginate(prisma.uploadedFile, {
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      page: options?.page,
      limit: options?.limit,
    });
  }

  /**
   * Find file by hash (for deduplication)
   */
  async findByHash(fileHash: string, userId?: string): Promise<UploadedFile | null> {
    const whereClause: Prisma.UploadedFileWhereInput = {
      fileHash,
      uploadStatus: { not: UploadStatus.DELETED },
    };

    if (userId) {
      whereClause.userId = userId;
    }

    return prisma.uploadedFile.findFirst({
      where: whereClause,
    });
  }

  /**
   * Update file status
   */
  async updateStatus(id: string, status: UploadStatus): Promise<UploadedFile> {
    return prisma.uploadedFile.update({
      where: { id },
      data: { uploadStatus: status },
    });
  }

  /**
   * Update file metadata
   */
  async updateMetadata(id: string, metadata: any): Promise<UploadedFile> {
    return prisma.uploadedFile.update({
      where: { id },
      data: { metadata },
    });
  }

  /**
   * Soft delete file
   */
  async delete(id: string): Promise<void> {
    await prisma.uploadedFile.update({
      where: { id },
      data: { uploadStatus: UploadStatus.DELETED },
    });
  }

  /**
   * Get file statistics for a user
   */
  async getUserFileStats(userId: string): Promise<{
    totalFiles: number;
    totalSize: bigint;
    completedFiles: number;
    failedFiles: number;
    recentUploads: number; // Last 7 days
  }> {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const [totalFiles, totalSizeResult, completedFiles, failedFiles, recentUploads] = await Promise.all([
      prisma.uploadedFile.count({
        where: {
          userId,
          uploadStatus: { not: UploadStatus.DELETED },
        },
      }),
      prisma.uploadedFile.aggregate({
        where: {
          userId,
          uploadStatus: UploadStatus.COMPLETED,
        },
        _sum: { fileSize: true },
      }),
      prisma.uploadedFile.count({
        where: {
          userId,
          uploadStatus: UploadStatus.COMPLETED,
        },
      }),
      prisma.uploadedFile.count({
        where: {
          userId,
          uploadStatus: UploadStatus.FAILED,
        },
      }),
      prisma.uploadedFile.count({
        where: {
          userId,
          uploadStatus: { not: UploadStatus.DELETED },
          createdAt: { gte: sevenDaysAgo },
        },
      }),
    ]);

    return {
      totalFiles,
      totalSize: totalSizeResult._sum.fileSize || BigInt(0),
      completedFiles,
      failedFiles,
      recentUploads,
    };
  }

  /**
   * Search files by filename
   */
  async searchByFilename(
    userId: string,
    searchTerm: string,
    options?: {
      page?: number;
      limit?: number;
    }
  ): Promise<PaginatedResult<UploadedFile>> {
    return paginate(prisma.uploadedFile, {
      where: {
        userId,
        uploadStatus: { not: UploadStatus.DELETED },
        originalFilename: {
          contains: searchTerm,
          mode: 'insensitive',
        },
      },
      orderBy: { createdAt: 'desc' },
      page: options?.page,
      limit: options?.limit,
    });
  }

  /**
   * Get duplicate files by hash
   */
  async findDuplicates(userId?: string): Promise<
    Array<{
      fileHash: string;
      count: number;
      files: UploadedFile[];
    }>
  > {
    const whereClause: Prisma.UploadedFileWhereInput = {
      uploadStatus: { not: UploadStatus.DELETED },
      fileHash: { not: null },
    };

    if (userId) {
      whereClause.userId = userId;
    }

    // Get files grouped by hash
    const duplicateHashes = await prisma.uploadedFile.groupBy({
      by: ['fileHash'],
      where: whereClause,
      _count: { fileHash: true },
      having: {
        fileHash: { _count: { gt: 1 } },
      },
    });

    // Get full file details for each duplicate group
    const duplicateGroups = await Promise.all(
      duplicateHashes.map(async (group: any) => {
        const files = await prisma.uploadedFile.findMany({
          where: {
            fileHash: group.fileHash,
            uploadStatus: { not: UploadStatus.DELETED },
            ...(userId && { userId }),
          },
          orderBy: { createdAt: 'asc' },
        });

        return {
          fileHash: group.fileHash!,
          count: group._count.fileHash,
          files,
        };
      })
    );

    return duplicateGroups;
  }

  /**
   * Clean up failed uploads older than specified days
   */
  async cleanupFailedUploads(olderThanDays: number = 7): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    const result = await prisma.uploadedFile.updateMany({
      where: {
        uploadStatus: UploadStatus.FAILED,
        createdAt: { lt: cutoffDate },
      },
      data: {
        uploadStatus: UploadStatus.DELETED,
      },
    });

    return result.count;
  }

  /**
   * Get storage usage by user
   */
  async getStorageUsage(userId?: string): Promise<{
    totalFiles: number;
    totalSize: bigint;
    averageFileSize: number;
    largestFile: UploadedFile | null;
  }> {
    const whereClause: Prisma.UploadedFileWhereInput = {
      uploadStatus: UploadStatus.COMPLETED,
    };

    if (userId) {
      whereClause.userId = userId;
    }

    const [stats, largestFile] = await Promise.all([
      prisma.uploadedFile.aggregate({
        where: whereClause,
        _count: { id: true },
        _sum: { fileSize: true },
        _avg: { fileSize: true },
      }),
      prisma.uploadedFile.findFirst({
        where: whereClause,
        orderBy: { fileSize: 'desc' },
      }),
    ]);

    return {
      totalFiles: stats._count.id,
      totalSize: stats._sum.fileSize || BigInt(0),
      averageFileSize: stats._avg.fileSize || 0,
      largestFile,
    };
  }
}

// Export singleton instance
export const filesRepository = new FilesRepository();