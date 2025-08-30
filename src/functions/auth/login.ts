import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { z } from 'zod';
import { baseMiddleware } from '@/shared/middleware';
import { createSuccessResponse, createValidationErrorResponse, createUnauthorizedResponse, createInternalServerErrorResponse } from '@/shared/utils/response';
import { loginSchema } from '@/shared/utils/validation';
import { UsersRepository } from '@/shared/database';
import { CognitoAuthService } from '@/shared/auth/cognito-auth';

/**
 * User login endpoint
 */
const loginHandler = async (
  event: APIGatewayProxyEvent,
  _context: Context
): Promise<APIGatewayProxyResult> => {
  // Validate request body
  console.log('Login handler started');
  console.log('Event body:', event.body);
  
  try {
    const validatedData = loginSchema.parse(event.body);
    console.log('Validation successful:', { email: validatedData.email });
    const { email, password } = validatedData;

    console.log('Creating CognitoAuthService...');
    const cognitoAuth = new CognitoAuthService();
    
    // Authenticate user with Cognito
    console.log('Authenticating user with Cognito:', email);
    const authResult = await cognitoAuth.loginUser({ email, password });
    
    console.log('Cognito authentication successful');

    console.log('Creating UsersRepository...');
    const usersRepo = new UsersRepository();
    
    // Find user in DynamoDB for additional metadata
    console.log('Finding user metadata in DynamoDB:', email);
    const user = await usersRepo.findByEmail(email);
    if (!user) {
      console.log('User metadata not found in DynamoDB');
      return createUnauthorizedResponse('User not found');
    }
    console.log('User metadata found:', { id: user.id, email: user.email, status: user.status });

    // Prepare response data (exclude sensitive information)
    const responseData = {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        emailVerified: user.emailVerified,
        createdAt: user.createdAt,
        profile: null,
      },
      tokens: {
        accessToken: authResult.accessToken,
        refreshToken: authResult.refreshToken,
        idToken: authResult.idToken,
      },
    };

    return createSuccessResponse(responseData, 'Login successful');
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessages = error.errors.map(err =>
        `${err.path.join('.')}: ${err.message}`
      ).join(', ');
      return createValidationErrorResponse(errorMessages);
    }
    
    // Handle Cognito authentication errors
    if (error instanceof Error) {
      console.error('Login error:', error.message);
      if (error.message.includes('NotAuthorizedException') || 
          error.message.includes('UserNotConfirmedException') ||
          error.message.includes('password')) {
        return createUnauthorizedResponse('Invalid credentials');
      }
    }
    
    console.error('Login error:', error);
    return createInternalServerErrorResponse(
      'Login failed',
      error
    );
  }
};

// Export the handler with middleware
export const main = baseMiddleware(loginHandler);