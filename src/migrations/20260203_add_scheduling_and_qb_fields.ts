import { MigrateUpArgs, MigrateDownArgs } from '@payloadcms/db-postgres'

// Helper to execute raw SQL via pg pool (drizzle-orm import has issues in tsx runtime)
async function exec(payload: any, sql: string) {
  await payload.db.pool.query(sql)
}

export async function up({ payload }: MigrateUpArgs): Promise<void> {
  // ─── Enums ────────────────────────────────────────────────────────────────

  await exec(payload, `
    DO $$ BEGIN
      CREATE TYPE "public"."enum_jobs_scheduling_request_request_type" AS ENUM(
        'time-windows',
        'specific-time',
        'tech-proposes'
      );
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;`)

  await exec(payload, `
    DO $$ BEGIN
      CREATE TYPE "public"."enum_jobs_scheduling_request_time_options_time_window" AS ENUM(
        'morning',
        'afternoon',
        'evening',
        'custom'
      );
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;`)

  await exec(payload, `
    DO $$ BEGIN
      CREATE TYPE "public"."enum_vendors_integrations_quickbooks_sync_status" AS ENUM(
        'not-synced',
        'synced',
        'error'
      );
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;`)

  // ─── jobs table – schedulingRequest group ────────────────────────────────

  await exec(payload, `
    DO $$ BEGIN
      ALTER TABLE "jobs" ADD COLUMN "scheduling_request_request_type" "enum_jobs_scheduling_request_request_type";
    EXCEPTION WHEN duplicate_column THEN null; END $$;`)

  await exec(payload, `
    DO $$ BEGIN
      ALTER TABLE "jobs" ADD COLUMN "scheduling_request_sent_at" timestamp(3) with time zone;
    EXCEPTION WHEN duplicate_column THEN null; END $$;`)

  await exec(payload, `
    DO $$ BEGIN
      ALTER TABLE "jobs" ADD COLUMN "scheduling_request_deadline" timestamp(3) with time zone;
    EXCEPTION WHEN duplicate_column THEN null; END $$;`)

  await exec(payload, `
    DO $$ BEGIN
      ALTER TABLE "jobs" ADD COLUMN "scheduling_request_reminder_sent" boolean;
    EXCEPTION WHEN duplicate_column THEN null; END $$;`)

  await exec(payload, `
    DO $$ BEGIN
      ALTER TABLE "jobs" ADD COLUMN "scheduling_request_reminder_sent_at" timestamp(3) with time zone;
    EXCEPTION WHEN duplicate_column THEN null; END $$;`)

  await exec(payload, `
    DO $$ BEGIN
      ALTER TABLE "jobs" ADD COLUMN "scheduling_request_request_message" varchar;
    EXCEPTION WHEN duplicate_column THEN null; END $$;`)

  await exec(payload, `
    DO $$ BEGIN
      ALTER TABLE "jobs" ADD COLUMN "scheduling_request_special_instructions" varchar;
    EXCEPTION WHEN duplicate_column THEN null; END $$;`)

  // ─── jobs table – techResponse group ─────────────────────────────────────

  await exec(payload, `
    DO $$ BEGIN
      ALTER TABLE "jobs" ADD COLUMN "tech_response_responded_at" timestamp(3) with time zone;
    EXCEPTION WHEN duplicate_column THEN null; END $$;`)

  await exec(payload, `
    DO $$ BEGIN
      ALTER TABLE "jobs" ADD COLUMN "tech_response_interested" boolean;
    EXCEPTION WHEN duplicate_column THEN null; END $$;`)

  await exec(payload, `
    DO $$ BEGIN
      ALTER TABLE "jobs" ADD COLUMN "tech_response_selected_option" numeric;
    EXCEPTION WHEN duplicate_column THEN null; END $$;`)

  await exec(payload, `
    DO $$ BEGIN
      ALTER TABLE "jobs" ADD COLUMN "tech_response_preferred_start_time" varchar;
    EXCEPTION WHEN duplicate_column THEN null; END $$;`)

  await exec(payload, `
    DO $$ BEGIN
      ALTER TABLE "jobs" ADD COLUMN "tech_response_decline_reason" varchar;
    EXCEPTION WHEN duplicate_column THEN null; END $$;`)

  await exec(payload, `
    DO $$ BEGIN
      ALTER TABLE "jobs" ADD COLUMN "tech_response_notes" varchar;
    EXCEPTION WHEN duplicate_column THEN null; END $$;`)

  // ─── jobs_scheduling_request_time_options (child table) ──────────────────

  await exec(payload, `
    CREATE TABLE IF NOT EXISTS "jobs_scheduling_request_time_options" (
      "_order" integer NOT NULL,
      "_parent_id" integer NOT NULL,
      "id" varchar PRIMARY KEY NOT NULL,
      "option_number" numeric,
      "date" timestamp(3) with time zone,
      "time_window" "enum_jobs_scheduling_request_time_options_time_window",
      "start_time" varchar,
      "end_time" varchar,
      "specific_time" varchar
    );`)

  await exec(payload, `
    DO $$ BEGIN
      ALTER TABLE "jobs_scheduling_request_time_options"
        ADD CONSTRAINT "jobs_scheduling_request_time_options_parent_id_fk"
        FOREIGN KEY ("_parent_id") REFERENCES "public"."jobs"("id")
        ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN null; END $$;`)

  await exec(payload, `CREATE INDEX IF NOT EXISTS "jobs_scheduling_request_time_options_order_idx" ON "jobs_scheduling_request_time_options" USING btree ("_order");`)
  await exec(payload, `CREATE INDEX IF NOT EXISTS "jobs_scheduling_request_time_options_parent_id_idx" ON "jobs_scheduling_request_time_options" USING btree ("_parent_id");`)

  // ─── jobs_tech_response_proposed_options (child table) ───────────────────

  await exec(payload, `
    CREATE TABLE IF NOT EXISTS "jobs_tech_response_proposed_options" (
      "_order" integer NOT NULL,
      "_parent_id" integer NOT NULL,
      "id" varchar PRIMARY KEY NOT NULL,
      "date" timestamp(3) with time zone,
      "start_time" varchar,
      "notes" varchar
    );`)

  await exec(payload, `
    DO $$ BEGIN
      ALTER TABLE "jobs_tech_response_proposed_options"
        ADD CONSTRAINT "jobs_tech_response_proposed_options_parent_id_fk"
        FOREIGN KEY ("_parent_id") REFERENCES "public"."jobs"("id")
        ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN null; END $$;`)

  await exec(payload, `CREATE INDEX IF NOT EXISTS "jobs_tech_response_proposed_options_order_idx" ON "jobs_tech_response_proposed_options" USING btree ("_order");`)
  await exec(payload, `CREATE INDEX IF NOT EXISTS "jobs_tech_response_proposed_options_parent_id_idx" ON "jobs_tech_response_proposed_options" USING btree ("_parent_id");`)

  // ─── jobs_external_expenses – QuickBooks tracking columns ────────────────

  await exec(payload, `
    DO $$ BEGIN
      ALTER TABLE "jobs_external_expenses" ADD COLUMN "quickbooks_id" varchar;
    EXCEPTION WHEN duplicate_column THEN null; END $$;`)

  await exec(payload, `
    DO $$ BEGIN
      ALTER TABLE "jobs_external_expenses" ADD COLUMN "quickbooks_doc_number" varchar;
    EXCEPTION WHEN duplicate_column THEN null; END $$;`)

  await exec(payload, `
    DO $$ BEGIN
      ALTER TABLE "jobs_external_expenses" ADD COLUMN "quickbooks_synced_at" timestamp(3) with time zone;
    EXCEPTION WHEN duplicate_column THEN null; END $$;`)

  // ─── vendors – QuickBooks integration columns ────────────────────────────

  await exec(payload, `
    DO $$ BEGIN
      ALTER TABLE "vendors" ADD COLUMN "integrations_quickbooks_vendor_id" varchar;
    EXCEPTION WHEN duplicate_column THEN null; END $$;`)

  await exec(payload, `
    DO $$ BEGIN
      ALTER TABLE "vendors" ADD COLUMN "integrations_quickbooks_sync_status" "enum_vendors_integrations_quickbooks_sync_status";
    EXCEPTION WHEN duplicate_column THEN null; END $$;`)

  await exec(payload, `
    DO $$ BEGIN
      ALTER TABLE "vendors" ADD COLUMN "integrations_quickbooks_last_synced_at" timestamp(3) with time zone;
    EXCEPTION WHEN duplicate_column THEN null; END $$;`)
}

