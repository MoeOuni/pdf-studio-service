/**
 * PDF Generation Types and Interfaces
 * Comprehensive type definitions for PDF creation, field mapping, and styling
 */

import { rgb, RGB } from 'pdf-lib';

// ============================================================================
// Core PDF Types
// ============================================================================

export interface PDFGenerationRequest {
  templateId: string;
  data: Record<string, any>;
  options?: PDFGenerationOptions;
}

export interface PDFGenerationOptions {
  outputFormat?: 'buffer' | 'base64' | 'url';
  metadata?: PDFMetadata;
  watermark?: WatermarkConfig;
  security?: PDFSecurityConfig;
  quality?: 'low' | 'medium' | 'high';
}

export interface PDFMetadata {
  title?: string;
  author?: string;
  subject?: string;
  keywords?: string[];
  creator?: string;
  producer?: string;
}

export interface PDFSecurityConfig {
  ownerPassword?: string;
  userPassword?: string;
  permissions?: {
    printing?: boolean;
    modifying?: boolean;
    copying?: boolean;
    annotating?: boolean;
    fillingForms?: boolean;
    contentAccessibility?: boolean;
    documentAssembly?: boolean;
    degradedPrinting?: boolean;
  };
}

export interface WatermarkConfig {
  text: string;
  opacity?: number;
  rotation?: number;
  fontSize?: number;
  color?: RGB;
  position?: WatermarkPosition;
}

export type WatermarkPosition = 
  | 'center' 
  | 'top-left' 
  | 'top-right' 
  | 'bottom-left' 
  | 'bottom-right'
  | { x: number; y: number };

// ============================================================================
// Field Mapping and Data Types
// ============================================================================

export interface FieldMappingConfig {
  fieldId: string;
  dataPath: string; // JSONPath-like string for nested data access
  transformer?: FieldTransformer;
  validation?: FieldValidationRule[];
  formatting?: FieldFormatConfig;
}

export interface FieldTransformer {
  type: 'text' | 'number' | 'date' | 'currency' | 'boolean' | 'image' | 'qrcode' | 'barcode';
  options?: TransformerOptions;
}

export interface TransformerOptions {
  // Text transformers
  uppercase?: boolean;
  lowercase?: boolean;
  capitalize?: boolean;
  truncate?: number;
  prefix?: string;
  suffix?: string;
  
  // Number transformers
  decimals?: number;
  thousandsSeparator?: string;
  decimalSeparator?: string;
  
  // Date transformers
  dateFormat?: string;
  timezone?: string;
  locale?: string;
  
  // Currency transformers
  currency?: string;
  currencyDisplay?: 'symbol' | 'code' | 'name';
  
  // Boolean transformers
  trueText?: string;
  falseText?: string;
  
  // Image transformers
  maxWidth?: number;
  maxHeight?: number;
  aspectRatio?: 'preserve' | 'fill' | 'fit';
  
  // QR/Barcode transformers
  errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
  margin?: number;
  scale?: number;
}

export interface FieldValidationRule {
  type: 'required' | 'minLength' | 'maxLength' | 'pattern' | 'custom';
  value?: any;
  message?: string;
  customValidator?: (value: any) => boolean | string;
}

export interface FieldFormatConfig {
  font?: FontConfig;
  color?: RGB;
  alignment?: 'left' | 'center' | 'right' | 'justify';
  lineHeight?: number;
  letterSpacing?: number;
  wordSpacing?: number;
}

export interface FontConfig {
  family?: string;
  size?: number;
  weight?: 'normal' | 'bold';
  style?: 'normal' | 'italic';
}

// ============================================================================
// Template and Layout Types
// ============================================================================

export interface PDFTemplateData {
  id: string;
  name: string;
  description?: string;
  templateUrl: string; // S3 URL to the base PDF template
  fields: PDFFieldDefinition[];
  pages: PDFPageDefinition[];
  metadata: PDFTemplateMetadata;
  settings: PDFTemplateSettings;
}

export interface PDFFieldDefinition {
  id: string;
  name: string;
  type: FieldType;
  page: number;
  position: FieldPosition;
  dimensions: FieldDimensions;
  style: FieldStyle;
  validation?: FieldValidationRule[];
  defaultValue?: any;
  placeholder?: string;
  required?: boolean;
}

export type FieldType = 
  | 'text' 
  | 'multiline-text' 
  | 'number' 
  | 'date' 
  | 'checkbox' 
  | 'radio' 
  | 'dropdown' 
  | 'image' 
  | 'signature' 
  | 'qrcode' 
  | 'barcode'
  | 'table';

export interface FieldPosition {
  x: number;
  y: number;
  rotation?: number;
}

export interface FieldDimensions {
  width: number;
  height: number;
}

export interface FieldStyle {
  font?: FontConfig;
  color?: RGB;
  backgroundColor?: RGB;
  borderColor?: RGB;
  borderWidth?: number;
  borderStyle?: 'solid' | 'dashed' | 'dotted';
  padding?: number | { top: number; right: number; bottom: number; left: number };
  alignment?: 'left' | 'center' | 'right' | 'justify';
  verticalAlignment?: 'top' | 'middle' | 'bottom';
  opacity?: number;
}

