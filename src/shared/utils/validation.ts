import { z } from 'zod';

// Common validation schemas
export const emailSchema = z.string().email('Invalid email format');
export const passwordSchema = z.string().min(8, 'Password must be at least 8 characters');
export const uuidSchema = z.string().uuid('Invalid UUID format');

// Position and Size schemas
export const positionSchema = z.object({
  x: z.number().min(0, 'X position must be non-negative'),
  y: z.number().min(0, 'Y position must be non-negative'),
});

export const sizeSchema = z.object({
  width: z.number().min(1, 'Width must be positive'),
  height: z.number().min(1, 'Height must be positive'),
});

export const dimensionsSchema = z.object({
  width: z.number().min(1, 'Width must be positive'),
  height: z.number().min(1, 'Height must be positive'),
});

// Field type validation
export const fieldTypeSchema = z.enum([
  'text',
  'signature',
  'date',
  'email',
  'image',
  'table',
  'QRCode',
  'separator',
  'label'
]);

// Field style validation
export const fieldStyleSchema = z.object({
  fontFamily: z.string().min(1, 'Font family is required').optional(),
  fontSize: z.number().min(1, 'Font size must be positive').optional(),
  textColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid color format').optional(),
  backgroundColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid color format').optional(),
  textAlign: z.enum(['left', 'center', 'right']).optional(),
  bold: z.boolean().optional(),
  italic: z.boolean().optional(),
  underline: z.boolean().optional(),
  lineThickness: z.number().min(0).optional(),
  lineStyle: z.enum(['solid', 'dashed', 'dotted']).optional(),
  opacity: z.number().min(0).max(1).optional(),
});

// Field layout validation
export const fieldLayoutSchema = z.object({
  lockProportions: z.boolean(),
  layerOrder: z.number().int(),
  snapToGrid: z.boolean(),
}).partial();

// Field advanced validation
export const fieldAdvancedSchema = z.object({
  placeholder: z.string(),
  required: z.boolean(),
  multiLine: z.boolean(),
  maxLength: z.number().min(0),
  visibility: z.enum(['always', 'conditional', 'hidden']),
}).partial();

// Field validation schema
export const fieldValidationSchema = z.object({
  type: z.enum(['none', 'email', 'number', 'regex']),
  regexPattern: z.string(),
  errorMessage: z.string(),
}).partial();

// Authentication schemas
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
});

export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  name: z.string().min(1, 'Name is required').optional(),
});

// File upload schemas
export const uploadRequestSchema = z.object({
  fileName: z.string().min(1, 'File name is required'),
  fileSize: z.number().min(1, 'File size must be positive'),
  mimeType: z.string().min(1, 'MIME type is required'),
});

export const confirmUploadSchema = z.object({
  fileId: uuidSchema,
});

// Template schemas
export const createTemplateSchema = z.object({
  name: z.string().min(1, 'Template name is required').max(100, 'Template name too long'),
  description: z.string().max(500, 'Description too long').optional(),
  originalFileId: uuidSchema,
  dimensions: z.object({
    width: z.number().min(1, 'Width must be positive'),
    height: z.number().min(1, 'Height must be positive'),
  }),
  pageCount: z.number().min(1, 'Page count must be at least 1'),
  thumbnailUrl: z.string().url('Invalid thumbnail URL').optional(),
  isPublic: z.boolean().optional(),
  tags: z.array(z.string().min(1, 'Tag cannot be empty')).max(10, 'Too many tags').optional(),
  metadata: z.record(z.any()).optional(),
});

export const updateTemplateSchema = z.object({
  name: z.string().min(1, 'Template name is required').max(100, 'Template name too long').optional(),
  description: z.string().max(500, 'Description too long').optional(),
  isPublic: z.boolean().optional(),
  tags: z.array(z.string().min(1, 'Tag cannot be empty')).max(10, 'Too many tags').optional(),
  thumbnailUrl: z.string().url('Invalid thumbnail URL').optional(),
  metadata: z.record(z.any()).optional(),
});

