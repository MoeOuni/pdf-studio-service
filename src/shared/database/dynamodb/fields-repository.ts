import { v4 as uuidv4 } from 'uuid';
import { DynamoDBService, FIELDS_TABLE } from './client';
import {
  TemplateField,
  CreateFieldInput,
  UpdateFieldInput,
  PaginationInput,
  PaginatedResponse,
} from './types';

/**
 * Fields Repository using DynamoDB
 * Handles CRUD operations for template fields
 */
export class FieldsRepository {
  /**
   * Create a new field
   */
  async create(input: CreateFieldInput): Promise<TemplateField> {
    const now = new Date().toISOString();
    const field: TemplateField = {
      id: uuidv4(),
      templateId: input.templateId,
      userId: input.userId,
      name: input.name,
      type: input.type,
      page: input.page,
      position: input.position,
      size: input.size,
      style: input.style,
      validation: input.validation,
      defaultValue: input.defaultValue,
      placeholder: input.placeholder,
      isRequired: input.isRequired || false,
      isReadonly: input.isReadonly || false,
      order: input.order || 0,
      createdAt: now,
      updatedAt: now,
    };

    await DynamoDBService.putItem(FIELDS_TABLE, field);
    return field;
  }

  /**
   * Get field by ID
   */
  async findById(id: string): Promise<TemplateField | null> {
    const result = await DynamoDBService.getItem(FIELDS_TABLE, { id });
    return result as TemplateField | null;
  }

  /**
   * Get field by ID with user ownership check
   */
  async findByIdAndUserId(id: string, userId: string): Promise<TemplateField | null> {
    const field = await this.findById(id);
    if (!field || field.userId !== userId) {
      return null;
    }
    return field;
  }

  /**
   * Get fields by template ID with pagination
   */
  async findByTemplateId(
    templateId: string,
    pagination: PaginationInput = {}
  ): Promise<PaginatedResponse<TemplateField>> {
    const limit = Math.min(pagination.limit || 50, 100);
    
    const result = await DynamoDBService.queryItems(
      FIELDS_TABLE,
      '#templateId = :templateId',
      {
        '#templateId': 'templateId',
      },
      {
        ':templateId': templateId,
      },
      'GSI1', // GSI on templateId
      limit,
      pagination.lastEvaluatedKey
    );

    // Sort by order and then by creation time
    const sortedItems = (result.items as TemplateField[]).sort((a, b) => {
      if (a.order !== b.order) {
        return a.order - b.order;
      }
      return a.createdAt.localeCompare(b.createdAt);
    });

    return {
      items: sortedItems,
      lastEvaluatedKey: result.lastEvaluatedKey,
      hasMore: !!result.lastEvaluatedKey,
      count: result.count,
    };
  }

  /**
   * Get fields by user ID with pagination
   */
  async findByUserId(
    userId: string,
    pagination: PaginationInput = {}
  ): Promise<PaginatedResponse<TemplateField>> {
    const limit = Math.min(pagination.limit || 50, 100);
    
    const result = await DynamoDBService.queryItems(
      FIELDS_TABLE,
      '#userId = :userId',
      {
        '#userId': 'userId',
      },
      {
        ':userId': userId,
      },
      'GSI2', // GSI on userId
      limit,
      pagination.lastEvaluatedKey
    );

    return {
      items: result.items as TemplateField[],
      lastEvaluatedKey: result.lastEvaluatedKey,
      hasMore: !!result.lastEvaluatedKey,
      count: result.count,
    };
  }

  /**
   * Get fields by template ID and page number
   */
  async findByTemplateIdAndPage(
    templateId: string,
    page: number
  ): Promise<TemplateField[]> {
    const result = await DynamoDBService.scanItems(
      FIELDS_TABLE,
      '#templateId = :templateId AND #page = :page',
      {
        '#templateId': 'templateId',
        '#page': 'page',
      },
      {
        ':templateId': templateId,
        ':page': page,
      }
    );

    // Sort by order
    return (result.items as TemplateField[]).sort((a, b) => a.order - b.order);
  }

