import {
  GetCommand,
  PutCommand,
  UpdateCommand,
  DeleteCommand,
  QueryCommand,
  ScanCommand,
  BatchGetCommand,
  BatchWriteCommand,
} from '@aws-sdk/lib-dynamodb';
import { dynamoDb } from './client';
import { BaseEntity } from './ddb/entities/base-entity';
import { nanoid } from 'nanoid';

/**
 * Base repository class for DynamoDB operations
 * Provides common CRUD operations and query patterns for entities
 */
export abstract class BaseRepository<T extends BaseEntity> {
  protected abstract tableName: string;
  protected abstract primaryKey: string;

  /**
   * Generate a unique ID
   */
  protected generateId(): string {
    return nanoid();
  }

  /**
   * Get current timestamp
   */
  protected getTimestamp(): string {
    return new Date().toISOString();
  }

  /**
   * Create a new record
   */
  async create(data: Omit<T, 'createdAt' | 'updatedAt'>): Promise<T> {
    const now = this.getTimestamp();
    const id = this.generateId();

    const record = {
      ...data,
      [this.primaryKey]: id,
      createdAt: now,
      updatedAt: now,
    } as unknown as T;

    await dynamoDb.send(
      new PutCommand({
        TableName: this.tableName,
        Item: record,
        ConditionExpression: `attribute_not_exists(${this.primaryKey})`,
      })
    );

    return record;
  }

  /**
   * Get a record by primary key
   */
  async findById(id: string): Promise<T | null> {
    const result = await dynamoDb.send(
      new GetCommand({
        TableName: this.tableName,
        Key: { [this.primaryKey]: id },
      })
    );

    return (result.Item as T) || null;
  }

  /**
   * Update a record
   */
  async update(id: string, updates: Partial<Omit<T, 'createdAt' | 'updatedAt'>>): Promise<T> {
    const now = this.getTimestamp();

    // Build update expression
    const updateExpressions: string[] = [];
    const expressionAttributeNames: Record<string, string> = {};
    const expressionAttributeValues: Record<string, any> = {};

    Object.entries(updates).forEach(([key, value], index) => {
      if (value !== undefined) {
        const nameKey = `#attr${index}`;
        const valueKey = `:val${index}`;

        updateExpressions.push(`${nameKey} = ${valueKey}`);
        expressionAttributeNames[nameKey] = key;
        expressionAttributeValues[valueKey] = value;
      }
    });

    // Add updatedAt
    updateExpressions.push('#updatedAt = :updatedAt');
    expressionAttributeNames['#updatedAt'] = 'updatedAt';
    expressionAttributeValues[':updatedAt'] = now;

    const result = await dynamoDb.send(
      new UpdateCommand({
        TableName: this.tableName,
        Key: { [this.primaryKey]: id },
        UpdateExpression: `SET ${updateExpressions.join(', ')}`,
        ExpressionAttributeNames: expressionAttributeNames,
        ExpressionAttributeValues: expressionAttributeValues,
        ReturnValues: 'ALL_NEW',
        ConditionExpression: `attribute_exists(${this.primaryKey})`,
      })
    );

    if (!result.Attributes) {
      throw new Error(`Record with ${this.primaryKey} ${id} not found`);
    }

    return result.Attributes as T;
  }

  /**
   * Delete a record
   */
  async delete(id: string): Promise<void> {
    await dynamoDb.send(
      new DeleteCommand({
        TableName: this.tableName,
        Key: { [this.primaryKey]: id },
        ConditionExpression: `attribute_exists(${this.primaryKey})`,
      })
    );
  }

