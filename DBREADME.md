# Database Architecture Plan

## Overview

This document outlines the hybrid database architecture for the PDF Studio Service, combining AWS RDS PostgreSQL for relational data and AWS DynamoDB for document-based data, fully integrated with AWS serverless infrastructure to optimize performance, scalability, and cost.

## Architecture Philosophy

### AWS RDS PostgreSQL (Relational Data)
- **Purpose**: User management, file metadata, audit trails, and structured relationships
- **Infrastructure**: Multi-AZ RDS with automated backups, read replicas, and Performance Insights
- **Strengths**: ACID compliance, complex queries, joins, data integrity, managed scaling
- **Use Cases**: User authentication, file tracking, billing, analytics, reporting

### AWS DynamoDB (Document Data)
- **Purpose**: Template configurations, field definitions, and high-frequency operations
- **Infrastructure**: On-demand scaling with Global Secondary Indexes and automatic backups
- **Strengths**: Sub-10ms latency, infinite scalability, flexible schema, serverless
- **Use Cases**: Template editing, field management, real-time operations, high-throughput workloads

### Supporting AWS Services
- **Amazon SQS**: Asynchronous message processing for PDF generation, file processing, cleanup
- **Amazon S3**: Scalable file storage for uploads, generated PDFs, and templates
- **Amazon CloudWatch**: Comprehensive monitoring, logging, and alerting
- **Amazon VPC**: Secure networking with private subnets and security groups

## Database Schemas

### AWS RDS PostgreSQL Schema (Relational Data)

```mermaid
erDiagram
    USERS {
        uuid id PK
        string email UK
        string password_hash
        string name
        boolean email_verified
        enum status
        timestamp created_at
        timestamp updated_at
    }
    
    USER_PROFILES {
        uuid user_id PK,FK
        string avatar_url
        string company
        string timezone
        string language
        jsonb preferences
        timestamp created_at
        timestamp updated_at
    }
    
    UPLOADED_FILES {
        uuid id PK
        uuid user_id FK
        string original_filename
        string stored_filename
        string file_path
        string s3_bucket
        string s3_key
        bigint file_size
        string mime_type
        string file_hash
        enum upload_status
        jsonb metadata
        timestamp created_at
        timestamp updated_at
    }
    
    GENERATED_PDFS {
        uuid id PK
        uuid user_id FK
        string template_id
        uuid original_file_id FK
        string generated_filename
        string file_path
        string s3_bucket
        string s3_key
        bigint file_size
        jsonb generation_data
        integer download_count
        timestamp expires_at
        timestamp created_at
        timestamp updated_at
    }

    USERS ||--o{ USER_PROFILES : "has profile"
    USERS ||--o{ UPLOADED_FILES : "uploads files"
    USERS ||--o{ GENERATED_PDFS : "generates PDFs"
    UPLOADED_FILES ||--o{ GENERATED_PDFS : "source for templates"
```

#### AWS RDS Configuration
- **Engine**: PostgreSQL 15.4 with optimized parameters
- **Instance Classes**: 
  - Development: `db.t3.micro`
  - Staging: `db.t3.small` 
  - Production: `db.t3.medium` with Multi-AZ
- **Storage**: GP3 SSD with auto-scaling (20GB → 500GB)
- **Backups**: Automated with 7-30 day retention
- **Security**: VPC isolation, encrypted at rest and in transit
- **Monitoring**: Performance Insights and CloudWatch integration

### AWS DynamoDB Schema (Document Data)

```mermaid
graph TB
    subgraph "DynamoDB Tables with Embedded Properties"
        T[Templates Table]
        F[Fields Table with Embedded Properties]
    end
    
    subgraph "Templates Structure"
        T --> T1[templateId: PK]
        T --> T2[userId: GSI - References RDS]
        T --> T3[originalFileId - References RDS]
        T --> T4[name, dimensions, scale]
        T --> T5[pageCount, version, status]
        T --> T6[metadata, timestamps]
    end
    
    subgraph "Fields Structure with Embedded Properties"
        F --> F1[fieldId: PK]
        F --> F2[templateId: GSI]
        F --> F3[name, type, page]
        F --> F4[position, size, bindingKey]
        F --> F5[Embedded Style Properties]
        F --> F6[Embedded Layout Properties]
        F --> F7[Embedded Advanced Properties]
        F --> F8[Embedded Validation Properties]
        F --> F9[Table Config for Complex Fields]
    end
    
    subgraph "Embedded Style Properties"
        F5 --> S1[fontFamily, fontSize]
        F5 --> S2[textColor, backgroundColor]
        F5 --> S3[textAlign, bold, italic]
        F5 --> S4[lineThickness, lineStyle, opacity]
    end
    
    subgraph "Embedded Layout Properties"
        F6 --> L1[rotation, lockProportions]
        F6 --> L2[layerOrder, snapToGrid]
    end
    
    subgraph "Embedded Advanced Properties"
        F7 --> A1[placeholder, required]
        F7 --> A2[multiLine, maxLength]
        F7 --> A3[visibility settings]
    end
    
    subgraph "Embedded Validation Properties"
        F8 --> V1[type, regexPattern]
        F8 --> V2[errorMessage, constraints]
    end
    
    T -.->|1:N| F
```

