import { BaseRepository } from '../repository';
import { TemplateEntity } from './entities/template-entity';

/**
 * Templates Repository for DynamoDB
 * Handles CRUD operations for PDF templates
 */
export class TemplatesRepository extends BaseRepository<TemplateEntity> {
  protected tableName = `pdf-studio-templates-${process.env['STAGE'] || 'dev'}`;
  protected primaryKey = 'templateId';

  /**
   * Create a new template
   */
  override async create(templateData: Omit<TemplateEntity, 'templateId' | 'createdAt' | 'updatedAt' | 'version' | 'status'>): Promise<TemplateEntity> {
    const data = {
      ...templateData,
      version: 1,
      status: 'active' as const,
      scale: templateData.scale || 1,
      metadata: templateData.metadata || {},
    } as Omit<TemplateEntity, 'createdAt' | 'updatedAt'>;

    return super.create(data);
  }

  /**
   * Find templates by user ID
   */
  async findByUserId(
    userId: string,
    options?: {
      status?: TemplateEntity['status'];
      limit?: number;
      exclusiveStartKey?: Record<string, any>;
    }
  ): Promise<{ items: TemplateEntity[]; lastEvaluatedKey?: Record<string, any> }> {
    const queryOptions: any = {
      limit: options?.limit,
      exclusiveStartKey: options?.exclusiveStartKey,
      scanIndexForward: false, // Most recent first
    };

    // Add status filter if provided
    if (options?.status) {
      queryOptions.filterExpression = '#status = :status';
      queryOptions.expressionAttributeNames = { '#status': 'status' };
      queryOptions.expressionAttributeValues = { ':status': options.status };
    } else {
      // Default: exclude deleted templates
      queryOptions.filterExpression = '#status <> :deletedStatus';
      queryOptions.expressionAttributeNames = { '#status': 'status' };
      queryOptions.expressionAttributeValues = { ':deletedStatus': 'deleted' };
    }

    return this.queryByIndex('UserIdIndex', 'userId', userId, queryOptions);
  }

  /**
   * Find active templates by user ID
   */
  async findActiveByUserId(userId: string, limit?: number): Promise<TemplateEntity[]> {
    const result = await this.findByUserId(userId, { status: 'active', limit });
    return result.items;
  }

  /**
   * Update template
   */
  override async update(templateId: string, updates: Partial<Omit<TemplateEntity, 'templateId' | 'userId' | 'createdAt' | 'updatedAt'>>): Promise<TemplateEntity> {
    // Increment version if significant changes are made
    const significantFields = ['name', 'dimensions', 'scale', 'pdfFileUrl'];
    const hasSignificantChanges = Object.keys(updates).some(key => significantFields.includes(key));
    
    if (hasSignificantChanges) {
      const currentTemplate = await this.findById(templateId);
      if (currentTemplate) {
        updates.version = (currentTemplate.version || 1) + 1;
      }
    }

    return super.update(templateId, updates);
  }

  /**
   * Soft delete template (set status to deleted)
   */
  async softDelete(templateId: string): Promise<TemplateEntity> {
    return this.update(templateId, { status: 'deleted' });
  }

  /**
   * Archive template
   */
  async archive(templateId: string): Promise<TemplateEntity> {
    return this.update(templateId, { status: 'archived' });
  }

  /**
   * Restore template (set status to active)
   */
  async restore(templateId: string): Promise<TemplateEntity> {
    return this.update(templateId, { status: 'active' });
  }

  /**
   * Find templates by status
   */
  async findByStatus(
    status: TemplateEntity['status'],
    options?: {
      limit?: number;
      exclusiveStartKey?: Record<string, any>;
    }
  ): Promise<{ items: TemplateEntity[]; lastEvaluatedKey?: Record<string, any> }> {
    return this.queryByIndex('StatusIndex', 'status', status, {
      limit: options?.limit,
      exclusiveStartKey: options?.exclusiveStartKey,
      scanIndexForward: false, // Most recent first
    });
  }

  /**
   * Search templates by name
   */
  async searchByName(userId: string, searchTerm: string, limit?: number): Promise<TemplateEntity[]> {
    const userTemplates = await this.findByUserId(userId, { limit: limit || 100 });
    
    return userTemplates.items.filter(template =>
      template.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
      template.status !== 'deleted'
    );
  }

