const mysql = require('mysql2/promise');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// Material parser
function parseMaterialFromItemName(itemName) {
  if (!itemName) {
    return { material: null, type: null, thickness: null };
  }

  const name = itemName.toLowerCase();
  let material = null;
  let type = null;
  let thickness = null;

  // Extract thickness
  const thicknessMatch = itemName.match(/(\d+(?:\.\d+)?)\s*mm/i);
  if (thicknessMatch) {
    thickness = thicknessMatch[1];
  }

  // Parse materials
  if (name.includes('mdf')) {
    material = 'MDF';
  } else if (name.includes('plywood')) {
    material = 'Plywood';
  } else if (name.includes('acrylic')) {
    material = 'Acrylic';
  } else if (name.includes('polycarbonate')) {
    material = 'Polycarbonate';
  } else if (name.includes('osb')) {
    material = 'OSB';
  } else if (name.includes('chipboard')) {
    material = 'Chipboard';
  } else if (name.includes('oak') && !name.includes('mdf')) {
    material = 'Oak';
  }

  return { material, type, thickness };
}

async function importToParts() {
  console.log('🚀 Importing to parts table...\n');

  let mysqlConnection;
  
  try {
    // Connect to MySQL
    mysqlConnection = await mysql.createConnection({
      host: process.env.MYSQL_HOST,
      port: parseInt(process.env.MYSQL_PORT),
      user: process.env.MYSQL_USER,
      password: process.env.MYSQL_PASSWORD,
      database: process.env.MYSQL_DATABASE,
    });

    // Clear existing data
    console.log('Clearing existing data...');
    const { error: deleteError } = await supabase
      .from('parts')
      .delete()
      .neq('part_number', '');
    
    if (deleteError) {
      console.log('Could not clear data:', deleteError.message);
    }

    // Fetch data
    console.log('Fetching data from MySQL...');
    const [records] = await mysqlConnection.execute(`
      SELECT 
        sove.entity_id,
        so.increment_id,
        sove.item_name,
        sove.notes
      FROM sales_order_variant_entity sove
      JOIN sales_order so ON sove.order_id = so.entity_id
      WHERE sove.item_status = 'cutting_ready'
        AND so.status = 'processing'
      LIMIT 100
    `);
    
    console.log(`Fetched ${records.length} records`);

    // Transform for parts table
    const transformedRecords = records.map(r => {
      const parsed = parseMaterialFromItemName(r.item_name);
      
      return {
        order_number: r.increment_id,
        part_number: `PART-${r.entity_id}`,
        quantity: 1,
        material: parsed.material || r.item_name?.substring(0, 50),
        thickness: parsed.thickness ? parseFloat(parsed.thickness) : null,
        finish: null,
        notes: r.notes || r.item_name
      };
    });

    // Insert in batches
    console.log('Inserting to Supabase...');
    const batchSize = 50;
    let imported = 0;

    for (let i = 0; i < transformedRecords.length; i += batchSize) {
      const batch = transformedRecords.slice(i, i + batchSize);
      
      const { data, error } = await supabase
        .from('parts')
        .insert(batch)
        .select();
      
      if (error) {
        console.error('Batch failed:', error.message);
      } else {
        imported += data.length;
        console.log(`Imported ${imported}/${transformedRecords.length}`);
      }
    }

    console.log(`\n✅ Import complete! Imported ${imported} records`);

  } catch (error) {
    console.error('Import failed:', error);
  } finally {
    if (mysqlConnection) {
      await mysqlConnection.end();
    }
  }
}

importToParts();