/**
 * PDF Generator - Main PDF generation engine
 * Orchestrates the entire PDF generation process from template and data to final PDF
 */

import { PDFDocument, rgb, degrees } from 'pdf-lib';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { s3Client } from '@/shared/storage/s3-client';
import { TemplateRepository, FieldRepository } from '@/shared/database/repositories';
import {
  PDFGenerationRequest,
  PDFGenerationOptions,
  PDFProcessingResult,
  PDFTemplateData,
  PDFFieldDefinition,
  ProcessingError,
  ProcessingWarning,
  ValidationResult,
} from './types';
import {
  DataTransformer,
  FieldValidator,
  FontManager,
  FieldProcessor,
  PDFGenerationError,
  TemplateNotFoundError,
  ValidationError,
  colorUtils,
} from './utils';

export class PDFGenerator {
  private templatesRepo: TemplateRepository;
  private fieldsRepo: FieldRepository;

  constructor() {
    this.templatesRepo = new TemplateRepository();
    this.fieldsRepo = new FieldRepository();
  }

  /**
   * Generate PDF from template and data
   */
  async generatePDF(request: PDFGenerationRequest): Promise<PDFProcessingResult> {
    const startTime = Date.now();
    const errors: ProcessingError[] = [];
    const warnings: ProcessingWarning[] = [];

    try {
      // Validate the request
      const validationResult = this.validateRequest(request);
      if (!validationResult.isValid) {
        throw new ValidationError('Request validation failed', validationResult.errors);
      }

      // Get template data
      const template = await this.getTemplate(request.templateId);
      if (!template) {
        throw new TemplateNotFoundError(request.templateId);
      }

      // Get template fields
      const fields = await this.getTemplateFields(request.templateId);

      // Load the base PDF template
      const basePdfBuffer = await this.loadBasePDF(template.templateUrl);
      const pdfDoc = await PDFDocument.load(basePdfBuffer);

      // Process data and map to fields
      const processedData = await this.processData(request.data, fields);

      // Fill the PDF with data
      const { fieldErrors, fieldWarnings } = await this.fillPDFFields(
        pdfDoc,
        fields,
        processedData
      );
      
      errors.push(...fieldErrors);
      warnings.push(...fieldWarnings);

      // Apply PDF options (watermark, metadata, etc.)
      await this.applyPDFOptions(pdfDoc, request.options || {});

      // Generate the final PDF
      const pdfBytes = await pdfDoc.save();
      const processingTime = Date.now() - startTime;

      // Prepare result based on output format
      const result = await this.prepareResult(
        pdfBytes,
        request.options?.outputFormat || 'buffer',
        {
          templateId: request.templateId,
          generatedAt: new Date().toISOString(),
          processingTime,
          fileSize: pdfBytes.length,
          pageCount: pdfDoc.getPageCount(),
          fieldsProcessed: fields.length - errors.filter(e => e.field).length,
          fieldsSkipped: errors.filter(e => e.field).length,
          version: '1.0.0',
        }
      );

      return {
        success: true,
        metadata: {
          templateId: request.templateId,
          generatedAt: new Date().toISOString(),
          processingTime,
          fileSize: pdfBytes.length,
          pageCount: pdfDoc.getPageCount(),
          fieldsProcessed: fields.length - errors.filter(e => e.field).length,
          fieldsSkipped: errors.filter(e => e.field).length,
          version: '1.0.0',
        },
        ...result,
        errors: errors.length > 0 ? errors : undefined,
        warnings: warnings.length > 0 ? warnings : undefined,
      };

    } catch (error) {
      const processingTime = Date.now() - startTime;
      
      if (error instanceof PDFGenerationError) {
        errors.push({
          code: error.code,
          message: error.message,
          severity: 'error',
          details: error.details,
        });
      } else {
        errors.push({
          code: 'UNKNOWN_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error occurred',
          severity: 'error',
          details: error,
        });
      }

      return {
        success: false,
        metadata: {
          templateId: request.templateId,
          generatedAt: new Date().toISOString(),
          processingTime,
          fileSize: 0,
          pageCount: 0,
          fieldsProcessed: 0,
          fieldsSkipped: 0,
          version: '1.0.0',
        },
        errors,
        warnings: warnings.length > 0 ? warnings : undefined,
      };
    }
  }

  /**
   * Validate PDF generation request
   */
  private validateRequest(request: PDFGenerationRequest): ValidationResult {
    const errors: string[] = [];

    if (!request.templateId) {
      errors.push('Template ID is required');
    }

    if (!request.data || typeof request.data !== 'object') {
      errors.push('Data object is required');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings: [],
    };
  }

