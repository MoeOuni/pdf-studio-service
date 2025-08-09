import { UploadedFile, UploadStatus, Prisma } from '@prisma/client';
import { prisma, paginate, PaginatedResult, withTransaction } from './client';

/**
 * Uploaded Files Repository using Prisma ORM
 * Handles CRUD operations for file uploads
 */
export class UploadedFilesRepository {
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
    fileSize: number;
    mimeType?: string;
    uploadStatus?: UploadStatus;
  }): Promise<UploadedFile> {
    return withTransaction(async (tx) => {
      return tx.uploadedFile.create({
        data: {
          ...fileData,
          uploadStatus: fileData.uploadStatus || 'UPLOADING',
        },
      });
    });
  }

  /**
   * Find uploaded file by ID
   */
  async findById(id: string, userId?: string): Promise<UploadedFile | null> {
    const where: Prisma.UploadedFileWhereInput = { id };
    if (userId) {
      where.userId = userId;
    }

    return prisma.uploadedFile.findFirst({
      where,
    });
  }

  /**
   * Find uploaded files by user ID
   */
  async findByUserId(
    userId: string,
    page: number = 1,
    limit: number = 20,
    uploadStatus?: UploadStatus
  ): Promise<PaginatedResult<UploadedFile>> {
    const where: Prisma.UploadedFileWhereInput = { 
      userId,
      ...(uploadStatus && { uploadStatus }),
    };

    return paginate(
      prisma.uploadedFile,
      {
        where,
        page,
        limit,
        orderBy: { createdAt: 'desc' },
      }
    );
  }

  /**
   * Update file upload status
   */
  async updateStatus(
    id: string,
    uploadStatus: UploadStatus,
    userId?: string
  ): Promise<UploadedFile> {
    // If userId provided, ensure ownership
    if (userId) {
      const file = await this.findById(id, userId);
      if (!file) {
        throw new Error('File not found or access denied');
      }
    }

    return withTransaction(async (tx) => {
      return tx.uploadedFile.update({
        where: { id },
        data: { 
          uploadStatus,
          updatedAt: new Date(),
        },
      });
    });
  }

  /**
   * Update file with metadata after successful upload
   */
  async confirmUpload(
    id: string,
    metadata: {
      fileSize?: number;
      fileHash?: string;
    },
    userId?: string
  ): Promise<UploadedFile> {
    // If userId provided, ensure ownership
    if (userId) {
      const file = await this.findById(id, userId);
      if (!file) {
        throw new Error('File not found or access denied');
      }
    }

    return withTransaction(async (tx) => {
      return tx.uploadedFile.update({
        where: { id },
        data: {
          uploadStatus: 'COMPLETED',
          fileSize: metadata.fileSize ? BigInt(metadata.fileSize) : undefined,
          fileHash: metadata.fileHash,
          updatedAt: new Date(),
        },
      });
    });
  }

  /**
   * Delete uploaded file
   */
  async delete(id: string, userId?: string): Promise<UploadedFile> {
    // If userId provided, ensure ownership
    if (userId) {
      const file = await this.findById(id, userId);
      if (!file) {
        throw new Error('File not found or access denied');
      }
    }

    return withTransaction(async (tx) => {
      return tx.uploadedFile.delete({
        where: { id },
      });
    });
  }

  /**
   * Find files by status
   */
  async findByStatus(
    uploadStatus: UploadStatus,
    page: number = 1,
    limit: number = 50
  ): Promise<PaginatedResult<UploadedFile>> {
    return paginate(
      prisma.uploadedFile,
      {
        where: { uploadStatus },
        page,
        limit,
        orderBy: { createdAt: 'desc' },
      }
    );
  }

  /**
   * Clean up old uploading files (older than specified hours)
   */
  async cleanupPendingFiles(olderThanHours: number = 1): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setHours(cutoffDate.getHours() - olderThanHours);

    return withTransaction(async (tx) => {
      const result = await tx.uploadedFile.deleteMany({
        where: {
          uploadStatus: 'UPLOADING',
          createdAt: {
            lt: cutoffDate,
          },
        },
      });

      return result.count;
    });
  }
}
