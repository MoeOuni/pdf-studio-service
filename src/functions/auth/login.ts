import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { z } from 'zod';
import { baseMiddleware } from '@/shared/middleware';
import { createSuccessResponse, createValidationErrorResponse, createNotFoundResponse, createUnauthorizedResponse } from '@/shared/utils/response';
import { loginSchema } from '@/shared/utils/validation';
import { UsersRepository } from '@/shared/database';
import { generateTokens } from '@/shared/auth/jwt';
import bcrypt from 'bcryptjs';

/**
 * User login endpoint
 */
const loginHandler = async (
  event: APIGatewayProxyEvent,
  _context: Context
): Promise<APIGatewayProxyResult> => {
  // Validate request body (middy already parsed JSON)
  try {
    const validatedData = loginSchema.parse(event.body);
    const { email, password } = validatedData;

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
      name: user.name || undefined,
    });

    // Prepare response data (exclude sensitive information)
    const responseData = {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        emailVerified: user.emailVerified,
        createdAt: user.createdAt,
        // Note: Profile is separate in Drizzle schema
        profile: null,
      },
      tokens,
    };

    return createSuccessResponse(responseData, 'Login successful');
  } catch (validationError) {
    if (validationError instanceof z.ZodError) {
      const errorMessages = validationError.errors.map(err =>
        `${err.path.join('.')}: ${err.message}`
      ).join(', ');
      return createValidationErrorResponse(errorMessages);
    }
    console.error('Login error:', validationError);
    throw validationError;
  }
};

// Export the handler with middleware
export const main = baseMiddleware(loginHandler);