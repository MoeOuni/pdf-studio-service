import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { baseMiddleware } from '@/shared/middleware';
import { authMiddleware } from '@/shared/auth/middleware';
import { createSuccessResponse, createValidationErrorResponse } from '@/shared/utils/response';
import { validateRequestBody, uploadRequestSchema } from '@/shared/utils/validation';
import { generatePresignedUrl } from '@/shared/services/s3-service';
import { UploadedFilesRepository } from '@/shared/database';

/**
 * Generate presigned URL for file upload
 */
const generateUploadUrlHandler = async (
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  // Get authenticated user from context (added by authMiddleware)
  const user = (context as any).user;

  // Validate request body
  const validation = validateRequestBody(event.body, uploadRequestSchema);
  if (!validation.success) {
    return createValidationErrorResponse(validation.error);
  }

  const { fileName, fileSize, mimeType } = validation.data;

  try {
    const uploadedFilesRepo = new UploadedFilesRepository();

    // Generate unique file key
    const fileExtension = fileName.split('.').pop() || '';
    const uniqueFileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExtension}`;
    const s3Key = `uploads/${user.userId}/${uniqueFileName}`;
    const s3Bucket = process.env['S3_BUCKET_NAME'] || 'pdf-studio-uploads';
    const filePath = `s3://${s3Bucket}/${s3Key}`;

    // Generate presigned URL
    const presignedUrl = await generatePresignedUrl(s3Key, mimeType);

    // Create file record in database (status: uploading)
    const fileRecord = await uploadedFilesRepo.create({
      userId: user.userId,
      originalFilename: fileName,
      storedFilename: uniqueFileName,
      filePath,
      s3Bucket,
      s3Key,
      fileSize,
      mimeType,
      uploadStatus: 'UPLOADING',
    });

    return createSuccessResponse({
      uploadUrl: presignedUrl,
      fileId: fileRecord.id,
      s3Key,
      expiresIn: 300, // 5 minutes
    }, 'Upload URL generated successfully');

  } catch (error) {
    console.error('Generate upload URL error:', error);
    throw error;
  }
};

// Export the handler with authentication middleware
export const main = baseMiddleware(generateUploadUrlHandler)
  .use(authMiddleware);
