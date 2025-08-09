# Database Setup Guide

This guide explains how to set up and use the hybrid PostgreSQL + DynamoDB architecture for the PDF Studio Service with full AWS serverless infrastructure.

## Architecture Overview

The database architecture is split into two main parts, fully integrated with AWS services:

### PostgreSQL (AWS RDS via Prisma ORM)
- **Location**: `src/shared/database/prisma/`
- **Purpose**: Relational data with ACID compliance
- **Infrastructure**: AWS RDS PostgreSQL with Multi-AZ, automated backups
- **Contains**: Users, uploaded files, generated PDFs, audit logs

### DynamoDB (AWS DynamoDB via Custom Repositories)
- **Location**: `src/shared/database/ddb/`
- **Purpose**: High-performance document data with auto-scaling
- **Infrastructure**: AWS DynamoDB with GSIs and on-demand billing
- **Contains**: Templates, fields with embedded styles/validation

### Supporting AWS Services
- **SQS**: Message queues for PDF generation, file processing, cleanup
- **S3**: File storage for uploads, generated PDFs, templates
- **CloudWatch**: Monitoring, logging, and alerting
- **VPC**: Secure networking for RDS and Lambda communication

## Folder Structure

```
src/shared/database/
├── client.ts                    # DynamoDB client configuration
├── repository.ts                # Base DynamoDB repository class
├── index.ts                     # Main exports
├── prisma/                      # PostgreSQL with Prisma
│   ├── client.ts               # Prisma client with connection pooling
│   ├── users-repository.ts     # User management
│   ├── files-repository.ts     # File uploads tracking
│   ├── generated-pdfs-repository.ts # PDF generation tracking
│   └── index.ts                # Prisma exports
└── ddb/                        # DynamoDB repositories
    ├── entities/               # Entity definitions
    │   ├── base-entity.ts      # Base entity interface
    │   ├── template-entity.ts  # Template entity
    │   └── field-entity.ts     # Field entity with embedded properties
    ├── templates-repository.ts # Template operations
    ├── fields-repository.ts    # Field operations
    └── index.ts               # DynamoDB exports

infrastructure/
├── resources/                   # AWS CloudFormation resources
│   ├── vpc.yml                 # VPC, subnets, security groups
│   ├── rds.yml                 # PostgreSQL RDS configuration
│   ├── sqs.yml                 # SQS queues and dead letter queues
│   ├── dynamodb.yml            # DynamoDB tables and indexes
│   ├── s3.yml                  # S3 buckets for file storage
│   └── cloudwatch.yml          # Monitoring and alerting
└── iam/
    └── lambda-execution-role.yml # IAM permissions
```

## Quick Start Deployment

### 1. Prerequisites

```bash
# Install required tools
npm install -g serverless
npm install -g @aws-cli/cli

# Configure AWS credentials
aws configure

# Set database password (required for production)
export DB_PASSWORD="your-secure-password"
```

### 2. Deploy Everything

```bash
# Clone and setup
git clone <repository>
cd pdf-studio-service

# Deploy to development
./scripts/deploy.sh --stage dev

# Deploy to production
./scripts/deploy.sh --stage prod --region us-west-2
```

The deployment script will:
- ✅ Create VPC with public/private subnets
- ✅ Deploy PostgreSQL RDS with security groups
- ✅ Create DynamoDB tables with proper indexes
- ✅ Set up SQS queues for background processing
- ✅ Configure S3 buckets for file storage
- ✅ Deploy Lambda functions with VPC access
- ✅ Set up CloudWatch monitoring and alarms
- ✅ Run database migrations

## Manual Setup (Advanced)

### 1. Environment Configuration