  /**
   * Update field
   */
  async update(
    id: string,
    userId: string,
    input: UpdateFieldInput
  ): Promise<TemplateField | null> {
    // Verify ownership
    const existingField = await this.findByIdAndUserId(id, userId);
    if (!existingField) {
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

    if (input.type !== undefined) {
      updateExpressions.push('#type = :type');
      expressionAttributeNames['#type'] = 'type';
      expressionAttributeValues[':type'] = input.type;
    }

    if (input.page !== undefined) {
      updateExpressions.push('#page = :page');
      expressionAttributeNames['#page'] = 'page';
      expressionAttributeValues[':page'] = input.page;
    }

    if (input.position !== undefined) {
      updateExpressions.push('#position = :position');
      expressionAttributeNames['#position'] = 'position';
      expressionAttributeValues[':position'] = input.position;
    }

    if (input.size !== undefined) {
      updateExpressions.push('#size = :size');
      expressionAttributeNames['#size'] = 'size';
      expressionAttributeValues[':size'] = input.size;
    }

    if (input.style !== undefined) {
      // Merge with existing style
      const mergedStyle = { ...existingField.style, ...input.style };
      updateExpressions.push('#style = :style');
      expressionAttributeNames['#style'] = 'style';
      expressionAttributeValues[':style'] = mergedStyle;
    }

    if (input.validation !== undefined) {
      updateExpressions.push('#validation = :validation');
      expressionAttributeNames['#validation'] = 'validation';
      expressionAttributeValues[':validation'] = input.validation;
    }

    if (input.defaultValue !== undefined) {
      updateExpressions.push('#defaultValue = :defaultValue');
      expressionAttributeNames['#defaultValue'] = 'defaultValue';
      expressionAttributeValues[':defaultValue'] = input.defaultValue;
    }

    if (input.placeholder !== undefined) {
      updateExpressions.push('#placeholder = :placeholder');
      expressionAttributeNames['#placeholder'] = 'placeholder';
      expressionAttributeValues[':placeholder'] = input.placeholder;
    }

    if (input.isRequired !== undefined) {
      updateExpressions.push('#isRequired = :isRequired');
      expressionAttributeNames['#isRequired'] = 'isRequired';
      expressionAttributeValues[':isRequired'] = input.isRequired;
    }

    if (input.isReadonly !== undefined) {
      updateExpressions.push('#isReadonly = :isReadonly');
      expressionAttributeNames['#isReadonly'] = 'isReadonly';
      expressionAttributeValues[':isReadonly'] = input.isReadonly;
    }

    if (input.order !== undefined) {
      updateExpressions.push('#order = :order');
      expressionAttributeNames['#order'] = 'order';
      expressionAttributeValues[':order'] = input.order;
    }

    // Always update the updatedAt timestamp
    updateExpressions.push('#updatedAt = :updatedAt');
    expressionAttributeNames['#updatedAt'] = 'updatedAt';
    expressionAttributeValues[':updatedAt'] = new Date().toISOString();

    if (updateExpressions.length === 1) {
      // Only updatedAt was added, no actual changes
      return existingField;
    }

    const updateExpression = `SET ${updateExpressions.join(', ')}`;

    const result = await DynamoDBService.updateItem(
      FIELDS_TABLE,
      { id },
      updateExpression,
      expressionAttributeNames,
      expressionAttributeValues
    );

    return result as TemplateField | null;
  }

  /**
   * Delete field
   */
  async delete(id: string, userId: string): Promise<TemplateField | null> {
    // Verify ownership
    const existingField = await this.findByIdAndUserId(id, userId);
    if (!existingField) {
      return null;
    }

    const result = await DynamoDBService.deleteItem(FIELDS_TABLE, { id });
    return result as TemplateField | null;
  }

  /**
   * Delete all fields for a template
   */
  async deleteByTemplateId(templateId: string, userId: string): Promise<number> {
    const fields = await this.findByTemplateId(templateId);
    let deletedCount = 0;

    // Delete fields in batches
    for (const field of fields.items) {
      if (field.userId === userId) {
        await DynamoDBService.deleteItem(FIELDS_TABLE, { id: field.id });
        deletedCount++;
      }
    }

    return deletedCount;
  }

  /**
   * Bulk update field order
   */
  async updateFieldsOrder(
    fieldOrders: Array<{ id: string; order: number }>,
    userId: string
  ): Promise<TemplateField[]> {
    const updatedFields: TemplateField[] = [];

    for (const fieldOrder of fieldOrders) {
      const updated = await this.update(fieldOrder.id, userId, {
        order: fieldOrder.order,
      });
      
      if (updated) {
        updatedFields.push(updated);
      }
    }

    return updatedFields;
  }

  /**
   * Count fields by template ID
   */
  async countByTemplateId(templateId: string): Promise<number> {
    const result = await DynamoDBService.queryItems(
      FIELDS_TABLE,
      '#templateId = :templateId',
      {
        '#templateId': 'templateId',
      },
      {
        ':templateId': templateId,
      },
      'GSI1'
    );

    return result.count;
  }
}
