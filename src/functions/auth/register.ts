import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { z } from 'zod';
import { baseMiddleware } from '@/shared/middleware';
import { createSuccessResponse, createValidationErrorResponse, createConflictResponse } from '@/shared/utils/response';
import { registerSchema } from '@/shared/utils/validation';
import { UsersRepository } from '@/shared/database';
import { generateTokens } from '@/shared/auth/jwt';

/**
 * User registration endpoint
 */
const registerHandler = async (
  event: APIGatewayProxyEvent,
  _context: Context
): Promise<APIGatewayProxyResult> => {
  // Validate request body (middy already parsed JSON)
  try {
    const validatedData = registerSchema.parse(event.body);
    const { email, password, name } = validatedData;

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

    return createSuccessResponse(responseData, 'User registered successfully');
  } catch (validationError) {
    if (validationError instanceof z.ZodError) {
      const errorMessages = validationError.errors.map(err =>
        `${err.path.join('.')}: ${err.message}`
      ).join(', ');
      return createValidationErrorResponse(errorMessages);
    }
    console.error('Registration error:', validationError);
    throw validationError;
  }
};

// Export the handler with middleware
export const main = baseMiddleware(registerHandler);