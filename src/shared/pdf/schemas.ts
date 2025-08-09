/**
 * PDF Generation Validation Schemas
 * Zod schemas for validating PDF generation requests and data
 */

import { z } from 'zod';

// ============================================================================
// Core Request Schemas
// ============================================================================

export const PDFGenerationRequestSchema = z.object({
  templateId: z.string().uuid('Template ID must be a valid UUID'),
  data: z.record(z.string(), z.any()).refine(
    (data) => Object.keys(data).length > 0,
    'Data object cannot be empty'
  ),
  options: z.object({
    outputFormat: z.enum(['buffer', 'base64', 'url']).optional().default('buffer'),
    metadata: z.object({
      title: z.string().optional(),
      author: z.string().optional(),
      subject: z.string().optional(),
      keywords: z.array(z.string()).optional(),
      creator: z.string().optional(),
      producer: z.string().optional(),
    }).optional(),
    watermark: z.object({
      text: z.string().min(1, 'Watermark text is required'),
      opacity: z.number().min(0).max(1).optional().default(0.3),
      rotation: z.number().optional().default(-45),
      fontSize: z.number().positive().optional().default(48),
      color: z.object({
        r: z.number().min(0).max(1),
        g: z.number().min(0).max(1),
        b: z.number().min(0).max(1),
      }).optional(),
      position: z.union([
        z.enum(['center', 'top-left', 'top-right', 'bottom-left', 'bottom-right']),
        z.object({
          x: z.number(),
          y: z.number(),
        }),
      ]).optional().default('center'),
    }).optional(),
    security: z.object({
      ownerPassword: z.string().optional(),
      userPassword: z.string().optional(),
      permissions: z.object({
        printing: z.boolean().optional().default(true),
        modifying: z.boolean().optional().default(false),
        copying: z.boolean().optional().default(true),
        annotating: z.boolean().optional().default(false),
        fillingForms: z.boolean().optional().default(true),
        contentAccessibility: z.boolean().optional().default(true),
        documentAssembly: z.boolean().optional().default(false),
        degradedPrinting: z.boolean().optional().default(true),
      }).optional(),
    }).optional(),
    quality: z.enum(['low', 'medium', 'high']).optional().default('medium'),
  }).optional().default({}),
});

// ============================================================================
// Field Type Schemas
// ============================================================================

export const FieldValidationRuleSchema = z.object({
  type: z.enum(['required', 'minLength', 'maxLength', 'pattern', 'custom']),
  value: z.any().optional(),
  message: z.string().optional(),
  customValidator: z.function().optional(),
});

export const FontConfigSchema = z.object({
  family: z.string().optional().default('Helvetica'),
  size: z.number().positive().optional().default(12),
  weight: z.enum(['normal', 'bold']).optional().default('normal'),
  style: z.enum(['normal', 'italic']).optional().default('normal'),
});

export const FieldStyleSchema = z.object({
  font: FontConfigSchema.optional(),
  color: z.object({
    r: z.number().min(0).max(1),
    g: z.number().min(0).max(1),
    b: z.number().min(0).max(1),
  }).optional(),
  backgroundColor: z.object({
    r: z.number().min(0).max(1),
    g: z.number().min(0).max(1),
    b: z.number().min(0).max(1),
  }).optional(),
  borderColor: z.object({
    r: z.number().min(0).max(1),
    g: z.number().min(0).max(1),
    b: z.number().min(0).max(1),
  }).optional(),
  borderWidth: z.number().min(0).optional(),
  borderStyle: z.enum(['solid', 'dashed', 'dotted']).optional().default('solid'),
  padding: z.union([
    z.number().min(0),
    z.object({
      top: z.number().min(0),
      right: z.number().min(0),
      bottom: z.number().min(0),
      left: z.number().min(0),
    }),
  ]).optional(),
  alignment: z.enum(['left', 'center', 'right', 'justify']).optional().default('left'),
  verticalAlignment: z.enum(['top', 'middle', 'bottom']).optional().default('top'),
  opacity: z.number().min(0).max(1).optional().default(1),
});

export const FieldPositionSchema = z.object({
  x: z.number().min(0),
  y: z.number().min(0),
  rotation: z.number().optional().default(0),
});

export const FieldDimensionsSchema = z.object({
  width: z.number().positive(),
  height: z.number().positive(),
});

export const PDFFieldDefinitionSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1, 'Field name is required'),
  type: z.enum([
    'text',
    'multiline-text',
    'number',
    'date',
    'checkbox',
    'radio',
    'dropdown',
    'image',
    'signature',
    'qrcode',
    'barcode',
    'table',
  ]),
  page: z.number().positive().default(1),
  position: FieldPositionSchema,
  dimensions: FieldDimensionsSchema,
  style: FieldStyleSchema.optional().default({}),
  validation: z.array(FieldValidationRuleSchema).optional().default([]),
  defaultValue: z.any().optional(),
  placeholder: z.string().optional(),
  required: z.boolean().optional().default(false),
});

