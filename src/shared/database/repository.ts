import { 
  GetCommand, 
  PutCommand, 
  UpdateCommand, 
  DeleteCommand, 
  QueryCommand, 
  ScanCommand,
  BatchGetCommand
} from '@aws-sdk/lib-dynamodb';
import { dynamoDb, TABLE_NAME } from './client';
import { DynamoDBRecord, EntityType } from '@/types';
import { nanoid } from 'nanoid';

/**
 * Base repository class for DynamoDB operations
 */
export class BaseRepository {
  protected tableName = TABLE_NAME;

  /**
   * Create a new record
   */
  async create<T>(
    pk: string,
    sk: string,
    entityType: EntityType,
    data: T,
    gsi1pk?: string,
    gsi1sk?: string,
    gsi2pk?: string,
    gsi2sk?: string,
    ttl?: number
  ): Promise<DynamoDBRecord> {
    const now = new Date().toISOString();
    const record: DynamoDBRecord = {
      PK: pk,
      SK: sk,
      entityType,
      data,
      createdAt: now,
      updatedAt: now,
      ...(gsi1pk && { GSI1PK: gsi1pk }),
      ...(gsi1sk && { GSI1SK: gsi1sk }),
      ...(gsi2pk && { GSI2PK: gsi2pk }),
      ...(gsi2sk && { GSI2SK: gsi2sk }),
      ...(ttl && { ttl }),
    };

    await dynamoDb.send(new PutCommand({
      TableName: this.tableName,
      Item: record,
    }));

    return record;
  }

  /**
   * Get a record by primary key
   */
  async get(pk: string, sk: string): Promise<DynamoDBRecord | null> {
    const result = await dynamoDb.send(new GetCommand({
      TableName: this.tableName,
      Key: { PK: pk, SK: sk },
    }));

    return result.Item as DynamoDBRecord || null;
  }

  /**
   * Update a record
   */
  async update<T>(
    pk: string,
    sk: string,
    updates: Partial<T>,
    updateExpression?: string,
    expressionAttributeNames?: Record<string, string>,
    expressionAttributeValues?: Record<string, any>
  ): Promise<DynamoDBRecord> {
    const now = new Date().toISOString();

    if (!updateExpression) {
      // Build update expression from updates object
      const updateExpressions: string[] = [];
      const attributeNames: Record<string, string> = {};
      const attributeValues: Record<string, any> = {};

      Object.entries(updates).forEach(([key, value], index) => {
        const nameKey = `#attr${index}`;
        const valueKey = `:val${index}`;
        
        updateExpressions.push(`#attr${index} = :val${index}`);
        attributeNames[nameKey] = key;
        attributeValues[valueKey] = value;
      });

      updateExpression = `SET ${updateExpressions.join(', ')}, updatedAt = :updatedAt`;
      attributeValues[':updatedAt'] = now;
      expressionAttributeNames = attributeNames;
      expressionAttributeValues = attributeValues;
    }

    const result = await dynamoDb.send(new UpdateCommand({
      TableName: this.tableName,
      Key: { PK: pk, SK: sk },
      UpdateExpression: updateExpression,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: 'ALL_NEW',
    }));

    return result.Attributes as DynamoDBRecord;
  }

  /**
   * Delete a record
   */
  async delete(pk: string, sk: string): Promise<void> {
    await dynamoDb.send(new DeleteCommand({
      TableName: this.tableName,
      Key: { PK: pk, SK: sk },
    }));
  }

  /**
   * Query records by partition key
   */
  async query(
    pk: string,
    skCondition?: string,
    indexName?: string,
    limit?: number,
    exclusiveStartKey?: Record<string, any>
  ): Promise<{ items: DynamoDBRecord[]; lastEvaluatedKey?: Record<string, any> }> {
    let keyConditionExpression = 'PK = :pk';
    const expressionAttributeValues: Record<string, any> = { ':pk': pk };

    if (skCondition) {
      keyConditionExpression += ` AND ${skCondition}`;
    }

    const result = await dynamoDb.send(new QueryCommand({
      TableName: this.tableName,
      IndexName: indexName,
      KeyConditionExpression: keyConditionExpression,
      ExpressionAttributeValues: expressionAttributeValues,
      ...(limit && { Limit: limit }),
      ...(exclusiveStartKey && { ExclusiveStartKey: exclusiveStartKey }),
    }));

    return {
      items: result.Items as DynamoDBRecord[],
      ...(result.LastEvaluatedKey && { lastEvaluatedKey: result.LastEvaluatedKey }),
    };
  }

  /**
   * Query records using GSI
   */
  async queryGSI(
    gsiName: string,
    gsiPK: string,
    gsiSKCondition?: string,
    limit?: number,
    exclusiveStartKey?: Record<string, any>
  ): Promise<{ items: DynamoDBRecord[]; lastEvaluatedKey?: Record<string, any> }> {
    let keyConditionExpression = `${gsiName}PK = :gsiPK`;
    const expressionAttributeValues: Record<string, any> = { ':gsiPK': gsiPK };

    if (gsiSKCondition) {
      keyConditionExpression += ` AND ${gsiSKCondition}`;
    }

    const result = await dynamoDb.send(new QueryCommand({
      TableName: this.tableName,
      IndexName: gsiName,
      KeyConditionExpression: keyConditionExpression,
      ExpressionAttributeValues: expressionAttributeValues,
      ...(limit && { Limit: limit }),
      ...(exclusiveStartKey && { ExclusiveStartKey: exclusiveStartKey }),
    }));

    return {
      items: result.Items as DynamoDBRecord[],
      ...(result.LastEvaluatedKey && { lastEvaluatedKey: result.LastEvaluatedKey }),
    };
  }

  /**
   * Scan all records (use with caution)
   */
  async scan(
    filterExpression?: string,
    expressionAttributeNames?: Record<string, string>,
    expressionAttributeValues?: Record<string, any>,
    limit?: number,
    exclusiveStartKey?: Record<string, any>
  ): Promise<{ items: DynamoDBRecord[]; lastEvaluatedKey?: Record<string, any> }> {
    const result = await dynamoDb.send(new ScanCommand({
      TableName: this.tableName,
      ...(filterExpression && { FilterExpression: filterExpression }),
      ...(expressionAttributeNames && { ExpressionAttributeNames: expressionAttributeNames }),
      ...(expressionAttributeValues && { ExpressionAttributeValues: expressionAttributeValues }),
      ...(limit && { Limit: limit }),
      ...(exclusiveStartKey && { ExclusiveStartKey: exclusiveStartKey }),
    }));

    return {
      items: result.Items as DynamoDBRecord[],
      ...(result.LastEvaluatedKey && { lastEvaluatedKey: result.LastEvaluatedKey }),
    };
  }

  /**
   * Batch get multiple records
   */
  async batchGet(keys: Array<{ PK: string; SK: string }>): Promise<DynamoDBRecord[]> {
    if (keys.length === 0) return [];

    const result = await dynamoDb.send(new BatchGetCommand({
      RequestItems: {
        [this.tableName]: {
          Keys: keys,
        },
      },
    }));

    return result.Responses?.[this.tableName] as DynamoDBRecord[] || [];
  }

  /**
   * Generate a unique ID
   */
  generateId(): string {
    return nanoid();
  }

  /**
   * Generate timestamp
   */
  generateTimestamp(): string {
    return new Date().toISOString();
  }
}

// Export singleton instance
export const repository = new BaseRepository();