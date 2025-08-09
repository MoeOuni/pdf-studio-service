import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { baseMiddleware } from '@/shared/middleware';
import { authMiddleware } from '@/shared/auth/middleware';
import { createSuccessResponse, createValidationErrorResponse, createNotFoundResponse } from '@/shared/utils/response';
import { validateRequestBody, confirmUploadSchema } from '@/shared/utils/validation';
import { UploadedFilesRepository } from '@/shared/database/prisma/uploaded-files-repository';
import { getFileMetadata } from '@/shared/services/s3-service';

/**
 * Confirm file upload completion
 */
const confirmUploadHandler = async (
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  // Get authenticated user from context (added by authMiddleware)
  const user = (context as any).user;

  // Validate request body
  const validation = validateRequestBody(event.body, confirmUploadSchema);
  if (!validation.success) {
    return createValidationErrorResponse(validation.error);
  }

  const { fileId } = validation.data;

  try {
    const uploadedFilesRepo = new UploadedFilesRepository();

    // Find the file and ensure it belongs to the user
    const file = await uploadedFilesRepo.findById(fileId, user.userId);
    if (!file) {
      return createNotFoundResponse('File');
    }

    // Check if file exists in S3 and get metadata
    const s3Metadata = await getFileMetadata(file.s3Key);
    if (!s3Metadata) {
      return createValidationErrorResponse('File not found in storage');
    }

    // Update file status to completed with actual metadata
    const updatedFile = await uploadedFilesRepo.confirmUpload(
      fileId,
      {
        fileSize: s3Metadata.size,
      },
      user.userId
    );

    return createSuccessResponse({
      fileId: updatedFile.id,
      status: updatedFile.uploadStatus,
      fileSize: Number(updatedFile.fileSize),
      uploadedAt: updatedFile.updatedAt,
    }, 'File upload confirmed successfully');

  } catch (error) {
    console.error('Confirm upload error:', error);
    throw error;
  }
};

// Export the handler with authentication middleware
export const main = baseMiddleware(confirmUploadHandler)
  .use(authMiddleware);
