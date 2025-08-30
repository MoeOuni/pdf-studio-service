# PDF Studio Service

Serverless backend service for the PDF Studio application, built with **AWS Lambda** and **DynamoDB** using a pure AWS-native approach.

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Deploy to development
npm run deploy:dev

# Check deployment status
npm run info

# View function logs
npm run logs -- health
```

## 📋 Prerequisites

- **Node.js** 18+ 
- **AWS CLI** configured with appropriate permissions
- **Serverless Framework** installed globally

## 🏗️ Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Frontend      │───▶│   API Gateway    │───▶│   Lambda Fns    │
│   (React)       │    │   (HTTP API)     │    │   (Node.js)     │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                                         │
                                                         ▼
                                              ┌─────────────────┐
                                              │    DynamoDB     │
                                              │ (Single Table)  │
                                              └─────────────────┘
                                                         │
                                                         ▼
                                              ┌─────────────────┐
                                              │       S3        │
                                              │  (File Storage) │
                                              └─────────────────┘
```

## ✨ **AWS-Native Features**

- **�️ DynamoDB Single Table Design**: All data in one optimized table with GSI indexing
- **📁 S3 File Storage**: Secure file uploads and downloads with presigned URLs
- **🔐 No Database Migrations**: Schema-less DynamoDB eliminates migration complexity
- **⚡ Zero Cold Start Database**: DynamoDB provides instant access
- **� Cost Optimized**: Pay-per-request pricing for both Lambda and DynamoDB

## 📦 Core Services

| Service | Description | Storage |
|---------|-------------|---------|
| **Authentication** | User login/registration | DynamoDB |
| **Templates** | PDF template management | DynamoDB + S3 |
| **Fields** | Form field definitions | DynamoDB |
| **Files** | File upload/download | S3 + DynamoDB metadata |
| **PDF Generation** | Dynamic PDF creation | S3 + DynamoDB |

## 🗄️ **DynamoDB Table Design**

### Single Table Pattern with Partition Keys:

| Entity | PK | SK | GSI1PK | GSI1SK |
|--------|----|----|--------|--------|
| **User** | `USER#${id}` | `PROFILE` | `EMAIL#${email}` | `USER` |
| **Template** | `USER#${userId}` | `TEMPLATE#${id}` | `TEMPLATE#${id}` | `${category}#${created}` |
| **Field** | `TEMPLATE#${templateId}` | `FIELD#${id}` | `FIELD#${id}` | `${type}#${created}` |
| **File** | `USER#${userId}` | `FILE#${id}` | `FILE#${id}` | `${created}` |

### Benefits:
- **Single Table**: One table for all entities reduces costs and complexity
- **Global Secondary Index**: Fast queries across different access patterns
- **Schema Flexibility**: No migrations needed for new fields
- **Auto-scaling**: DynamoDB handles capacity automatically

## 🔧 Available Scripts

| Command | Description |
|---------|-------------|
| `npm run deploy:dev` | Deploy to development |
| `npm run deploy:staging` | Deploy to staging |
| `npm run deploy:prod` | Deploy to production |
| `npm run remove:dev` | Remove development stack |
| `npm run info` | Show deployment info |
| `npm run logs -- health` | View health check logs |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | TypeScript type checking |

## 📚 API Endpoints

### Health Check
- `GET /health` - Service health status

### Authentication
- `POST /auth/register` - User registration
- `POST /auth/login` - User login

### Templates
- `GET /templates` - List user templates
- `POST /templates` - Create template
- `GET /templates/{id}` - Get template
- `PUT /templates/{id}` - Update template
- `DELETE /templates/{id}` - Delete template
- `POST /templates/blank` - Create blank template

### Fields
- `GET /templates/{id}/fields` - Get template fields
- `POST /fields` - Create field
- `GET /fields/{id}` - Get field
- `PUT /fields/{id}` - Update field
- `DELETE /fields/{id}` - Delete field

### Files
- `POST /files/upload` - Upload file
- `GET /files/{id}` - Download file

### PDF Generation
- `POST /pdf/generate` - Generate PDF

## 🌍 Environment Stages

### Development (`dev`)
- Smaller Lambda memory allocation
- DynamoDB on-demand pricing
- Debug logging enabled

### Staging (`staging`)
- Production-like configuration
- Performance monitoring enabled
- Extended log retention

### Production (`prod`)
- Optimized memory allocation
- Enhanced monitoring and alerts
- Long-term log retention

## 🚀 Deployment

### Development
```bash
npm run deploy:dev
```

### Production
```bash
npm run deploy:prod
```

### Custom Region
```bash
serverless deploy --stage dev --region eu-west-1
```

##  Monitoring

### CloudWatch Logs
```bash
# View function logs
npm run logs -- health

# View specific function
serverless logs -f register --tail --stage dev
```

### Metrics
- **API Gateway**: Request count, latency, errors
- **Lambda**: Duration, memory usage, cold starts  
- **DynamoDB**: Read/write capacity, throttling, hot partitions
- **S3**: Request metrics, storage metrics

## 🔧 Development

### Code Quality
```bash
# Run linting
npm run lint

# Fix linting issues
npm run lint:fix

# Type checking
npm run typecheck
```

## 🔍 Troubleshooting

### Common Issues

#### DynamoDB Access Denied
```bash
# Check IAM permissions
aws iam get-user

# Verify table exists
aws dynamodb list-tables
```

#### Lambda Memory Issues
- Increase memory in `infrastructure/functions.yml`
- Monitor CloudWatch metrics for optimization

#### S3 Upload Failures
- Check bucket permissions
- Verify CORS configuration
- Review presigned URL generation

### Getting Help

1. **Check CloudWatch Logs** - Primary debugging resource
2. **Review AWS Documentation** - Service-specific guides
3. **Test with AWS CLI** - Verify permissions and configuration

## 🧹 Cleanup

### Remove Development Stack
```bash
npm run remove:dev
```

### Complete Cleanup
```bash
# Remove all stages
npm run remove:dev
npm run remove:staging  
npm run remove:prod
```

## ⚡ **Performance Benefits**

- **No Database Connections**: DynamoDB SDK eliminates connection pooling overhead
- **No Migration Downtime**: Schema changes don't require database migrations
- **Auto-scaling**: Both Lambda and DynamoDB scale automatically
- **Global Distribution**: DynamoDB Global Tables support multi-region deployment
- **Consistent Performance**: Single-digit millisecond latency for DynamoDB operations

## 🎯 **Next Steps**

1. **Deploy the service**: `npm run deploy:dev`
2. **Test endpoints**: Use the health check endpoint to verify deployment
3. **Monitor performance**: Check CloudWatch dashboards for metrics
4. **Scale as needed**: DynamoDB and Lambda scale automatically with demand

---

**No database migrations, no connection management, no infrastructure complexity.**  
Just pure AWS serverless architecture! 🚀
