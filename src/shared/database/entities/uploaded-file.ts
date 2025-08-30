/**
 * Uploaded File Entity Definition for DynamoDB
 */

export interface UploadedFile {
  PK: string; // USER#${userId}
  SK: string; // FILE#${fileId}
  GSI1PK: string; // FILE#${fileId}
  GSI1SK: string; // ${createdAt}
  id: string;
  userId: string;
  originalFilename: string;
  storedFilename: string;
  filePath: string;
  s3Bucket: string;
  s3Key: string;
  fileSize: number;
  mimeType?: string;
  fileHash?: string;
  uploadStatus: 'UPLOADING' | 'COMPLETED' | 'FAILED' | 'DELETED';
  metadata: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface CreateUploadedFileInput {
  userId: string;
  originalFilename: string;
  storedFilename: string;
  filePath: string;
  s3Bucket: string;
  s3Key: string;
  fileSize: number;
  mimeType?: string;
  fileHash?: string;
  uploadStatus?: 'UPLOADING' | 'COMPLETED' | 'FAILED' | 'DELETED';
  metadata?: Record<string, any>;
}

export interface UpdateUploadedFileInput {
  originalFilename?: string;
  uploadStatus?: 'UPLOADING' | 'COMPLETED' | 'FAILED' | 'DELETED';
  metadata?: Record<string, any>;
}
