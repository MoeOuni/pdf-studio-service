import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { baseMiddleware, loggingMiddleware } from '@/shared/middleware';
import { createSuccessResponse, createValidationErrorResponse } from '@/shared/utils/response';
import { validateRequestBody, loginSchema } from '@/shared/utils/validation';

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

  const { email, password: _password } = validation.data;

  // TODO: Implement actual authentication logic with password validation
  // For now, return mock response
  const mockUser = {
    id: 'user-123',
    email,
    name: 'Test User',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const mockToken = 'mock-jwt-token';

  return createSuccessResponse({
    user: mockUser,
    token: mockToken,
  }, 'Login successful');
};

// Export the handler with middleware
export const main = baseMiddleware(loginHandler)
  .use(loggingMiddleware);