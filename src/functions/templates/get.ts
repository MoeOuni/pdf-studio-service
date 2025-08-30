import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { baseMiddleware } from '@/shared/middleware';
import { authMiddleware } from '@/shared/middleware';
import { createSuccessResponse, createNotFoundResponse, createUnauthorizedResponse } from '@/shared/utils/response';
import { TemplatesRepository } from '@/shared/database';

/**
 * Get a template by ID
 */
const getTemplateHandler = async (
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  // Get authenticated user from context (added by authMiddleware)
  const user = (context as any).user;

  // Validate path parameters
  const templateId = event.pathParameters?.['templateId'];
  if (!templateId) {
    return createNotFoundResponse('Template');
  }

  try {
    const templatesRepo = new TemplatesRepository();
    
    // Get the template
    const template = await templatesRepo.findById(templateId);
    if (!template) {
      return createNotFoundResponse('Template');
    }

    // Check if user has access (owns template or it's public)
    const hasAccess = await templatesRepo.hasAccess(templateId, user.userId);
    if (!hasAccess) {
      return createUnauthorizedResponse('Access denied to this template');
    }

    return createSuccessResponse(template, 'Template retrieved successfully');

  } catch (error) {
    console.error('Get template error:', error);
    throw error;
  }
};

// Export the handler with authentication middleware
export const main = baseMiddleware(getTemplateHandler)
  .use(authMiddleware);