  /**
   * Query records using Global Secondary Index
   */
  async queryByIndex(
    indexName: string,
    partitionKey: string,
    partitionValue: string,
    options?: {
      sortKeyName?: string;
      sortKeyValue?: any;
      sortKeyCondition?: '=' | '<' | '<=' | '>' | '>=' | 'begins_with' | 'between';
      sortKeyValue2?: any; // For 'between' condition
      limit?: number;
      exclusiveStartKey?: Record<string, any>;
      scanIndexForward?: boolean;
      filterExpression?: string;
      expressionAttributeNames?: Record<string, string>;
      expressionAttributeValues?: Record<string, any>;
    }
  ): Promise<{ items: T[]; lastEvaluatedKey?: Record<string, any> }> {
    let keyConditionExpression = `${partitionKey} = :pk`;
    const expressionAttributeValues: Record<string, any> = { ':pk': partitionValue };
    const expressionAttributeNames: Record<string, string> = {};

    // Add sort key condition if provided
    if (options?.sortKeyName && options?.sortKeyValue !== undefined) {
      const sortKeyCondition = options.sortKeyCondition || '=';

      switch (sortKeyCondition) {
        case '=':
          keyConditionExpression += ` AND ${options.sortKeyName} = :sk`;
          expressionAttributeValues[':sk'] = options.sortKeyValue;
          break;
        case '<':
          keyConditionExpression += ` AND ${options.sortKeyName} < :sk`;
          expressionAttributeValues[':sk'] = options.sortKeyValue;
          break;
        case '<=':
          keyConditionExpression += ` AND ${options.sortKeyName} <= :sk`;
          expressionAttributeValues[':sk'] = options.sortKeyValue;
          break;
        case '>':
          keyConditionExpression += ` AND ${options.sortKeyName} > :sk`;
          expressionAttributeValues[':sk'] = options.sortKeyValue;
          break;
        case '>=':
          keyConditionExpression += ` AND ${options.sortKeyName} >= :sk`;
          expressionAttributeValues[':sk'] = options.sortKeyValue;
          break;
        case 'begins_with':
          keyConditionExpression += ` AND begins_with(${options.sortKeyName}, :sk)`;
          expressionAttributeValues[':sk'] = options.sortKeyValue;
          break;
        case 'between':
          if (options.sortKeyValue2 === undefined) {
            throw new Error('sortKeyValue2 is required for between condition');
          }
          keyConditionExpression += ` AND ${options.sortKeyName} BETWEEN :sk1 AND :sk2`;
          expressionAttributeValues[':sk1'] = options.sortKeyValue;
          expressionAttributeValues[':sk2'] = options.sortKeyValue2;
          break;
      }
    }

    // Merge additional expression attribute values and names
    if (options?.expressionAttributeValues) {
      Object.assign(expressionAttributeValues, options.expressionAttributeValues);
    }
    if (options?.expressionAttributeNames) {
      Object.assign(expressionAttributeNames, options.expressionAttributeNames);
    }

    const result = await dynamoDb.send(
      new QueryCommand({
        TableName: this.tableName,
        IndexName: indexName,
        KeyConditionExpression: keyConditionExpression,
        ExpressionAttributeValues: expressionAttributeValues,
        ...(Object.keys(expressionAttributeNames).length > 0 && {
          ExpressionAttributeNames: expressionAttributeNames,
        }),
        ...(options?.filterExpression && { FilterExpression: options.filterExpression }),
        ...(options?.limit && { Limit: options.limit }),
        ...(options?.exclusiveStartKey && { ExclusiveStartKey: options.exclusiveStartKey }),
        ...(options?.scanIndexForward !== undefined && { ScanIndexForward: options.scanIndexForward }),
      })
    );

    return {
      items: (result.Items as T[]) || [],
      ...(result.LastEvaluatedKey && { lastEvaluatedKey: result.LastEvaluatedKey }),
    };
  }

  /**
   * Scan all records with optional filtering
   */

  async scan(options?: {
    filterExpression?: string;
    expressionAttributeNames?: Record<string, string>;
    expressionAttributeValues?: Record<string, any>;
    limit?: number;
    exclusiveStartKey?: Record<string, any>;
  }): Promise<{ items: T[]; lastEvaluatedKey?: Record<string, any> }> {
    const result = await dynamoDb.send(
      new ScanCommand({
        TableName: this.tableName,
        ...(options?.filterExpression && { FilterExpression: options.filterExpression }),
        ...(options?.expressionAttributeNames && {
          ExpressionAttributeNames: options.expressionAttributeNames,
        }),
        ...(options?.expressionAttributeValues && {
          ExpressionAttributeValues: options.expressionAttributeValues,
        }),
        ...(options?.limit && { Limit: options.limit }),
        ...(options?.exclusiveStartKey && { ExclusiveStartKey: options.exclusiveStartKey }),
      })
    );

    return {
      items: (result.Items as T[]) || [],
      ...(result.LastEvaluatedKey && { lastEvaluatedKey: result.LastEvaluatedKey }),
    };
  }

  /**
   * Batch get multiple records
   */
  async batchGet(ids: string[]): Promise<T[]> {
    if (ids.length === 0) return [];

    const keys = ids.map(id => ({ [this.primaryKey]: id }));

    const result = await dynamoDb.send(
      new BatchGetCommand({
        RequestItems: {
          [this.tableName]: {
            Keys: keys,
          },
        },
      })
    );

    return (result.Responses?.[this.tableName] as T[]) || [];
  }

  /**
   * Batch write (put/delete) multiple records
   */
  async batchWrite(operations: Array<{ type: 'put' | 'delete'; item?: T; key?: string }>): Promise<void> {
    if (operations.length === 0) return;

    const writeRequests = operations.map(op => {
      if (op.type === 'put' && op.item) {
        return {
          PutRequest: {
            Item: op.item,
          },
        };
      } else if (op.type === 'delete' && op.key) {
        return {
          DeleteRequest: {
            Key: { [this.primaryKey]: op.key },
          },
        };
      }
      throw new Error('Invalid batch write operation');
    });

    await dynamoDb.send(
      new BatchWriteCommand({
        RequestItems: {
          [this.tableName]: writeRequests,
        },
      })
    );
  }

  /**
   * Check if record exists
   */
  async exists(id: string): Promise<boolean> {
    const result = await dynamoDb.send(
      new GetCommand({
        TableName: this.tableName,
        Key: { [this.primaryKey]: id },
        ProjectionExpression: this.primaryKey,
      })
    );

    return !!result.Item;
  }

  /**
   * Count records (expensive operation, use with caution)
   */
  async count(filterExpression?: string, expressionAttributeValues?: Record<string, any>): Promise<number> {
    const result = await dynamoDb.send(
      new ScanCommand({
        TableName: this.tableName,
        Select: 'COUNT',
        ...(filterExpression && { FilterExpression: filterExpression }),
        ...(expressionAttributeValues && { ExpressionAttributeValues: expressionAttributeValues }),
      })
    );

    return result.Count || 0;
  }
}