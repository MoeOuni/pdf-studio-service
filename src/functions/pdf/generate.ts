import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { baseMiddleware, loggingMiddleware, authMiddleware } from '@/shared/middleware';
import { 
  createSuccessResponse, 
  createValidationErrorResponse 
} from '@/shared/utils/response';
import { validateRequestBody, generatePdfSchema } from '@/shared/utils/validation';

interface AuthenticatedContext extends Context {
  user: {
    userId: string;
    email: string;
  };
}

const generatePdfHandler = async (
  event: APIGatewayProxyEvent,
  _context: AuthenticatedContext
): Promise<APIGatewayProxyResult> => {
  try {
    // Validate request body
    const validation = validateRequestBody(event.body, generatePdfSchema);
    if (!validation.success) {
      return createValidationErrorResponse(validation.error);
    }

    const { templateId, fieldValues, outputFormat } = validation.data;

    // For now, return a simple success response indicating PDF generation would happen
    // TODO: Implement actual PDF generation with template and field values
    const responseData = {
      templateId,
      fieldValues,
      outputFormat,
      message: 'PDF generation endpoint is working. Actual PDF generation to be implemented.',
      generatedAt: new Date().toISOString(),
    };

    return createSuccessResponse(responseData, 'PDF generation request processed successfully');

  } catch (error) {
    console.error('PDF generation error:', error);
    throw error;
  }
};

export const main = baseMiddleware(generatePdfHandler)
  .use(authMiddleware)
  .use(loggingMiddleware);