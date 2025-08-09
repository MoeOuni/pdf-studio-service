import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

// Create DynamoDB client
const client = new DynamoDBClient({
  region: process.env['REGION'] || 'us-east-1',
  ...(process.env['STAGE'] === 'dev' && {
    endpoint: 'http://localhost:8000',
  }),
});

// Create DynamoDB Document client for easier operations
export const dynamoDb = DynamoDBDocumentClient.from(client, {
  marshallOptions: {
    convertEmptyValues: false,
    removeUndefinedValues: true,
    convertClassInstanceToMap: false,
  },
  unmarshallOptions: {
    wrapNumbers: false,
  },
});

export const TABLE_NAME = process.env['DYNAMODB_TABLE'] || 'pdf-studio-api-dev';