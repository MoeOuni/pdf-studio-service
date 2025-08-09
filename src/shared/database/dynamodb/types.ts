export interface Template {
  id: string; // Primary key (UUID)
  userId: string; // GSI1PK - to query templates by user
  name: string;
  description?: string;
  originalFileId: string; // Reference to uploaded PDF file
  dimensions: {
    width: number;
    height: number;
  };
  pageCount: number;
  thumbnailUrl?: string;
  isPublic: boolean;
  tags: string[];
  metadata: {
    fileSize: number;
    mimeType: string;
    [key: string]: any;
  };
  createdAt: string; // ISO timestamp
  updatedAt: string; // ISO timestamp
}

export interface CreateTemplateInput {
  userId: string;
  name: string;
  description?: string;
  originalFileId: string;
  dimensions: {
    width: number;
    height: number;
  };
  pageCount: number;
  thumbnailUrl?: string;
  isPublic?: boolean;
  tags?: string[];
  metadata?: Record<string, any>;
}

export interface UpdateTemplateInput {
  name?: string;
  description?: string;
  isPublic?: boolean;
  tags?: string[];
  thumbnailUrl?: string;
  metadata?: Record<string, any>;
}

export interface TemplateField {
  id: string; // Primary key (UUID)
  templateId: string; // GSI1PK - to query fields by template
  userId: string; // GSI2PK - to query fields by user
  name: string;
  type: FieldType;
  page: number; // Page number (1-based)
  position: {
    x: number;
    y: number;
  };
  size: {
    width: number;
    height: number;
  };
  style: FieldStyle;
  validation?: FieldValidation;
  defaultValue?: string;
  placeholder?: string;
  isRequired: boolean;
  isReadonly: boolean;
  order: number; // Display order
  createdAt: string; // ISO timestamp
  updatedAt: string; // ISO timestamp
}

export type FieldType = 
  | 'text' 
  | 'signature' 
  | 'date' 
  | 'email' 
  | 'image' 
  | 'table' 
  | 'QRCode' 
  | 'separator' 
  | 'label';

export interface FieldStyle {
  fontFamily: string;
  fontSize: number;
  textColor: string;
  backgroundColor: string;
  textAlign: 'left' | 'center' | 'right';
  bold: boolean;
  italic: boolean;
  underline: boolean;
  lineThickness?: number;
  lineStyle?: 'solid' | 'dashed' | 'dotted';
  opacity?: number;
}

export interface FieldValidation {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: string; // Regex pattern
  min?: number; // For numeric fields
  max?: number; // For numeric fields
  customMessage?: string;
}

export interface CreateFieldInput {
  templateId: string;
  userId: string;
  name: string;
  type: FieldType;
  page: number;
  position: {
    x: number;
    y: number;
  };
  size: {
    width: number;
    height: number;
  };
  style: FieldStyle;
  validation?: FieldValidation;
  defaultValue?: string;
  placeholder?: string;
  isRequired?: boolean;
  isReadonly?: boolean;
  order?: number;
}

export interface UpdateFieldInput {
  name?: string;
  type?: FieldType;
  page?: number;
  position?: {
    x: number;
    y: number;
  };
  size?: {
    width: number;
    height: number;
  };
  style?: Partial<FieldStyle>;
  validation?: FieldValidation;
  defaultValue?: string;
  placeholder?: string;
  isRequired?: boolean;
  isReadonly?: boolean;
  order?: number;
}

export interface PaginationInput {
  limit?: number;
  lastEvaluatedKey?: Record<string, any>;
}

export interface PaginatedResponse<T> {
  items: T[];
  lastEvaluatedKey?: Record<string, any>;
  hasMore: boolean;
  count: number;
}
