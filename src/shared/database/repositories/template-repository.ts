/**
 * Template Repository - DynamoDB Operations
 * Handles all template-related database operations
 */

import { PutCommand, QueryCommand, UpdateCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';
import { dynamoDBClient, TABLE_NAME, createPK, createSK, createGSI1PK, createGSI1SK } from '../config';
import { Template, CreateTemplateInput, UpdateTemplateInput } from '../entities/template';

export class TemplateRepository {
  
  /**
   * Create a new template
   */
  async create(input: CreateTemplateInput): Promise<Template> {
    const id = uuidv4();
    const timestamp = new Date().toISOString();
    
    const template: Template = {
      PK: createPK('USER', input.userId),
      SK: createSK('TEMPLATE', id),
      GSI1PK: createGSI1PK('TEMPLATE', id),
      GSI1SK: createGSI1SK(input.category, timestamp),
      id,
      userId: input.userId,
      name: input.name,
      description: input.description,
      category: input.category,
      isPublic: input.isPublic || false,
      originalFileId: input.originalFileId,
      dimensions: input.dimensions,
      pageCount: input.pageCount,
      templateData: input.templateData,
      tags: input.tags || [],
      downloadCount: 0,
      version: 1,
      status: 'DRAFT',
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    await dynamoDBClient.send(new PutCommand({
      TableName: TABLE_NAME,
      Item: template,
    }));

    return template;
  }

  /**
   * Get template by ID
   */
  async findById(id: string): Promise<Template | null> {
    const result = await dynamoDBClient.send(new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :gsi1pk',
      ExpressionAttributeValues: {
        ':gsi1pk': createGSI1PK('TEMPLATE', id),
      },
    }));

    return result.Items?.[0] as Template || null;
  }

  /**
   * Get template by ID and verify user ownership
   */
  async findByIdAndUserId(templateId: string, userId: string): Promise<Template | null> {
    const template = await this.findById(templateId);
    if (!template || template.userId !== userId) {
      return null;
    }
    return template;
  }

  /**
   * Check if user has access to template (owns it or it's public)
   */
  async hasAccess(templateId: string, userId: string): Promise<boolean> {
    const template = await this.findById(templateId);
    return template && (template.userId === userId || template.isPublic) || false;
  }

  /**
   * Get all templates for a user
   */
  async findByUserId(userId: string): Promise<Template[]> {
    const result = await dynamoDBClient.send(new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      ExpressionAttributeValues: {
        ':pk': createPK('USER', userId),
        ':sk': 'TEMPLATE#',
      },
    }));

    return result.Items as Template[] || [];
  }

  /**
   * Get public templates
   */
  async getPublicTemplates(): Promise<Template[]> {
    const result = await dynamoDBClient.send(new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :gsi1pk',
      FilterExpression: 'isPublic = :isPublic',
      ExpressionAttributeValues: {
        ':gsi1pk': 'PUBLIC#TEMPLATES',
        ':isPublic': true,
      },
    }));

    return result.Items as Template[] || [];
  }

  /**
   * Search templates by name/description for a user
   */
  async searchTemplates(userId: string, searchTerm: string): Promise<Template[]> {
    const userTemplates = await this.findByUserId(userId);
    return userTemplates.filter(template => 
      template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (template.description && template.description.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }

  /**
   * Find public templates with pagination (compatibility method)
   */
  async findPublicTemplates(): Promise<Template[]> {
    return this.getPublicTemplates();
  }

  /**
   * Update template
   */
  async update(id: string, input: UpdateTemplateInput): Promise<Template | null> {
    const updateExpressions: string[] = [];
    const expressionAttributeNames: Record<string, string> = {};
    const expressionAttributeValues: Record<string, any> = {};

    // Build dynamic update expression
    Object.entries(input).forEach(([key, value]) => {
      if (value !== undefined) {
        updateExpressions.push(`#${key} = :${key}`);
        expressionAttributeNames[`#${key}`] = key;
        expressionAttributeValues[`:${key}`] = value;
      }
    });

    // Always update the updatedAt timestamp and increment version
    updateExpressions.push('#updatedAt = :updatedAt', '#version = #version + :inc');
    expressionAttributeNames['#updatedAt'] = 'updatedAt';
    expressionAttributeNames['#version'] = 'version';
    expressionAttributeValues[':updatedAt'] = new Date().toISOString();
    expressionAttributeValues[':inc'] = 1;

    if (updateExpressions.length === 2) {
      // Only updatedAt and version were added, no actual changes
      const template = await this.findById(id);
      return template;
    }

    // First get the template to find its PK/SK
    const template = await this.findById(id);
    if (!template) return null;

    const result = await dynamoDBClient.send(new UpdateCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: template.PK,
        SK: template.SK,
      },
      UpdateExpression: `SET ${updateExpressions.join(', ')}`,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: 'ALL_NEW',
    }));

    return result.Attributes as Template || null;
  }

  /**
   * Delete template
   */
  async delete(id: string): Promise<boolean> {
    try {
      const template = await this.findById(id);
      if (!template) return false;

      await dynamoDBClient.send(new DeleteCommand({
        TableName: TABLE_NAME,
        Key: {
          PK: template.PK,
          SK: template.SK,
        },
      }));

      return true;
    } catch (error) {
      console.error('Error deleting template:', error);
      return false;
    }
  }
}
