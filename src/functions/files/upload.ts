import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { baseMiddleware } from '@/shared/middleware';
import { authMiddleware } from '@/shared/middleware';
import { createSuccessResponse, createValidationErrorResponse, createInternalServerErrorResponse } from '@/shared/utils/response';
import { UploadedFilesRepository } from '@/shared/database';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';

const s3Client = new S3Client({
  region: process.env['AWS_REGION'] || 'us-east-1',
});

/**
 * Direct file upload endpoint (receives file in request body)
 */
const uploadFileHandler = async (
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  console.log('Direct file upload handler started');
  
  try {
    // Get authenticated user from context
    const user = (context as any).user;
    
    // Get file data from request body (base64 encoded)
    if (!event.body) {
      return createValidationErrorResponse('File data is required');
    }

    // Parse the multipart form data or JSON payload
    const contentType = event.headers['content-type'] || event.headers['Content-Type'] || '';
    
    let fileBuffer: Buffer;
    let fileName: string;
    let mimeType: string;
    
    if (contentType.includes('application/json')) {
      // JSON payload with base64 encoded file (already parsed by middleware)
      const payload = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
      
      if (!payload.fileName || !payload.fileData || !payload.mimeType) {
        return createValidationErrorResponse('fileName, fileData, and mimeType are required');
      }
      
      fileName = payload.fileName;
      mimeType = payload.mimeType;
      fileBuffer = Buffer.from(payload.fileData, 'base64');
    } else {
      return createValidationErrorResponse('Unsupported content type. Use application/json with base64 encoded file data');
    }

    console.log('Processing file upload:', { fileName, mimeType, fileSize: fileBuffer.length });

    // Generate unique file key
    const fileExtension = fileName.split('.').pop() || '';
    const uniqueFileName = `${Date.now()}-${uuidv4()}.${fileExtension}`;
    const s3Key = `uploads/${user.userId}/${uniqueFileName}`;
    const s3Bucket = process.env['S3_BUCKET_NAME'] || 'pdf-studio-api-dev';
    const filePath = `s3://${s3Bucket}/${s3Key}`;

    // Upload to S3
    console.log('Uploading to S3:', { s3Bucket, s3Key });
    const putCommand = new PutObjectCommand({
      Bucket: s3Bucket,
      Key: s3Key,
      Body: fileBuffer,
      ContentType: mimeType,
    });

    await s3Client.send(putCommand);
    console.log('File uploaded to S3 successfully');

    // Create file record in database
    const uploadedFilesRepo = new UploadedFilesRepository();
    const fileRecord = await uploadedFilesRepo.create({
      userId: user.userId,
      originalFilename: fileName,
      storedFilename: uniqueFileName,
      filePath,
      s3Bucket,
      s3Key,
      fileSize: fileBuffer.length,
      mimeType,
      uploadStatus: 'COMPLETED',
    });

    console.log('File record created:', { id: fileRecord.id });

    return createSuccessResponse({
      fileId: fileRecord.id,
      fileName: fileRecord.originalFilename,
      fileSize: fileRecord.fileSize,
      uploadStatus: fileRecord.uploadStatus,
      uploadedAt: fileRecord.createdAt,
    }, 'File uploaded successfully');

  } catch (error) {
    console.error('Direct upload error:', error);
    return createInternalServerErrorResponse(
      'Failed to upload file',
      error
    );
  }
};

export const main = baseMiddleware(uploadFileHandler)
  .use(authMiddleware);