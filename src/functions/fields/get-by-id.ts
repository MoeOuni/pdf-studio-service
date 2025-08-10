import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { baseMiddleware, authMiddleware } from '@/shared/middleware';
import { createSuccessResponse, createNotFoundResponse, createValidationErrorResponse } from '@/shared/utils/response';
import { validatePathParameters } from '@/shared/utils/validation';
import { FieldsRepository } from '@/shared/database/dynamodb/fields-repository';

/**
 * Get a specific field by ID
 */
const getFieldByIdHandler = async (
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  // Get authenticated user from context (added by authMiddleware)
  const user = (context as any).user;

  // Validate path parameters
  const pathValidation = validatePathParameters(event.pathParameters, ['fieldId']);
  if (!pathValidation.success) {
    return createValidationErrorResponse(pathValidation.error);
  }

  const fieldId = pathValidation.data['fieldId'] as string;

  try {
    const fieldsRepo = new FieldsRepository();

    // Get the field and verify ownership
    const field = await fieldsRepo.findByIdAndUserId(fieldId, user.userId);
    
    if (!field) {
      return createNotFoundResponse('Field');
    }

    return createSuccessResponse(field, 'Field retrieved successfully');

  } catch (error) {
    console.error('Get field by ID error:', error);
    throw error;
  }
};

export const main = baseMiddleware(getFieldByIdHandler)
  .use(authMiddleware);