import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { baseMiddleware, authMiddleware } from '@/shared/middleware';
import { createSuccessResponse, createNotFoundResponse, createValidationErrorResponse } from '@/shared/utils/response';
import { validateRequestBody, validatePathParameters, updateFieldSchema } from '@/shared/utils/validation';
import { FieldsRepository } from '@/shared/database/dynamodb/fields-repository';

/**
 * Update a template field
 */
const updateFieldHandler = async (
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

  // Validate request body
  const validation = validateRequestBody(event.body, updateFieldSchema);
  if (!validation.success) {
    return createValidationErrorResponse(validation.error);
  }

  const updateData = validation.data;

  try {
    const fieldsRepo = new FieldsRepository();

    // Update the field (repository will verify ownership)
    const updatedField = await fieldsRepo.update(fieldId, user.userId, updateData);
    
    if (!updatedField) {
      return createNotFoundResponse('Field');
    }

    return createSuccessResponse(updatedField, 'Field updated successfully');

  } catch (error) {
    console.error('Update field error:', error);
    throw error;
  }
};

export const main = baseMiddleware(updateFieldHandler)
  .use(authMiddleware);