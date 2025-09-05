import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { baseMiddleware } from '@/shared/middleware';
import { authMiddleware } from '@/shared/middleware';
import { createSuccessResponse, createNotFoundResponse, createUnauthorizedResponse } from '@/shared/utils/response';
import { TemplatesRepository } from '@/shared/database';

/**
 * Get a template by ID or list all templates
 */
const getTemplateHandler = async (
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  // Get authenticated user from context (added by authMiddleware)
  const user = (context as any).user;

  const templateId = event.pathParameters?.['templateId'];

  try {
    const templatesRepo = new TemplatesRepository();
    
    // If templateId is provided, get single template
    if (templateId) {
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
    } 
    // Otherwise, list all templates for the user
    else {
      // Parse query parameters for pagination (future enhancement)
      const limit = event.queryStringParameters?.['limit'] ? parseInt(event.queryStringParameters['limit'], 10) : 10;

      // Get templates for the user
      const templates = await templatesRepo.findByUserId(user.userId);
      
      // Apply limit if specified
      const limitedTemplates = limit ? templates.slice(0, limit) : templates;
      
      // Always return 200 with data (even if empty array)
      return createSuccessResponse({
        templates: limitedTemplates,
        total: templates.length,
        count: limitedTemplates.length
      }, 'Templates retrieved successfully');
    }

  } catch (error) {
    console.error('Get template(s) error:', error);
    throw error;
  }
};

// Export the handler with authentication middleware
export const main = baseMiddleware(getTemplateHandler)
  .use(authMiddleware);
