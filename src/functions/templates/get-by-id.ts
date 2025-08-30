import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { baseMiddleware } from '@/shared/middleware';
import { 
  createSuccessResponse, 
  createNotFoundResponse, 
  createInternalServerErrorResponse 
} from '@/shared/utils/response';
import { TemplatesRepository } from '@/shared/database';

/**
 * Get template by ID endpoint
 */
const getTemplateByIdHandler = async (
  event: APIGatewayProxyEvent,
  _context: Context
): Promise<APIGatewayProxyResult> => {
  try {
    console.log('Get template by ID handler started');
    
    const templateId = event.pathParameters?.['templateId'];
    if (!templateId) {
      return createNotFoundResponse('Template ID is required');
    }

    console.log('Getting template by ID:', templateId);
    
    const templatesRepo = new TemplatesRepository();
    const template = await templatesRepo.findById(templateId);
    
    if (!template) {
      console.log('Template not found:', templateId);
      return createNotFoundResponse('Template not found');
    }

    console.log('Template found:', { id: template.id, name: template.name });
    
    return createSuccessResponse(template, 'Template retrieved successfully');
  } catch (error) {
    console.error('Get template by ID error:', error);
    return createInternalServerErrorResponse(
      'Failed to get template',
      error
    );
  }
};

// Export the handler with middleware
export const main = baseMiddleware(getTemplateByIdHandler);
