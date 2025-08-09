/**
 * Base DynamoDB entity interface
 * All DynamoDB entities should extend this interface
 */
export interface BaseEntity {
  createdAt: string;
  updatedAt: string;
}

/**
 * Common field types used across entities
 */
export interface Position {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface Dimensions {
  width: number;
  height: number;
}

/**
 * Field types enum
 */
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

/**
 * Template status enum
 */
export type TemplateStatus = 'active' | 'archived' | 'deleted';

/**
 * Text alignment enum
 */
export type TextAlignment = 'left' | 'center' | 'right';

/**
 * Line style enum
 */
export type LineStyle = 'solid' | 'dashed' | 'dotted';

/**
 * Field visibility enum
 */
export type FieldVisibility = 'always' | 'conditional' | 'hidden';

/**
 * Validation type enum
 */
export type ValidationType = 'none' | 'email' | 'number' | 'regex';