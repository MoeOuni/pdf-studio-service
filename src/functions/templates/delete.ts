import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { baseMiddleware } from '@/shared/middleware';
import { authMiddleware } from '@/shared/auth/middleware';
import { createSuccessResponse, createNotFoundResponse } from '@/shared/utils/response';
import { TemplatesRepository } from '@/shared/database/dynamodb/templates-repository';
import { FieldsRepository } from '@/shared/database/dynamodb/fields-repository';

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
    
    // First, delete all fields associated with the template
    const deletedFieldsCount = await fieldsRepo.deleteByTemplateId(templateId, user.userId);
    
    // Then delete the template (repository will verify ownership)
    const deletedTemplate = await templatesRepo.delete(templateId, user.userId);
    
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
