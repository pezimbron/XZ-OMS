import { MigrateUpArgs, MigrateDownArgs } from '@payloadcms/db-postgres'
import { sql } from 'drizzle-orm'

export async function up({ payload }: MigrateUpArgs): Promise<void> {
  // Add workflow enum types (skip if already exist from dev mode)
  await payload.db.drizzle.execute(sql.raw(`
    DO $$ BEGIN
      CREATE TYPE "public"."enum_clients_default_workflow" AS ENUM(
        'outsourced-scan-upload-client',
        'outsourced-scan-transfer',
        'outsourced-scan-survey-images',
        'direct-scan-hosted',
        'direct-scan-transfer',
        'direct-scan-floorplan',
        'direct-scan-floorplan-photos',
        'direct-scan-asbuilts'
      );
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;`))

  await payload.db.drizzle.execute(sql.raw(`
    DO $$ BEGIN
      CREATE TYPE "public"."enum_jobs_workflow_type" AS ENUM(
        'outsourced-scan-upload-client',
        'outsourced-scan-transfer',
        'outsourced-scan-survey-images',
        'direct-scan-hosted',
        'direct-scan-transfer',
        'direct-scan-floorplan',
        'direct-scan-floorplan-photos',
        'direct-scan-asbuilts'
      );
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;`))

  // Add defaultWorkflow column to clients table (skip if exists)
  await payload.db.drizzle.execute(sql.raw(`
    DO $$ BEGIN
      ALTER TABLE "clients"
      ADD COLUMN "default_workflow" "enum_clients_default_workflow";
    EXCEPTION
      WHEN duplicate_column THEN null;
    END $$;`))

  // Add workflowType column to jobs table (skip if exists)
  await payload.db.drizzle.execute(sql.raw(`
    DO $$ BEGIN
      ALTER TABLE "jobs"
      ADD COLUMN "workflow_type" "enum_jobs_workflow_type";
    EXCEPTION
      WHEN duplicate_column THEN null;
    END $$;`))

  // Create jobs_workflow_steps table (skip if exists)
  await payload.db.drizzle.execute(sql.raw(`
    CREATE TABLE IF NOT EXISTS "jobs_workflow_steps" (
      "_order" integer NOT NULL,
      "_parent_id" integer NOT NULL,
      "id" varchar PRIMARY KEY NOT NULL,
      "step_name" varchar NOT NULL,
      "completed" boolean DEFAULT false,
      "completed_at" timestamp(3) with time zone,
      "completed_by" varchar,
      "notes" varchar
    );`))

  // Add foreign key constraint
  await payload.db.drizzle.execute(sql.raw(`
    DO $$ BEGIN
      ALTER TABLE "jobs_workflow_steps"
      ADD CONSTRAINT "jobs_workflow_steps_parent_id_fk"
      FOREIGN KEY ("_parent_id") REFERENCES "public"."jobs"("id")
      ON DELETE cascade ON UPDATE no action;
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;`))

  // Create indexes
  await payload.db.drizzle.execute(sql.raw(`CREATE INDEX IF NOT EXISTS "jobs_workflow_steps_order_idx" ON "jobs_workflow_steps" USING btree ("_order");`))

  await payload.db.drizzle.execute(sql.raw(`CREATE INDEX IF NOT EXISTS "jobs_workflow_steps_parent_id_idx" ON "jobs_workflow_steps" USING btree ("_parent_id");`))
}

export async function down({ payload }: MigrateDownArgs): Promise<void> {
  // Drop indexes
  await payload.db.drizzle.execute(sql.raw(`DROP INDEX IF EXISTS "jobs_workflow_steps_order_idx";`))
  await payload.db.drizzle.execute(sql.raw(`DROP INDEX IF EXISTS "jobs_workflow_steps_parent_id_idx";`))

  // Drop foreign key constraint
  await payload.db.drizzle.execute(sql.raw(`
    ALTER TABLE "jobs_workflow_steps"
    DROP CONSTRAINT IF EXISTS "jobs_workflow_steps_parent_id_fk";`))

  // Drop table
  await payload.db.drizzle.execute(sql.raw(`DROP TABLE IF EXISTS "jobs_workflow_steps" CASCADE;`))

  // Drop columns
  await payload.db.drizzle.execute(sql.raw(`ALTER TABLE "jobs" DROP COLUMN IF EXISTS "workflow_type";`))
  await payload.db.drizzle.execute(sql.raw(`ALTER TABLE "clients" DROP COLUMN IF EXISTS "default_workflow";`))

  // Drop enum types
  await payload.db.drizzle.execute(sql.raw(`DROP TYPE IF EXISTS "public"."enum_jobs_workflow_type";`))
  await payload.db.drizzle.execute(sql.raw(`DROP TYPE IF EXISTS "public"."enum_clients_default_workflow";`))
}
