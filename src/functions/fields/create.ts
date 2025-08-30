import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { baseMiddleware, authMiddleware } from '@/shared/middleware';
import { createSuccessResponse, createValidationErrorResponse, createNotFoundResponse } from '@/shared/utils/response';
import { FieldsRepository, TemplatesRepository } from '@/shared/database';

/**
 * Create a new template field
 */
const createFieldHandler = async (
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  // Get authenticated user from context (added by authMiddleware)
  const user = (context as any).user;

  // Parse request body
  if (!event.body) {
    return createValidationErrorResponse('Request body is required');
  }

  let fieldData;
  try {
    fieldData = JSON.parse(event.body);
  } catch (error) {
    return createValidationErrorResponse('Invalid JSON in request body');
  }

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
      type: fieldData.type,
      name: fieldData.name,
      label: fieldData.name, // Use name as label for now
      position: {
        x: fieldData.position.x,
        y: fieldData.position.y,
        width: fieldData.size.width,
        height: fieldData.size.height,
        page: fieldData.page,
      },
      properties: {
        style: fieldData.style ? { ...defaultStyle, ...fieldData.style } : defaultStyle,
        defaultValue: fieldData.defaultValue,
        placeholder: fieldData.placeholder,
        isRequired: fieldData.isRequired,
        isReadonly: fieldData.isReadonly,
        order: fieldData.order,
        tableConfig: fieldData.tableConfig,
      },
      validation: fieldData.validation,
    });

    return createSuccessResponse(field, 'Field created successfully');

  } catch (error) {
    console.error('Create field error:', error);
    throw error;
  }
};

export const main = baseMiddleware(createFieldHandler)
  .use(authMiddleware);