```env
# Stage and Region
STAGE=dev
AWS_REGION=us-east-1

# PostgreSQL (AWS RDS) - Auto-configured by deployment
DATABASE_URL="postgresql://pdf_studio_user:password@rds-endpoint:5432/pdf_studio_dev?schema=public"
DB_HOST=your-rds-endpoint.region.rds.amazonaws.com
DB_PORT=5432
DB_NAME=pdf_studio_dev
DB_USER=pdf_studio_user
DB_PASSWORD=your-secure-password

# DynamoDB - Auto-configured by deployment
DYNAMODB_REGION=us-east-1

# SQS Queues - Auto-configured by deployment
PDF_GENERATION_QUEUE_URL=https://sqs.region.amazonaws.com/account/pdf-generation-queue
FILE_PROCESSING_QUEUE_URL=https://sqs.region.amazonaws.com/account/file-processing-queue
CLEANUP_QUEUE_URL=https://sqs.region.amazonaws.com/account/cleanup-queue

# S3 Buckets - Auto-configured by deployment
S3_UPLOAD_BUCKET=pdf-studio-uploads-dev
S3_GENERATED_BUCKET=pdf-studio-generated-dev
S3_BUCKET=pdf-studio-files-dev

# VPC Configuration - Auto-configured by deployment
VPC_ID=vpc-xxxxxxxxx
SUBNET_IDS=subnet-xxxxxxxx,subnet-yyyyyyyy
SECURITY_GROUP_ID=sg-xxxxxxxxx
```

### 2. Database Schema Deployment

```bash
# Generate Prisma client
npm run db:generate

# Deploy schema to RDS (development)
npm run db:push

# Create and apply migrations (production)
npm run db:migrate
npm run db:migrate:deploy
```

### 3. AWS Resources Configuration

The serverless.yml automatically creates:

#### PostgreSQL RDS Configuration
- **Instance Class**: db.t3.micro (dev) → db.t3.medium (prod)
- **Storage**: 20GB (dev) → 100GB (prod) with auto-scaling
- **Backup**: 7 days (dev) → 30 days (prod)
- **Multi-AZ**: Disabled (dev) → Enabled (prod)
- **Encryption**: Enabled for all stages
- **Performance Insights**: Enabled for staging/prod

#### DynamoDB Tables
- **Templates Table**: `pdf-studio-templates-{stage}`
  - Primary Key: `templateId`
  - GSI: `UserIdIndex`, `StatusIndex`
  - Billing: On-demand with auto-scaling
  
- **Fields Table**: `pdf-studio-fields-{stage}`
  - Primary Key: `fieldId`
  - GSI: `TemplateIdIndex`, `TypeIndex`
  - Billing: On-demand with auto-scaling

#### SQS Queues
- **PDF Generation**: High-priority PDF processing
- **File Processing**: File upload validation and processing
- **Cleanup**: Expired file and PDF cleanup
- **Email Notifications**: User notification delivery
- **Dead Letter Queues**: Failed message handling

## Usage Examples

### PostgreSQL Operations (Users)

```typescript
import { usersRepository } from '@/shared/database/prisma';

// Create a user with profile
const user = await usersRepository.create({
  email: 'user@example.com',
  password: 'securepassword',
  name: 'John Doe',
  profile: {
    company: 'Acme Corp',
    timezone: 'America/New_York',
    language: 'en',
    preferences: { theme: 'dark' }
  }
});

// Find user with profile
const foundUser = await usersRepository.findByEmail('user@example.com', true);

// List users with pagination
const userList = await usersRepository.list({
  page: 1,
  limit: 20,
  search: 'john',
  includeProfile: true
});
```

### File Management

```typescript
import { filesRepository } from '@/shared/database/prisma';

// Track uploaded file
const uploadedFile = await filesRepository.create({
  userId: user.id,
  originalFilename: 'document.pdf',
  storedFilename: 'uuid-document.pdf',
  filePath: '/uploads/2024/01/uuid-document.pdf',
  s3Bucket: 'pdf-studio-uploads-dev',
  s3Key: 'uploads/2024/01/uuid-document.pdf',
  fileSize: BigInt(1024000),
  mimeType: 'application/pdf',
  metadata: { pageCount: 5, dimensions: { width: 612, height: 792 } }
});

// Get user's file statistics
const stats = await filesRepository.getUserFileStats(user.id);
console.log(`Total files: ${stats.totalFiles}, Total size: ${stats.totalSize}`);
```

