import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { baseMiddleware, loggingMiddleware, authMiddleware } from '@/shared/middleware';
import { createSuccessResponse } from '@/shared/utils/response';

const createFieldHandler = async (
  _event: APIGatewayProxyEvent,
  _context: Context
): Promise<APIGatewayProxyResult> => {
  // TODO: Implement field creation logic
  return createSuccessResponse({ message: 'Field creation - Coming soon' });
};

export const main = baseMiddleware(createFieldHandler)
  .use(authMiddleware)
  .use(loggingMiddleware);