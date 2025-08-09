import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';

// API Response types
export interface ApiResponse {
  statusCode: number;
  body: string;
  headers?: Record<string, string>;
}

export interface SuccessResponse<T = any> {
  data: T;
  message?: string;
}

export interface ErrorResponse {
  error: string;
  message?: string;
  details?: any;
}

// Lambda handler types
export type LambdaHandler = (
  event: APIGatewayProxyEvent,
  context: Context
) => Promise<APIGatewayProxyResult>;

// Database types
export interface DynamoDBRecord {
  PK: string;
  SK: string;
  GSI1PK?: string;
  GSI1SK?: string;
  GSI2PK?: string;
  GSI2SK?: string;
  entityType: EntityType;
  data: any;
  createdAt: string;
  updatedAt: string;
  ttl?: number;
}

export type EntityType = 
  | 'USER' 
  | 'TEMPLATE' 
  | 'FIELD' 
  | 'FIELD_STYLE' 
  | 'FIELD_LAYOUT' 
  | 'FIELD_ADVANCED' 
  | 'FIELD_VALIDATION';

// User types
export interface User {
  id: string;
  email: string;
  name?: string;
  createdAt: string;
  updatedAt: string;
}

// Template types
export interface Template {
  id: string;
  userId: string;
  name: string;
  dimensions: {
    width: number;
    height: number;
  };
  scale: number;
  fileName: string;
  pdfFileUrl: string;
  pageCount: number;
  fieldIds?: string[];
  createdAt: string;
  updatedAt: string;
}

// Field types
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

export interface Position {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

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

export interface FieldLayout {
  lockProportions: boolean;
  layerOrder: number;
  snapToGrid: boolean;
}

export interface FieldAdvanced {
  placeholder: string;
  required: boolean;
  multiLine: boolean;
  maxLength: number;
  visibility: 'always' | 'conditional' | 'hidden';
}

export interface FieldValidation {
  type: 'none' | 'email' | 'number' | 'regex';
  regexPattern: string;
  errorMessage: string;
}

export interface Field {
  id: string;
  templateId: string;
  name: string;
  type: FieldType;
  page: number;
  position: Position;
  size: Size;
  value?: string;
  bindingKey: string;
  style?: FieldStyle;
  layout?: FieldLayout;
  advanced?: FieldAdvanced;
  validation?: FieldValidation;
  text?: string;
  tableConfig?: any;
  createdAt: string;
  updatedAt: string;
}

// Request/Response types
export interface CreateTemplateRequest {
  name: string;
  fileName: string;
  pdfFileUrl: string;
  pageCount: number;
  dimensions: {
    width: number;
    height: number;
  };
  scale?: number;
}

export interface UpdateTemplateRequest {
  name?: string;
  dimensions?: {
    width: number;
    height: number;
  };
  scale?: number;
}

export interface CreateFieldRequest {
  templateId: string;
  name: string;
  type: FieldType;
  page: number;
  position: Position;
  size: Size;
  bindingKey: string;
  value?: string;
  style?: FieldStyle;
  layout?: FieldLayout;
  advanced?: FieldAdvanced;
  validation?: FieldValidation;
  text?: string;
  tableConfig?: any;
}

export interface UpdateFieldRequest {
  name?: string;
  type?: FieldType;
  page?: number;
  position?: Position;
  size?: Size;
  bindingKey?: string;
  value?: string;
  style?: FieldStyle;
  layout?: FieldLayout;
  advanced?: FieldAdvanced;
  validation?: FieldValidation;
  text?: string;
  tableConfig?: any;
}

// Authentication types
export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name?: string;
}

export interface AuthResponse {
  user: User;
  token: string;
  refreshToken?: string;
}

// File upload types
export interface FileUploadResponse {
  filename: string;
  path: string;
  size: number;
  url: string;
}

// PDF generation types
export interface GeneratePdfRequest {
  templateId: string;
  payload: Record<string, any>;
}

export interface GeneratePdfResponse {
  fileUrl: string;
  filename: string;
}