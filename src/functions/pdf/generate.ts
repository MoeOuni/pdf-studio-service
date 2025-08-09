import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { baseMiddleware, loggingMiddleware, authMiddleware } from '@/shared/middleware';
import { createSuccessResponse } from '@/shared/utils/response';

const generatePdfHandler = async (
  _event: APIGatewayProxyEvent,
  _context: Context
): Promise<APIGatewayProxyResult> => {
  // TODO: Implement PDF generation logic
  return createSuccessResponse({ message: 'PDF generation - Coming soon' });
};

export const main = baseMiddleware(generatePdfHandler)
  .use(authMiddleware)
  .use(loggingMiddleware);