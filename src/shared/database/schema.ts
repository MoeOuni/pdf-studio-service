import { pgTable, uuid, varchar, boolean, timestamp, integer, bigint, json, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums
export const userStatusEnum = pgEnum('user_status', ['ACTIVE', 'INACTIVE', 'SUSPENDED', 'DELETED']);
export const uploadStatusEnum = pgEnum('upload_status', ['UPLOADING', 'COMPLETED', 'FAILED', 'DELETED']);

// Users table
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).notNull().unique(),
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
  preferences: json('preferences').default({}).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// Uploaded files table
export const uploadedFiles = pgTable('uploaded_files', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  originalFilename: varchar('original_filename', { length: 255 }).notNull(),
  storedFilename: varchar('stored_filename', { length: 255 }).notNull(),
  filePath: varchar('file_path', { length: 500 }).notNull(),
  s3Bucket: varchar('s3_bucket', { length: 255 }).notNull(),
  s3Key: varchar('s3_key', { length: 500 }).notNull(),
  fileSize: bigint('file_size', { mode: 'number' }).notNull(),
  mimeType: varchar('mime_type', { length: 100 }),
  fileHash: varchar('file_hash', { length: 64 }), // SHA-256 hash
  uploadStatus: uploadStatusEnum('upload_status').default('COMPLETED').notNull(),
  metadata: json('metadata').default({}).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// Generated PDFs table
export const generatedPdfs = pgTable('generated_pdfs', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  templateId: varchar('template_id', { length: 255 }).notNull(), // References DynamoDB template
  originalFileId: uuid('original_file_id').references(() => uploadedFiles.id, { onDelete: 'set null' }),
  generatedFilename: varchar('generated_filename', { length: 255 }).notNull(),
  filePath: varchar('file_path', { length: 500 }).notNull(),
  s3Bucket: varchar('s3_bucket', { length: 255 }).notNull(),
  s3Key: varchar('s3_key', { length: 500 }).notNull(),
  fileSize: bigint('file_size', { mode: 'number' }).notNull(),
  generationData: json('generation_data').notNull(), // The payload used for generation
  downloadCount: integer('download_count').default(0).notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }), // For cleanup (30 days default)
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// Relations
export const usersRelations = relations(users, ({ one, many }) => ({
  profile: one(userProfiles),
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

// User status type
export type UserStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'DELETED';
export type UploadStatus = 'UPLOADING' | 'COMPLETED' | 'FAILED' | 'DELETED';