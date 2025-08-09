import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { baseMiddleware, loggingMiddleware } from '@/shared/middleware';
import { createSuccessResponse } from '@/shared/utils/response';

/**
 * Health check endpoint
 */
const healthHandler = async (
  _event: APIGatewayProxyEvent,
  _context: Context
): Promise<APIGatewayProxyResult> => {
  const healthData = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'PDF Studio API',
    version: '1.0.0',
    stage: process.env['STAGE'] || 'dev',
    region: process.env['REGION'] || 'us-east-1',
    environment: {
      dynamoTable: process.env['DYNAMODB_TABLE'],
      s3Bucket: process.env['S3_BUCKET'],
    },
  };

  return createSuccessResponse(healthData, 'Service is healthy');
};

// Export the handler with middleware
export const main = baseMiddleware(healthHandler)
  .use(loggingMiddleware);