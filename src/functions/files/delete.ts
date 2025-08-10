import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { baseMiddleware } from '@/shared/middleware';
import { authMiddleware } from '@/shared/auth/middleware';
import { createSuccessResponse, createNotFoundResponse } from '@/shared/utils/response';
import { UploadedFilesRepository } from '@/shared/database';

const deleteFileHandler = async (
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  // Get authenticated user from context (added by authMiddleware)
  const user = (context as any).user;

  // Get file ID from path
  const fileId = event.pathParameters?.['fileId'];
  if (!fileId) {
    return createNotFoundResponse('File');
  }

  try {
    const uploadedFilesRepo = new UploadedFilesRepository();
    
    // First, get the file to verify ownership and get file details
    const fileToDelete = await uploadedFilesRepo.findByUserAndId(user.userId, fileId);
    if (!fileToDelete) {
      return createNotFoundResponse('File');
    }

    // Delete the file
    const deleted = await uploadedFilesRepo.deleteByUserAndId(user.userId, fileId);
    if (!deleted) {
      return createNotFoundResponse('File');
    }

    // TODO: Also delete from S3 storage
    // This should be done in a separate background job or using S3 lifecycle policies

    return createSuccessResponse({
      file: {
        id: fileToDelete.id,
        originalFilename: fileToDelete.originalFilename,
        storedFilename: fileToDelete.storedFilename,
      },
    }, 'File deleted successfully');

  } catch (error) {
    console.error('Delete file error:', error);
    throw error;
  }
};

export const main = baseMiddleware(deleteFileHandler)
  .use(authMiddleware);