import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { baseMiddleware, authMiddleware } from '@/shared/middleware';
import { createSuccessResponse, createNotFoundResponse, createValidationErrorResponse } from '@/shared/utils/response';
import { validatePathParameters } from '@/shared/utils/validation';
import { FieldsRepository } from '@/shared/database';

/**
 * Delete a template field
 */
const deleteFieldHandler = async (
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

    // Verify field exists and user has access
    const field = await fieldsRepo.findByIdAndUserId(fieldId, user.userId);
    if (!field) {
      return createNotFoundResponse('Field');
    }

    // Delete the field
    const deletedField = await fieldsRepo.delete(fieldId);
    
    if (!deletedField) {
      return createNotFoundResponse('Field');
    }

    return createSuccessResponse(
      { fieldId: field.id }, 
      'Field deleted successfully'
    );

  } catch (error) {
    console.error('Delete field error:', error);
    throw error;
  }
};

export const main = baseMiddleware(deleteFieldHandler)
  .use(authMiddleware);