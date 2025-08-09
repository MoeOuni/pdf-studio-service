import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { baseMiddleware, loggingMiddleware } from '@/shared/middleware';
import { createSuccessResponse, createValidationErrorResponse } from '@/shared/utils/response';
import { validateRequestBody, registerSchema } from '@/shared/utils/validation';

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

  const { email, password: _password, name } = validation.data;

  // TODO: Implement actual registration logic with password hashing
  // For now, return mock response
  const mockUser = {
    id: 'user-456',
    email,
    name: name || 'New User',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const mockToken = 'mock-jwt-token';

  return createSuccessResponse({
    user: mockUser,
    token: mockToken,
  }, 'Registration successful');
};

// Export the handler with middleware
export const main = baseMiddleware(registerHandler)
  .use(loggingMiddleware);