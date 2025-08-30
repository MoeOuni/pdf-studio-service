import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { baseMiddleware } from '@/shared/middleware';
import { createSuccessResponse, createValidationErrorResponse, createConflictResponse, createInternalServerErrorResponse } from '@/shared/utils/response';
import { cognitoAuth } from '@/shared/auth/cognito-auth';
import { UserRepository } from '@/shared/database/repositories';

/**
 * User registration endpoint using AWS Cognito
 */
const registerHandler = async (
  event: APIGatewayProxyEvent,
  _context: Context
): Promise<APIGatewayProxyResult> => {
  try {
    // Parse request body
    if (!event.body) {
      return createValidationErrorResponse('Request body is required');
    }

    let requestData;
    try {
      requestData = JSON.parse(event.body);
    } catch {
      return createValidationErrorResponse('Invalid JSON in request body');
    }

    const { email, password, name } = requestData;

    // Basic validation
    if (!email || !password) {
      return createValidationErrorResponse('Email and password are required');
    }

    if (password.length < 8) {
      return createValidationErrorResponse('Password must be at least 8 characters long');
    }

    // Register user in Cognito
    const cognitoUser = await cognitoAuth.registerUser({
      email,
      password,
      name,
    });

    // Also store user in our DynamoDB for additional data
    const userRepo = new UserRepository();
    await userRepo.create({
      email,
      passwordHash: 'COGNITO_MANAGED', // Cognito manages passwords
      name,
    });

    return createSuccessResponse({
      user: {
        userId: cognitoUser.userId,
        email: cognitoUser.email,
        name: cognitoUser.name,
        emailVerified: cognitoUser.emailVerified,
        createdAt: cognitoUser.createdAt,
      },
      message: 'User registered successfully',
    });

  } catch (error: any) {
    console.error('Registration error:', error);
    
    if (error.message.includes('already exists')) {
      return createConflictResponse('User with this email already exists');
    }
    
    return createInternalServerErrorResponse(`Registration failed: ${error.message}`);
  }
};

// Export the handler with middleware
export const main = baseMiddleware(registerHandler);