#### AWS DynamoDB Configuration

**Templates Table**: `pdf-studio-templates-{stage}`
- **Primary Key**: `templateId` (String)
- **GSI**: `UserIdIndex` (userId, createdAt), `StatusIndex` (status, updatedAt)
- **Billing**: On-demand with auto-scaling
- **Backup**: Point-in-time recovery enabled
- **Purpose**: Store template metadata with cross-references to RDS

**Fields Table**: `pdf-studio-fields-{stage}`
- **Primary Key**: `fieldId` (String)
- **GSI**: `TemplateIdIndex` (templateId, page), `TypeIndex` (type, createdAt)
- **Billing**: On-demand with auto-scaling
- **Backup**: Point-in-time recovery enabled
- **Purpose**: Store field definitions with embedded style, layout, advanced, and validation properties

#### Key Improvements
- **Embedded Properties**: Eliminates need for separate style/validation tables
- **Reduced Queries**: Single query retrieves complete field configuration
- **Better Performance**: Sub-10ms response times with embedded data
- **Simplified Schema**: Fewer tables to manage and maintain

## Data Flow & Communication

### AWS Serverless Architecture Overview
```mermaid
graph TB
    subgraph "Client Layer"
        UI[Web UI]
        MOBILE[Mobile App]
        API_CLIENT[API Clients]
    end
    
    subgraph "AWS API Gateway"
        APIGW[API Gateway]
        AUTH[Cognito/JWT Auth]
    end
    
    subgraph "AWS Lambda Functions"
        API_LAMBDA[API Lambda]
        PDF_LAMBDA[PDF Generation Lambda]
        FILE_LAMBDA[File Processing Lambda]
        CLEANUP_LAMBDA[Cleanup Lambda]
    end
    
    subgraph "AWS Data Services"
        RDS[(RDS PostgreSQL)]
        DDB[(DynamoDB)]
        S3[(S3 Buckets)]
    end
    
    subgraph "AWS Messaging & Monitoring"
        SQS[SQS Queues]
        CW[CloudWatch]
        SNS[SNS Notifications]
    end
    
    subgraph "AWS Networking"
        VPC[VPC with Private Subnets]
        SG[Security Groups]
        NAT[NAT Gateway]
    end
    
    UI --> APIGW
    MOBILE --> APIGW
    API_CLIENT --> APIGW
    
    APIGW --> AUTH
    APIGW --> API_LAMBDA
    
    API_LAMBDA --> RDS
    API_LAMBDA --> DDB
    API_LAMBDA --> S3
    API_LAMBDA --> SQS
    
    SQS --> PDF_LAMBDA
    SQS --> FILE_LAMBDA
    SQS --> CLEANUP_LAMBDA
    
    PDF_LAMBDA --> DDB
    PDF_LAMBDA --> S3
    FILE_LAMBDA --> RDS
    FILE_LAMBDA --> S3
    CLEANUP_LAMBDA --> RDS
    CLEANUP_LAMBDA --> DDB
    CLEANUP_LAMBDA --> S3
    
    API_LAMBDA -.->|VPC Access| VPC
    PDF_LAMBDA -.->|VPC Access| VPC
    RDS -.->|Private Subnet| VPC
    
    CW --> SNS
    API_LAMBDA --> CW
    PDF_LAMBDA --> CW
    RDS --> CW
    DDB --> CW
    
    RDS -.->|Cross-References| DDB
    DDB -.->|User/File References| RDS
```

### Data Flow Patterns

#### 1. User Registration & Authentication
```mermaid
sequenceDiagram
    participant U as User
    participant A as Auth Service
    participant PG as PostgreSQL
    participant C as Cache
    
    U->>A: Register/Login
    A->>PG: Create/Verify User
    PG-->>A: User Data
    A->>C: Cache Session
    A-->>U: JWT Token
    
    Note over A,PG: All user data in PostgreSQL
    Note over A,C: Session caching for performance
```