  /**
   * Get template data from repository
   */
  private async getTemplate(templateId: string): Promise<PDFTemplateData | null> {
    try {
      const template = await this.templatesRepo.findById(templateId);
      if (!template) {
        return null;
      }

      // Convert repository template to PDF template data
      return {
        id: template.id,
        name: template.name,
        description: template.description,
        templateUrl: `s3://${process.env['S3_BUCKET']}/${template.originalFileId}`, // Construct S3 URL
        fields: [], // Will be populated separately
        pages: [
          {
            number: 1,
            width: template.dimensions?.width || 612,
            height: template.dimensions?.height || 792,
            orientation: 'portrait',
            margins: { top: 72, right: 72, bottom: 72, left: 72 },
          },
        ],
        metadata: {
          version: '1.0.0',
          createdAt: template.createdAt,
          updatedAt: template.updatedAt,
          createdBy: template.userId,
          tags: template.tags,
          category: 'user-template',
        },
        settings: {
          defaultFont: { family: 'Helvetica', size: 12 },
          defaultColor: rgb(0, 0, 0),
          allowOverflow: false,
          autoResize: true,
          quality: 'medium',
          compression: true,
        },
      };
    } catch (error) {
      console.error('Failed to get template:', error);
      return null;
    }
  }

  /**
   * Get template fields from repository
   */
  private async getTemplateFields(templateId: string): Promise<PDFFieldDefinition[]> {
    try {
      const fieldsResult = await this.fieldsRepo.findByTemplateId(templateId);
      const fields = fieldsResult; // Direct array from new repository
      
      return fields.map((field: any) => ({
        id: field.id,
        name: field.name,
        type: field.type as any, // Type mapping
        page: field.page || 1,
        position: {
          x: field.x,
          y: field.y,
          rotation: field.rotation,
        },
        dimensions: {
          width: field.width,
          height: field.height,
        },
        style: {
          font: {
            family: field.fontFamily || 'Helvetica',
            size: field.fontSize || 12,
            weight: field.fontWeight as any,
            style: field.fontStyle as any,
          },
          color: field.color ? colorUtils.hex(field.color) : rgb(0, 0, 0),
          backgroundColor: field.backgroundColor ? colorUtils.hex(field.backgroundColor) : undefined,
          borderColor: field.borderColor ? colorUtils.hex(field.borderColor) : undefined,
          borderWidth: field.borderWidth,
          alignment: field.alignment as any,
          verticalAlignment: field.verticalAlignment as any,
          padding: field.padding,
        },
        validation: field.validation ? JSON.parse(field.validation) : undefined,
        defaultValue: field.defaultValue,
        placeholder: field.placeholder,
        required: field.required,
      }));
    } catch (error) {
      console.error('Failed to get template fields:', error);
      return [];
    }
  }

