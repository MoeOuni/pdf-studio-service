import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const s3Client = new S3Client({
  region: process.env['AWS_REGION'] || 'us-east-1',
});

const BUCKET_NAME = process.env['S3_BUCKET_NAME'] || 'pdf-studio-uploads';

/**
 * Generate presigned URL for file upload
 */
export async function generatePresignedUrl(
  fileKey: string,
  mimeType: string,
  expiresIn: number = 300 // 5 minutes
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: fileKey,
    ContentType: mimeType,
  });

  return getSignedUrl(s3Client, command, { expiresIn });
}

/**
 * Generate presigned URL for file download
 */
export async function generateDownloadUrl(
  fileKey: string,
  expiresIn: number = 3600 // 1 hour
): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: fileKey,
  });

  return getSignedUrl(s3Client, command, { expiresIn });
}

/**
 * Check if file exists in S3
 */
export async function fileExists(fileKey: string): Promise<boolean> {
  try {
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: fileKey,
    });
    
    await s3Client.send(command);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Get file metadata from S3
 */
export async function getFileMetadata(fileKey: string): Promise<{
  size?: number;
  lastModified?: Date;
  contentType?: string;
} | null> {
  try {
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: fileKey,
    });
    
    const response = await s3Client.send(command);
    
    return {
      size: response.ContentLength,
      lastModified: response.LastModified,
      contentType: response.ContentType,
    };
  } catch (error) {
    return null;
  }
}
