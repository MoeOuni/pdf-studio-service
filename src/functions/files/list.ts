import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { baseMiddleware } from '@/shared/middleware';
import { authMiddleware } from '@/shared/auth/middleware';
import { createSuccessResponse } from '@/shared/utils/response';
import { UploadedFilesRepository } from '@/shared/database/prisma/uploaded-files-repository';
import { UploadStatus } from '@prisma/client';

/**
 * List user's uploaded files
 */
const listFilesHandler = async (
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  // Get authenticated user from context (added by authMiddleware)
  const user = (context as any).user;

  // Parse query parameters
  const page = parseInt(event.queryStringParameters?.['page'] || '1', 10);
  const limit = parseInt(event.queryStringParameters?.['limit'] || '20', 10);
  const status = event.queryStringParameters?.['status'] as UploadStatus | undefined;

  try {
    const uploadedFilesRepo = new UploadedFilesRepository();

    // Get paginated files for the user
    const result = await uploadedFilesRepo.findByUserId(user.userId, page, limit, status);

    // Transform the data to exclude sensitive information
    const transformedData = result.data.map(file => ({
      id: file.id,
      originalFilename: file.originalFilename,
      storedFilename: file.storedFilename,
      fileSize: Number(file.fileSize),
      mimeType: file.mimeType,
      uploadStatus: file.uploadStatus,
      createdAt: file.createdAt,
      updatedAt: file.updatedAt,
    }));

    return createSuccessResponse({
      files: transformedData,
      pagination: result.pagination,
    }, 'Files retrieved successfully');

  } catch (error) {
    console.error('List files error:', error);
    throw error;
  }
};

// Export the handler with authentication middleware
export const main = baseMiddleware(listFilesHandler)
  .use(authMiddleware);
