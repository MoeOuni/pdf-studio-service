import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { baseMiddleware, loggingMiddleware, authMiddleware } from '@/shared/middleware';
import { createSuccessResponse } from '@/shared/utils/response';

const getFileHandler = async (
  _event: APIGatewayProxyEvent,
  _context: Context
): Promise<APIGatewayProxyResult> => {
  // TODO: Implement file retrieval logic
  return createSuccessResponse({ message: 'File retrieval - Coming soon' });
};

export const main = baseMiddleware(getFileHandler)
  .use(authMiddleware)
  .use(loggingMiddleware);