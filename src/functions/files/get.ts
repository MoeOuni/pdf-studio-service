import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { baseMiddleware } from '@/shared/middleware';
import { authMiddleware } from '@/shared/auth/middleware';
import { createSuccessResponse, createNotFoundResponse } from '@/shared/utils/response';
import { UploadedFilesRepository } from '@/shared/database';
import { generateDownloadUrl } from '@/shared/services/s3-service';

const getFileHandler = async (
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
    
    // Get the file and ensure it belongs to the user
    const file = await uploadedFilesRepo.findByUserAndId(user.userId, fileId);
    if (!file) {
      return createNotFoundResponse('File');
    }

    // Generate download URL
    const downloadUrl = await generateDownloadUrl(file.s3Key);

    return createSuccessResponse({
      file: {
        id: file.id,
        originalFilename: file.originalFilename,
        storedFilename: file.storedFilename,
        fileSize: Number(file.fileSize),
        mimeType: file.mimeType,
        uploadStatus: file.uploadStatus,
        createdAt: file.createdAt,
        updatedAt: file.updatedAt,
      },
      downloadUrl,
    }, 'File retrieved successfully');

  } catch (error) {
    console.error('Get file error:', error);
    throw error;
  }
};

export const main = baseMiddleware(getFileHandler)
  .use(authMiddleware);