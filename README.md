# PDF Studio Serverless API

A modern, serverless PDF template management system built with AWS Lambda, DynamoDB, and S3.

## 🏗️ **Project Structure**

```
pdf-studio-serverless/pdf-studio-service/
├── src/
│   ├── functions/                    # Lambda functions organized by domain
│   │   ├── auth/                     # Authentication functions
│   │   │   ├── login.ts
│   │   │   ├── register.ts
│   │   │   └── serverless.yml        # Auth function configurations
│   │   ├── templates/                # Template management functions
│   │   │   ├── create.ts
│   │   │   ├── get.ts
│   │   │   ├── list.ts
│   │   │   ├── update.ts
│   │   │   ├── delete.ts
│   │   │   └── serverless.yml        # Template function configurations
│   │   ├── fields/                   # Field management functions
│   │   │   ├── create.ts
│   │   │   ├── get.ts
│   │   │   ├── update.ts
│   │   │   ├── delete.ts
│   │   │   └── serverless.yml        # Field function configurations
│   │   ├── files/                    # File management functions
│   │   │   ├── upload.ts
│   │   │   ├── get.ts
│   │   │   ├── delete.ts
│   │   │   └── serverless.yml        # File function configurations
│   │   ├── pdf/                      # PDF generation functions
│   │   │   ├── generate.ts
│   │   │   └── serverless.yml        # PDF function configurations
│   │   └── health/                   # Health check functions
│   │       ├── handler.ts
│   │       └── serverless.yml        # Health function configurations
│   ├── shared/                       # Shared utilities and services
│   │   ├── database/                 # DynamoDB client and repository
│   │   │   ├── client.ts
│   │   │   └── repository.ts
│   │   ├── storage/                  # S3 client and storage service
│   │   │   └── s3-client.ts
│   │   ├── middleware/               # Lambda middleware (auth, validation, etc.)
│   │   │   └── index.ts
│   │   └── utils/                    # Utility functions
│   │       ├── response.ts
│   │       └── validation.ts
│   └── types/                        # TypeScript type definitions
│       └── index.ts
├── infrastructure/                   # AWS infrastructure configurations
│   ├── resources/                    # CloudFormation resources
│   │   ├── dynamodb.yml
│   │   └── s3.yml
│   ├── iam/                          # IAM roles and policies
│   │   └── lambda-execution-role.yml
│   ├── functions.ts                  # TypeScript functions importer (source)
│   └── functions.js                  # Compiled functions importer (generated)

├── serverless.yml                    # Main Serverless Framework configuration
├── package.json                      # Node.js dependencies and scripts
├── tsconfig.json                     # TypeScript configuration
└── .eslintrc.js                      # ESLint configuration
```

## 🚀 **Getting Started**

### Prerequisites

- Node.js 20.x or later
- AWS CLI configured with appropriate credentials
- Serverless Framework CLI

### Installation

```bash
# Install dependencies
npm install

# Run type checking
npm run typecheck

# Run linting
npm run lint
```

### Local Development

```bash
# Start local development server
npm run dev

# This will start:
# - API Gateway on http://localhost:3000
# - DynamoDB Local on http://localhost:8000
```

### Deployment

```bash
# Deploy to development
npm run deploy:dev

# Deploy to production
npm run deploy:prod

# Or deploy directly with serverless
serverless deploy --stage dev --region us-east-1
```

## 📡 **API Endpoints**

### Health Check
- `GET /health` - Service health check

### Authentication
- `POST /auth/login` - User login
- `POST /auth/register` - User registration

### Templates
- `GET /templates` - List user templates
- `POST /templates` - Create new template
- `GET /templates/{id}` - Get specific template
- `PUT /templates/{id}` - Update template
- `DELETE /templates/{id}` - Delete template

### Fields
- `POST /fields` - Create field in template
- `GET /fields/{id}` - Get specific field
- `PUT /fields/{id}` - Update field
- `DELETE /fields/{id}` - Delete field

