import { db } from './client';
import { generatedPdfs, GeneratedPdf, NewGeneratedPdf } from './schema';
import { eq, and, desc, count } from 'drizzle-orm';

export class GeneratedPdfsRepository {
  /**
   * Create a new generated PDF record
   */
  async create(data: NewGeneratedPdf): Promise<GeneratedPdf> {
    const [result] = await db.insert(generatedPdfs).values(data).returning();
    if (!result) {
      throw new Error('Failed to create generated PDF record');
    }
    return result;
  }

  /**
   * Find generated PDF by ID
   */
  async findById(id: string): Promise<GeneratedPdf | null> {
    const [result] = await db
      .select()
      .from(generatedPdfs)
      .where(eq(generatedPdfs.id, id))
      .limit(1);
    
    return result || null;
  }

  /**
   * Find generated PDF by user ID and PDF ID
   */
  async findByUserAndId(userId: string, pdfId: string): Promise<GeneratedPdf | null> {
    const [result] = await db
      .select()
      .from(generatedPdfs)
      .where(and(
        eq(generatedPdfs.userId, userId),
        eq(generatedPdfs.id, pdfId)
      ))
      .limit(1);
    
    return result || null;
  }

  /**
   * Find generated PDFs by user ID
   */
  async findByUserId(
    userId: string, 
    options?: {
      limit?: number;
      offset?: number;
    }
  ): Promise<GeneratedPdf[]> {
    const baseQuery = db
      .select()
      .from(generatedPdfs)
      .where(eq(generatedPdfs.userId, userId))
      .orderBy(desc(generatedPdfs.createdAt));

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
   * Find generated PDFs by template ID
   */
  async findByTemplateId(templateId: string): Promise<GeneratedPdf[]> {
    return await db
      .select()
      .from(generatedPdfs)
      .where(eq(generatedPdfs.templateId, templateId))
      .orderBy(desc(generatedPdfs.createdAt));
  }

  /**
   * Update generated PDF
   */
  async update(id: string, data: Partial<Omit<GeneratedPdf, 'id' | 'createdAt'>>): Promise<GeneratedPdf | null> {
    const [result] = await db
      .update(generatedPdfs)
      .set({ 
        ...data,
        updatedAt: new Date()
      })
      .where(eq(generatedPdfs.id, id))
      .returning();

    return result || null;
  }

  /**
   * Delete generated PDF by ID
   */
  async delete(id: string): Promise<boolean> {
    const result = await db
      .delete(generatedPdfs)
      .where(eq(generatedPdfs.id, id));

    return (result.rowCount || 0) > 0;
  }

  /**
   * Delete generated PDF by user ID and PDF ID
   */
  async deleteByUserAndId(userId: string, pdfId: string): Promise<boolean> {
    const result = await db
      .delete(generatedPdfs)
      .where(and(
        eq(generatedPdfs.userId, userId),
        eq(generatedPdfs.id, pdfId)
      ));

    return (result.rowCount || 0) > 0;
  }

  /**
   * Count generated PDFs by user ID
   */
  async countByUserId(userId: string): Promise<number> {
    const [result] = await db
      .select({ count: count() })
      .from(generatedPdfs)
      .where(eq(generatedPdfs.userId, userId));

    return result?.count || 0;
  }

  /**
   * Count generated PDFs by template ID
   */
  async countByTemplateId(templateId: string): Promise<number> {
    const [result] = await db
      .select({ count: count() })
      .from(generatedPdfs)
      .where(eq(generatedPdfs.templateId, templateId));

    return result?.count || 0;
  }
}
