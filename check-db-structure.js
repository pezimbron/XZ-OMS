import pg from 'pg'

const { Pool } = pg

async function checkStructure() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URI,
  })

  try {
    console.log('Checking clients table structure...\n')
    
    // Get column information
    const columnsResult = await pool.query(`
      SELECT 
        column_name, 
        data_type, 
        is_nullable,
        column_default
      FROM information_schema.columns 
      WHERE table_name = 'clients' 
        AND column_name LIKE '%workflow%'
      ORDER BY ordinal_position;
    `)
    
    console.log('Workflow-related columns in clients table:')
    console.table(columnsResult.rows)
    
    // Check foreign key constraints
    const fkResult = await pool.query(`
      SELECT
        tc.constraint_name,
        tc.table_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_name = 'clients'
        AND kcu.column_name LIKE '%workflow%';
    `)
    
    console.log('\nForeign key constraints for workflow columns:')
    console.table(fkResult.rows)
    
    // Check if old enum type still exists
    const enumResult = await pool.query(`
      SELECT typname 
      FROM pg_type 
      WHERE typname LIKE '%workflow%';
    `)
    
    console.log('\nWorkflow-related enum types:')
    console.table(enumResult.rows)
    
    // Check workflow_templates table exists
    const tableResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_name = 'workflow_templates';
    `)
    
    console.log('\nWorkflow templates table exists:', tableResult.rows.length > 0 ? 'YES' : 'NO')
    
    if (tableResult.rows.length > 0) {
      const countResult = await pool.query('SELECT COUNT(*) FROM workflow_templates')
      console.log('Number of workflow templates:', countResult.rows[0].count)
    }
    
  } catch (error) {
    console.error('Error checking structure:', error.message)
  } finally {
    await pool.end()
  }
}

checkStructure()
