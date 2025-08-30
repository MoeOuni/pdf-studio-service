/**
 * Field Repository - DynamoDB Operations
 * Handles all field-related database operations
 */

import { PutCommand, QueryCommand, UpdateCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';
import { dynamoDBClient, TABLE_NAME, createPK, createSK, createGSI1PK, createGSI1SK } from '../config';
import { Field, CreateFieldInput, UpdateFieldInput } from '../entities/field';

export class FieldRepository {
  
  /**
   * Create a new field
   */
  async create(input: CreateFieldInput): Promise<Field> {
    const id = uuidv4();
    const timestamp = new Date().toISOString();
    
    const field: Field = {
      PK: createPK('TEMPLATE', input.templateId),
      SK: createSK('FIELD', id),
      GSI1PK: createGSI1PK('FIELD', id),
      GSI1SK: createGSI1SK(input.type, timestamp),
      id,
      templateId: input.templateId,
      type: input.type,
      name: input.name,
      label: input.label,
      required: input.required || false,
      position: input.position,
      properties: input.properties || {},
      validation: input.validation,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    await dynamoDBClient.send(new PutCommand({
      TableName: TABLE_NAME,
      Item: field,
    }));

    return field;
  }

  /**
   * Get field by ID
   */
  async findById(id: string): Promise<Field | null> {
    const result = await dynamoDBClient.send(new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :gsi1pk',
      ExpressionAttributeValues: {
        ':gsi1pk': createGSI1PK('FIELD', id),
      },
    }));

    return result.Items?.[0] as Field || null;
  }

  /**
   * Get all fields for a template
   */
  async findByTemplateId(templateId: string): Promise<Field[]> {
    const result = await dynamoDBClient.send(new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      ExpressionAttributeValues: {
        ':pk': createPK('TEMPLATE', templateId),
        ':sk': 'FIELD#',
      },
    }));

    return result.Items as Field[] || [];
  }

  /**
   * Get fields for a template filtered by page
   */
  async findByTemplateIdAndPage(templateId: string, page: number): Promise<Field[]> {
    const allFields = await this.findByTemplateId(templateId);
    return allFields.filter(field => field.position.page === page);
  }

  /**
   * Get field by ID and verify user has access via template ownership
   */
  async findByIdAndUserId(fieldId: string, userId: string): Promise<Field | null> {
    const field = await this.findById(fieldId);
    if (!field) return null;

    // Import here to avoid circular dependency
    const { TemplateRepository } = await import('./template-repository');
    const templateRepo = new TemplateRepository();
    const template = await templateRepo.findByIdAndUserId(field.templateId, userId);
    
    if (!template) return null;
    return field;
  }

  /**
   * Update field
   */
  async update(id: string, input: UpdateFieldInput): Promise<Field | null> {
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

    // Always update the updatedAt timestamp
    updateExpressions.push('#updatedAt = :updatedAt');
    expressionAttributeNames['#updatedAt'] = 'updatedAt';
    expressionAttributeValues[':updatedAt'] = new Date().toISOString();

    if (updateExpressions.length === 1) {
      // Only updatedAt was added, no actual changes
      return this.findById(id);
    }

    // First get the field to find its PK/SK
    const field = await this.findById(id);
    if (!field) return null;

    const result = await dynamoDBClient.send(new UpdateCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: field.PK,
        SK: field.SK,
      },
      UpdateExpression: `SET ${updateExpressions.join(', ')}`,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: 'ALL_NEW',
    }));

    return result.Attributes as Field || null;
  }

  /**
   * Delete field
   */
  async delete(id: string): Promise<boolean> {
    try {
      const field = await this.findById(id);
      if (!field) return false;

      await dynamoDBClient.send(new DeleteCommand({
        TableName: TABLE_NAME,
        Key: {
          PK: field.PK,
          SK: field.SK,
        },
      }));

      return true;
    } catch (error) {
      console.error('Error deleting field:', error);
      return false;
    }
  }

  /**
   * Delete all fields for a template
   */
  async deleteByTemplateId(templateId: string): Promise<number> {
    const fields = await this.findByTemplateId(templateId);
    let deletedCount = 0;

    for (const field of fields) {
      const success = await this.delete(field.id);
      if (success) deletedCount++;
    }

    return deletedCount;
  }
}
