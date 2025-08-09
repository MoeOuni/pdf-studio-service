import { v4 as uuidv4 } from 'uuid';
import { DynamoDBService, TEMPLATES_TABLE } from './client';
import {
  Template,
  CreateTemplateInput,
  UpdateTemplateInput,
  PaginationInput,
  PaginatedResponse,
} from './types';

/**
 * Templates Repository using DynamoDB
 * Handles CRUD operations for PDF templates
 */
export class TemplatesRepository {
  /**
   * Create a new template
   */
  async create(input: CreateTemplateInput): Promise<Template> {
    const now = new Date().toISOString();
    const template: Template = {
      id: uuidv4(),
      userId: input.userId,
      name: input.name,
      description: input.description,
      originalFileId: input.originalFileId,
      dimensions: input.dimensions,
      pageCount: input.pageCount,
      thumbnailUrl: input.thumbnailUrl,
      isPublic: input.isPublic || false,
      tags: input.tags || [],
      metadata: {
        fileSize: 0, // Will be updated when file metadata is available
        mimeType: 'application/pdf',
        ...input.metadata,
      },
      createdAt: now,
      updatedAt: now,
    };

    await DynamoDBService.putItem(TEMPLATES_TABLE, template);
    return template;
  }

  /**
   * Get template by ID
   */
  async findById(id: string): Promise<Template | null> {
    const result = await DynamoDBService.getItem(TEMPLATES_TABLE, { id });
    return result as Template | null;
  }

  /**
   * Get template by ID with user ownership check
   */
  async findByIdAndUserId(id: string, userId: string): Promise<Template | null> {
    const template = await this.findById(id);
    if (!template || template.userId !== userId) {
      return null;
    }
    return template;
  }

  /**
   * Get templates by user ID with pagination
   */
  async findByUserId(
    userId: string,
    pagination: PaginationInput = {}
  ): Promise<PaginatedResponse<Template>> {
    const limit = Math.min(pagination.limit || 20, 100);
    
    const result = await DynamoDBService.queryItems(
      TEMPLATES_TABLE,
      '#userId = :userId',
      {
        '#userId': 'userId',
      },
      {
        ':userId': userId,
      },
      'GSI1', // GSI on userId
      limit,
      pagination.lastEvaluatedKey
    );

    return {
      items: result.items as Template[],
      lastEvaluatedKey: result.lastEvaluatedKey,
      hasMore: !!result.lastEvaluatedKey,
      count: result.count,
    };
  }

  /**
   * Get public templates with pagination
   */
  async findPublicTemplates(
    pagination: PaginationInput = {}
  ): Promise<PaginatedResponse<Template>> {
    const limit = Math.min(pagination.limit || 20, 100);
    
    const result = await DynamoDBService.scanItems(
      TEMPLATES_TABLE,
      '#isPublic = :isPublic',
      {
        '#isPublic': 'isPublic',
      },
      {
        ':isPublic': true,
      },
      limit,
      pagination.lastEvaluatedKey
    );

    return {
      items: result.items as Template[],
      lastEvaluatedKey: result.lastEvaluatedKey,
      hasMore: !!result.lastEvaluatedKey,
      count: result.count,
    };
  }

  /**
   * Search templates by name or tags
   */
  async searchTemplates(
    userId: string,
    searchTerm: string,
    pagination: PaginationInput = {}
  ): Promise<PaginatedResponse<Template>> {
    const limit = Math.min(pagination.limit || 20, 100);
    
    // Note: This is a simplified search using scan.
    // For production, consider using OpenSearch or CloudSearch for better performance
    const result = await DynamoDBService.scanItems(
      TEMPLATES_TABLE,
      '#userId = :userId AND (contains(#name, :searchTerm) OR contains(#tags, :searchTerm))',
      {
        '#userId': 'userId',
        '#name': 'name',
        '#tags': 'tags',
      },
      {
        ':userId': userId,
        ':searchTerm': searchTerm,
      },
      limit,
      pagination.lastEvaluatedKey
    );

    return {
      items: result.items as Template[],
      lastEvaluatedKey: result.lastEvaluatedKey,
      hasMore: !!result.lastEvaluatedKey,
      count: result.count,
    };
  }

