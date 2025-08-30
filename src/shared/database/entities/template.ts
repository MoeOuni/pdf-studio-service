/**
 * Template Entity Definition for DynamoDB
 */

export interface Template {
  PK: string; // USER#${userId}
  SK: string; // TEMPLATE#${templateId}
  GSI1PK: string; // TEMPLATE#${templateId}
  GSI1SK: string; // ${category}#${createdAt}
  id: string;
  userId: string;
  name: string;
  description?: string;
  category: string;
  isPublic: boolean;
  thumbnailUrl?: string;
  previewUrl?: string;
  originalFileId?: string; // For templates created from uploaded files
  dimensions?: {
    width: number;
    height: number;
  };
  pageCount?: number;
  templateData: {
    pages: Array<{
      width: number;
      height: number;
      fields: any[];
    }>;
    metadata: Record<string, any>;
  };
  tags: string[];
  downloadCount: number;
  version: number;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  createdAt: string;
  updatedAt: string;
}

export interface CreateTemplateInput {
  userId: string;
  name: string;
  description?: string;
  category: string;
  isPublic?: boolean;
  thumbnailUrl?: string;
  originalFileId?: string;
  dimensions?: {
    width: number;
    height: number;
  };
  pageCount?: number;
  templateData: {
    pages: Array<{
      width: number;
      height: number;
      fields: any[];
    }>;
    metadata: Record<string, any>;
  };
  tags?: string[];
  metadata?: Record<string, any>; // For compatibility
}

export interface UpdateTemplateInput {
  name?: string;
  description?: string;
  category?: string;
  isPublic?: boolean;
  thumbnailUrl?: string;
  previewUrl?: string;
  templateData?: {
    pages: Array<{
      width: number;
      height: number;
      fields: any[];
    }>;
    metadata: Record<string, any>;
  };
  tags?: string[];
  status?: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
}