// ============================================================================
// Data Transformation Schemas
// ============================================================================

export const TransformerOptionsSchema = z.object({
  // Text transformers
  uppercase: z.boolean().optional(),
  lowercase: z.boolean().optional(),
  capitalize: z.boolean().optional(),
  truncate: z.number().positive().optional(),
  prefix: z.string().optional(),
  suffix: z.string().optional(),
  
  // Number transformers
  decimals: z.number().min(0).max(10).optional().default(2),
  thousandsSeparator: z.string().optional().default(','),
  decimalSeparator: z.string().optional().default('.'),
  
  // Date transformers
  dateFormat: z.string().optional().default('YYYY-MM-DD'),
  timezone: z.string().optional(),
  locale: z.string().optional().default('en-US'),
  
  // Currency transformers
  currency: z.string().length(3).optional().default('USD'),
  currencyDisplay: z.enum(['symbol', 'code', 'name']).optional().default('symbol'),
  
  // Boolean transformers
  trueText: z.string().optional().default('Yes'),
  falseText: z.string().optional().default('No'),
  
  // Image transformers
  maxWidth: z.number().positive().optional(),
  maxHeight: z.number().positive().optional(),
  aspectRatio: z.enum(['preserve', 'fill', 'fit']).optional().default('preserve'),
  
  // QR/Barcode transformers
  errorCorrectionLevel: z.enum(['L', 'M', 'Q', 'H']).optional().default('M'),
  margin: z.number().min(0).optional().default(4),
  scale: z.number().positive().optional().default(4),
});

export const FieldTransformerSchema = z.object({
  type: z.enum(['text', 'number', 'date', 'currency', 'boolean', 'image', 'qrcode', 'barcode']),
  options: TransformerOptionsSchema.optional().default({}),
});

export const FieldMappingConfigSchema = z.object({
  fieldId: z.string().uuid(),
  dataPath: z.string().min(1, 'Data path is required'),
  transformer: FieldTransformerSchema.optional(),
  validation: z.array(FieldValidationRuleSchema).optional().default([]),
  formatting: FieldStyleSchema.optional(),
});

// ============================================================================
// Template Schemas
// ============================================================================

export const PageMarginSchema = z.object({
  top: z.number().min(0),
  right: z.number().min(0),
  bottom: z.number().min(0),
  left: z.number().min(0),
});

export const PageBackgroundSchema = z.object({
  color: z.object({
    r: z.number().min(0).max(1),
    g: z.number().min(0).max(1),
    b: z.number().min(0).max(1),
  }).optional(),
  image: z.string().url().optional(),
  opacity: z.number().min(0).max(1).optional().default(1),
});

export const PDFPageDefinitionSchema = z.object({
  number: z.number().positive(),
  width: z.number().positive(),
  height: z.number().positive(),
  orientation: z.enum(['portrait', 'landscape']).optional().default('portrait'),
  margins: PageMarginSchema.optional().default({
    top: 72,
    right: 72,
    bottom: 72,
    left: 72,
  }),
  background: PageBackgroundSchema.optional(),
});

export const PDFTemplateMetadataSchema = z.object({
  version: z.string().default('1.0.0'),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  createdBy: z.string().uuid(),
  tags: z.array(z.string()).optional().default([]),
  category: z.string().optional(),
});

export const PDFTemplateSettingsSchema = z.object({
  defaultFont: FontConfigSchema.optional(),
  defaultColor: z.object({
    r: z.number().min(0).max(1),
    g: z.number().min(0).max(1),
    b: z.number().min(0).max(1),
  }).optional(),
  allowOverflow: z.boolean().optional().default(false),
  autoResize: z.boolean().optional().default(true),
  quality: z.enum(['low', 'medium', 'high']).optional().default('medium'),
  compression: z.boolean().optional().default(true),
});

export const PDFTemplateDataSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1, 'Template name is required'),
  description: z.string().optional(),
  templateUrl: z.string().url('Template URL must be valid'),
  fields: z.array(PDFFieldDefinitionSchema).default([]),
  pages: z.array(PDFPageDefinitionSchema).min(1, 'At least one page is required'),
  metadata: PDFTemplateMetadataSchema,
  settings: PDFTemplateSettingsSchema.optional().default({}),
});

// ============================================================================
// Table Data Schemas
// ============================================================================

export const BorderStyleSchema = z.object({
  width: z.number().min(0),
  color: z.object({
    r: z.number().min(0).max(1),
    g: z.number().min(0).max(1),
    b: z.number().min(0).max(1),
  }),
  style: z.enum(['solid', 'dashed', 'dotted']).default('solid'),
});

export const TableStyleSchema = z.object({
  headerStyle: FieldStyleSchema.optional(),
  rowStyle: FieldStyleSchema.optional(),
  alternatingRowStyle: FieldStyleSchema.optional(),
  borderStyle: BorderStyleSchema.optional(),
  cellPadding: z.number().min(0).optional().default(4),
  columnWidths: z.array(z.number().positive()).optional(),
});

