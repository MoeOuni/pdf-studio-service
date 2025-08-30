import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { baseMiddleware } from '@/shared/middleware';
import { authMiddleware } from '@/shared/middleware';
import { createSuccessResponse, createValidationErrorResponse, createInternalServerErrorResponse } from '@/shared/utils/response';
import { validateRequestBody } from '@/shared/utils/validation';
import { TemplatesRepository, UploadedFilesRepository } from '@/shared/database';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { PDFDocument } from 'pdf-lib';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';

const s3Client = new S3Client({
  region: process.env['AWS_REGION'] || 'us-east-1',
});

// Validation schema for blank template creation
const createBlankTemplateSchema = z.object({
  name: z.string().min(1, 'Template name is required').max(100, 'Template name too long'),
  description: z.string().max(500, 'Description too long').optional(),
  dimensions: z.object({
    width: z.number().min(50, 'Width must be at least 50').max(5000, 'Width cannot exceed 5000'),
    height: z.number().min(50, 'Height must be at least 50').max(5000, 'Height cannot exceed 5000'),
  }),
  isPublic: z.boolean().optional(),
  tags: z.array(z.string().min(1, 'Tag cannot be empty')).max(10, 'Too many tags').optional(),
});

/**
 * Create a blank PDF template with specified dimensions
 */
const createBlankTemplateHandler = async (
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  console.log('Create blank template handler started');
  
  try {
    // Get authenticated user from context
    const user = (context as any).user;
    
    // Validate request body
    const validation = validateRequestBody(event.body, createBlankTemplateSchema);
    if (!validation.success) {
      return createValidationErrorResponse(validation.error);
    }

    const { name, description, dimensions, isPublic, tags } = validation.data;
    console.log('Creating blank template:', { name, dimensions });

    // Generate blank PDF with specified dimensions
    const pdfDoc = await PDFDocument.create();
    pdfDoc.addPage([dimensions.width, dimensions.height]);
    const pdfBytes = await pdfDoc.save();

    console.log('Blank PDF generated, size:', pdfBytes.length);

    // Generate unique file key for S3
    const uniqueFileName = `${Date.now()}-${uuidv4()}.pdf`;
    const s3Key = `uploads/${user.userId}/${uniqueFileName}`;
    const s3Bucket = process.env['S3_BUCKET_NAME'] || 'pdf-studio-api-dev';
    const filePath = `s3://${s3Bucket}/${s3Key}`;

    // Upload PDF to S3
    console.log('Uploading blank PDF to S3:', { s3Bucket, s3Key });
    const putCommand = new PutObjectCommand({
      Bucket: s3Bucket,
      Key: s3Key,
      Body: pdfBytes,
      ContentType: 'application/pdf',
    });

    await s3Client.send(putCommand);
    console.log('Blank PDF uploaded to S3 successfully');

    // Create file record in database
    const uploadedFilesRepo = new UploadedFilesRepository();
    const fileRecord = await uploadedFilesRepo.create({
      userId: user.userId,
      originalFilename: `${name}.pdf`,
      storedFilename: uniqueFileName,
      filePath,
      s3Bucket,
      s3Key,
      fileSize: pdfBytes.length,
      mimeType: 'application/pdf',
      uploadStatus: 'COMPLETED',
    });

    console.log('File record created:', { id: fileRecord.id });

    // Create template record
    const templatesRepo = new TemplatesRepository();
    const template = await templatesRepo.create({
      userId: user.userId,
      name,
      description: description || `Blank template with dimensions ${dimensions.width} × ${dimensions.height}`,
      category: 'blank', // Category for blank templates
      originalFileId: fileRecord.id,
      dimensions,
      pageCount: 1,
      isPublic: isPublic || false,
      tags: tags || [],
      templateData: {
        pages: [{
          width: dimensions.width,
          height: dimensions.height,
          fields: [],
        }],
        metadata: {},
      },
      metadata: {
        fileSize: pdfBytes.length,
        mimeType: 'application/pdf',
        originalFilename: `${name}.pdf`,
        isBlankTemplate: true,
      },
    });

    console.log('Template created:', { id: template.id });

    return createSuccessResponse({
      template: {
        id: template.id,
        name: template.name,
        description: template.description,
        dimensions: template.dimensions,
        pageCount: template.pageCount,
        isPublic: template.isPublic,
        tags: template.tags,
        createdAt: template.createdAt,
        updatedAt: template.updatedAt,
      },
      file: {
        id: fileRecord.id,
        originalFilename: fileRecord.originalFilename,
        fileSize: fileRecord.fileSize,
        mimeType: fileRecord.mimeType,
      },
    }, 'Blank template created successfully');

  } catch (error) {
    console.error('Create blank template error:', error);
    return createInternalServerErrorResponse(
      'Failed to create blank template',
      error
    );
  }
};

export const main = baseMiddleware(createBlankTemplateHandler)
  .use(authMiddleware);