#### 2. File Upload & Template Creation
```mermaid
sequenceDiagram
    participant U as User
    participant APP as Application
    participant S3 as S3 Storage
    participant PG as PostgreSQL
    participant DDB as DynamoDB
    
    U->>APP: Upload PDF
    APP->>S3: Store File
    S3-->>APP: File URL
    APP->>PG: Save File Metadata
    PG-->>APP: File ID
    
    U->>APP: Create Template
    APP->>DDB: Create Template Record
    Note over APP,DDB: References PG file_id and user_id
    DDB-->>APP: Template ID
    APP-->>U: Template Created
```

#### 3. Template Editing (Real-time)
```mermaid
sequenceDiagram
    participant U as User
    participant APP as Application
    participant DDB as DynamoDB
    participant C as Cache
    
    U->>APP: Edit Field
    APP->>DDB: Update Field
    DDB-->>APP: Updated Field
    APP->>C: Cache Field Data
    APP-->>U: Real-time Update
    
    Note over APP,DDB: High-performance editing
    Note over APP,C: Cache for instant UI updates
```

#### 4. PDF Generation (Asynchronous with SQS)
```mermaid
sequenceDiagram
    participant U as User
    participant API as API Lambda
    participant SQS as SQS Queue
    participant PDF as PDF Lambda
    participant DDB as DynamoDB
    participant S3 as S3 Storage
    participant PG as PostgreSQL
    participant SNS as SNS Notifications
    
    U->>API: Request PDF Generation
    API->>SQS: Queue PDF Generation Job
    API-->>U: Job Queued (202 Accepted)
    
    SQS->>PDF: Trigger PDF Lambda
    PDF->>DDB: Fetch Template & Fields
    DDB-->>PDF: Complete Template Data
    
    PDF->>PDF: Generate PDF Document
    PDF->>S3: Store Generated PDF
    S3-->>PDF: PDF URL & Metadata
    
    PDF->>PG: Save Generation Record
    PG-->>PDF: Record Saved
    
    PDF->>SNS: Send Completion Notification
    SNS-->>U: PDF Ready Notification
    
    Note over PDF,PG: Async processing with error handling
    Note over SQS: Dead letter queue for failed jobs
```

#### 5. Analytics & Reporting
```mermaid
sequenceDiagram
    participant ADMIN as Admin
    participant APP as Application
    participant PG as PostgreSQL
    participant DDB as DynamoDB
    
    ADMIN->>APP: Request Analytics
    APP->>PG: Query User Data
    APP->>PG: Query File Usage
    APP->>DDB: Query Template Stats
    
    PG-->>APP: User Metrics
    DDB-->>APP: Template Metrics
    
    APP->>APP: Combine Data
    APP-->>ADMIN: Analytics Report
    
    Note over APP: Cross-database joins in application layer
```

## Cross-Database Relationships

### Reference Architecture
```mermaid
graph LR
    subgraph "PostgreSQL Domain"
        U[Users]
        UF[Uploaded Files]
        GP[Generated PDFs]
        S[Subscriptions]
        AL[Audit Logs]
    end
    
    subgraph "DynamoDB Domain"
        T[Templates]
        F[Fields]
        FS[Field Styles]
        FV[Field Validations]
    end
    
    subgraph "External Storage"
        S3[S3 Buckets]
    end
    
    U -.->|user_id| T
    UF -.->|file_id| T
    T -.->|template_id| GP
    T --> F
    F --> FS
    F --> FV
    
    UF --> S3
    GP --> S3
    
    style U fill:#e1f5fe
    style UF fill:#e1f5fe
    style GP fill:#e1f5fe
    style S fill:#e1f5fe
    style AL fill:#e1f5fe
    
    style T fill:#fff3e0
    style F fill:#fff3e0
    style FS fill:#fff3e0
    style FV fill:#fff3e0
```

### Data Consistency Patterns

