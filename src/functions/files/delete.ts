import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { baseMiddleware } from '@/shared/middleware';
import { authMiddleware } from '@/shared/auth/middleware';
import { createSuccessResponse, createNotFoundResponse } from '@/shared/utils/response';
import { UploadedFilesRepository } from '@/shared/database/prisma/uploaded-files-repository';

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
    
    // Delete the file (repository will verify ownership)
    const deletedFile = await uploadedFilesRepo.delete(fileId, user.userId);
    if (!deletedFile) {
      return createNotFoundResponse('File');
    }

    // TODO: Also delete from S3 storage
    // This should be done in a separate background job or using S3 lifecycle policies

    return createSuccessResponse({
      file: {
        id: deletedFile.id,
        originalFilename: deletedFile.originalFilename,
        storedFilename: deletedFile.storedFilename,
      },
    }, 'File deleted successfully');

  } catch (error) {
    console.error('Delete file error:', error);
    throw error;
  }
};

export const main = baseMiddleware(deleteFileHandler)
  .use(authMiddleware);