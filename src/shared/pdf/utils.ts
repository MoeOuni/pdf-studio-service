/**
 * PDF Generation Utilities
 * Core utilities for PDF creation, field processing, and data transformation
 */

import { rgb, RGB, PDFDocument, PDFPage, PDFFont, StandardFonts } from 'pdf-lib';
import * as QRCode from 'qrcode';
import {
  PDFFieldDefinition,
  FieldTransformer,
  TransformerOptions,
  FieldValidationRule,
  ValidationResult,
  ColorUtils,
  GeometryUtils,
  Colors,
  TableData,
  ProcessingError,
  ProcessingWarning,
  SignatureConfig,
} from './types';

// ============================================================================
// Color Utilities
// ============================================================================

export const colorUtils: ColorUtils = {
  hex: (hexColor: string): RGB => {
    const hex = hexColor.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16) / 255;
    const g = parseInt(hex.substr(2, 2), 16) / 255;
    const b = parseInt(hex.substr(4, 2), 16) / 255;
    return rgb(r, g, b);
  },

  rgba: (r: number, g: number, b: number, _a: number = 1): RGB => {
    return rgb(r / 255, g / 255, b / 255);
  },

  hsl: (h: number, s: number, l: number): RGB => {
    h = h / 360;
    s = s / 100;
    l = l / 100;

    const hue2rgb = (p: number, q: number, t: number): number => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };

    let r: number, g: number, b: number;

    if (s === 0) {
      r = g = b = l; // achromatic
    } else {
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1/3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1/3);
    }

    return rgb(r, g, b);
  },
};

// ============================================================================
// Geometry Utilities
// ============================================================================

export const geometryUtils: GeometryUtils = {
  pointToPixel: (point: number): number => point * 96 / 72,
  pixelToPoint: (pixel: number): number => pixel * 72 / 96,
  inchToPoint: (inch: number): number => inch * 72,
  mmToPoint: (mm: number): number => mm * 72 / 25.4,
  cmToPoint: (cm: number): number => cm * 72 / 2.54,
};

// ============================================================================
// Data Transformation Utilities
// ============================================================================

export class DataTransformer {
  /**
   * Transform a value based on the field transformer configuration
   */
  static transform(value: any, transformer?: FieldTransformer): any {
    if (!transformer || value === null || value === undefined) {
      return value;
    }

    const { type, options = {} } = transformer;

    switch (type) {
      case 'text':
        return this.transformText(String(value), options);
      
      case 'number':
        return this.transformNumber(Number(value), options);
      
      case 'date':
        return this.transformDate(new Date(value), options);
      
      case 'currency':
        return this.transformCurrency(Number(value), options);
      
      case 'boolean':
        return this.transformBoolean(Boolean(value), options);
      
      case 'image':
        return this.transformImage(value, options);
      
      case 'qrcode':
        return this.transformQRCode(String(value), options);
      
      case 'barcode':
        return this.transformBarcode(String(value), options);
      
      default:
        return value;
    }
  }

  /**
   * Transform text value with various text formatting options
   */
  private static transformText(value: string, options: TransformerOptions): string {
    let result = value;

    if (options.uppercase) {
      result = result.toUpperCase();
    }

    if (options.lowercase) {
      result = result.toLowerCase();
    }

    if (options.capitalize) {
      result = result.charAt(0).toUpperCase() + result.slice(1).toLowerCase();
    }

    if (options.truncate && result.length > options.truncate) {
      result = result.substring(0, options.truncate) + '...';
    }

    if (options.prefix) {
      result = options.prefix + result;
    }

    if (options.suffix) {
      result = result + options.suffix;
    }

    return result;
  }

  /**
   * Transform number value with formatting options
   */
  private static transformNumber(value: number, options: TransformerOptions): string {
    const decimals = options.decimals ?? 2;
    const thousandsSeparator = options.thousandsSeparator ?? ',';
    const decimalSeparator = options.decimalSeparator ?? '.';

    let result = value.toFixed(decimals);
    
    // Replace decimal separator
    if (decimalSeparator !== '.') {
      result = result.replace('.', decimalSeparator);
    }

    // Add thousands separator
    if (thousandsSeparator) {
      const parts = result.split(decimalSeparator);
      if (parts[0]) {
        parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, thousandsSeparator);
      }
      result = parts.join(decimalSeparator);
    }