#### 1. Reference Integrity
```mermaid
graph TB
    subgraph "Consistency Levels"
        SC[Strong Consistency]
        EC[Eventual Consistency]
        CC[Cached Consistency]
    end
    
    subgraph "PostgreSQL Operations"
        SC --> PG_USER[User Operations]
        SC --> PG_BILLING[Billing Operations]
        SC --> PG_AUDIT[Audit Logging]
    end
    
    subgraph "DynamoDB Operations"
        EC --> DDB_TEMPLATE[Template Editing]
        CC --> DDB_FIELD[Field Updates]
        EC --> DDB_STYLE[Style Changes]
    end
    
    subgraph "Cross-Database"
        EC --> CROSS_REF[Reference Updates]
        CC --> CROSS_QUERY[Cross Queries]
    end
```

#### 2. Synchronization Strategies
```mermaid
sequenceDiagram
    participant APP as Application
    participant PG as PostgreSQL
    participant DDB as DynamoDB
    participant QUEUE as Event Queue
    
    Note over APP,QUEUE: Strategy 1: Event-Driven Sync
    APP->>PG: Update User
    PG->>QUEUE: User Updated Event
    QUEUE->>DDB: Update User References
    
    Note over APP,QUEUE: Strategy 2: Compensating Transactions
    APP->>DDB: Create Template
    DDB-->>APP: Success
    APP->>PG: Log Template Creation
    PG--xAPP: Failure
    APP->>DDB: Rollback Template
    
    Note over APP,QUEUE: Strategy 3: Saga Pattern
    APP->>APP: Start Transaction
    APP->>PG: Step 1
    APP->>DDB: Step 2
    APP->>APP: Commit/Rollback All
```

## Performance Optimizations

### AWS Serverless Performance Strategy
```mermaid
graph TB
    subgraph "AWS Performance Layers"
        CF[CloudFront CDN]
        APIGW[API Gateway Caching]
        LAMBDA[Lambda Optimization]
        DB[Database Layer]
    end
    
    subgraph "RDS PostgreSQL Optimizations"
        PG_POOL[Prisma Connection Pooling]
        PG_INDEX[Automated Index Recommendations]
        PG_INSIGHTS[Performance Insights]
        PG_REPLICA[Read Replicas for Analytics]
        PG_CACHE[Query Result Caching]
    end
    
    subgraph "DynamoDB Optimizations"
        DDB_ONDEMAND[On-Demand Auto-Scaling]
        DDB_GSI[Optimized GSI Design]
        DDB_BATCH[Batch Operations]
        DDB_DAX[DynamoDB Accelerator (Optional)]
        DDB_STREAMS[DynamoDB Streams for Real-time]
    end
    
    subgraph "Lambda Optimizations"
        LAMBDA_WARM[Provisioned Concurrency]
        LAMBDA_LAYERS[Shared Lambda Layers]
        LAMBDA_VPC[VPC Connection Reuse]
        LAMBDA_MEMORY[Right-sized Memory]
    end
    
    subgraph "SQS & Async Processing"
        SQS_BATCH[Batch Message Processing]
        SQS_PARALLEL[Parallel Queue Processing]
        SQS_DLQ[Dead Letter Queue Handling]
    end
    
    CF --> APIGW
    APIGW --> LAMBDA
    LAMBDA --> DB
    
    DB --> PG_POOL
    DB --> PG_INDEX
    DB --> PG_INSIGHTS
    DB --> PG_REPLICA
    DB --> PG_CACHE
    
    DB --> DDB_ONDEMAND
    DB --> DDB_GSI
    DB --> DDB_BATCH
    DB --> DDB_DAX
    DB --> DDB_STREAMS
    
    LAMBDA --> LAMBDA_WARM
    LAMBDA --> LAMBDA_LAYERS
    LAMBDA --> LAMBDA_VPC
    LAMBDA --> LAMBDA_MEMORY
    
    LAMBDA --> SQS_BATCH
    LAMBDA --> SQS_PARALLEL
    LAMBDA --> SQS_DLQ
```

### Performance Metrics & Targets

#### AWS RDS PostgreSQL
- **Connection Time**: < 100ms (with connection pooling)
- **Query Response**: < 50ms for simple queries, < 200ms for complex joins
- **Throughput**: 1000+ queries/second with read replicas
- **Availability**: 99.95% with Multi-AZ deployment

#### AWS DynamoDB
- **Read Latency**: < 10ms (single-digit milliseconds)
- **Write Latency**: < 10ms (single-digit milliseconds)
- **Throughput**: Auto-scales to handle any traffic volume
- **Availability**: 99.999% with global tables

#### AWS Lambda
- **Cold Start**: < 1s with provisioned concurrency
- **Warm Execution**: < 100ms for API operations
- **Concurrency**: 1000+ concurrent executions
- **Memory Efficiency**: Right-sized per function (128MB - 3GB)

