# PDF Studio Service - Deployment Guide

Complete deployment guide for the PDF Studio serverless backend service.

## Overview

The PDF Studio Service is a serverless backend built with AWS Lambda, featuring:

- **🔐 Secure Architecture**: AWS Cognito User Pools for authentication
- **⚡ Serverless**: Auto-scaling Lambda functions
- **🗄️ Pure AWS Data**: DynamoDB single-table design
- **📁 File Storage**: S3 with lifecycle policies
- **🚀 Infrastructure as Code**: CloudFormation via Serverless Framework

## Prerequisites

### Required Tools

```bash
# Node.js (v20+ recommended)
node --version

# AWS CLI configured with appropriate permissions
aws --version
aws configure list

# Serverless Framework
npm install -g serverless
serverless --version
```

### Required AWS Permissions

Your AWS user/role needs the following permissions:
- CloudFormation (full access)
- Lambda (full access)
- API Gateway (full access)
- DynamoDB (full access)
- S3 (full access)
- Cognito (full access)
- IAM (create/update roles and policies)

## Project Structure

```
pdf-studio-service/
├── src/
│   ├── functions/           # Lambda function handlers
│   │   ├── auth/           # Authentication endpoints
│   │   ├── templates/      # Template management
│   │   ├── fields/         # Form field management
│   │   ├── files/          # File upload/download
│   │   └── pdf/            # PDF generation
│   └── shared/             # Shared utilities
│       ├── database/       # DynamoDB entities & repositories
│       ├── auth/           # Cognito authentication service
│       ├── pdf/            # PDF generation utilities
│       └── utils/          # Common utilities
├── infrastructure/         # CloudFormation resources
│   ├── functions.yml       # Lambda function definitions
│   ├── iam/               # IAM roles and policies
│   └── resources/         # AWS resource definitions
│       ├── dynamodb.yml   # DynamoDB table
│       ├── s3.yml         # S3 bucket
│       └── cognito.yml    # Cognito User Pool
└── serverless.yml         # Main configuration
```

## Deployment Steps

### 1. Install Dependencies

```bash
# Install project dependencies
npm install

# Verify TypeScript compilation
npm run typecheck

# Verify serverless configuration
npx serverless print
```

### 2. Deploy to Development

```bash
# Deploy to dev environment
npm run deploy:dev

# Monitor deployment progress
# This creates all AWS resources automatically:
# - DynamoDB table with GSI indexes
# - S3 bucket with CORS and lifecycle policies
# - Cognito User Pool and Client
# - Lambda functions with proper IAM roles
# - API Gateway with CORS
```

### 3. Verify Deployment

```bash
# Get service information
npm run info

# Test health endpoint
curl https://your-api-id.execute-api.us-east-1.amazonaws.com/health

# Expected response:
{
  "success": true,
  "message": "API is healthy",
  "data": {
    "timestamp": "2025-08-30T15:30:00.000Z",
    "environment": "dev",
    "version": "1.0.0"
  }
}
```

## Environment Configuration

### Supported Environments

- **dev**: Development environment
- **staging**: Staging environment  
- **prod**: Production environment

### Environment Variables

The service automatically configures these environment variables:

```yaml
environment:
  STAGE: ${self:provider.stage}
  REGION: ${self:provider.region}
  DYNAMODB_TABLE: ${self:service}-main-${self:provider.stage}
  S3_BUCKET: ${self:service}-files-${self:provider.stage}-${self:provider.region}
  COGNITO_USER_POOL_ID: !Ref UserPool
  COGNITO_USER_POOL_CLIENT_ID: !Ref UserPoolClient
```

## Security Features

### Authentication
- ✅ AWS Cognito User Pools for user management
- ✅ Access token validation in middleware
- ✅ Email verification with custom templates
- ✅ Password policies with complexity requirements

### Data Security
- ✅ DynamoDB encryption at rest
- ✅ S3 bucket with public access blocked
- ✅ HTTPS-only access enforced
- ✅ CORS configured for specific origins

### Infrastructure Security
- ✅ Least privilege IAM policies
- ✅ CloudFormation drift detection
- ✅ Resource tagging for compliance
- ✅ X-Ray tracing enabled

## Monitoring & Debugging

### CloudWatch Logs

```bash
# View logs for specific function
npm run logs -- --function login

# Stream logs in real-time
npm run logs -- --function register --tail
```

### DynamoDB Monitoring

Access AWS Console → DynamoDB → Tables → Your Table → Monitoring for:
- Read/Write capacity metrics
- Throttling events
- Item count trends

### S3 Monitoring

Access AWS Console → S3 → Your Bucket → Metrics for:
- Storage utilization
- Request metrics
- Data transfer costs

### Cognito Monitoring

Access AWS Console → Cognito → User Pools → Your Pool for:
- User registration trends
- Authentication metrics
- Failed login attempts

## Scaling

### Automatic Scaling

- **Lambda**: Automatic concurrency scaling (up to 1000 concurrent executions)
- **DynamoDB**: On-demand billing with automatic scaling
- **S3**: Unlimited storage capacity
- **Cognito**: Scales to millions of users

### Performance Optimization

- Memory allocation optimized per function
- DynamoDB single-table design for efficient queries
- S3 multipart uploads for large files
- Lambda warm-up strategies

## Cost Optimization

### Pay-per-use Model

- **Lambda**: Pay only for execution time
- **DynamoDB**: Pay for actual read/write operations
- **S3**: Pay for storage used + requests
- **Cognito**: Free tier up to 50,000 monthly active users

### Cost Monitoring

```bash
# AWS CLI cost commands
aws ce get-cost-and-usage --time-period Start=2025-08-01,End=2025-08-31 --granularity MONTHLY --metrics BlendedCost
```

## Deployment Commands

```bash
# Development
npm run deploy:dev          # Deploy to dev
npm run remove:dev          # Remove dev resources

# Staging
npm run deploy:staging      # Deploy to staging
npm run remove:staging      # Remove staging resources

# Production
npm run deploy:prod         # Deploy to production
npm run remove:prod         # Remove production resources

# Utilities
npm run info               # Get deployment info
npm run typecheck          # Validate TypeScript
npx serverless print       # Validate configuration
```

## Troubleshooting

### Common Issues

#### 1. Deployment Fails with IAM Errors
```bash
# Verify AWS credentials
aws sts get-caller-identity

# Check permissions
aws iam get-user --user-name your-username
```

#### 2. Lambda Function Timeouts
- Check CloudWatch logs for specific errors
- Increase memory allocation if needed
- Optimize database queries

#### 3. CORS Issues
- Verify allowed origins in serverless.yml
- Check request headers match allowed headers
- Ensure preflight requests are handled

#### 4. DynamoDB Access Errors
- Verify IAM permissions include DynamoDB access
- Check table name environment variable
- Validate GSI query patterns

### Support

For deployment issues:
1. Check CloudWatch logs for specific errors
2. Verify AWS permissions and limits
3. Review CloudFormation stack events
4. Validate configuration with `npx serverless print`

---

**Note**: This service uses pure AWS managed services for maximum reliability, security, and cost-effectiveness. No custom infrastructure or complex networking is required.
