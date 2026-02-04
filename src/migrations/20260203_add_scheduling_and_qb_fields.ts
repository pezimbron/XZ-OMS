import { MigrateUpArgs, MigrateDownArgs } from '@payloadcms/db-postgres'
import { sql } from 'drizzle-orm'

export async function up({ payload }: MigrateUpArgs): Promise<void> {
  // ─── Enums ────────────────────────────────────────────────────────────────

  await payload.db.drizzle.execute(sql.raw(`
    DO $$ BEGIN
      CREATE TYPE "public"."enum_jobs_scheduling_request_request_type" AS ENUM(
        'time-windows',
        'specific-time',
        'tech-proposes'
      );
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;`))

  await payload.db.drizzle.execute(sql.raw(`
    DO $$ BEGIN
      CREATE TYPE "public"."enum_jobs_scheduling_request_time_options_time_window" AS ENUM(
        'morning',
        'afternoon',
        'evening',
        'custom'
      );
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;`))

  await payload.db.drizzle.execute(sql.raw(`
    DO $$ BEGIN
      CREATE TYPE "public"."enum_vendors_integrations_quickbooks_sync_status" AS ENUM(
        'not-synced',
        'synced',
        'error'
      );
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;`))

  // ─── jobs table – schedulingRequest group ────────────────────────────────

  await payload.db.drizzle.execute(sql.raw(`
    DO $$ BEGIN
      ALTER TABLE "jobs" ADD COLUMN "scheduling_request_request_type" "enum_jobs_scheduling_request_request_type";
    EXCEPTION WHEN duplicate_column THEN null; END $$;`))

  await payload.db.drizzle.execute(sql.raw(`
    DO $$ BEGIN
      ALTER TABLE "jobs" ADD COLUMN "scheduling_request_sent_at" timestamp(3) with time zone;
    EXCEPTION WHEN duplicate_column THEN null; END $$;`))

  await payload.db.drizzle.execute(sql.raw(`
    DO $$ BEGIN
      ALTER TABLE "jobs" ADD COLUMN "scheduling_request_deadline" timestamp(3) with time zone;
    EXCEPTION WHEN duplicate_column THEN null; END $$;`))

  await payload.db.drizzle.execute(sql.raw(`
    DO $$ BEGIN
      ALTER TABLE "jobs" ADD COLUMN "scheduling_request_reminder_sent" boolean;
    EXCEPTION WHEN duplicate_column THEN null; END $$;`))

  await payload.db.drizzle.execute(sql.raw(`
    DO $$ BEGIN
      ALTER TABLE "jobs" ADD COLUMN "scheduling_request_reminder_sent_at" timestamp(3) with time zone;
    EXCEPTION WHEN duplicate_column THEN null; END $$;`))

  await payload.db.drizzle.execute(sql.raw(`
    DO $$ BEGIN
      ALTER TABLE "jobs" ADD COLUMN "scheduling_request_request_message" varchar;
    EXCEPTION WHEN duplicate_column THEN null; END $$;`))

  await payload.db.drizzle.execute(sql.raw(`
    DO $$ BEGIN
      ALTER TABLE "jobs" ADD COLUMN "scheduling_request_special_instructions" varchar;
    EXCEPTION WHEN duplicate_column THEN null; END $$;`))

  // ─── jobs table – techResponse group ─────────────────────────────────────

  await payload.db.drizzle.execute(sql.raw(`
    DO $$ BEGIN
      ALTER TABLE "jobs" ADD COLUMN "tech_response_responded_at" timestamp(3) with time zone;
    EXCEPTION WHEN duplicate_column THEN null; END $$;`))

  await payload.db.drizzle.execute(sql.raw(`
    DO $$ BEGIN
      ALTER TABLE "jobs" ADD COLUMN "tech_response_interested" boolean;
    EXCEPTION WHEN duplicate_column THEN null; END $$;`))

  await payload.db.drizzle.execute(sql.raw(`
    DO $$ BEGIN
      ALTER TABLE "jobs" ADD COLUMN "tech_response_selected_option" numeric;
    EXCEPTION WHEN duplicate_column THEN null; END $$;`))

  await payload.db.drizzle.execute(sql.raw(`
    DO $$ BEGIN
      ALTER TABLE "jobs" ADD COLUMN "tech_response_preferred_start_time" varchar;
    EXCEPTION WHEN duplicate_column THEN null; END $$;`))

  await payload.db.drizzle.execute(sql.raw(`
    DO $$ BEGIN
      ALTER TABLE "jobs" ADD COLUMN "tech_response_decline_reason" varchar;
    EXCEPTION WHEN duplicate_column THEN null; END $$;`))

  await payload.db.drizzle.execute(sql.raw(`
    DO $$ BEGIN
      ALTER TABLE "jobs" ADD COLUMN "tech_response_notes" varchar;
    EXCEPTION WHEN duplicate_column THEN null; END $$;`))

  // ─── jobs_scheduling_request_time_options (child table) ──────────────────

  await payload.db.drizzle.execute(sql.raw(`
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
    );`))

  await payload.db.drizzle.execute(sql.raw(`
    DO $$ BEGIN
      ALTER TABLE "jobs_scheduling_request_time_options"
        ADD CONSTRAINT "jobs_scheduling_request_time_options_parent_id_fk"
        FOREIGN KEY ("_parent_id") REFERENCES "public"."jobs"("id")
        ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN null; END $$;`))

  await payload.db.drizzle.execute(sql.raw(`CREATE INDEX IF NOT EXISTS "jobs_scheduling_request_time_options_order_idx" ON "jobs_scheduling_request_time_options" USING btree ("_order");`))

  await payload.db.drizzle.execute(sql.raw(`CREATE INDEX IF NOT EXISTS "jobs_scheduling_request_time_options_parent_id_idx" ON "jobs_scheduling_request_time_options" USING btree ("_parent_id");`))

  // ─── jobs_tech_response_proposed_options (child table) ───────────────────

  await payload.db.drizzle.execute(sql.raw(`
    CREATE TABLE IF NOT EXISTS "jobs_tech_response_proposed_options" (
      "_order" integer NOT NULL,
      "_parent_id" integer NOT NULL,
      "id" varchar PRIMARY KEY NOT NULL,
      "date" timestamp(3) with time zone,
      "start_time" varchar,
      "notes" varchar
    );`))

  await payload.db.drizzle.execute(sql.raw(`
    DO $$ BEGIN
      ALTER TABLE "jobs_tech_response_proposed_options"
        ADD CONSTRAINT "jobs_tech_response_proposed_options_parent_id_fk"
        FOREIGN KEY ("_parent_id") REFERENCES "public"."jobs"("id")
        ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN null; END $$;`))

  await payload.db.drizzle.execute(sql.raw(`CREATE INDEX IF NOT EXISTS "jobs_tech_response_proposed_options_order_idx" ON "jobs_tech_response_proposed_options" USING btree ("_order");`))

  await payload.db.drizzle.execute(sql.raw(`CREATE INDEX IF NOT EXISTS "jobs_tech_response_proposed_options_parent_id_idx" ON "jobs_tech_response_proposed_options" USING btree ("_parent_id");`))

  // ─── jobs_external_expenses – QuickBooks tracking columns ────────────────

  await payload.db.drizzle.execute(sql.raw(`
    DO $$ BEGIN
      ALTER TABLE "jobs_external_expenses" ADD COLUMN "quickbooks_id" varchar;
    EXCEPTION WHEN duplicate_column THEN null; END $$;`))

  await payload.db.drizzle.execute(sql.raw(`
    DO $$ BEGIN
      ALTER TABLE "jobs_external_expenses" ADD COLUMN "quickbooks_doc_number" varchar;
    EXCEPTION WHEN duplicate_column THEN null; END $$;`))

  await payload.db.drizzle.execute(sql.raw(`
    DO $$ BEGIN
      ALTER TABLE "jobs_external_expenses" ADD COLUMN "quickbooks_synced_at" timestamp(3) with time zone;
    EXCEPTION WHEN duplicate_column THEN null; END $$;`))

  // ─── vendors – QuickBooks integration columns ────────────────────────────

  await payload.db.drizzle.execute(sql.raw(`
    DO $$ BEGIN
      ALTER TABLE "vendors" ADD COLUMN "integrations_quickbooks_vendor_id" varchar;
    EXCEPTION WHEN duplicate_column THEN null; END $$;`))

  await payload.db.drizzle.execute(sql.raw(`
    DO $$ BEGIN
      ALTER TABLE "vendors" ADD COLUMN "integrations_quickbooks_sync_status" "enum_vendors_integrations_quickbooks_sync_status";
    EXCEPTION WHEN duplicate_column THEN null; END $$;`))

  await payload.db.drizzle.execute(sql.raw(`
    DO $$ BEGIN
      ALTER TABLE "vendors" ADD COLUMN "integrations_quickbooks_last_synced_at" timestamp(3) with time zone;
    EXCEPTION WHEN duplicate_column THEN null; END $$;`))
}

