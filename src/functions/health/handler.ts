import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { baseMiddleware } from '@/shared/middleware';
import { createSuccessResponse, createInternalServerErrorResponse } from '@/shared/utils/response';

/**
 * Health check endpoint
 */
const healthHandler = async (
  _event: APIGatewayProxyEvent,
  _context: Context
): Promise<APIGatewayProxyResult> => {
  console.log('Health check handler started');
  
  try {
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

    console.log('Health data prepared:', healthData);
    const response = createSuccessResponse(healthData, 'Service is healthy');
    console.log('Response created successfully');
    return response;
  } catch (error) {
    console.error('Health check error:', error);
    return createInternalServerErrorResponse(
      'Health check failed',
      error
    );
  }
};

// Export the handler with middleware
export const main = baseMiddleware(healthHandler);