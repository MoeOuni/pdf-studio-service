import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { baseMiddleware, authMiddleware } from '@/shared/middleware';
import { createSuccessResponse, createValidationErrorResponse, createNotFoundResponse } from '@/shared/utils/response';
import { validateRequestBody, createFieldSchema } from '@/shared/utils/validation';
import { FieldsRepository } from '@/shared/database/dynamodb/fields-repository';
import { TemplatesRepository } from '@/shared/database/dynamodb/templates-repository';

/**
 * Create a new template field
 */
const createFieldHandler = async (
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  // Get authenticated user from context (added by authMiddleware)
  const user = (context as any).user;

  // Validate request body
  const validation = validateRequestBody(event.body, createFieldSchema);
  if (!validation.success) {
    return createValidationErrorResponse(validation.error);
  }

  const fieldData = validation.data;

  try {
    // Verify the template exists and belongs to the user
    const templatesRepo = new TemplatesRepository();
    const template = await templatesRepo.findByIdAndUserId(fieldData.templateId, user.userId);
    
    if (!template) {
      return createNotFoundResponse('Template');
    }

    // Create field with default style values
    const fieldsRepo = new FieldsRepository();
    const defaultStyle = {
      fontFamily: 'Arial',
      fontSize: 12,
      textColor: '#000000',
      backgroundColor: '#FFFFFF',
      textAlign: 'left' as const,
      bold: false,
      italic: false,
      underline: false,
    };

    const field = await fieldsRepo.create({
      templateId: fieldData.templateId,
      userId: user.userId,
      name: fieldData.name,
      type: fieldData.type,
      page: fieldData.page,
      position: fieldData.position,
      size: fieldData.size,
      style: fieldData.style ? { ...defaultStyle, ...fieldData.style } : defaultStyle,
      validation: fieldData.validation,
      defaultValue: fieldData.defaultValue,
      placeholder: fieldData.placeholder,
      isRequired: fieldData.isRequired,
      isReadonly: fieldData.isReadonly,
      order: fieldData.order,
    });

    return createSuccessResponse(field, 'Field created successfully');

  } catch (error) {
    console.error('Create field error:', error);
    throw error;
  }
};

export const main = baseMiddleware(createFieldHandler)
  .use(authMiddleware);