// Field schemas
export const createFieldSchema = z.object({
  templateId: uuidSchema,
  name: z.string().min(1, 'Field name is required').max(50, 'Field name too long'),
  type: fieldTypeSchema,
  page: z.number().min(1, 'Page must be at least 1'),
  position: positionSchema,
  size: sizeSchema,
  style: fieldStyleSchema.optional(),
  validation: z.object({
    required: z.boolean().optional(),
    minLength: z.number().min(0).optional(),
    maxLength: z.number().min(1).optional(),
    pattern: z.string().optional(),
    min: z.number().optional(),
    max: z.number().optional(),
    customMessage: z.string().max(200, 'Custom message too long').optional(),
  }).optional(),
  defaultValue: z.string().max(1000, 'Default value too long').optional(),
  placeholder: z.string().max(100, 'Placeholder too long').optional(),
  isRequired: z.boolean().optional(),
  isReadonly: z.boolean().optional(),
  order: z.number().min(0).optional(),
});

export const updateFieldSchema = z.object({
  name: z.string().min(1, 'Field name is required').max(50, 'Field name too long').optional(),
  type: fieldTypeSchema.optional(),
  page: z.number().min(1, 'Page must be at least 1').optional(),
  position: positionSchema.optional(),
  size: sizeSchema.optional(),
  style: fieldStyleSchema.optional(),
  validation: z.object({
    required: z.boolean().optional(),
    minLength: z.number().min(0).optional(),
    maxLength: z.number().min(1).optional(),
    pattern: z.string().optional(),
    min: z.number().optional(),
    max: z.number().optional(),
    customMessage: z.string().max(200, 'Custom message too long').optional(),
  }).optional(),
  defaultValue: z.string().max(1000, 'Default value too long').optional(),
  placeholder: z.string().max(100, 'Placeholder too long').optional(),
  isRequired: z.boolean().optional(),
  isReadonly: z.boolean().optional(),
  order: z.number().min(0).optional(),
});

export const updateFieldsOrderSchema = z.object({
  fieldOrders: z.array(z.object({
    id: uuidSchema,
    order: z.number().min(0),
  })).min(1, 'At least one field order is required'),
});

// PDF generation schemas
export const generatePdfSchema = z.object({
  templateId: uuidSchema,
  fieldValues: z.record(z.string(), z.any()),
  outputFormat: z.enum(['pdf', 'png', 'jpeg']).default('pdf'),
});

/**
 * Validate request body against a schema
 */
export function validateRequestBody<T>(
  body: string | null,
  schema: z.ZodSchema<T>
): { success: true; data: T } | { success: false; error: string } {
  try {
    if (!body) {
      return { success: false, error: 'Request body is required' };
    }

    const parsedBody = JSON.parse(body);
    const validatedData = schema.parse(parsedBody);

    return { success: true, data: validatedData };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessages = error.errors.map(err =>
        `${err.path.join('.')}: ${err.message}`
      ).join(', ');
      return { success: false, error: errorMessages };
    }

    if (error instanceof SyntaxError) {
      return { success: false, error: 'Invalid JSON format' };
    }

    return { success: false, error: 'Validation failed' };
  }
}

/**
 * Validate path parameters
 */
export function validatePathParameters(
  pathParameters: Record<string, string | undefined> | null,
  requiredParams: string[]
): { success: true; data: Record<string, string> } | { success: false; error: string } {
  if (!pathParameters) {
    return { success: false, error: 'Path parameters are required' };
  }

  const missingParams = requiredParams.filter(param => !pathParameters[param]);

  if (missingParams.length > 0) {
    return {
      success: false,
      error: `Missing required path parameters: ${missingParams.join(', ')}`
    };
  }

  // Filter out undefined values and ensure all required params are strings
  const validatedParams: Record<string, string> = {};
  for (const param of requiredParams) {
    const value = pathParameters[param];
    if (typeof value === 'string' && value.trim() !== '') {
      validatedParams[param] = value;
    } else {
      return {
        success: false,
        error: `Invalid path parameter: ${param}`
      };
    }
  }

  return { success: true, data: validatedParams };
}