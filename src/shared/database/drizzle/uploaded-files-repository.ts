import { db } from './client';
import { uploadedFiles, UploadedFile, NewUploadedFile, UploadStatus } from './schema';
import { eq, and, desc, count, sql } from 'drizzle-orm';

export class UploadedFilesRepository {
  /**
   * Create a new uploaded file record
   */
  async create(data: NewUploadedFile): Promise<UploadedFile> {
    const [result] = await db.insert(uploadedFiles).values(data).returning();
    if (!result) {
      throw new Error('Failed to create uploaded file');
    }
    return result;
  }

  /**
   * Find uploaded file by ID
   */
  async findById(id: string): Promise<UploadedFile | null> {
    const [result] = await db
      .select()
      .from(uploadedFiles)
      .where(eq(uploadedFiles.id, id))
      .limit(1);
    
    return result || null;
  }

  /**
   * Find uploaded file by user ID and file ID
   */
  async findByUserAndId(userId: string, fileId: string): Promise<UploadedFile | null> {
    const [result] = await db
      .select()
      .from(uploadedFiles)
      .where(and(
        eq(uploadedFiles.userId, userId),
        eq(uploadedFiles.id, fileId)
      ))
      .limit(1);
    
    return result || null;
  }

  /**
   * Find uploaded files by user ID
   */
  async findByUserId(
    userId: string, 
    options?: {
      status?: UploadStatus;
      limit?: number;
      offset?: number;
    }
  ): Promise<UploadedFile[]> {
    const conditions = [eq(uploadedFiles.userId, userId)];
    
    if (options?.status) {
      conditions.push(eq(uploadedFiles.uploadStatus, options.status));
    }

    const baseQuery = db
      .select()
      .from(uploadedFiles)
      .where(and(...conditions))
      .orderBy(desc(uploadedFiles.createdAt));

    if (options?.limit && options?.offset) {
      return await baseQuery.limit(options.limit).offset(options.offset);
    } else if (options?.limit) {
      return await baseQuery.limit(options.limit);
    } else if (options?.offset) {
      return await baseQuery.offset(options.offset);
    } else {
      return await baseQuery;
    }
  }

  /**
   * Update uploaded file status
   */
  async updateStatus(id: string, status: UploadStatus): Promise<UploadedFile | null> {
    const [result] = await db
      .update(uploadedFiles)
      .set({ 
        uploadStatus: status,
        updatedAt: new Date()
      })
      .where(eq(uploadedFiles.id, id))
      .returning();

    return result || null;
  }

  /**
   * Update uploaded file
   */
  async update(id: string, data: Partial<Omit<UploadedFile, 'id' | 'createdAt'>>): Promise<UploadedFile | null> {
    const [result] = await db
      .update(uploadedFiles)
      .set({ 
        ...data,
        updatedAt: new Date()
      })
      .where(eq(uploadedFiles.id, id))
      .returning();

    return result || null;
  }

  /**
   * Delete uploaded file by ID
   */
  async delete(id: string): Promise<boolean> {
    const result = await db
      .delete(uploadedFiles)
      .where(eq(uploadedFiles.id, id));

    return (result.rowCount || 0) > 0;
  }

  /**
   * Delete uploaded file by user ID and file ID
   */
  async deleteByUserAndId(userId: string, fileId: string): Promise<boolean> {
    const result = await db
      .delete(uploadedFiles)
      .where(and(
        eq(uploadedFiles.userId, userId),
        eq(uploadedFiles.id, fileId)
      ));

    return (result.rowCount || 0) > 0;
  }

  /**
   * Count uploaded files by user ID
   */
  async countByUserId(userId: string, status?: UploadStatus): Promise<number> {
    const conditions = [eq(uploadedFiles.userId, userId)];
    
    if (status) {
      conditions.push(eq(uploadedFiles.uploadStatus, status));
    }

    const [result] = await db
      .select({ count: count() })
      .from(uploadedFiles)
      .where(and(...conditions));

    return result?.count || 0;
  }

  /**
   * Get user storage usage in bytes
   */
  async getUserStorageUsage(userId: string): Promise<number> {
    const [result] = await db
      .select({
        totalSize: sql<number>`COALESCE(SUM(${uploadedFiles.fileSize}), 0)`
      })
      .from(uploadedFiles)
      .where(and(
        eq(uploadedFiles.userId, userId),
        eq(uploadedFiles.uploadStatus, 'COMPLETED')
      ));

    return result?.totalSize || 0;
  }
}
