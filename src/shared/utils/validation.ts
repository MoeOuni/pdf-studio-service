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
  fontFamily: z.string().min(1, 'Font family is required'),
  fontSize: z.number().min(1, 'Font size must be positive'),
  textColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid color format'),
  backgroundColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid color format'),
  textAlign: z.enum(['left', 'center', 'right']),
  bold: z.boolean(),
  italic: z.boolean(),
  underline: z.boolean(),
  lineThickness: z.number().min(0).optional(),
  lineStyle: z.enum(['solid', 'dashed', 'dotted']).optional(),
  opacity: z.number().min(0).max(1).optional(),
}).partial();

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

// Template schemas
export const createTemplateSchema = z.object({
  name: z.string().min(1, 'Template name is required'),
  fileName: z.string().min(1, 'File name is required'),
  pdfFileUrl: z.string().url('Invalid PDF file URL'),
  pageCount: z.number().int().min(1, 'Page count must be at least 1'),
  dimensions: dimensionsSchema,
  scale: z.number().min(0.1).max(5).default(1),
});

export const updateTemplateSchema = z.object({
  name: z.string().min(1, 'Template name is required').optional(),
  dimensions: dimensionsSchema.optional(),
  scale: z.number().min(0.1).max(5).optional(),
});

// Field schemas
export const createFieldSchema = z.object({
  templateId: uuidSchema,
  name: z.string().min(1, 'Field name is required'),
  type: fieldTypeSchema,
  page: z.number().int().min(1, 'Page number must be at least 1'),
  position: positionSchema,
  size: sizeSchema,
  bindingKey: z.string().min(1, 'Binding key is required'),
  value: z.string().optional(),
  style: fieldStyleSchema.optional(),
  layout: fieldLayoutSchema.optional(),
  advanced: fieldAdvancedSchema.optional(),
  validation: fieldValidationSchema.optional(),
  text: z.string().optional(),
  tableConfig: z.any().optional(),
});

export const updateFieldSchema = z.object({
  name: z.string().min(1, 'Field name is required').optional(),
  type: fieldTypeSchema.optional(),
  page: z.number().int().min(1, 'Page number must be at least 1').optional(),
  position: positionSchema.optional(),
  size: sizeSchema.optional(),
  bindingKey: z.string().min(1, 'Binding key is required').optional(),
  value: z.string().optional(),
  style: fieldStyleSchema.optional(),
  layout: fieldLayoutSchema.optional(),
  advanced: fieldAdvancedSchema.optional(),
  validation: fieldValidationSchema.optional(),
  text: z.string().optional(),
  tableConfig: z.any().optional(),
});

// PDF generation schema
export const generatePdfSchema = z.object({
  templateId: uuidSchema,
  payload: z.record(z.any()),
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
  pathParameters: Record<string, string> | null,
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

  return { success: true, data: pathParameters };
}