### Files
- `POST /files/upload` - Upload PDF file
- `GET /files/{fileId}` - Get file or download URL
- `DELETE /files/{filename}` - Delete file

### PDF Generation
- `POST /pdf/generate` - Generate filled PDF from template

## 🏛️ **Architecture**

### Database Design (DynamoDB Single Table)

```
PK                    SK                    EntityType    Data
USER#123             PROFILE               USER          {user data}
USER#123             TEMPLATE#456          TEMPLATE      {template data}
TEMPLATE#456         FIELD#789             FIELD         {field data}
TEMPLATE#456         METADATA              TEMPLATE      {template metadata}
```

### AWS Services Used

- **AWS Lambda**: Serverless compute for API endpoints
- **Amazon DynamoDB**: NoSQL database with single-table design
- **Amazon S3**: File storage for PDF templates and generated files
- **Amazon API Gateway**: HTTP API for routing requests
- **AWS CloudFormation**: Infrastructure as Code
- **Amazon CloudWatch**: Logging and monitoring

## 🔧 **Configuration**

### Environment Variables

- `STAGE`: Deployment stage (dev, staging, prod)
- `REGION`: AWS region
- `DYNAMODB_TABLE`: DynamoDB table name
- `S3_BUCKET`: S3 bucket name for file storage

### Modular Configuration

Each function domain has its own `serverless.yml` file co-located with the function code:

- `src/functions/auth/serverless.yml` - Authentication function configurations
- `src/functions/templates/serverless.yml` - Template function configurations
- `src/functions/fields/serverless.yml` - Field function configurations
- `src/functions/files/serverless.yml` - File function configurations
- `src/functions/pdf/serverless.yml` - PDF generation function configurations
- `src/functions/health/serverless.yml` - Health check function configurations

These configurations are dynamically imported by `infrastructure/functions.ts` (written in TypeScript with full type safety), which gets compiled to `functions.js` and merges all module configurations into a single functions object. This approach keeps the main `serverless.yml` clean while maintaining full modularity and TypeScript support - when you add a new function module, you just need to add it to the functions.ts importer.

## 🧪 **Testing**

```bash
# Type checking
npm run typecheck

# Linting
npm run lint

# Run tests (when implemented)
npm test
```

## 📦 **Scripts**

- `npm run dev` - Start local development server
- `npm run deploy` - Deploy to AWS
- `npm run deploy:dev` - Deploy to development stage
- `npm run deploy:prod` - Deploy to production stage
- `npm run typecheck` - Run TypeScript type checking
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint issues automatically

## 🔐 **Security**

- IAM roles with least privilege access
- S3 bucket policies for secure file access
- Input validation using Zod schemas
- CORS configuration for API Gateway
- Security headers middleware

## 📊 **Monitoring**

- CloudWatch Logs for all Lambda functions
- X-Ray tracing enabled
- Custom metrics and alarms (to be implemented)
- Health check endpoint for service monitoring

## 🚀 **Deployment**

Deploy using the Serverless Framework:

```bash
# Deploy to development
serverless deploy --stage dev

# Deploy to production  
serverless deploy --stage prod

# Deploy to specific region
serverless deploy --stage dev --region us-west-2
```

## 📝 **Development Guidelines**

1. **Function Organization**: Each domain has its own folder with related functions
2. **Configuration Co-location**: Serverless configurations are kept with their respective functions
3. **Shared Code**: Common utilities, middleware, and types are in the `shared` folder
4. **Type Safety**: Full TypeScript support with strict type checking
5. **Error Handling**: Consistent error responses using shared utilities
6. **Validation**: Input validation using Zod schemas
7. **Middleware**: Reusable middleware for authentication, logging, and error handling

## 🤝 **Contributing**

1. Follow the existing code structure and patterns
2. Add new functions in appropriate domain folders
3. Update configurations in co-located `serverless.yml` files
4. Ensure TypeScript compilation passes
5. Follow ESLint rules
6. Add appropriate error handling and validation

## 📄 **License**

MIT License - see LICENSE file for details.