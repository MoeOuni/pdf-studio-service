/**
 * Uploaded File Repository - DynamoDB Operations
 * Handles all uploaded file-related database operations
 */

import { PutCommand, QueryCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';
import { dynamoDBClient, TABLE_NAME, createPK, createSK, createGSI1PK, createGSI1SK } from '../config';
import { UploadedFile, CreateUploadedFileInput, UpdateUploadedFileInput } from '../entities/uploaded-file';

export class UploadedFileRepository {
  
  /**
   * Create a new uploaded file record
   */
  async create(input: CreateUploadedFileInput): Promise<UploadedFile> {
    const id = uuidv4();
    const timestamp = new Date().toISOString();
    
    const uploadedFile: UploadedFile = {
      PK: createPK('USER', input.userId),
      SK: createSK('FILE', id),
      GSI1PK: createGSI1PK('FILE', id),
      GSI1SK: createGSI1SK(timestamp),
      id,
      userId: input.userId,
      originalFilename: input.originalFilename,
      storedFilename: input.storedFilename,
      filePath: input.filePath,
      s3Bucket: input.s3Bucket,
      s3Key: input.s3Key,
      fileSize: input.fileSize,
      mimeType: input.mimeType,
      fileHash: input.fileHash,
      uploadStatus: input.uploadStatus || 'UPLOADING',
      metadata: input.metadata || {},
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    await dynamoDBClient.send(new PutCommand({
      TableName: TABLE_NAME,
      Item: uploadedFile,
    }));

    return uploadedFile;
  }

  /**
   * Get uploaded file by ID
   */
  async findById(id: string): Promise<UploadedFile | null> {
    const result = await dynamoDBClient.send(new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :gsi1pk',
      ExpressionAttributeValues: {
        ':gsi1pk': createGSI1PK('FILE', id),
      },
    }));

    return result.Items?.[0] as UploadedFile || null;
  }

  /**
   * Get uploaded file by ID and verify user ownership
   */
  async findByUserAndId(userId: string, fileId: string): Promise<UploadedFile | null> {
    const file = await this.findById(fileId);
    if (!file || file.userId !== userId) {
      return null;
    }
    return file;
  }

  /**
   * Get all uploaded files for a user
   */
  async findByUserId(userId: string): Promise<UploadedFile[]> {
    const result = await dynamoDBClient.send(new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      ExpressionAttributeValues: {
        ':pk': createPK('USER', userId),
        ':sk': 'FILE#',
      },
    }));

    return result.Items as UploadedFile[] || [];
  }

  /**
   * Update uploaded file
   */
  async update(id: string, input: UpdateUploadedFileInput): Promise<UploadedFile | null> {
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

    // First get the file to find its PK/SK
    const file = await this.findById(id);
    if (!file) return null;

    const result = await dynamoDBClient.send(new UpdateCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: file.PK,
        SK: file.SK,
      },
      UpdateExpression: `SET ${updateExpressions.join(', ')}`,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: 'ALL_NEW',
    }));

    return result.Attributes as UploadedFile || null;
  }

  /**
   * Delete uploaded file (soft delete by changing status)
   */
  async delete(id: string): Promise<boolean> {
    try {
      await this.update(id, { uploadStatus: 'DELETED' });
      return true;
    } catch (error) {
      console.error('Error deleting uploaded file:', error);
      return false;
    }
  }
}
