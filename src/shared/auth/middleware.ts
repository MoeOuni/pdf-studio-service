import { APIGatewayProxyEvent } from 'aws-lambda';
import { verifyAccessToken } from './jwt';
import { createUnauthorizedResponse } from '@/shared/utils/response';

interface TokenPayload {
  userId: string;
  email: string;
  name?: string;
}

/**
 * Extract JWT token from Authorization header
 */
export function extractTokenFromHeader(authHeader?: string): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.substring(7); // Remove 'Bearer ' prefix
}

/**
 * Authenticate user from API Gateway event
 */
export async function authenticateUser(event: APIGatewayProxyEvent): Promise<TokenPayload> {
  const authHeader = event.headers['Authorization'] || event.headers['authorization'];
  const token = extractTokenFromHeader(authHeader);

  if (!token) {
    throw new Error('No token provided');
  }

  try {
    const payload = await verifyAccessToken(token);
    return payload;
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
}

/**
 * Middleware for protected routes
 */
export const authMiddleware = {
  before: async (request: any) => {
    try {
      const user = await authenticateUser(request.event);
      // Add user to context for use in handlers
      request.context.user = user;
    } catch (error) {
      // Return unauthorized response
      request.response = createUnauthorizedResponse(error instanceof Error ? error.message : 'Authentication failed');
      return;
    }
  },
};