### DynamoDB Operations (Templates)

```typescript
import { templatesRepository } from '@/shared/database/ddb';

// Create a template
const template = await templatesRepository.create({
  userId: user.id, // References PostgreSQL user
  name: 'Invoice Template',
  originalFileId: uploadedFile.id, // References PostgreSQL file
  dimensions: { width: 800, height: 600 },
  fileName: 'invoice-template.pdf',
  pdfFileUrl: 's3://pdf-studio-files-dev/templates/invoice.pdf',
  pageCount: 1,
  scale: 1,
  metadata: { category: 'business', tags: ['invoice', 'billing'] }
});

// Get user's template statistics
const templateStats = await templatesRepository.getUserTemplateStats(user.id);
console.log(`Active templates: ${templateStats.active}, Total: ${templateStats.total}`);
```

### DynamoDB Operations (Fields)

```typescript
import { fieldsRepository } from '@/shared/database/ddb';

// Create a field with full configuration
const field = await fieldsRepository.create({
  templateId: template.templateId,
  name: 'Customer Name',
  type: 'text',
  page: 1,
  position: { x: 100, y: 50 },
  size: { width: 200, height: 30 },
  bindingKey: 'customer.name',
  style: {
    fontFamily: 'Arial',
    fontSize: 12,
    textColor: '#000000',
    backgroundColor: 'transparent',
    textAlign: 'left',
    bold: false,
    italic: false,
    underline: false,
  },
  layout: {
    rotation: 0,
    lockProportions: false,
    layerOrder: 1,
    snapToGrid: true
  },
  advanced: {
    placeholder: 'Enter customer name',
    required: true,
    multiLine: false,
    maxLength: 100,
    visibility: 'always'
  },
  validation: {
    type: 'none',
    required: true
  }
});

// Batch update field positions (drag & drop)
await fieldsRepository.batchUpdatePositions([
  { fieldId: field.fieldId, position: { x: 150, y: 75 } },
  // ... more fields
]);
```

### Background Processing with SQS

```typescript
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';

const sqsClient = new SQSClient({ region: process.env.AWS_REGION });

// Queue PDF generation
await sqsClient.send(new SendMessageCommand({
  QueueUrl: process.env.PDF_GENERATION_QUEUE_URL,
  MessageBody: JSON.stringify({
    templateId: template.templateId,
    userId: user.id,
    payload: { 'customer.name': 'John Doe', 'invoice.number': 'INV-001' }
  })
}));

// Queue file cleanup
await sqsClient.send(new SendMessageCommand({
  QueueUrl: process.env.CLEANUP_QUEUE_URL,
  MessageBody: JSON.stringify({
    action: 'cleanup_expired_pdfs',
    olderThanDays: 30
  })
}));
```

## Monitoring and Observability

### CloudWatch Dashboard
Access your application dashboard at:
```
https://us-east-1.console.aws.amazon.com/cloudwatch/home?region=us-east-1#dashboards:name=pdf-studio-api-dev
```

### Key Metrics Monitored
- **Lambda Performance**: Duration, errors, invocations
- **RDS Health**: CPU, connections, read/write latency
- **DynamoDB Usage**: Read/write capacity, throttling
- **SQS Queues**: Message count, processing time
- **S3 Storage**: Object count, storage usage

### Alarms Configured
- Database CPU > 80%
- Lambda error rate > 5%
- SQS dead letter queue messages > 0
- DynamoDB throttling events

## Performance Optimization

