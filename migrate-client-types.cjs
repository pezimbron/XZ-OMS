/**
 * Migration script to update client_type enum values
 * Run this with: node migrate-client-types.cjs
 */

const { Client } = require('pg')

async function migrateClientTypes() {
  // Use DATABASE_URI directly
  const databaseUri = 'postgresql://postgres:OJtMGFTEhEXfihEVhGDnUtKmrFJXlISs@caboose.proxy.rlwy.net:55195/railway'

  const client = new Client({
    connectionString: databaseUri,
  })

  try {
    await client.connect()
    console.log('Connected to database')

    // Check if table has data
    const countResult = await client.query('SELECT COUNT(*) FROM clients')
    console.log(`Found ${countResult.rows[0].count} clients in database`)

    // Start transaction
    await client.query('BEGIN')

    // Step 1: Convert column to text temporarily
    console.log('Converting column to text...')
    await client.query(`
      ALTER TABLE clients ALTER COLUMN client_type DROP DEFAULT
    `)
    await client.query(`
      ALTER TABLE clients ALTER COLUMN client_type TYPE text
    `)

    // Step 2: Drop old enum type
    console.log('Dropping old enum type...')
    await client.query(`
      DROP TYPE IF EXISTS enum_clients_client_type CASCADE
    `)

    // Step 3: Create new enum with correct values
    console.log('Creating new enum type...')
    await client.query(`
      CREATE TYPE enum_clients_client_type AS ENUM ('retail', 'outsourcing-partner')
    `)

    // Step 4: Convert column back to enum
    console.log('Converting column back to enum...')
    await client.query(`
      ALTER TABLE clients 
      ALTER COLUMN client_type TYPE enum_clients_client_type 
      USING client_type::enum_clients_client_type
    `)

    // Step 5: Set default value
    console.log('Setting default value...')
    await client.query(`
      ALTER TABLE clients 
      ALTER COLUMN client_type SET DEFAULT 'retail'::enum_clients_client_type
    `)

    // Commit transaction
    await client.query('COMMIT')
    console.log('✅ Migration completed successfully!')

  } catch (error) {
    await client.query('ROLLBACK')
    console.error('❌ Migration failed:', error)
    throw error
  } finally {
    await client.end()
  }
}

migrateClientTypes()
  .then(() => {
    console.log('Done!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('Fatal error:', error)
    process.exit(1)
  })
