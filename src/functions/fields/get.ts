import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { baseMiddleware, authMiddleware } from '@/shared/middleware';
import { createSuccessResponse, createNotFoundResponse, createValidationErrorResponse } from '@/shared/utils/response';
import { validatePathParameters } from '@/shared/utils/validation';
import { FieldsRepository, TemplatesRepository, Field } from '@/shared/database';

/**
 * Get template fields
 */
const getFieldsHandler = async (
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  // Get authenticated user from context (added by authMiddleware)
  const user = (context as any).user;

  // Validate path parameters
  const pathValidation = validatePathParameters(event.pathParameters, ['templateId']);
  if (!pathValidation.success) {
    return createValidationErrorResponse(pathValidation.error);
  }

  const templateId = pathValidation.data['templateId'] as string;

  // Parse query parameters
  const page = event.queryStringParameters?.['page'] ? parseInt(event.queryStringParameters['page'], 10) : undefined;
  const limit = parseInt(event.queryStringParameters?.['limit'] || '50', 10);
  const cursor = event.queryStringParameters?.['cursor'];

  try {
    const templatesRepo = new TemplatesRepository();
    const fieldsRepo = new FieldsRepository();

    // Verify user has access to the template (owns it or it's public)
    const hasAccess = await templatesRepo.hasAccess(templateId, user.userId);
    if (!hasAccess) {
      return createNotFoundResponse('Template');
    }

    let fields: Field[];

    if (page !== undefined) {
      // Get fields for specific page
      fields = await fieldsRepo.findByTemplateIdAndPage(templateId, page);
    } else {
      // Get all fields for template
      fields = await fieldsRepo.findByTemplateId(templateId);
      
      // Apply client-side pagination if requested
      if (limit && fields.length > limit) {
        const startIndex = cursor ? parseInt(cursor, 10) : 0;
        fields = fields.slice(startIndex, startIndex + limit);
      }
    }

    // Simple pagination response
    const hasMore = limit ? fields.length === limit : false;
    const nextCursor = hasMore ? String(fields.length) : undefined;

    return createSuccessResponse({
      fields: fields,
      pagination: {
        count: fields.length,
        hasMore,
        nextCursor,
      },
    });
  } catch (error) {
    console.error('Error getting fields:', error);
    return createNotFoundResponse('Failed to retrieve fields');
  }
};

export const main = baseMiddleware(getFieldsHandler)
  .use(authMiddleware);