    return result;
  }

  /**
   * Transform date value with formatting options
   */
  private static transformDate(value: Date, options: TransformerOptions): string {
    const format = options.dateFormat ?? 'YYYY-MM-DD';

    try {
      if (format === 'ISO') {
        return value.toISOString();
      }

      // Simple date formatting - in production, use a library like date-fns
      const year = value.getFullYear();
      const month = String(value.getMonth() + 1).padStart(2, '0');
      const day = String(value.getDate()).padStart(2, '0');
      const hours = String(value.getHours()).padStart(2, '0');
      const minutes = String(value.getMinutes()).padStart(2, '0');
      const seconds = String(value.getSeconds()).padStart(2, '0');

      return format
        .replace('YYYY', String(year))
        .replace('MM', month)
        .replace('DD', day)
        .replace('HH', hours)
        .replace('mm', minutes)
        .replace('ss', seconds);
    } catch (error) {
      return value.toString();
    }
  }

  /**
   * Transform currency value with formatting options
   */
  private static transformCurrency(value: number, options: TransformerOptions): string {
    const currency = options.currency ?? 'USD';
    const locale = options.locale ?? 'en-US';
    const display = options.currencyDisplay ?? 'symbol';

    try {
      return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency,
        currencyDisplay: display,
      }).format(value);
    } catch (error) {
      return `${currency} ${value.toFixed(2)}`;
    }
  }

  /**
   * Transform boolean value with custom text options
   */
  private static transformBoolean(value: boolean, options: TransformerOptions): string {
    const trueText = options.trueText ?? 'Yes';
    const falseText = options.falseText ?? 'No';
    return value ? trueText : falseText;
  }

  /**
   * Transform image value (placeholder for image processing)
   */
  private static transformImage(value: any, options: TransformerOptions): any {
    // Image transformation would involve resizing, format conversion, etc.
    // This is a placeholder for more complex image processing
    return {
      ...value,
      maxWidth: options.maxWidth,
      maxHeight: options.maxHeight,
      aspectRatio: options.aspectRatio ?? 'preserve',
    };
  }

  /**
   * Generate QR code from text value
   */
  private static async transformQRCode(value: string, options: TransformerOptions): Promise<string> {
    try {
      const qrOptions = {
        errorCorrectionLevel: options.errorCorrectionLevel ?? 'M',
        margin: options.margin ?? 4,
        scale: options.scale ?? 4,
        width: 200,
      };

      return await QRCode.toDataURL(value, qrOptions);
    } catch (error) {
      console.error('QR Code generation failed:', error);
      return value; // Return original value if QR generation fails
    }
  }

  /**
   * Generate barcode from text value (placeholder)
   */
  private static transformBarcode(value: string, options: TransformerOptions): any {
    // Placeholder for barcode generation
    // In production, use a barcode library like jsbarcode
    return {
      value,
      type: 'code128',
      options,
    };
  }

  /**
   * Get nested value from object using dot notation path
   */
  static getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : undefined;
    }, obj);
  }
}

// ============================================================================
// Field Validation Utilities
// ============================================================================

