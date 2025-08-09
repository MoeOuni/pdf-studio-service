import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { baseMiddleware, loggingMiddleware, authMiddleware } from '@/shared/middleware';
import { createSuccessResponse } from '@/shared/utils/response';

const deleteFileHandler = async (
  _event: APIGatewayProxyEvent,
  _context: Context
): Promise<APIGatewayProxyResult> => {
  // TODO: Implement file deletion logic
  return createSuccessResponse({ message: 'File deletion - Coming soon' });
};

export const main = baseMiddleware(deleteFileHandler)
  .use(authMiddleware)
  .use(loggingMiddleware);