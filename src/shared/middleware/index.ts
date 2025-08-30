import middy from '@middy/core';
import jsonBodyParser from '@middy/http-json-body-parser';
import httpErrorHandler from '@middy/http-error-handler';
import cors from '@middy/http-cors';
import securityHeaders from '@middy/http-security-headers';
import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { createInternalServerErrorResponse } from '@/shared/utils/response';

/**
 * Base middleware configuration for all Lambda functions
 */
export const baseMiddleware = (handler: any) => {
  return middy(handler)
    .use(jsonBodyParser())
    .use(cors({
      origin: '*', // Allow all origins for now to test
      credentials: true,
    }))
    .use(securityHeaders())
    .use(httpErrorHandler())
    .use({
      onError: async (request) => {
        console.error('Lambda Error:', {
          error: request.error,
          event: request.event,
          context: request.context,
        });

        // Return a standardized error response
        request.response = createInternalServerErrorResponse(
          request.error?.message || 'Internal server error',
          request.error
        );
      },
    });
};

/**
 * Authentication middleware using AWS Cognito
 */
export const authMiddleware = {
  before: async (request: middy.Request<APIGatewayProxyEvent, APIGatewayProxyResult, Error, Context>) => {
    try {
      const authHeader = request.event.headers['authorization'] || request.event.headers['Authorization'];

      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw new Error('Authorization header is required');
      }

      const token = authHeader.substring(7); // Remove 'Bearer ' prefix

      // Import Cognito auth service
      const { CognitoAuthService } = await import('@/shared/auth/cognito-auth');
      const cognitoAuth = new CognitoAuthService();

      // Verify the Cognito access token
      const user = await cognitoAuth.verifyToken(token);

      // Add user to context for use in handlers
      (request.context as any).user = user;
    } catch (error) {
      console.error('Authentication error:', error);
      throw new Error('Invalid or expired token');
    }
  },
};

/**
 * Validation middleware factory
 */
export const validationMiddleware = (schema: any, target: 'body' | 'pathParameters' | 'queryStringParameters' = 'body') => ({
  before: async (request: middy.Request<APIGatewayProxyEvent, APIGatewayProxyResult, Error, Context>) => {
    try {
      let dataToValidate;

      switch (target) {
        case 'body':
          dataToValidate = request.event.body;
          break;
        case 'pathParameters':
          dataToValidate = request.event.pathParameters;
          break;
        case 'queryStringParameters':
          dataToValidate = request.event.queryStringParameters;
          break;
        default:
          dataToValidate = request.event.body;
      }

      const validatedData = schema.parse(dataToValidate);

      // Attach validated data to the event
      (request.event as any).validatedData = validatedData;
    } catch (error: any) {
      throw new Error(`Validation failed: ${error.message}`);
    }
  },
});

/**
 * Logging middleware
 */
export const loggingMiddleware = {
  before: async (request: middy.Request<APIGatewayProxyEvent, APIGatewayProxyResult, Error, Context>) => {
    console.log('Request:', {
      httpMethod: request.event.httpMethod,
      path: request.event.path,
      pathParameters: request.event.pathParameters,
      queryStringParameters: request.event.queryStringParameters,
      headers: request.event.headers,
      // Don't log the body in production for security
      ...(process.env['STAGE'] === 'dev' && { body: request.event.body }),
    });
  },
  after: async (request: middy.Request<APIGatewayProxyEvent, APIGatewayProxyResult, Error, Context>) => {
    console.log('Response:', {
      statusCode: request.response?.statusCode,
      // Don't log response body in production
      ...(process.env['STAGE'] === 'dev' && { body: request.response?.body }),
    });
  },
};