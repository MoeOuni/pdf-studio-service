import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { baseMiddleware, authMiddleware } from '@/shared/middleware';
import { createSuccessResponse } from '@/shared/utils/response';
import { UploadedFilesRepository, UploadStatus } from '@/shared/database';

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

    // Calculate pagination
    const offset = (page - 1) * limit;

    // Get files for the user
    const files = await uploadedFilesRepo.findByUserId(user.userId, {
      status,
      limit,
      offset
    });

    // Get total count for pagination
    const totalCount = await uploadedFilesRepo.countByUserId(user.userId, status);

    // Transform the data to exclude sensitive information
    const transformedData = files.map(file => ({
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
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit),
        hasNext: page * limit < totalCount,
        hasPrev: page > 1
      }
    }, 'Files retrieved successfully');

  } catch (error) {
    console.error('List files error:', error);
    throw error;
  }
};

// Export the handler with authentication middleware
export const main = baseMiddleware(listFilesHandler)
  .use(authMiddleware);
