import { MigrateUpArgs, MigrateDownArgs } from '@payloadcms/db-postgres'

export async function up({ payload }: MigrateUpArgs): Promise<void> {
  // Add 'request' to the enum_jobs_status enum type
  // Use pool.query directly since drizzle-orm import has issues in tsx runtime
  // Check if enum exists first (fresh DBs may not have it yet - Payload will create it on startup)
  const pool = (payload.db as any).pool
  const enumCheck = await pool.query(`
    SELECT 1 FROM pg_type WHERE typname = 'enum_jobs_status'
  `)
  if (enumCheck.rows.length > 0) {
    await pool.query(`ALTER TYPE "public"."enum_jobs_status" ADD VALUE IF NOT EXISTS 'request';`)
  }
  // If enum doesn't exist, Payload's schema push will create it with all values including 'request'
}

export async function down({ payload }: MigrateDownArgs): Promise<void> {
  // Note: PostgreSQL doesn't support removing enum values directly
  // You would need to recreate the enum type to remove a value
  // For now, this is a no-op
}
