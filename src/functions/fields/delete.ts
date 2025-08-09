import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { baseMiddleware, loggingMiddleware, authMiddleware } from '@/shared/middleware';
import { createSuccessResponse } from '@/shared/utils/response';

const deleteTemplateHandler = async (
  _event: APIGatewayProxyEvent,
  _context: Context
): Promise<APIGatewayProxyResult> => {
  // TODO: Implement template deletion logic
  return createSuccessResponse({ message: 'Template deletion - Coming soon' });
};

export const main = baseMiddleware(deleteTemplateHandler)
  .use(authMiddleware)
  .use(loggingMiddleware);