export interface PDFPageDefinition {
  number: number;
  width: number;
  height: number;
  orientation?: 'portrait' | 'landscape';
  margins?: PageMargins;
  background?: PageBackground;
}

export interface PageMargins {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface PageBackground {
  color?: RGB;
  image?: string; // URL or base64
  opacity?: number;
}

export interface PDFTemplateMetadata {
  version: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  tags?: string[];
  category?: string;
}

export interface PDFTemplateSettings {
  defaultFont?: FontConfig;
  defaultColor?: RGB;
  allowOverflow?: boolean;
  autoResize?: boolean;
  quality?: 'low' | 'medium' | 'high';
  compression?: boolean;
}

// ============================================================================
// Processing and Result Types
// ============================================================================

export interface PDFProcessingResult {
  success: boolean;
  pdfBuffer?: Buffer;
  pdfBase64?: string;
  downloadUrl?: string;
  metadata: ProcessingMetadata;
  errors?: ProcessingError[];
  warnings?: ProcessingWarning[];
}

export interface ProcessingMetadata {
  templateId: string;
  generatedAt: string;
  processingTime: number; // milliseconds
  fileSize: number; // bytes
  pageCount: number;
  fieldsProcessed: number;
  fieldsSkipped: number;
  version: string;
}

export interface ProcessingError {
  code: string;
  message: string;
  field?: string;
  page?: number;
  severity: 'error' | 'warning';
  details?: any;
}

export interface ProcessingWarning {
  code: string;
  message: string;
  field?: string;
  page?: number;
  suggestion?: string;
}

// ============================================================================
// Font and Resource Types
// ============================================================================

export interface FontResource {
  family: string;
  variants: FontVariant[];
  source: FontSource;
}

export interface FontVariant {
  weight: 'normal' | 'bold';
  style: 'normal' | 'italic';
  url?: string;
  buffer?: Buffer;
}

export interface FontSource {
  type: 'system' | 'web' | 's3' | 'embedded';
  url?: string;
  fallback?: string[];
}

// ============================================================================
// Advanced Features
// ============================================================================

export interface TableData {
  headers: string[];
  rows: any[][];
  style?: TableStyle;
}

export interface TableStyle {
  headerStyle?: FieldStyle;
  rowStyle?: FieldStyle;
  alternatingRowStyle?: FieldStyle;
  borderStyle?: BorderStyle;
  cellPadding?: number;
  columnWidths?: number[];
}

export interface BorderStyle {
  width: number;
  color: RGB;
  style: 'solid' | 'dashed' | 'dotted';
}

export interface SignatureConfig {
  type: 'image' | 'drawn' | 'typed';
  imageUrl?: string;
  signatureData?: string; // Base64 or SVG data
  timestamp?: boolean;
  certificateInfo?: CertificateInfo;
}

export interface CertificateInfo {
  signerName: string;
  signerEmail?: string;
  signingDate: string;
  reason?: string;
  location?: string;
}

// ============================================================================
// Utility and Helper Types
// ============================================================================

export interface ColorUtils {
  hex: (hexColor: string) => RGB;
  rgba: (r: number, g: number, b: number, a?: number) => RGB;
  hsl: (h: number, s: number, l: number) => RGB;
}

export interface GeometryUtils {
  pointToPixel: (point: number) => number;
  pixelToPoint: (pixel: number) => number;
  inchToPoint: (inch: number) => number;
  mmToPoint: (mm: number) => number;
  cmToPoint: (cm: number) => number;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

// ============================================================================
// Export commonly used color constants
// ============================================================================

export const Colors = {
  BLACK: rgb(0, 0, 0),
  WHITE: rgb(1, 1, 1),
  RED: rgb(1, 0, 0),
  GREEN: rgb(0, 1, 0),
  BLUE: rgb(0, 0, 1),
  GRAY: rgb(0.5, 0.5, 0.5),
  LIGHT_GRAY: rgb(0.8, 0.8, 0.8),
  DARK_GRAY: rgb(0.3, 0.3, 0.3),
} as const;

export const Fonts = {
  HELVETICA: 'Helvetica',
  HELVETICA_BOLD: 'Helvetica-Bold',
  HELVETICA_OBLIQUE: 'Helvetica-Oblique',
  HELVETICA_BOLD_OBLIQUE: 'Helvetica-BoldOblique',
  TIMES_ROMAN: 'Times-Roman',
  TIMES_BOLD: 'Times-Bold',
  TIMES_ITALIC: 'Times-Italic',
  TIMES_BOLD_ITALIC: 'Times-BoldItalic',
  COURIER: 'Courier',
  COURIER_BOLD: 'Courier-Bold',
  COURIER_OBLIQUE: 'Courier-Oblique',
  COURIER_BOLD_OBLIQUE: 'Courier-BoldOblique',
} as const;
