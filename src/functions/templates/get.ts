import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { baseMiddleware, loggingMiddleware, authMiddleware } from '@/shared/middleware';
import { createSuccessResponse } from '@/shared/utils/response';

const getTemplateHandler = async (
  _event: APIGatewayProxyEvent,
  _context: Context
): Promise<APIGatewayProxyResult> => {
  // TODO: Implement template retrieval logic
  return createSuccessResponse({ message: 'Template retrieval - Coming soon' });
};

export const main = baseMiddleware(getTemplateHandler)
  .use(authMiddleware)
  .use(loggingMiddleware);