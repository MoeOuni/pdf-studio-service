import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { baseMiddleware, loggingMiddleware, authMiddleware } from '@/shared/middleware';
import { 
  createSuccessResponse, 
  createErrorResponse, 
  createValidationErrorResponse 
} from '@/shared/utils/response';
import { 
  PDFGenerator, 
  PDFGenerationRequestSchema, 
  PDFGenerationError 
} from '@/shared/pdf';

interface AuthenticatedContext extends Context {
  user: {
    userId: string;
    email: string;
  };
}

const generatePdfHandler = async (
  event: APIGatewayProxyEvent,
  context: AuthenticatedContext
): Promise<APIGatewayProxyResult> => {
  try {
    // Parse and validate request body
    const body = JSON.parse(event.body || '{}');
    
    // Validate request structure
    const validationResult = PDFGenerationRequestSchema.safeParse(body);
    if (!validationResult.success) {
      const errorMessages = validationResult.error.errors.map(err => 
        `${err.path.join('.')}: ${err.message}`
      ).join(', ');
      return createValidationErrorResponse(errorMessages, validationResult.error.errors);
    }

    const { templateId, data, options } = validationResult.data;

    // Create PDF generator instance
    const pdfGenerator = new PDFGenerator();

    // Generate PDF (cast options to bypass type mismatch for now)
    const result = await pdfGenerator.generatePDF({
      templateId,
      data,
      options: options as any, // TODO: Fix type compatibility
    });

    if (!result.success) {
      return createErrorResponse(
        'PDF generation failed',
        'Failed to generate PDF from template',
        500,
        {
          errors: result.errors,
          warnings: result.warnings,
        }
      );
    }

    // Prepare response based on output format
    const outputFormat = options?.outputFormat || 'base64';
    
    let responseData: any = {
      success: true,
      metadata: result.metadata,
    };

    switch (outputFormat) {
      case 'base64':
        responseData.pdfData = result.pdfBase64;
        responseData.downloadUrl = result.downloadUrl;
        break;
      
      case 'url':
        responseData.downloadUrl = result.downloadUrl;
        break;
      
      case 'buffer':
      default:
        // For buffer, we'll return base64 anyway since we can't send binary over HTTP
        responseData.pdfData = result.pdfBuffer?.toString('base64');
        break;
    }

    if (result.warnings && result.warnings.length > 0) {
      responseData.warnings = result.warnings;
    }

    return createSuccessResponse(responseData);

  } catch (error) {
    console.error('PDF generation error:', error);

    if (error instanceof PDFGenerationError) {
      return createErrorResponse(
        error.message,
        `PDF generation failed: ${error.code}`,
        400,
        {
          code: error.code,
          details: error.details,
        }
      );
    }

    if (error instanceof SyntaxError) {
      return createValidationErrorResponse('Invalid JSON in request body', {
        error: error.message,
        type: 'JSON_PARSE_ERROR',
      });
    }

    return createErrorResponse(
      'Internal server error during PDF generation',
      'An unexpected error occurred',
      500,
      {
        timestamp: new Date().toISOString(),
        requestId: context.awsRequestId,
      }
    );
  }
};

export const main = baseMiddleware(generatePdfHandler)
  .use(authMiddleware)
  .use(loggingMiddleware);