export class FieldValidator {
  /**
   * Validate field value against validation rules
   */
  static validate(value: any, rules: FieldValidationRule[] = []): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    for (const rule of rules) {
      const result = this.validateRule(value, rule);
      
      if (result.error) {
        errors.push(result.error);
      }
      
      if (result.warning) {
        warnings.push(result.warning);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validate a single rule
   */
  private static validateRule(value: any, rule: FieldValidationRule): { error?: string; warning?: string } {
    const { type, value: ruleValue, message, customValidator } = rule;

    switch (type) {
      case 'required':
        if (value === null || value === undefined || value === '') {
          return { error: message ?? 'Field is required' };
        }
        break;

      case 'minLength':
        if (typeof value === 'string' && value.length < (ruleValue as number)) {
          return { error: message ?? `Minimum length is ${ruleValue}` };
        }
        break;

      case 'maxLength':
        if (typeof value === 'string' && value.length > (ruleValue as number)) {
          return { error: message ?? `Maximum length is ${ruleValue}` };
        }
        break;

      case 'pattern':
        if (typeof value === 'string' && ruleValue instanceof RegExp) {
          if (!ruleValue.test(value)) {
            return { error: message ?? 'Invalid format' };
          }
        }
        break;

      case 'custom':
        if (customValidator) {
          const result = customValidator(value);
          if (result !== true) {
            return { error: typeof result === 'string' ? result : (message ?? 'Validation failed') };
          }
        }
        break;
    }

    return {};
  }
}

// ============================================================================
// Font Management Utilities
// ============================================================================

export class FontManager {
  private static fontCache = new Map<string, PDFFont>();

  /**
   * Get or load a font for the PDF document
   */
  static async getFont(doc: PDFDocument, fontFamily: string): Promise<PDFFont> {
    const cacheKey = `${fontFamily}`;
    
    if (this.fontCache.has(cacheKey)) {
      return this.fontCache.get(cacheKey)!;
    }

    let font: PDFFont;

    // Map common font names to standard fonts
    switch (fontFamily.toLowerCase()) {
      case 'helvetica':
      case 'arial':
      case 'sans-serif':
        font = await doc.embedFont(StandardFonts.Helvetica);
        break;
      
      case 'helvetica-bold':
      case 'arial-bold':
        font = await doc.embedFont(StandardFonts.HelveticaBold);
        break;
      
      case 'times':
      case 'times-roman':
      case 'serif':
        font = await doc.embedFont(StandardFonts.TimesRoman);
        break;
      
      case 'times-bold':
        font = await doc.embedFont(StandardFonts.TimesRomanBold);
        break;
      
      case 'courier':
      case 'monospace':
        font = await doc.embedFont(StandardFonts.Courier);
        break;
      
      case 'courier-bold':
        font = await doc.embedFont(StandardFonts.CourierBold);
        break;
      
      default:
        // Default to Helvetica if font not found
        font = await doc.embedFont(StandardFonts.Helvetica);
    }

    this.fontCache.set(cacheKey, font);
    return font;
  }

  /**
   * Clear font cache
   */
  static clearCache(): void {
    this.fontCache.clear();
  }
}

// ============================================================================
// PDF Field Processors
// ============================================================================

export class FieldProcessor {
  /**
   * Process and render a field on a PDF page
   */
  static async renderField(
    page: PDFPage,
    field: PDFFieldDefinition,
    value: any,
    doc: PDFDocument
  ): Promise<{ errors: ProcessingError[]; warnings: ProcessingWarning[] }> {
    const errors: ProcessingError[] = [];
    const warnings: ProcessingWarning[] = [];

    try {
      switch (field.type) {
        case 'text':
        case 'multiline-text':
          await this.renderTextField(page, field, value, doc);
          break;
        
        case 'number':
          await this.renderNumberField(page, field, value, doc);
          break;
        
        case 'date':
          await this.renderDateField(page, field, value, doc);
          break;
        
        case 'checkbox':
          await this.renderCheckboxField(page, field, value, doc);
          break;
        
        case 'image':
          await this.renderImageField(page, field, value, doc);
          break;
        
        case 'qrcode':
          await this.renderQRCodeField(page, field, value, doc);
          break;
        
        case 'table':
          await this.renderTableField(page, field, value, doc);
          break;
        
        case 'signature':
          await this.renderSignatureField(page, field, value, doc);
          break;
        
        default:
          warnings.push({
            code: 'UNSUPPORTED_FIELD_TYPE',
            message: `Field type '${field.type}' is not supported`,
            field: field.id,
          });
      }
    } catch (error) {
      errors.push({
        code: 'FIELD_PROCESSING_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error',
        field: field.id,
        severity: 'error',
        details: error,
      });
    }

    return { errors, warnings };
  }

  /**
   * Render text field
   */
  private static async renderTextField(
    page: PDFPage,
    field: PDFFieldDefinition,
    value: any,
    doc: PDFDocument
  ): Promise<void> {
    const text = String(value || field.defaultValue || '');
    const font = await FontManager.getFont(doc, field.style.font?.family || 'Helvetica');
    const fontSize = field.style.font?.size || 12;
    const color = field.style.color || Colors.BLACK;

    if (field.type === 'multiline-text') {
      // Handle multiline text with word wrapping
      const lines = this.wrapText(text, field.dimensions.width, font, fontSize);
      let yPosition = field.position.y;

      for (const line of lines) {
        if (yPosition < field.position.y - field.dimensions.height) break;
        
        page.drawText(line, {
          x: field.position.x,
          y: yPosition,
          size: fontSize,
          font,
          color,
        });
        
        yPosition -= fontSize * 1.2; // Line height
      }
    } else {
      // Single line text
      page.drawText(text, {
        x: field.position.x,
        y: field.position.y,
        size: fontSize,
        font,
        color,
      });
    }
  }

  /**
   * Render number field
   */
  private static async renderNumberField(
    page: PDFPage,
    field: PDFFieldDefinition,
    value: any,
    doc: PDFDocument
  ): Promise<void> {
    const numValue = Number(value || field.defaultValue || 0);
    const formattedValue = numValue.toLocaleString();
    await this.renderTextField(page, field, formattedValue, doc);
  }

  /**
   * Render date field
   */
  private static async renderDateField(
    page: PDFPage,
    field: PDFFieldDefinition,
    value: any,
    doc: PDFDocument
  ): Promise<void> {
    const dateValue = new Date(value || field.defaultValue || new Date());
    const formattedValue = dateValue.toLocaleDateString();
    await this.renderTextField(page, field, formattedValue, doc);
  }

  /**
   * Render checkbox field
   */
  private static async renderCheckboxField(
    page: PDFPage,
    field: PDFFieldDefinition,
    value: any,
    doc: PDFDocument
  ): Promise<void> {
    const isChecked = Boolean(value);
    const size = Math.min(field.dimensions.width, field.dimensions.height);
    
    // Draw checkbox border
    page.drawRectangle({
      x: field.position.x,
      y: field.position.y,
      width: size,
      height: size,
      borderColor: field.style.borderColor || Colors.BLACK,
      borderWidth: field.style.borderWidth || 1,
    });

    // Draw checkmark if checked
    if (isChecked) {
      const font = await FontManager.getFont(doc, 'Helvetica');
      page.drawText('✓', {
        x: field.position.x + size * 0.2,
        y: field.position.y + size * 0.2,
        size: size * 0.6,
        font,
        color: field.style.color || Colors.BLACK,
      });
    }
  }

  /**
   * Render image field
   */
  private static async renderImageField(
    page: PDFPage,
    field: PDFFieldDefinition,
    value: any,
    doc: PDFDocument
  ): Promise<void> {
    try {
      if (!value || typeof value !== 'string') return;

      let imageBytes: Uint8Array;
      
      if (value.startsWith('data:image/')) {
        // Base64 image
        const base64Data = value.split(',')[1];
        if (!base64Data) {
          console.warn('Invalid base64 image data');
          return;
        }
        imageBytes = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
      } else {
        // URL - would need to fetch in production
        console.warn('URL-based images not implemented in this example');
        return;
      }

      let image;
      if (value.includes('image/png') || value.includes('image/jpeg')) {
        if (value.includes('image/png')) {
          image = await doc.embedPng(imageBytes);
        } else {
          image = await doc.embedJpg(imageBytes);
        }

        page.drawImage(image, {
          x: field.position.x,
          y: field.position.y,
          width: field.dimensions.width,
          height: field.dimensions.height,
        });
      }
    } catch (error) {
      console.error('Failed to render image:', error);
    }
  }

  /**
   * Render QR code field
   */
  private static async renderQRCodeField(
    page: PDFPage,
    field: PDFFieldDefinition,
    value: any,
    doc: PDFDocument
  ): Promise<void> {
    try {
      const qrCodeDataUrl = await QRCode.toDataURL(String(value), {
        width: field.dimensions.width,
        margin: 1,
      });

      await this.renderImageField(page, field, qrCodeDataUrl, doc);
    } catch (error) {
      console.error('Failed to render QR code:', error);
    }
  }

  /**
   * Render table field
   */
  private static async renderTableField(
    page: PDFPage,
    field: PDFFieldDefinition,
    value: TableData,
    doc: PDFDocument
  ): Promise<void> {
    if (!value || !value.headers || !value.rows) return;

    const font = await FontManager.getFont(doc, field.style.font?.family || 'Helvetica');
    const fontSize = field.style.font?.size || 10;
    const rowHeight = fontSize * 1.5;
    const cellPadding = 4;

    let yPosition = field.position.y;
    const columnWidth = field.dimensions.width / value.headers.length;

    // Draw headers
    for (let i = 0; i < value.headers.length; i++) {
      const x = field.position.x + i * columnWidth;
      const headerText = value.headers[i] || '';
      
      page.drawText(headerText, {
        x: x + cellPadding,
        y: yPosition - cellPadding,
        size: fontSize,
        font,
        color: Colors.BLACK,
      });
    }

    yPosition -= rowHeight;

    // Draw rows
    for (const row of value.rows) {
      if (yPosition < field.position.y - field.dimensions.height) break;
      
      for (let i = 0; i < row.length && i < value.headers.length; i++) {
        const x = field.position.x + i * columnWidth;
        
        page.drawText(String(row[i] || ''), {
          x: x + cellPadding,
          y: yPosition - cellPadding,
          size: fontSize,
          font,
          color: Colors.BLACK,
        });
      }
      
      yPosition -= rowHeight;
    }
  }

  /**
   * Render signature field
   */
  private static async renderSignatureField(
    page: PDFPage,
    field: PDFFieldDefinition,
    value: SignatureConfig,
    doc: PDFDocument
  ): Promise<void> {
    if (!value) return;

    if (value.type === 'image' && value.imageUrl) {
      await this.renderImageField(page, field, value.imageUrl, doc);
    } else if (value.type === 'typed' && value.signatureData) {
      await this.renderTextField(page, field, value.signatureData, doc);
    }

    // Add timestamp if requested
    if (value.timestamp && value.certificateInfo) {
      const font = await FontManager.getFont(doc, 'Helvetica');
      const timestampText = `Signed by ${value.certificateInfo.signerName} on ${value.certificateInfo.signingDate}`;
      
      page.drawText(timestampText, {
        x: field.position.x,
        y: field.position.y - field.dimensions.height - 15,
        size: 8,
        font,
        color: Colors.GRAY,
      });
    }
  }

  /**
   * Wrap text to fit within specified width
   */
  private static wrapText(text: string, maxWidth: number, font: PDFFont, fontSize: number): string[] {
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const textWidth = font.widthOfTextAtSize(testLine, fontSize);

      if (textWidth <= maxWidth) {
        currentLine = testLine;
      } else {
        if (currentLine) {
          lines.push(currentLine);
          currentLine = word;
        } else {
          // Single word too long, add it anyway
          lines.push(word);
        }
      }
    }

    if (currentLine) {
      lines.push(currentLine);
    }

    return lines;
  }
}

// ============================================================================
// PDF Generation Error Handling
// ============================================================================

export class PDFGenerationError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any
  ) {
    super(message);
    this.name = 'PDFGenerationError';
  }
}

export class ValidationError extends PDFGenerationError {
  constructor(message: string, public validationErrors: string[]) {
    super(message, 'VALIDATION_ERROR', validationErrors);
  }
}

export class TemplateNotFoundError extends PDFGenerationError {
  constructor(templateId: string) {
    super(`Template not found: ${templateId}`, 'TEMPLATE_NOT_FOUND', { templateId });
  }
}

export class FieldProcessingError extends PDFGenerationError {
  constructor(fieldId: string, originalError: Error) {
    super(`Failed to process field: ${fieldId}`, 'FIELD_PROCESSING_ERROR', {
      fieldId,
      originalError: originalError.message,
    });
  }
}
