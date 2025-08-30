/**
 * Database Module Index
 * Exports clean repository classes and entities for DynamoDB operations
 * No SQL database - Pure AWS DynamoDB with single table design
 */

// Export all entities (types)
export * from './entities';

// Export all repositories 
export * from './repositories';

// Export database configuration
export { dynamoDBClient, TABLE_NAME, FILES_BUCKET } from './config';

// Legacy compatibility layer for existing function imports
// These will be gradually replaced with direct repository usage
import { UserRepository, TemplateRepository, FieldRepository, UploadedFileRepository } from './repositories';

export class UsersRepository extends UserRepository {}
export class TemplatesRepository extends TemplateRepository {}
export class FieldsRepository extends FieldRepository {}
export class UploadedFilesRepository extends UploadedFileRepository {}