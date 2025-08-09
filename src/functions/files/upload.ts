import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { baseMiddleware, loggingMiddleware, authMiddleware } from '@/shared/middleware';
import { createSuccessResponse } from '@/shared/utils/response';

const uploadFileHandler = async (
  _event: APIGatewayProxyEvent,
  _context: Context
): Promise<APIGatewayProxyResult> => {
  // TODO: Implement file upload logic
  return createSuccessResponse({ message: 'File upload - Coming soon' });
};

export const main = baseMiddleware(uploadFileHandler)
  .use(authMiddleware)
  .use(loggingMiddleware);