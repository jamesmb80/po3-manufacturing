const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// Load environment variables
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false
  }
})

async function setupDatabase() {
  try {
    console.log('Setting up database...')
    
    // Read SQL file
    const sqlPath = path.join(__dirname, '..', 'supabase', 'parts-table.sql')
    const sql = fs.readFileSync(sqlPath, 'utf8')
    
    // Execute SQL
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql })
    
    if (error) {
      // If RPC doesn't exist, try executing statements individually
      console.log('Executing SQL statements...')
      
      // For now, let's just check if the table exists
      const { data: tables, error: tableError } = await supabase
        .from('parts')
        .select('*')
        .limit(1)
      
      if (tableError && tableError.code === '42P01') {
        console.log('Table does not exist. Please create it manually in Supabase dashboard.')
        console.log('SQL file location:', sqlPath)
      } else if (tableError) {
        console.log('Error checking table:', tableError.message)
      } else {
        console.log('Parts table already exists!')
      }
    } else {
      console.log('Database setup complete!')
    }
    
  } catch (err) {
    console.error('Setup failed:', err)
  }
}

setupDatabase()