  /**
   * Load base PDF template from S3
   */
  private async loadBasePDF(templateUrl: string): Promise<Uint8Array> {
    try {
      // Extract bucket and key from S3 URL
      const url = new URL(templateUrl);
      const bucket = url.hostname.split('.')[0];
      const key = url.pathname.substring(1);

      const command = new GetObjectCommand({
        Bucket: bucket,
        Key: key,
      });

      const response = await s3Client.send(command);
      
      if (!response.Body) {
        throw new Error('Empty response from S3');
      }

      const chunks: Uint8Array[] = [];
      const reader = response.Body.transformToWebStream().getReader();
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
      }

      // Combine chunks into single buffer
      const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
      const result = new Uint8Array(totalLength);
      let offset = 0;
      
      for (const chunk of chunks) {
        result.set(chunk, offset);
        offset += chunk.length;
      }

      return result;
    } catch (error) {
      throw new PDFGenerationError(
        `Failed to load base PDF template: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'TEMPLATE_LOAD_ERROR',
        { templateUrl, error }
      );
    }
  }

  /**
   * Process and transform input data
   */
  private async processData(
    data: Record<string, any>,
    fields: PDFFieldDefinition[]
  ): Promise<Record<string, any>> {
    const processedData: Record<string, any> = {};

    for (const field of fields) {
      try {
        // Get value from data using field name as path
        let value = this.getFieldValue(data, field.name);

        // Apply field validation
        if (field.validation) {
          const validationResult = FieldValidator.validate(value, field.validation);
          if (!validationResult.isValid) {
            console.warn(`Validation failed for field ${field.name}:`, validationResult.errors);
            // Use default value if validation fails and it's available
            value = field.defaultValue;
          }
        }

        // Apply data transformation based on field type
        if (field.type === 'date' && value) {
          value = DataTransformer.transform(value, {
            type: 'date',
            options: { dateFormat: 'MM/DD/YYYY' },
          });
        } else if (field.type === 'number' && value) {
          value = DataTransformer.transform(value, {
            type: 'number',
            options: { decimals: 2 },
          });
        } else if (field.type === 'qrcode' && value) {
          value = await DataTransformer.transform(value, {
            type: 'qrcode',
            options: {},
          });
        }

        processedData[field.id] = value;
      } catch (error) {
        console.error(`Failed to process field ${field.name}:`, error);
        processedData[field.id] = field.defaultValue || '';
      }
    }

    return processedData;
  }

  /**
   * Get field value from data object
   */
  private getFieldValue(data: Record<string, any>, fieldPath: string): any {
    // Support dot notation for nested objects
    return DataTransformer.getNestedValue(data, fieldPath);
  }

  /**
   * Fill PDF fields with processed data
   */
  private async fillPDFFields(
    pdfDoc: PDFDocument,
    fields: PDFFieldDefinition[],
    data: Record<string, any>
  ): Promise<{ fieldErrors: ProcessingError[]; fieldWarnings: ProcessingWarning[] }> {
    const fieldErrors: ProcessingError[] = [];
    const fieldWarnings: ProcessingWarning[] = [];

    for (const field of fields) {
      try {
        const page = pdfDoc.getPage(field.page - 1); // 0-based page index
        const value = data[field.id];

        const { errors, warnings } = await FieldProcessor.renderField(page, field, value, pdfDoc);
        fieldErrors.push(...errors);
        fieldWarnings.push(...warnings);
      } catch (error) {
        fieldErrors.push({
          code: 'FIELD_RENDER_ERROR',
          message: `Failed to render field ${field.name}: ${error instanceof Error ? error.message : 'Unknown error'}`,
          field: field.id,
          page: field.page,
          severity: 'error',
          details: error,
        });
      }
    }

    return { fieldErrors, fieldWarnings };
  }

  /**
   * Apply PDF generation options
   */
  private async applyPDFOptions(pdfDoc: PDFDocument, options: PDFGenerationOptions): Promise<void> {
    try {
      // Apply metadata
      if (options.metadata) {
        const { title, author, subject, keywords, creator, producer } = options.metadata;
        
        if (title) pdfDoc.setTitle(title);
        if (author) pdfDoc.setAuthor(author);
        if (subject) pdfDoc.setSubject(subject);
        if (keywords) pdfDoc.setKeywords(keywords);
        if (creator) pdfDoc.setCreator(creator);
        if (producer) pdfDoc.setProducer(producer);
      }

      // Apply watermark
      if (options.watermark) {
        await this.applyWatermark(pdfDoc, options.watermark);
      }

      // Security options would be applied here
      // Note: pdf-lib doesn't have built-in security features
      // In production, you might use a different library or service for encryption
      
    } catch (error) {
      console.error('Failed to apply PDF options:', error);
    }
  }

  /**
   * Apply watermark to PDF
   */
  private async applyWatermark(pdfDoc: PDFDocument, watermark: any): Promise<void> {
    try {
      const font = await FontManager.getFont(pdfDoc, 'Helvetica');
      const pages = pdfDoc.getPages();

      for (const page of pages) {
        const { width, height } = page.getSize();
        
        page.drawText(watermark.text, {
          x: width / 2,
          y: height / 2,
          size: watermark.fontSize || 48,
          font,
          color: watermark.color || rgb(0.8, 0.8, 0.8),
          opacity: watermark.opacity || 0.3,
          rotate: degrees(watermark.rotation || -45),
        });
      }
    } catch (error) {
      console.error('Failed to apply watermark:', error);
    }
  }

  /**
   * Prepare the final result based on output format
   */
  private async prepareResult(
    pdfBytes: Uint8Array,
    outputFormat: string,
    metadata: any
  ): Promise<Partial<PDFProcessingResult>> {
    switch (outputFormat) {
      case 'base64':
        return {
          pdfBase64: Buffer.from(pdfBytes).toString('base64'),
          metadata,
        };

      case 'url':
        // In production, upload to S3 and return presigned URL
        // For now, return base64
        return {
          pdfBase64: Buffer.from(pdfBytes).toString('base64'),
          downloadUrl: 'data:application/pdf;base64,' + Buffer.from(pdfBytes).toString('base64'),
          metadata,
        };

      case 'buffer':
      default:
        return {
          pdfBuffer: Buffer.from(pdfBytes),
          metadata,
        };
    }
  }

  /**
   * Generate PDF from template (simplified interface)
   */
  async generateFromTemplate(
    templateId: string,
    data: Record<string, any>,
    options?: PDFGenerationOptions
  ): Promise<Buffer> {
    const result = await this.generatePDF({
      templateId,
      data,
      options,
    });

    if (!result.success) {
      throw new PDFGenerationError(
        'PDF generation failed',
        'GENERATION_FAILED',
        result.errors
      );
    }

    return result.pdfBuffer!;
  }

  /**
   * Validate template and data compatibility
   */
  async validateTemplateData(
    templateId: string,
    data: Record<string, any>
  ): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      const fields = await this.getTemplateFields(templateId);
      
      for (const field of fields) {
        const value = this.getFieldValue(data, field.name);
        
        if (field.required && (value === null || value === undefined || value === '')) {
          errors.push(`Required field '${field.name}' is missing`);
        }

        if (field.validation && value !== null && value !== undefined) {
          const validationResult = FieldValidator.validate(value, field.validation);
          errors.push(...validationResult.errors.map(err => `${field.name}: ${err}`));
          warnings.push(...validationResult.warnings.map(warn => `${field.name}: ${warn}`));
        }
      }

      // Check for unused data fields
      const fieldNames = fields.map(f => f.name);
      const dataKeys = Object.keys(data);
      const unusedKeys = dataKeys.filter(key => !fieldNames.includes(key));
      
      if (unusedKeys.length > 0) {
        warnings.push(`Unused data fields: ${unusedKeys.join(', ')}`);
      }

    } catch (error) {
      errors.push(`Template validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }
}
