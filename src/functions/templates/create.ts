import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { baseMiddleware } from '@/shared/middleware';
import { authMiddleware } from '@/shared/middleware';
import { createSuccessResponse, createValidationErrorResponse, createNotFoundResponse } from '@/shared/utils/response';
import { validateRequestBody, createTemplateSchema } from '@/shared/utils/validation';
import { TemplatesRepository } from '@/shared/database';
import { UploadedFilesRepository } from '@/shared/database';
/**
 * Create a new PDF template
 */
const createTemplateHandler = async (
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  // Get authenticated user from context (added by authMiddleware)
  const user = (context as any).user;

  // Validate request body
  const validation = validateRequestBody(event.body, createTemplateSchema);
  if (!validation.success) {
    return createValidationErrorResponse(validation.error);
  }

  const templateData = validation.data;

  try {
    // Verify the uploaded file exists and belongs to the user
    const uploadedFilesRepo = new UploadedFilesRepository();
    const uploadedFile = await uploadedFilesRepo.findByUserAndId(user.userId, templateData.originalFileId);
    
    if (!uploadedFile) {
      return createNotFoundResponse('Uploaded file');
    }

    if (uploadedFile.uploadStatus !== 'COMPLETED') {
      return createValidationErrorResponse('File upload is not completed');
    }

    // Create template
    const templatesRepo = new TemplatesRepository();
    const template = await templatesRepo.create({
      userId: user.userId,
      name: templateData.name,
      description: templateData.description,
      category: 'general', // Default category
      originalFileId: templateData.originalFileId,
      dimensions: templateData.dimensions,
      pageCount: templateData.pageCount,
      thumbnailUrl: templateData.thumbnailUrl,
      isPublic: templateData.isPublic,
      tags: templateData.tags,
      templateData: {
        pages: [], // Will be populated when fields are added
        metadata: templateData.metadata || {},
      },
      metadata: {
        fileSize: Number(uploadedFile.fileSize),
        mimeType: uploadedFile.mimeType || 'application/pdf',
        originalFilename: uploadedFile.originalFilename,
        ...templateData.metadata,
      },
    });

    return createSuccessResponse(template, 'Template created successfully');

  } catch (error) {
    console.error('Create template error:', error);
    throw error;
  }
};

// Export the handler with authentication middleware
export const main = baseMiddleware(createTemplateHandler)
  .use(authMiddleware);
