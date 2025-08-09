import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { 
  DynamoDBDocumentClient, 
  PutCommand, 
  GetCommand, 
  UpdateCommand, 
  DeleteCommand, 
  QueryCommand, 
  ScanCommand 
} from '@aws-sdk/lib-dynamodb';

// Initialize DynamoDB client
const dynamoDBClient = new DynamoDBClient({
  region: process.env['AWS_REGION'] || 'us-east-1',
});

export const docClient = DynamoDBDocumentClient.from(dynamoDBClient);

// Table names from environment variables
export const TEMPLATES_TABLE = process.env['TEMPLATES_TABLE'] || 'pdf-studio-templates';
export const FIELDS_TABLE = process.env['FIELDS_TABLE'] || 'pdf-studio-fields';

/**
 * Generic DynamoDB operations
 */
export class DynamoDBService {
  /**
   * Put item in DynamoDB table
   */
  static async putItem(tableName: string, item: Record<string, any>): Promise<void> {
    const command = new PutCommand({
      TableName: tableName,
      Item: item,
    });
    
    await docClient.send(command);
  }

  /**
   * Get item from DynamoDB table
   */
  static async getItem(
    tableName: string, 
    key: Record<string, any>
  ): Promise<Record<string, any> | null> {
    const command = new GetCommand({
      TableName: tableName,
      Key: key,
    });
    
    const result = await docClient.send(command);
    return result.Item || null;
  }

  /**
   * Update item in DynamoDB table
   */
  static async updateItem(
    tableName: string,
    key: Record<string, any>,
    updateExpression: string,
    expressionAttributeNames?: Record<string, string>,
    expressionAttributeValues?: Record<string, any>
  ): Promise<Record<string, any> | null> {
    const command = new UpdateCommand({
      TableName: tableName,
      Key: key,
      UpdateExpression: updateExpression,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: 'ALL_NEW',
    });
    
    const result = await docClient.send(command);
    return result.Attributes || null;
  }

  /**
   * Delete item from DynamoDB table
   */
  static async deleteItem(
    tableName: string, 
    key: Record<string, any>
  ): Promise<Record<string, any> | null> {
    const command = new DeleteCommand({
      TableName: tableName,
      Key: key,
      ReturnValues: 'ALL_OLD',
    });
    
    const result = await docClient.send(command);
    return result.Attributes || null;
  }

  /**
   * Query items from DynamoDB table
   */
  static async queryItems(
    tableName: string,
    keyConditionExpression: string,
    expressionAttributeNames?: Record<string, string>,
    expressionAttributeValues?: Record<string, any>,
    indexName?: string,
    limit?: number,
    exclusiveStartKey?: Record<string, any>
  ): Promise<{
    items: Record<string, any>[];
    lastEvaluatedKey?: Record<string, any>;
    count: number;
  }> {
    const command = new QueryCommand({
      TableName: tableName,
      KeyConditionExpression: keyConditionExpression,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      IndexName: indexName,
      Limit: limit,
      ExclusiveStartKey: exclusiveStartKey,
    });
    
    const result = await docClient.send(command);
    
    return {
      items: result.Items || [],
      lastEvaluatedKey: result.LastEvaluatedKey,
      count: result.Count || 0,
    };
  }

  /**
   * Scan items from DynamoDB table (use sparingly)
   */
  static async scanItems(
    tableName: string,
    filterExpression?: string,
    expressionAttributeNames?: Record<string, string>,
    expressionAttributeValues?: Record<string, any>,
    limit?: number,
    exclusiveStartKey?: Record<string, any>
  ): Promise<{
    items: Record<string, any>[];
    lastEvaluatedKey?: Record<string, any>;
    count: number;
  }> {
    const command = new ScanCommand({
      TableName: tableName,
      FilterExpression: filterExpression,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      Limit: limit,
      ExclusiveStartKey: exclusiveStartKey,
    });
    
    const result = await docClient.send(command);
    
    return {
      items: result.Items || [],
      lastEvaluatedKey: result.LastEvaluatedKey,
      count: result.Count || 0,
    };
  }
}