### Query Performance Patterns
```mermaid
graph LR
    subgraph "Read Patterns"
        R1[User Dashboard]
        R2[Template Editor]
        R3[PDF Generation]
        R4[Analytics]
    end
    
    subgraph "Optimization Strategy"
        O1[Cache User Data]
        O2[Cache Template Data]
        O3[Batch Field Queries]
        O4[Read Replicas]
    end
    
    R1 --> O1
    R2 --> O2
    R3 --> O3
    R4 --> O4
    
    O1 -.->|PostgreSQL| PG[(Users, Profiles)]
    O2 -.->|DynamoDB| DDB[(Templates, Fields)]
    O3 -.->|DynamoDB| DDB
    O4 -.->|PostgreSQL| PG_R[(Read Replica)]
```

## Backup & Recovery

### PostgreSQL
- **Automated Backups**: Daily full backups with point-in-time recovery
- **Cross-Region Replication**: For disaster recovery
- **Schema Migrations**: Versioned migration scripts

### DynamoDB
- **Point-in-Time Recovery**: Enable PITR for all tables
- **Cross-Region Replication**: Global tables for critical data
- **Export to S3**: Regular exports for analytics

## Security Considerations

### Access Control
- **PostgreSQL**: Role-based access with least privilege
- **DynamoDB**: IAM policies with resource-level permissions
- **Application Level**: JWT-based authentication with user context

### Data Encryption
- **At Rest**: Both databases encrypted at rest
- **In Transit**: TLS for all database connections
- **Application**: Sensitive data hashed/encrypted before storage

## Monitoring & Observability

### Metrics to Track
- **PostgreSQL**: Connection count, query performance, disk usage
- **DynamoDB**: Read/write capacity, throttling, hot partitions
- **Cross-Database**: Query latency, consistency lag, error rates

### Alerting
- **Performance**: Slow queries, high CPU/memory usage
- **Availability**: Connection failures, timeout errors
- **Consistency**: Data sync failures between databases

## Deployment Strategy

### AWS Infrastructure Deployment Timeline
```mermaid
gantt
    title AWS Serverless Deployment Timeline
    dateFormat  YYYY-MM-DD
    section Phase 1: Core Infrastructure
    VPC & Networking     :p1, 2024-01-01, 2d
    RDS PostgreSQL       :p2, after p1, 1d
    DynamoDB Tables      :p3, after p1, 1d
    S3 Buckets          :p4, after p1, 1d
    
    section Phase 2: Application Services
    Lambda Functions     :a1, after p2, 2d
    API Gateway         :a2, after a1, 1d
    SQS Queues          :a3, after a1, 1d
    CloudWatch Setup    :a4, after a1, 1d
    
    section Phase 3: Testing & Optimization
    Integration Testing  :t1, after a2, 3d
    Performance Testing  :t2, after t1, 2d
    Security Review     :t3, after t2, 2d
    Production Deploy   :t4, after t3, 1d
```

### Serverless Deployment Flow
```mermaid
graph TB
    subgraph "Development Environment"
        DEV_CODE[Source Code]
        DEV_CONFIG[Dev Configuration]
    end
    
    subgraph "CI/CD Pipeline"
        BUILD[Build & Test]
        PACKAGE[Package Lambda]
        DEPLOY[Serverless Deploy]
    end
    
    subgraph "AWS Infrastructure"
        CF[CloudFormation Stack]
        LAMBDA[Lambda Functions]
        RDS[RDS PostgreSQL]
        DDB[DynamoDB Tables]
        S3[S3 Buckets]
        SQS[SQS Queues]
        CW[CloudWatch]
    end
    
    subgraph "Monitoring & Validation"
        HEALTH[Health Checks]
        METRICS[Performance Metrics]
        ALERTS[CloudWatch Alarms]
    end
    
    DEV_CODE --> BUILD
    DEV_CONFIG --> BUILD
    BUILD --> PACKAGE
    PACKAGE --> DEPLOY
    
    DEPLOY --> CF
    CF --> LAMBDA
    CF --> RDS
    CF --> DDB
    CF --> S3
    CF --> SQS
    CF --> CW
    
    LAMBDA --> HEALTH
    RDS --> METRICS
    DDB --> METRICS
    CW --> ALERTS
```

### Deployment Commands
```bash
# Quick deployment (all stages)
./scripts/deploy.sh --stage dev
./scripts/deploy.sh --stage staging  
./scripts/deploy.sh --stage prod

# Infrastructure only
serverless deploy --stage prod

# Database migrations
npm run db:migrate:deploy

# Monitoring setup
aws cloudwatch put-dashboard --dashboard-name pdf-studio-prod
```

