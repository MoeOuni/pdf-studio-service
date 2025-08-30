import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { baseMiddleware } from '@/shared/middleware';
import { authMiddleware } from '@/shared/middleware';
import { createSuccessResponse, createValidationErrorResponse, createNotFoundResponse } from '@/shared/utils/response';
import { validateRequestBody, updateTemplateSchema } from '@/shared/utils/validation';
import { TemplatesRepository } from '@/shared/database';

/**
 * Update a template
 */
const updateTemplateHandler = async (
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

  // Validate request body
  const validation = validateRequestBody(event.body, updateTemplateSchema);
  if (!validation.success) {
    return createValidationErrorResponse(validation.error);
  }

  const updateData = validation.data;

  try {
    const templatesRepo = new TemplatesRepository();
    
    // Verify template exists and user has access
    const existingTemplate = await templatesRepo.findByIdAndUserId(templateId, user.userId);
    if (!existingTemplate) {
      return createNotFoundResponse('Template');
    }

    // Update the template
    const updatedTemplate = await templatesRepo.update(templateId, updateData);
    
    if (!updatedTemplate) {
      return createNotFoundResponse('Template');
    }

    return createSuccessResponse(updatedTemplate, 'Template updated successfully');

  } catch (error) {
    console.error('Update template error:', error);
    throw error;
  }
};

// Export the handler with authentication middleware
export const main = baseMiddleware(updateTemplateHandler)
  .use(authMiddleware);
