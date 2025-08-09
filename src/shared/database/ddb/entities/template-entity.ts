import { BaseEntity, Dimensions, TemplateStatus } from './base-entity';

/**
 * Template entity interface for DynamoDB
 * Represents PDF templates with their metadata and configuration
 */
export interface TemplateEntity extends BaseEntity {
  templateId: string;
  userId: string; // References PostgreSQL users.id
  name: string;
  originalFileId?: string; // References PostgreSQL uploaded_files.id
  dimensions: Dimensions;
  scale: number;
  fileName: string;
  pdfFileUrl: string; // S3 path
  pageCount: number;
  version: number;
  status: TemplateStatus;
  metadata: Record<string, any>; // Flexible template metadata
}