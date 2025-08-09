import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { baseMiddleware } from '@/shared/middleware';
import { createSuccessResponse, createValidationErrorResponse, createNotFoundResponse, createUnauthorizedResponse } from '@/shared/utils/response';
import { validateRequestBody, loginSchema } from '@/shared/utils/validation';
import { UsersRepository } from '@/shared/database/prisma/users-repository';
import { generateTokens } from '@/shared/auth/jwt';
import bcrypt from 'bcrypt';

/**
 * User login endpoint
 */
const loginHandler = async (
  event: APIGatewayProxyEvent,
  _context: Context
): Promise<APIGatewayProxyResult> => {
  // Validate request body
  const validation = validateRequestBody(event.body, loginSchema);
  if (!validation.success) {
    return createValidationErrorResponse(validation.error);
  }

  const { email, password } = validation.data;

  try {
    const usersRepo = new UsersRepository();
    
    // Find user by email
    const user = await usersRepo.findByEmail(email);
    if (!user) {
      return createNotFoundResponse('User');
    }

    // Check if user is active
    if (user.status !== 'ACTIVE') {
      return createUnauthorizedResponse('Account is not active');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      return createUnauthorizedResponse('Invalid credentials');
    }

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

    return createSuccessResponse(responseData, 'Login successful');
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
};

// Export the handler with middleware
export const main = baseMiddleware(loginHandler);