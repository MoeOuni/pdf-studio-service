import {
  pgTable,
  uuid,
  varchar,
  boolean,
  timestamp,
  jsonb,
  bigint,
  integer,
  index,
  pgEnum,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums
export const userStatusEnum = pgEnum('user_status', ['ACTIVE', 'INACTIVE', 'SUSPENDED', 'DELETED']);
export const uploadStatusEnum = pgEnum('upload_status', ['UPLOADING', 'COMPLETED', 'FAILED', 'DELETED']);

// Users table
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).unique().notNull(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  name: varchar('name', { length: 255 }),
  emailVerified: boolean('email_verified').default(false).notNull(),
  status: userStatusEnum('status').default('ACTIVE').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// User profiles table
export const userProfiles = pgTable('user_profiles', {
  userId: uuid('user_id').primaryKey().references(() => users.id, { onDelete: 'cascade' }),
  avatarUrl: varchar('avatar_url', { length: 500 }),
  company: varchar('company', { length: 255 }),
  timezone: varchar('timezone', { length: 50 }).default('UTC').notNull(),
  language: varchar('language', { length: 10 }).default('en').notNull(),
  preferences: jsonb('preferences').default({}).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// Uploaded files table
export const uploadedFiles = pgTable('uploaded_files', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  originalFilename: varchar('original_filename', { length: 255 }).notNull(),
  storedFilename: varchar('stored_filename', { length: 255 }).notNull(),
  filePath: varchar('file_path', { length: 500 }).notNull(),
  s3Bucket: varchar('s3_bucket', { length: 255 }).notNull(),
  s3Key: varchar('s3_key', { length: 500 }).notNull(),
  fileSize: bigint('file_size', { mode: 'number' }).notNull(),
  mimeType: varchar('mime_type', { length: 255 }),
  fileHash: varchar('file_hash', { length: 64 }),
  uploadStatus: uploadStatusEnum('upload_status').default('COMPLETED').notNull(),
  metadata: jsonb('metadata').default({}).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index('uploaded_files_user_id_idx').on(table.userId),
  uploadStatusIdx: index('uploaded_files_upload_status_idx').on(table.uploadStatus),
  fileHashIdx: index('uploaded_files_file_hash_idx').on(table.fileHash),
  createdAtIdx: index('uploaded_files_created_at_idx').on(table.createdAt),
}));

// Generated PDFs table
export const generatedPdfs = pgTable('generated_pdfs', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  templateId: varchar('template_id', { length: 255 }).notNull(), // References DynamoDB template
  originalFileId: uuid('original_file_id').references(() => uploadedFiles.id, { onDelete: 'set null' }),
  generatedFilename: varchar('generated_filename', { length: 255 }).notNull(),
  filePath: varchar('file_path', { length: 500 }).notNull(),
  s3Bucket: varchar('s3_bucket', { length: 255 }).notNull(),
  s3Key: varchar('s3_key', { length: 500 }).notNull(),
  fileSize: bigint('file_size', { mode: 'number' }).notNull(),
  generationData: jsonb('generation_data').notNull(),
  downloadCount: integer('download_count').default(0).notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index('generated_pdfs_user_id_idx').on(table.userId),
  templateIdIdx: index('generated_pdfs_template_id_idx').on(table.templateId),
  expiresAtIdx: index('generated_pdfs_expires_at_idx').on(table.expiresAt),
  createdAtIdx: index('generated_pdfs_created_at_idx').on(table.createdAt),
}));

// Relations
export const usersRelations = relations(users, ({ one, many }) => ({
  profile: one(userProfiles, {
    fields: [users.id],
    references: [userProfiles.userId],
  }),
  uploadedFiles: many(uploadedFiles),
  generatedPdfs: many(generatedPdfs),
}));

export const userProfilesRelations = relations(userProfiles, ({ one }) => ({
  user: one(users, {
    fields: [userProfiles.userId],
    references: [users.id],
  }),
}));

export const uploadedFilesRelations = relations(uploadedFiles, ({ one, many }) => ({
  user: one(users, {
    fields: [uploadedFiles.userId],
    references: [users.id],
  }),
  generatedPdfs: many(generatedPdfs),
}));

export const generatedPdfsRelations = relations(generatedPdfs, ({ one }) => ({
  user: one(users, {
    fields: [generatedPdfs.userId],
    references: [users.id],
  }),
  originalFile: one(uploadedFiles, {
    fields: [generatedPdfs.originalFileId],
    references: [uploadedFiles.id],
  }),
}));

// Type exports
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type UserProfile = typeof userProfiles.$inferSelect;
export type NewUserProfile = typeof userProfiles.$inferInsert;
export type UploadedFile = typeof uploadedFiles.$inferSelect;
export type NewUploadedFile = typeof uploadedFiles.$inferInsert;
export type GeneratedPdf = typeof generatedPdfs.$inferSelect;
export type NewGeneratedPdf = typeof generatedPdfs.$inferInsert;

export type UserStatus = (typeof userStatusEnum.enumValues)[number];
export type UploadStatus = (typeof uploadStatusEnum.enumValues)[number];
