import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { baseMiddleware } from '@/shared/middleware';
import { createSuccessResponse, createValidationErrorResponse, createConflictResponse } from '@/shared/utils/response';
import { validateRequestBody, registerSchema } from '@/shared/utils/validation';
import { UsersRepository } from '@/shared/database/prisma/users-repository';
import { generateTokens } from '@/shared/auth/jwt';

/**
 * User registration endpoint
 */
const registerHandler = async (
  event: APIGatewayProxyEvent,
  _context: Context
): Promise<APIGatewayProxyResult> => {
  // Validate request body
  const validation = validateRequestBody(event.body, registerSchema);
  if (!validation.success) {
    return createValidationErrorResponse(validation.error);
  }

  const { email, password, name } = validation.data;

  try {
    const usersRepo = new UsersRepository();
    
    // Check if user already exists
    const existingUser = await usersRepo.findByEmail(email);
    if (existingUser) {
      return createConflictResponse('User with this email already exists');
    }

    // Create user with profile
    const user = await usersRepo.create({
      email,
      password,
      name,
    });

    // Generate JWT tokens
    const tokens = await generateTokens({
      userId: user.id,
      email: user.email,
      name: user.name,
    });

    // Prepare response data (exclude sensitive information)
    const responseData = {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        emailVerified: user.emailVerified,
        createdAt: user.createdAt,
        profile: user.profile ? {
          company: user.profile.company,
          timezone: user.profile.timezone,
          language: user.profile.language,
          preferences: user.profile.preferences,
        } : null,
      },
      tokens,
    };

    return createSuccessResponse(responseData, 'User registered successfully');
  } catch (error) {
    console.error('Registration error:', error);
    throw error;
  }
};

// Export the handler with middleware
export const main = baseMiddleware(registerHandler);