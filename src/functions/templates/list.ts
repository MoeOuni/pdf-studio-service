import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { baseMiddleware, loggingMiddleware, authMiddleware } from '@/shared/middleware';
import { createSuccessResponse } from '@/shared/utils/response';

const listTemplatesHandler = async (
  _event: APIGatewayProxyEvent,
  _context: Context
): Promise<APIGatewayProxyResult> => {
  // TODO: Implement template listing logic
  return createSuccessResponse({ templates: [], total: 0 });
};

export const main = baseMiddleware(listTemplatesHandler)
  .use(authMiddleware)
  .use(loggingMiddleware);