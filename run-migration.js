import pg from 'pg'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const { Pool } = pg
const __dirname = path.dirname(fileURLToPath(import.meta.url))

async function runMigration() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URI,
  })

  try {
    const sql = fs.readFileSync(path.join(__dirname, 'fix_workflow_migration.sql'), 'utf8')
    console.log('Running migration...')
    console.log('SQL:', sql)
    await pool.query(sql)
    console.log('✅ Migration completed successfully!')
    console.log('You can now restart your dev server.')
  } catch (error) {
    console.error('❌ Migration failed:')
    console.error('Error message:', error.message)
    console.error('Error detail:', error.detail)
    console.error('Full error:', error)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

runMigration()
