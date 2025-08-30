/**
 * Generated PDF Entity Definition for DynamoDB
 */

export interface GeneratedPdf {
  PK: string; // USER#${userId}
  SK: string; // PDF#${pdfId}
  GSI1PK: string; // PDF#${pdfId}
  GSI1SK: string; // ${templateId}#${createdAt}
  id: string;
  userId: string;
  templateId: string;
  s3Bucket: string;
  s3Key: string;
  fileName: string;
  fileSize: number;
  status: 'GENERATING' | 'COMPLETED' | 'FAILED' | 'DELETED';
  fieldValues: Record<string, any>;
  metadata: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface CreateGeneratedPdfInput {
  userId: string;
  templateId: string;
  fileName: string;
  s3Bucket: string;
  s3Key: string;
  fieldValues: Record<string, any>;
  metadata?: Record<string, any>;
}

export interface UpdateGeneratedPdfInput {
  fileSize?: number;
  status?: 'GENERATING' | 'COMPLETED' | 'FAILED' | 'DELETED';
  metadata?: Record<string, any>;
}
