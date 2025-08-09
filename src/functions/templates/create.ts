import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { baseMiddleware, loggingMiddleware, authMiddleware } from '@/shared/middleware';
import { createSuccessResponse } from '@/shared/utils/response';

const createTemplateHandler = async (
  _event: APIGatewayProxyEvent,
  _context: Context
): Promise<APIGatewayProxyResult> => {
  // TODO: Implement template creation logic
  return createSuccessResponse({ message: 'Template creation - Coming soon' });
};

export const main = baseMiddleware(createTemplateHandler)
  .use(authMiddleware)
  .use(loggingMiddleware);