CREATE TYPE "public"."upload_status" AS ENUM('UPLOADING', 'COMPLETED', 'FAILED', 'DELETED');--> statement-breakpoint
CREATE TYPE "public"."user_status" AS ENUM('ACTIVE', 'INACTIVE', 'SUSPENDED', 'DELETED');--> statement-breakpoint
CREATE TABLE "generated_pdfs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"template_id" varchar(255) NOT NULL,
	"original_file_id" uuid,
	"generated_filename" varchar(255) NOT NULL,
	"file_path" varchar(500) NOT NULL,
	"s3_bucket" varchar(255) NOT NULL,
	"s3_key" varchar(500) NOT NULL,
	"file_size" bigint NOT NULL,
	"generation_data" jsonb NOT NULL,
	"download_count" integer DEFAULT 0 NOT NULL,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "uploaded_files" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"original_filename" varchar(255) NOT NULL,
	"stored_filename" varchar(255) NOT NULL,
	"file_path" varchar(500) NOT NULL,
	"s3_bucket" varchar(255) NOT NULL,
	"s3_key" varchar(500) NOT NULL,
	"file_size" bigint NOT NULL,
	"mime_type" varchar(255),
	"file_hash" varchar(64),
	"upload_status" "upload_status" DEFAULT 'COMPLETED' NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_profiles" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"avatar_url" varchar(500),
	"company" varchar(255),
	"timezone" varchar(50) DEFAULT 'UTC' NOT NULL,
	"language" varchar(10) DEFAULT 'en' NOT NULL,
	"preferences" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"password_hash" varchar(255) NOT NULL,
	"name" varchar(255),
	"email_verified" boolean DEFAULT false NOT NULL,
	"status" "user_status" DEFAULT 'ACTIVE' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "generated_pdfs" ADD CONSTRAINT "generated_pdfs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generated_pdfs" ADD CONSTRAINT "generated_pdfs_original_file_id_uploaded_files_id_fk" FOREIGN KEY ("original_file_id") REFERENCES "public"."uploaded_files"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "uploaded_files" ADD CONSTRAINT "uploaded_files_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "generated_pdfs_user_id_idx" ON "generated_pdfs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "generated_pdfs_template_id_idx" ON "generated_pdfs" USING btree ("template_id");--> statement-breakpoint
CREATE INDEX "generated_pdfs_expires_at_idx" ON "generated_pdfs" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "generated_pdfs_created_at_idx" ON "generated_pdfs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "uploaded_files_user_id_idx" ON "uploaded_files" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "uploaded_files_upload_status_idx" ON "uploaded_files" USING btree ("upload_status");--> statement-breakpoint
CREATE INDEX "uploaded_files_file_hash_idx" ON "uploaded_files" USING btree ("file_hash");--> statement-breakpoint
CREATE INDEX "uploaded_files_created_at_idx" ON "uploaded_files" USING btree ("created_at");