export const TableDataSchema = z.object({
  headers: z.array(z.string()).min(1, 'At least one header is required'),
  rows: z.array(z.array(z.any())),
  style: TableStyleSchema.optional(),
});

// ============================================================================
// Signature Schemas
// ============================================================================

export const CertificateInfoSchema = z.object({
  signerName: z.string().min(1, 'Signer name is required'),
  signerEmail: z.string().email().optional(),
  signingDate: z.string().datetime(),
  reason: z.string().optional(),
  location: z.string().optional(),
});

export const SignatureConfigSchema = z.object({
  type: z.enum(['image', 'drawn', 'typed']),
  imageUrl: z.string().url().optional(),
  signatureData: z.string().optional(),
  timestamp: z.boolean().optional().default(false),
  certificateInfo: CertificateInfoSchema.optional(),
});

// ============================================================================
// Processing Result Schemas
// ============================================================================

export const ProcessingErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
  field: z.string().optional(),
  page: z.number().optional(),
  severity: z.enum(['error', 'warning']),
  details: z.any().optional(),
});

export const ProcessingWarningSchema = z.object({
  code: z.string(),
  message: z.string(),
  field: z.string().optional(),
  page: z.number().optional(),
  suggestion: z.string().optional(),
});

export const ProcessingMetadataSchema = z.object({
  templateId: z.string().uuid(),
  generatedAt: z.string().datetime(),
  processingTime: z.number().min(0),
  fileSize: z.number().min(0),
  pageCount: z.number().positive(),
  fieldsProcessed: z.number().min(0),
  fieldsSkipped: z.number().min(0),
  version: z.string(),
});

export const PDFProcessingResultSchema = z.object({
  success: z.boolean(),
  pdfBuffer: z.instanceof(Buffer).optional(),
  pdfBase64: z.string().optional(),
  downloadUrl: z.string().url().optional(),
  metadata: ProcessingMetadataSchema,
  errors: z.array(ProcessingErrorSchema).optional(),
  warnings: z.array(ProcessingWarningSchema).optional(),
});

// ============================================================================
// Validation Result Schema
// ============================================================================

export const ValidationResultSchema = z.object({
  isValid: z.boolean(),
  errors: z.array(z.string()),
  warnings: z.array(z.string()),
});

// ============================================================================
// Common Field Value Schemas
// ============================================================================

export const TextFieldValueSchema = z.string();
export const NumberFieldValueSchema = z.number();
export const DateFieldValueSchema = z.union([z.string().datetime(), z.date()]);
export const BooleanFieldValueSchema = z.boolean();
export const ImageFieldValueSchema = z.union([
  z.string().url(),
  z.string().startsWith('data:image/'),
]);
export const QRCodeFieldValueSchema = z.string().min(1);
export const CheckboxFieldValueSchema = z.boolean();
export const DropdownFieldValueSchema = z.string();

// ============================================================================
// Bulk Processing Schemas
// ============================================================================

export const BulkPDFGenerationRequestSchema = z.object({
  templateId: z.string().uuid(),
  dataArray: z.array(z.record(z.string(), z.any())).min(1, 'At least one data record is required'),
  options: PDFGenerationRequestSchema.shape.options.optional(),
  batchOptions: z.object({
    concurrent: z.number().min(1).max(10).optional().default(3),
    failFast: z.boolean().optional().default(false),
    includeIndex: z.boolean().optional().default(true),
  }).optional().default({}),
});

export const BulkPDFProcessingResultSchema = z.object({
  success: z.boolean(),
  totalRequests: z.number().min(0),
  successfulRequests: z.number().min(0),
  failedRequests: z.number().min(0),
  results: z.array(z.object({
    index: z.number(),
    success: z.boolean(),
    result: PDFProcessingResultSchema.optional(),
    error: z.string().optional(),
  })),
  processingTime: z.number().min(0),
});

// ============================================================================
// Export Type Helpers
// ============================================================================

export type PDFGenerationRequestInput = z.infer<typeof PDFGenerationRequestSchema>;
export type FieldValidationRuleInput = z.infer<typeof FieldValidationRuleSchema>;
export type PDFFieldDefinitionInput = z.infer<typeof PDFFieldDefinitionSchema>;
export type PDFTemplateDataInput = z.infer<typeof PDFTemplateDataSchema>;
export type TableDataInput = z.infer<typeof TableDataSchema>;
export type SignatureConfigInput = z.infer<typeof SignatureConfigSchema>;
export type ProcessingErrorInput = z.infer<typeof ProcessingErrorSchema>;
export type ProcessingWarningInput = z.infer<typeof ProcessingWarningSchema>;
export type PDFProcessingResultInput = z.infer<typeof PDFProcessingResultSchema>;
export type ValidationResultInput = z.infer<typeof ValidationResultSchema>;
export type BulkPDFGenerationRequestInput = z.infer<typeof BulkPDFGenerationRequestSchema>;
export type BulkPDFProcessingResultInput = z.infer<typeof BulkPDFProcessingResultSchema>;
