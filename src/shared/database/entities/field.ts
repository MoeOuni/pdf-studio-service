/**
 * Field Entity Definition for DynamoDB
 */

export interface Field {
  PK: string; // TEMPLATE#${templateId}
  SK: string; // FIELD#${fieldId}
  GSI1PK: string; // FIELD#${fieldId}
  GSI1SK: string; // ${type}#${createdAt}
  id: string;
  templateId: string;
  type: 'text' | 'email' | 'image' | 'signature' | 'checkbox' | 'date' | 'number' | 'table' | 'label' | 'QRCode' | 'separator';
  name: string;
  label: string;
  required: boolean;
  position: {
    x: number;
    y: number;
    width: number;
    height: number;
    page: number;
  };
  properties: Record<string, any>;
  validation?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface CreateFieldInput {
  templateId: string;
  userId?: string; // For compatibility with existing functions
  type: 'text' | 'email' | 'image' | 'signature' | 'checkbox' | 'date' | 'number' | 'table' | 'label' | 'QRCode' | 'separator';
  name: string;
  label: string;
  required?: boolean;
  position: {
    x: number;
    y: number;
    width: number;
    height: number;
    page: number;
  };
  properties?: Record<string, any>;
  validation?: Record<string, any>;
}

export interface UpdateFieldInput {
  type?: 'text' | 'email' | 'image' | 'signature' | 'checkbox' | 'date' | 'number' | 'table' | 'label' | 'QRCode' | 'separator';
  name?: string;
  label?: string;
  required?: boolean;
  position?: {
    x: number;
    y: number;
    width: number;
    height: number;
    page: number;
  };
  properties?: Record<string, any>;
  validation?: Record<string, any>;
}
