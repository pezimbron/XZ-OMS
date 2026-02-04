import { MigrateUpArgs, MigrateDownArgs } from '@payloadcms/db-postgres'
import { sql } from 'drizzle-orm'

export async function up({ payload }: MigrateUpArgs): Promise<void> {
  // Add 'request' to the enum_jobs_status enum type
  await payload.db.drizzle.execute(sql`ALTER TYPE "public"."enum_jobs_status" ADD VALUE IF NOT EXISTS 'request';`)
}

export async function down({ payload }: MigrateDownArgs): Promise<void> {
  // Note: PostgreSQL doesn't support removing enum values directly
  // You would need to recreate the enum type to remove a value
  // For now, this is a no-op
}
