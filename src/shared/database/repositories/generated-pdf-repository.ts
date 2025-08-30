/**
 * Generated PDF Repository - DynamoDB Operations
 * Handles all generated PDF-related database operations
 */

import { PutCommand, QueryCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';
import { dynamoDBClient, TABLE_NAME, createPK, createSK, createGSI1PK, createGSI1SK } from '../config';
import { GeneratedPdf, CreateGeneratedPdfInput, UpdateGeneratedPdfInput } from '../entities/generated-pdf';

export class GeneratedPdfRepository {
  
  /**
   * Create a new generated PDF record
   */
  async create(input: CreateGeneratedPdfInput): Promise<GeneratedPdf> {
    const id = uuidv4();
    const timestamp = new Date().toISOString();
    
    const generatedPdf: GeneratedPdf = {
      PK: createPK('USER', input.userId),
      SK: createSK('PDF', id),
      GSI1PK: createGSI1PK('PDF', id),
      GSI1SK: createGSI1SK(input.templateId, timestamp),
      id,
      userId: input.userId,
      templateId: input.templateId,
      s3Bucket: input.s3Bucket,
      s3Key: input.s3Key,
      fileName: input.fileName,
      fileSize: 0, // Will be updated when PDF generation is complete
      status: 'GENERATING',
      fieldValues: input.fieldValues,
      metadata: input.metadata || {},
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    await dynamoDBClient.send(new PutCommand({
      TableName: TABLE_NAME,
      Item: generatedPdf,
    }));

    return generatedPdf;
  }

  /**
   * Get generated PDF by ID
   */
  async findById(id: string): Promise<GeneratedPdf | null> {
    const result = await dynamoDBClient.send(new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :gsi1pk',
      ExpressionAttributeValues: {
        ':gsi1pk': createGSI1PK('PDF', id),
      },
    }));

    return result.Items?.[0] as GeneratedPdf || null;
  }

  /**
   * Get generated PDF by ID and verify user ownership
   */
  async findByUserAndId(userId: string, pdfId: string): Promise<GeneratedPdf | null> {
    const pdf = await this.findById(pdfId);
    if (!pdf || pdf.userId !== userId) {
      return null;
    }
    return pdf;
  }

  /**
   * Get all generated PDFs for a user
   */
  async findByUserId(userId: string): Promise<GeneratedPdf[]> {
    const result = await dynamoDBClient.send(new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      ExpressionAttributeValues: {
        ':pk': createPK('USER', userId),
        ':sk': 'PDF#',
      },
    }));

    return result.Items as GeneratedPdf[] || [];
  }

  /**
   * Get all generated PDFs for a template
   */
  async findByTemplateId(templateId: string): Promise<GeneratedPdf[]> {
    const result = await dynamoDBClient.send(new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1SK = :gsi1sk',
      ExpressionAttributeValues: {
        ':gsi1sk': createGSI1SK(templateId),
      },
    }));

    return result.Items as GeneratedPdf[] || [];
  }

  /**
   * Update generated PDF
   */
  async update(id: string, input: UpdateGeneratedPdfInput): Promise<GeneratedPdf | null> {
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

    // First get the PDF to find its PK/SK
    const pdf = await this.findById(id);
    if (!pdf) return null;

    const result = await dynamoDBClient.send(new UpdateCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: pdf.PK,
        SK: pdf.SK,
      },
      UpdateExpression: `SET ${updateExpressions.join(', ')}`,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: 'ALL_NEW',
    }));

    return result.Attributes as GeneratedPdf || null;
  }

  /**
   * Delete generated PDF (soft delete by changing status)
   */
  async delete(id: string): Promise<boolean> {
    try {
      await this.update(id, { status: 'DELETED' });
      return true;
    } catch (error) {
      console.error('Error deleting generated PDF:', error);
      return false;
    }
  }
}