  /**
   * Get template statistics for a user
   */
  async getUserTemplateStats(userId: string): Promise<{
    total: number;
    active: number;
    archived: number;
    recentlyCreated: number; // Last 7 days
  }> {
    const allTemplates = await this.findByUserId(userId);
    const templates = allTemplates.items;
    
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const stats = templates.reduce(
      (acc, template) => {
        if (template.status !== 'deleted') {
          acc.total++;
          
          if (template.status === 'active') acc.active++;
          if (template.status === 'archived') acc.archived++;
          
          if (new Date(template.createdAt) >= sevenDaysAgo) {
            acc.recentlyCreated++;
          }
        }
        return acc;
      },
      { total: 0, active: 0, archived: 0, recentlyCreated: 0 }
    );

    return stats;
  }

  /**
   * Duplicate a template
   */
  async duplicate(templateId: string, newName?: string): Promise<TemplateEntity> {
    const originalTemplate = await this.findById(templateId);
    if (!originalTemplate) {
      throw new Error(`Template ${templateId} not found`);
    }

    const duplicatedTemplate = {
      ...originalTemplate,
      name: newName || `${originalTemplate.name} (Copy)`,
    };

    // Remove the original templateId and timestamps to create a new record
    delete (duplicatedTemplate as any).templateId;
    delete (duplicatedTemplate as any).createdAt;
    delete (duplicatedTemplate as any).updatedAt;

    return this.create(duplicatedTemplate);
  }

  /**
   * Check if template name is unique for a user
   */
  async isNameUnique(userId: string, name: string, excludeTemplateId?: string): Promise<boolean> {
    const userTemplates = await this.findByUserId(userId);
    
    const conflictingTemplates = userTemplates.items.filter(template =>
      template.name.toLowerCase() === name.toLowerCase() &&
      template.status !== 'deleted' &&
      template.templateId !== excludeTemplateId
    );
    
    return conflictingTemplates.length === 0;
  }

  /**
   * Get templates by file ID (for tracking which templates use a specific file)
   */
  async findByOriginalFileId(originalFileId: string): Promise<TemplateEntity[]> {
    const result = await this.scan({
      filterExpression: 'originalFileId = :fileId AND #status <> :deletedStatus',
      expressionAttributeNames: { '#status': 'status' },
      expressionAttributeValues: {
        ':fileId': originalFileId,
        ':deletedStatus': 'deleted',
      },
    });

    return result.items;
  }

  /**
   * Update template metadata
   */
  async updateMetadata(templateId: string, metadata: Record<string, any>): Promise<TemplateEntity> {
    const currentTemplate = await this.findById(templateId);
    if (!currentTemplate) {
      throw new Error(`Template ${templateId} not found`);
    }

    const updatedMetadata = {
      ...currentTemplate.metadata,
      ...metadata,
    };

    return this.update(templateId, { metadata: updatedMetadata });
  }

  /**
   * Get recent templates for a user
   */
  async getRecentTemplates(userId: string, limit: number = 10): Promise<TemplateEntity[]> {
    const result = await this.findByUserId(userId, { status: 'active', limit });
    return result.items;
  }

  /**
   * Bulk update template status
   */
  async bulkUpdateStatus(templateIds: string[], status: TemplateEntity['status']): Promise<TemplateEntity[]> {
    const updatePromises = templateIds.map(id => this.update(id, { status }));
    return Promise.all(updatePromises);
  }

  /**
   * Get template count by status
   */
  async countByStatus(status: TemplateEntity['status']): Promise<number> {
    return this.count('#status = :status', { ':status': status });
  }

  /**
   * Clean up deleted templates older than specified days
   */
  async cleanupDeletedTemplates(olderThanDays: number = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
    
    const deletedTemplates = await this.findByStatus('deleted');
    const templatesToDelete = deletedTemplates.items.filter(
      template => new Date(template.updatedAt) < cutoffDate
    );

    // Delete templates in batches
    const deletePromises = templatesToDelete.map(template => this.delete(template.templateId));
    await Promise.all(deletePromises);

    return templatesToDelete.length;
  }
}

// Export singleton instance
export const templatesRepository = new TemplatesRepository();