import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { baseMiddleware } from '@/shared/middleware';
import { authMiddleware } from '@/shared/middleware';
import { createSuccessResponse, createNotFoundResponse } from '@/shared/utils/response';
import { TemplatesRepository, FieldsRepository } from '@/shared/database';

/**
 * Delete a template and all its fields
 */
const deleteTemplateHandler = async (
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  // Get authenticated user from context (added by authMiddleware)
  const user = (context as any).user;

  // Get template ID from path
  const templateId = event.pathParameters?.['templateId'];
  if (!templateId) {
    return createNotFoundResponse('Template');
  }

  try {
    const templatesRepo = new TemplatesRepository();
    const fieldsRepo = new FieldsRepository();
    
    // Verify template exists and user has access
    const template = await templatesRepo.findByIdAndUserId(templateId, user.userId);
    if (!template) {
      return createNotFoundResponse('Template');
    }
    
    // First, delete all fields associated with the template
    const deletedFieldsCount = await fieldsRepo.deleteByTemplateId(templateId);
    
    // Then delete the template
    const deletedTemplate = await templatesRepo.delete(templateId);
    
    if (!deletedTemplate) {
      return createNotFoundResponse('Template');
    }

    return createSuccessResponse({
      template: deletedTemplate,
      deletedFieldsCount,
    }, 'Template and associated fields deleted successfully');

  } catch (error) {
    console.error('Delete template error:', error);
    throw error;
  }
};

// Export the handler with authentication middleware
export const main = baseMiddleware(deleteTemplateHandler)
  .use(authMiddleware);