  /**
   * Update template
   */
  async update(
    id: string,
    userId: string,
    input: UpdateTemplateInput
  ): Promise<Template | null> {
    // Verify ownership
    const existingTemplate = await this.findByIdAndUserId(id, userId);
    if (!existingTemplate) {
      return null;
    }

    const updateExpressions: string[] = [];
    const expressionAttributeNames: Record<string, string> = {};
    const expressionAttributeValues: Record<string, any> = {};

    // Build dynamic update expression
    if (input.name !== undefined) {
      updateExpressions.push('#name = :name');
      expressionAttributeNames['#name'] = 'name';
      expressionAttributeValues[':name'] = input.name;
    }

    if (input.description !== undefined) {
      updateExpressions.push('#description = :description');
      expressionAttributeNames['#description'] = 'description';
      expressionAttributeValues[':description'] = input.description;
    }

    if (input.isPublic !== undefined) {
      updateExpressions.push('#isPublic = :isPublic');
      expressionAttributeNames['#isPublic'] = 'isPublic';
      expressionAttributeValues[':isPublic'] = input.isPublic;
    }

    if (input.tags !== undefined) {
      updateExpressions.push('#tags = :tags');
      expressionAttributeNames['#tags'] = 'tags';
      expressionAttributeValues[':tags'] = input.tags;
    }

    if (input.thumbnailUrl !== undefined) {
      updateExpressions.push('#thumbnailUrl = :thumbnailUrl');
      expressionAttributeNames['#thumbnailUrl'] = 'thumbnailUrl';
      expressionAttributeValues[':thumbnailUrl'] = input.thumbnailUrl;
    }

    if (input.metadata !== undefined) {
      updateExpressions.push('#metadata = :metadata');
      expressionAttributeNames['#metadata'] = 'metadata';
      expressionAttributeValues[':metadata'] = input.metadata;
    }

    // Always update the updatedAt timestamp
    updateExpressions.push('#updatedAt = :updatedAt');
    expressionAttributeNames['#updatedAt'] = 'updatedAt';
    expressionAttributeValues[':updatedAt'] = new Date().toISOString();

    if (updateExpressions.length === 1) {
      // Only updatedAt was added, no actual changes
      return existingTemplate;
    }

    const updateExpression = `SET ${updateExpressions.join(', ')}`;

    const result = await DynamoDBService.updateItem(
      TEMPLATES_TABLE,
      { id },
      updateExpression,
      expressionAttributeNames,
      expressionAttributeValues
    );

    return result as Template | null;
  }

  /**
   * Delete template
   */
  async delete(id: string, userId: string): Promise<Template | null> {
    // Verify ownership
    const existingTemplate = await this.findByIdAndUserId(id, userId);
    if (!existingTemplate) {
      return null;
    }

    const result = await DynamoDBService.deleteItem(TEMPLATES_TABLE, { id });
    return result as Template | null;
  }

  /**
   * Check if template exists and user has access
   */
  async hasAccess(id: string, userId: string): Promise<boolean> {
    const template = await this.findById(id);
    if (!template) {
      return false;
    }
    
    // User has access if they own the template or it's public
    return template.userId === userId || template.isPublic;
  }

  /**
   * Get templates by file ID
   */
  async findByFileId(originalFileId: string): Promise<Template[]> {
    const result = await DynamoDBService.scanItems(
      TEMPLATES_TABLE,
      '#originalFileId = :originalFileId',
      {
        '#originalFileId': 'originalFileId',
      },
      {
        ':originalFileId': originalFileId,
      }
    );

    return result.items as Template[];
  }
}
