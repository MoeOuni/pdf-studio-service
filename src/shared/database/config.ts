/**
 * DynamoDB Configuration and Base Client
 * Shared DynamoDB client and table configuration
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

// Initialize DynamoDB client
const client = new DynamoDBClient({
  region: process.env['AWS_REGION'] || 'us-east-1',
});

// Create document client for easier operations
export const dynamoDBClient = DynamoDBDocumentClient.from(client);

// Table configuration
export const TABLE_NAME = process.env['MAIN_TABLE'] || 'pdf-studio-dev';
export const FILES_BUCKET = process.env['FILES_BUCKET'] || 'pdf-studio-files-dev';

// Common DynamoDB patterns
export const createPK = (type: string, id: string) => `${type}#${id}`;
export const createSK = (type: string, id?: string) => id ? `${type}#${id}` : type;
export const createGSI1PK = (type: string, id: string) => `${type}#${id}`;
export const createGSI1SK = (type: string, timestamp?: string) => timestamp ? `${type}#${timestamp}` : type;