## Cost Optimization

### AWS Cost Management Strategy

#### RDS PostgreSQL Cost Optimization
- **Instance Right-sizing**: Start with `db.t3.micro` (dev) → scale to `db.t3.medium` (prod)
- **Reserved Instances**: 40-60% savings for predictable production workloads
- **Storage Optimization**: GP3 SSD with auto-scaling (pay for what you use)
- **Multi-AZ**: Only enable for production environments
- **Automated Backups**: Optimize retention periods (7 days dev, 30 days prod)

#### DynamoDB Cost Optimization
- **On-Demand Billing**: Perfect for unpredictable traffic patterns
- **Auto-Scaling**: Automatically adjusts capacity based on demand
- **TTL Implementation**: Automatic cleanup of expired data (no storage costs)
- **GSI Optimization**: Only create necessary indexes
- **Point-in-Time Recovery**: Enable only for critical production tables

#### Lambda Cost Optimization
- **Right-sized Memory**: Optimize memory allocation per function
- **Provisioned Concurrency**: Only for critical, latency-sensitive functions
- **VPC Configuration**: Minimize cold starts with connection reuse
- **Execution Time**: Optimize code for faster execution (lower costs)

#### S3 Cost Optimization
- **Storage Classes**: Use Intelligent Tiering for automatic cost optimization
- **Lifecycle Policies**: Move old files to cheaper storage classes
- **Compression**: Compress files before storage
- **Multipart Uploads**: Optimize large file uploads

#### SQS Cost Optimization
- **Batch Processing**: Process multiple messages per invocation
- **Long Polling**: Reduce empty receives (20-second polling)
- **Dead Letter Queues**: Prevent infinite retry costs
- **Message Retention**: Optimize retention periods

### Cost Monitoring & Alerts

```mermaid
graph TB
    subgraph "Cost Monitoring Dashboard"
        BUDGET[AWS Budgets]
        CE[Cost Explorer]
        CW_BILLING[CloudWatch Billing]
    end
    
    subgraph "Service-Level Costs"
        RDS_COST[RDS Costs]
        DDB_COST[DynamoDB Costs]
        LAMBDA_COST[Lambda Costs]
        S3_COST[S3 Costs]
        SQS_COST[SQS Costs]
    end
    
    subgraph "Cost Optimization Actions"
        RESIZE[Instance Resizing]
        RESERVED[Reserved Capacity]
        CLEANUP[Resource Cleanup]
        OPTIMIZE[Code Optimization]
    end
    
    BUDGET --> RDS_COST
    BUDGET --> DDB_COST
    BUDGET --> LAMBDA_COST
    BUDGET --> S3_COST
    BUDGET --> SQS_COST
    
    CE --> RESIZE
    CE --> RESERVED
    CE --> CLEANUP
    CE --> OPTIMIZE
```

### Estimated Monthly Costs (USD)

#### Development Environment
- **RDS PostgreSQL**: $15-25 (db.t3.micro)
- **DynamoDB**: $5-15 (on-demand, low traffic)
- **Lambda**: $5-10 (pay-per-execution)
- **S3**: $5-10 (standard storage)
- **SQS**: $1-3 (message processing)
- **CloudWatch**: $5-10 (logs and metrics)
- **Total**: ~$36-73/month

#### Production Environment
- **RDS PostgreSQL**: $100-200 (db.t3.medium, Multi-AZ)
- **DynamoDB**: $50-150 (on-demand, higher traffic)
- **Lambda**: $50-100 (higher execution volume)
- **S3**: $20-50 (intelligent tiering)
- **SQS**: $10-20 (higher message volume)
- **CloudWatch**: $20-40 (detailed monitoring)
- **Total**: ~$250-560/month

### Cost Optimization Best Practices

1. **Monitor Daily**: Set up billing alerts and daily cost monitoring
2. **Tag Resources**: Implement comprehensive resource tagging for cost allocation
3. **Regular Reviews**: Monthly cost optimization reviews
4. **Automation**: Use AWS Cost Anomaly Detection for unusual spending
5. **Reserved Capacity**: Purchase reserved instances for stable workloads
6. **Cleanup Policies**: Implement automated cleanup for temporary resources

This AWS serverless architecture provides optimal cost efficiency by scaling resources based on actual usage while maintaining high performance and reliability.