export async function down({ payload }: MigrateDownArgs): Promise<void> {
  // ─── vendors – QuickBooks integration columns ────────────────────────────
  await payload.db.drizzle.execute(sql.raw(`ALTER TABLE "vendors" DROP COLUMN IF EXISTS "integrations_quickbooks_last_synced_at";`))
  await payload.db.drizzle.execute(sql.raw(`ALTER TABLE "vendors" DROP COLUMN IF EXISTS "integrations_quickbooks_sync_status";`))
  await payload.db.drizzle.execute(sql.raw(`ALTER TABLE "vendors" DROP COLUMN IF EXISTS "integrations_quickbooks_vendor_id";`))

  // ─── jobs_external_expenses – QuickBooks tracking columns ────────────────
  await payload.db.drizzle.execute(sql.raw(`ALTER TABLE "jobs_external_expenses" DROP COLUMN IF EXISTS "quickbooks_synced_at";`))
  await payload.db.drizzle.execute(sql.raw(`ALTER TABLE "jobs_external_expenses" DROP COLUMN IF EXISTS "quickbooks_doc_number";`))
  await payload.db.drizzle.execute(sql.raw(`ALTER TABLE "jobs_external_expenses" DROP COLUMN IF EXISTS "quickbooks_id";`))

  // ─── Child tables ─────────────────────────────────────────────────────────
  await payload.db.drizzle.execute(sql.raw(`DROP INDEX IF EXISTS "jobs_tech_response_proposed_options_parent_id_idx";`))
  await payload.db.drizzle.execute(sql.raw(`DROP INDEX IF EXISTS "jobs_tech_response_proposed_options_order_idx";`))
  await payload.db.drizzle.execute(sql.raw(`ALTER TABLE "jobs_tech_response_proposed_options" DROP CONSTRAINT IF EXISTS "jobs_tech_response_proposed_options_parent_id_fk";`))
  await payload.db.drizzle.execute(sql.raw(`DROP TABLE IF EXISTS "jobs_tech_response_proposed_options" CASCADE;`))

  await payload.db.drizzle.execute(sql.raw(`DROP INDEX IF EXISTS "jobs_scheduling_request_time_options_parent_id_idx";`))
  await payload.db.drizzle.execute(sql.raw(`DROP INDEX IF EXISTS "jobs_scheduling_request_time_options_order_idx";`))
  await payload.db.drizzle.execute(sql.raw(`ALTER TABLE "jobs_scheduling_request_time_options" DROP CONSTRAINT IF EXISTS "jobs_scheduling_request_time_options_parent_id_fk";`))
  await payload.db.drizzle.execute(sql.raw(`DROP TABLE IF EXISTS "jobs_scheduling_request_time_options" CASCADE;`))

  // ─── jobs table – techResponse group ─────────────────────────────────────
  await payload.db.drizzle.execute(sql.raw(`ALTER TABLE "jobs" DROP COLUMN IF EXISTS "tech_response_notes";`))
  await payload.db.drizzle.execute(sql.raw(`ALTER TABLE "jobs" DROP COLUMN IF EXISTS "tech_response_decline_reason";`))
  await payload.db.drizzle.execute(sql.raw(`ALTER TABLE "jobs" DROP COLUMN IF EXISTS "tech_response_preferred_start_time";`))
  await payload.db.drizzle.execute(sql.raw(`ALTER TABLE "jobs" DROP COLUMN IF EXISTS "tech_response_selected_option";`))
  await payload.db.drizzle.execute(sql.raw(`ALTER TABLE "jobs" DROP COLUMN IF EXISTS "tech_response_interested";`))
  await payload.db.drizzle.execute(sql.raw(`ALTER TABLE "jobs" DROP COLUMN IF EXISTS "tech_response_responded_at";`))

  // ─── jobs table – schedulingRequest group ────────────────────────────────
  await payload.db.drizzle.execute(sql.raw(`ALTER TABLE "jobs" DROP COLUMN IF EXISTS "scheduling_request_special_instructions";`))
  await payload.db.drizzle.execute(sql.raw(`ALTER TABLE "jobs" DROP COLUMN IF EXISTS "scheduling_request_request_message";`))
  await payload.db.drizzle.execute(sql.raw(`ALTER TABLE "jobs" DROP COLUMN IF EXISTS "scheduling_request_reminder_sent_at";`))
  await payload.db.drizzle.execute(sql.raw(`ALTER TABLE "jobs" DROP COLUMN IF EXISTS "scheduling_request_reminder_sent";`))
  await payload.db.drizzle.execute(sql.raw(`ALTER TABLE "jobs" DROP COLUMN IF EXISTS "scheduling_request_deadline";`))
  await payload.db.drizzle.execute(sql.raw(`ALTER TABLE "jobs" DROP COLUMN IF EXISTS "scheduling_request_sent_at";`))
  await payload.db.drizzle.execute(sql.raw(`ALTER TABLE "jobs" DROP COLUMN IF EXISTS "scheduling_request_request_type";`))

  // ─── Enums ────────────────────────────────────────────────────────────────
  await payload.db.drizzle.execute(sql.raw(`DROP TYPE IF EXISTS "public"."enum_vendors_integrations_quickbooks_sync_status";`))
  await payload.db.drizzle.execute(sql.raw(`DROP TYPE IF EXISTS "public"."enum_jobs_scheduling_request_time_options_time_window";`))
  await payload.db.drizzle.execute(sql.raw(`DROP TYPE IF EXISTS "public"."enum_jobs_scheduling_request_request_type";`))
}
