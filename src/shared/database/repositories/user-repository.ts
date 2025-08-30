/**
 * User Repository - DynamoDB Operations
 * Handles all user-related database operations
 */

import { PutCommand, GetCommand, QueryCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';
import { dynamoDBClient, TABLE_NAME, createPK, createSK, createGSI1PK, createGSI1SK } from '../config';
import { User, CreateUserInput, UpdateUserInput } from '../entities/user';

export class UserRepository {
  
  /**
   * Create a new user
   */
  async create(input: CreateUserInput): Promise<User> {
    const id = uuidv4();
    const timestamp = new Date().toISOString();
    
    const user: User = {
      PK: createPK('USER', id),
      SK: createSK('PROFILE'),
      GSI1PK: createGSI1PK('EMAIL', input.email),
      GSI1SK: createGSI1SK('USER'),
      id,
      email: input.email,
      passwordHash: input.passwordHash,
      name: input.name,
      emailVerified: false,
      status: 'ACTIVE',
      timezone: input.timezone || 'UTC',
      language: input.language || 'en',
      preferences: input.preferences || {},
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    await dynamoDBClient.send(new PutCommand({
      TableName: TABLE_NAME,
      Item: user,
      ConditionExpression: 'attribute_not_exists(PK)', // Prevent duplicates
    }));

    return user;
  }

  /**
   * Get user by ID
   */
  async findById(id: string): Promise<User | null> {
    const result = await dynamoDBClient.send(new GetCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: createPK('USER', id),
        SK: createSK('PROFILE'),
      },
    }));

    return result.Item as User || null;
  }

  /**
   * Get user by email
   */
  async findByEmail(email: string): Promise<User | null> {
    const result = await dynamoDBClient.send(new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :gsi1pk AND GSI1SK = :gsi1sk',
      ExpressionAttributeValues: {
        ':gsi1pk': createGSI1PK('EMAIL', email),
        ':gsi1sk': createGSI1SK('USER'),
      },
    }));

    return result.Items?.[0] as User || null;
  }

  /**
   * Update user
   */
  async update(id: string, input: UpdateUserInput): Promise<User | null> {
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

    const result = await dynamoDBClient.send(new UpdateCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: createPK('USER', id),
        SK: createSK('PROFILE'),
      },
      UpdateExpression: `SET ${updateExpressions.join(', ')}`,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: 'ALL_NEW',
    }));

    return result.Attributes as User || null;
  }

  /**
   * Delete user (soft delete by changing status)
   */
  async delete(id: string): Promise<boolean> {
    try {
      await this.update(id, { status: 'DELETED' });
      return true;
    } catch (error) {
      console.error('Error deleting user:', error);
      return false;
    }
  }
}
