import { PDFGenerator } from './generator';
import {
  DataTransformer,
  FieldValidator,
  FontManager,
  FieldProcessor,
  colorUtils,
  geometryUtils,
  PDFGenerationError,
  ValidationError,
  TemplateNotFoundError,
  FieldProcessingError,
} from './utils';
import type { PDFGenerationOptions, ValidationResult } from './types';

/**
 * PDF Module - Main Export
 * Central export point for all PDF generation functionality
 */

// Core Classes
export { PDFGenerator };

// Utility Classes and Functions
export {
  DataTransformer,
  FieldValidator,
  FontManager,
  FieldProcessor,
  colorUtils,
  geometryUtils,
};

// Error Classes
export {
  PDFGenerationError,
  ValidationError,
  TemplateNotFoundError,
  FieldProcessingError,
};

// Type Definitions
export type {
  PDFGenerationRequest,
  PDFGenerationOptions,
  PDFProcessingResult,
  PDFTemplateData,
  PDFFieldDefinition,
  ProcessingError,
  ProcessingWarning,
  ValidationResult,
  FieldTransformer,
  TransformerOptions,
  FieldValidationRule,
  FieldFormatConfig,
  PDFMetadata,
  PDFSecurityConfig,
  WatermarkConfig,
  WatermarkPosition,
  FieldMappingConfig,
  FieldType,
  FieldPosition,
  FieldDimensions,
  FieldStyle,
  PDFPageDefinition,
  PageMargins,
  PageBackground,
  PDFTemplateMetadata,
  PDFTemplateSettings,
  ProcessingMetadata,
  TableData,
  TableStyle,
  SignatureConfig,
  CertificateInfo,
  FontConfig,
  FontResource,
  FontVariant,
  FontSource,
  BorderStyle,
  ColorUtils,
  GeometryUtils,
} from './types';

// Validation Schemas
export {
  PDFGenerationRequestSchema,
  PDFFieldDefinitionSchema,
  PDFTemplateDataSchema,
  TableDataSchema,
  SignatureConfigSchema,
  ProcessingErrorSchema,
  ProcessingWarningSchema,
  PDFProcessingResultSchema,
  ValidationResultSchema,
  BulkPDFGenerationRequestSchema,
  BulkPDFProcessingResultSchema,
  FieldValidationRuleSchema,
  FontConfigSchema,
  FieldStyleSchema,
  FieldPositionSchema,
  FieldDimensionsSchema,
  TransformerOptionsSchema,
  FieldTransformerSchema,
  FieldMappingConfigSchema,
} from './schemas';

// Schema Type Inference
export type {
  PDFGenerationRequestInput,
  FieldValidationRuleInput,
  PDFFieldDefinitionInput,
  PDFTemplateDataInput,
  TableDataInput,
  SignatureConfigInput,
  ProcessingErrorInput,
  ProcessingWarningInput,
  PDFProcessingResultInput,
  ValidationResultInput,
  BulkPDFGenerationRequestInput,
  BulkPDFProcessingResultInput,
} from './schemas';

// Constants
export { Colors, Fonts } from './types';

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Quick PDF generation from template
 * Simplified interface for basic PDF generation
 */
export async function generatePDF(
  templateId: string,
  data: Record<string, any>,
  options?: PDFGenerationOptions
): Promise<Buffer> {
  const generator = new PDFGenerator();
  return generator.generateFromTemplate(templateId, data, options);
}

/**
 * Validate template data compatibility
 * Check if data is compatible with template before generation
 */
export async function validateTemplateData(
  templateId: string,
  data: Record<string, any>
): Promise<ValidationResult> {
  const generator = new PDFGenerator();
  return generator.validateTemplateData(templateId, data);
}

/**
 * Create a new PDF generator instance
 * Factory function for creating generator instances
 */
export function createPDFGenerator(): PDFGenerator {
  return new PDFGenerator();
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Convert hex color to RGB
 */
export function hexToRgb(hex: string) {
  return colorUtils.hex(hex);
}

/**
 * Convert point to pixel
 */
export function pointToPixel(point: number): number {
  return geometryUtils.pointToPixel(point);
}

/**
 * Convert pixel to point
 */
export function pixelToPoint(pixel: number): number {
  return geometryUtils.pixelToPoint(pixel);
}

/**
 * Convert inches to points
 */
export function inchesToPoints(inches: number): number {
  return geometryUtils.inchToPoint(inches);
}

/**
 * Convert millimeters to points
 */
export function mmToPoints(mm: number): number {
  return geometryUtils.mmToPoint(mm);
}

/**
 * Convert centimeters to points
 */
export function cmToPoints(cm: number): number {
  return geometryUtils.cmToPoint(cm);
}
