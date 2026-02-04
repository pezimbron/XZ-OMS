import { MigrateUpArgs, MigrateDownArgs } from '@payloadcms/db-postgres'

export async function up({ payload }: MigrateUpArgs): Promise<void> {
  // Add 'request' to the enum_jobs_status enum type
  // Use pool.query directly since drizzle-orm import has issues in tsx runtime
  await (payload.db as any).pool.query(`ALTER TYPE "public"."enum_jobs_status" ADD VALUE IF NOT EXISTS 'request';`)
}

export async function down({ payload }: MigrateDownArgs): Promise<void> {
  // Note: PostgreSQL doesn't support removing enum values directly
  // You would need to recreate the enum type to remove a value
  // For now, this is a no-op
}