export async function down({ payload }: MigrateDownArgs): Promise<void> {
  // ─── vendors – QuickBooks integration columns ────────────────────────────
  await exec(payload, `ALTER TABLE "vendors" DROP COLUMN IF EXISTS "integrations_quickbooks_last_synced_at";`)
  await exec(payload, `ALTER TABLE "vendors" DROP COLUMN IF EXISTS "integrations_quickbooks_sync_status";`)
  await exec(payload, `ALTER TABLE "vendors" DROP COLUMN IF EXISTS "integrations_quickbooks_vendor_id";`)

  // ─── jobs_external_expenses – QuickBooks tracking columns ────────────────
  await exec(payload, `ALTER TABLE "jobs_external_expenses" DROP COLUMN IF EXISTS "quickbooks_synced_at";`)
  await exec(payload, `ALTER TABLE "jobs_external_expenses" DROP COLUMN IF EXISTS "quickbooks_doc_number";`)
  await exec(payload, `ALTER TABLE "jobs_external_expenses" DROP COLUMN IF EXISTS "quickbooks_id";`)

  // ─── Child tables ─────────────────────────────────────────────────────────
  await exec(payload, `DROP INDEX IF EXISTS "jobs_tech_response_proposed_options_parent_id_idx";`)
  await exec(payload, `DROP INDEX IF EXISTS "jobs_tech_response_proposed_options_order_idx";`)
  await exec(payload, `ALTER TABLE "jobs_tech_response_proposed_options" DROP CONSTRAINT IF EXISTS "jobs_tech_response_proposed_options_parent_id_fk";`)
  await exec(payload, `DROP TABLE IF EXISTS "jobs_tech_response_proposed_options" CASCADE;`)

  await exec(payload, `DROP INDEX IF EXISTS "jobs_scheduling_request_time_options_parent_id_idx";`)
  await exec(payload, `DROP INDEX IF EXISTS "jobs_scheduling_request_time_options_order_idx";`)
  await exec(payload, `ALTER TABLE "jobs_scheduling_request_time_options" DROP CONSTRAINT IF EXISTS "jobs_scheduling_request_time_options_parent_id_fk";`)
  await exec(payload, `DROP TABLE IF EXISTS "jobs_scheduling_request_time_options" CASCADE;`)

  // ─── jobs table – techResponse group ─────────────────────────────────────
  await exec(payload, `ALTER TABLE "jobs" DROP COLUMN IF EXISTS "tech_response_notes";`)
  await exec(payload, `ALTER TABLE "jobs" DROP COLUMN IF EXISTS "tech_response_decline_reason";`)
  await exec(payload, `ALTER TABLE "jobs" DROP COLUMN IF EXISTS "tech_response_preferred_start_time";`)
  await exec(payload, `ALTER TABLE "jobs" DROP COLUMN IF EXISTS "tech_response_selected_option";`)
  await exec(payload, `ALTER TABLE "jobs" DROP COLUMN IF EXISTS "tech_response_interested";`)
  await exec(payload, `ALTER TABLE "jobs" DROP COLUMN IF EXISTS "tech_response_responded_at";`)

  // ─── jobs table – schedulingRequest group ────────────────────────────────
  await exec(payload, `ALTER TABLE "jobs" DROP COLUMN IF EXISTS "scheduling_request_special_instructions";`)
  await exec(payload, `ALTER TABLE "jobs" DROP COLUMN IF EXISTS "scheduling_request_request_message";`)
  await exec(payload, `ALTER TABLE "jobs" DROP COLUMN IF EXISTS "scheduling_request_reminder_sent_at";`)
  await exec(payload, `ALTER TABLE "jobs" DROP COLUMN IF EXISTS "scheduling_request_reminder_sent";`)
  await exec(payload, `ALTER TABLE "jobs" DROP COLUMN IF EXISTS "scheduling_request_deadline";`)
  await exec(payload, `ALTER TABLE "jobs" DROP COLUMN IF EXISTS "scheduling_request_sent_at";`)
  await exec(payload, `ALTER TABLE "jobs" DROP COLUMN IF EXISTS "scheduling_request_request_type";`)

  // ─── Enums ────────────────────────────────────────────────────────────────
  await exec(payload, `DROP TYPE IF EXISTS "public"."enum_vendors_integrations_quickbooks_sync_status";`)
  await exec(payload, `DROP TYPE IF EXISTS "public"."enum_jobs_scheduling_request_time_options_time_window";`)
  await exec(payload, `DROP TYPE IF EXISTS "public"."enum_jobs_scheduling_request_request_type";`)
}
