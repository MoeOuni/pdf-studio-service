import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { baseMiddleware, authMiddleware } from '@/shared/middleware';
import { createSuccessResponse, createNotFoundResponse, createValidationErrorResponse } from '@/shared/utils/response';
import { validatePathParameters } from '@/shared/utils/validation';
import { FieldsRepository } from '@/shared/database/dynamodb/fields-repository';
import { TemplatesRepository } from '@/shared/database/dynamodb/templates-repository';

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

  // Handle pagination cursor
  let lastEvaluatedKey: Record<string, any> | undefined;
  const cursor = event.queryStringParameters?.['cursor'];
  if (cursor) {
    try {
      lastEvaluatedKey = JSON.parse(Buffer.from(cursor, 'base64').toString());
    } catch (error) {
      // Invalid cursor, ignore it
    }
  }

  try {
    // Verify template exists and user has access
    const templatesRepo = new TemplatesRepository();
    const hasAccess = await templatesRepo.hasAccess(templateId, user.userId);

    if (!hasAccess) {
      return createNotFoundResponse('Template');
    }

    const fieldsRepo = new FieldsRepository();
    let result;

    if (page !== undefined) {
      // Get fields for specific page
      const fields = await fieldsRepo.findByTemplateIdAndPage(templateId, page);
      result = {
        items: fields,
        count: fields.length,
        hasMore: false,
        lastEvaluatedKey: undefined,
      };
    } else {
      // Get all fields for template with pagination
      result = await fieldsRepo.findByTemplateId(templateId, {
        limit,
        lastEvaluatedKey,
      });
    }

    // Encode the cursor for next page
    let nextCursor: string | undefined;
    if (result.lastEvaluatedKey) {
      nextCursor = Buffer.from(JSON.stringify(result.lastEvaluatedKey)).toString('base64');
    }

    return createSuccessResponse({
      fields: result.items,
      pagination: {
        count: result.count,
        hasMore: result.hasMore,
        nextCursor,
      },
    }, 'Fields retrieved successfully');

  } catch (error) {
    console.error('Get fields error:', error);
    throw error;
  }
};

export const main = baseMiddleware(getFieldsHandler)
  .use(authMiddleware);