### PostgreSQL (RDS)
- **Connection Pooling**: Built into Prisma client
- **Read Replicas**: Auto-created for production
- **Performance Insights**: Enabled for query optimization
- **Automated Backups**: Point-in-time recovery enabled

### DynamoDB
- **On-Demand Billing**: Auto-scales with traffic
- **Global Secondary Indexes**: Optimized for query patterns
- **Batch Operations**: Used for bulk updates
- **TTL**: Automatic cleanup for temporary data

### Lambda Functions
- **VPC Configuration**: Secure RDS access
- **Memory Optimization**: Right-sized per function
- **Connection Reuse**: Persistent database connections
- **X-Ray Tracing**: Performance monitoring

## Security Features

### Network Security
- **VPC Isolation**: Private subnets for RDS
- **Security Groups**: Least-privilege access
- **NAT Gateway**: Secure internet access for Lambda

### Data Security
- **Encryption at Rest**: RDS and DynamoDB encrypted
- **Encryption in Transit**: TLS for all connections
- **IAM Roles**: Fine-grained permissions
- **Secrets Manager**: Secure credential storage

### Access Control
- **JWT Authentication**: Stateless user sessions
- **Resource-Level Permissions**: User data isolation
- **Audit Logging**: All operations tracked

## Disaster Recovery

### Backup Strategy
- **RDS Automated Backups**: 7-30 days retention
- **DynamoDB Point-in-Time Recovery**: 35 days
- **S3 Versioning**: File history preservation
- **Cross-Region Replication**: Production data protection

### Recovery Procedures
- **RDS Restore**: Point-in-time or snapshot restore
- **DynamoDB Restore**: Table-level recovery
- **Lambda Redeployment**: Infrastructure as code
- **Data Validation**: Automated integrity checks

## Cost Optimization

### Development Environment
- **RDS**: db.t3.micro with minimal storage
- **DynamoDB**: On-demand billing
- **Lambda**: Pay-per-execution
- **S3**: Standard storage class

### Production Environment
- **RDS**: Reserved instances for predictable workloads
- **DynamoDB**: Provisioned capacity for consistent traffic
- **Lambda**: Provisioned concurrency for critical functions
- **S3**: Intelligent tiering for cost optimization

## Troubleshooting

### Common Issues

1. **RDS Connection Timeout**
   - Check VPC security groups
   - Verify Lambda subnet configuration
   - Confirm RDS endpoint accessibility

2. **DynamoDB Throttling**
   - Review partition key distribution
   - Check for hot partitions
   - Consider on-demand billing

3. **Lambda Cold Starts**
   - Use provisioned concurrency for critical functions
   - Optimize bundle size
   - Implement connection pooling

4. **SQS Message Processing Delays**
   - Check dead letter queues
   - Verify Lambda concurrency limits
   - Monitor queue visibility timeout

### Debug Commands

```bash
# Check RDS connectivity
aws rds describe-db-instances --db-instance-identifier pdf-studio-api-postgres-dev

# Monitor DynamoDB metrics
aws dynamodb describe-table --table-name pdf-studio-templates-dev

# View SQS queue attributes
aws sqs get-queue-attributes --queue-url $PDF_GENERATION_QUEUE_URL --attribute-names All

# Check Lambda logs
aws logs tail /aws/lambda/pdf-studio-api-api-dev --follow
```

### Performance Monitoring

```bash
# Database performance
npm run db:studio  # Prisma Studio for PostgreSQL

# Application metrics
aws cloudwatch get-metric-statistics \
  --namespace AWS/Lambda \
  --metric-name Duration \
  --dimensions Name=FunctionName,Value=pdf-studio-api-api-dev \
  --start-time 2024-01-01T00:00:00Z \
  --end-time 2024-01-02T00:00:00Z \
  --period 3600 \
  --statistics Average
```

This comprehensive setup provides a production-ready, scalable, and secure PDF Studio service with full AWS integration and monitoring capabilities.