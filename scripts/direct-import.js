const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env.local' });

// Direct database import using fetch API to Supabase REST API
async function directImport() {
  console.log('🚀 Direct import to Supabase...\n');

  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

  if (!SUPABASE_SERVICE_KEY) {
    console.error('❌ SUPABASE_SERVICE_KEY not found in .env.local');
    console.error('Please add your service role key to .env.local');
    return;
  }

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

    console.log('✅ Connected to MySQL');

    // First check what table exists
    console.log('\n🔍 Checking Supabase tables...');
    
    // Try to check ready2cut_parts table
    const checkResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/ready2cut_parts?select=sheet_id&limit=1`,
      {
        headers: {
          'apikey': SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        }
      }
    );

    const useReadyCutTable = checkResponse.status !== 404;
    const tableName = useReadyCutTable ? 'ready2cut_parts' : 'parts';
    
    console.log(`Using table: ${tableName}`);

    // Fetch first 50 records from MySQL
    console.log('\n📊 Fetching data from MySQL...');
    const [records] = await mysqlConnection.execute(`
      SELECT 
        sove.entity_id as sheet_id,
        so.increment_id,
        DATE_FORMAT(sove.cutting_date, '%d %b %Y') as cutting_date,
        'Processing' as order_status,
        CONCAT(COALESCE(so.customer_firstname, ''), ' ', COALESCE(so.customer_lastname, '')) as shipping_name,
        sove.item_name,
        COALESCE(shape_attr.value, 'rectangle') as shape,
        width_attr.value as width,
        length_attr.value as length,
        sove.cutting_tag,
        sove.notes,
        DATE_FORMAT(COALESCE(sove.item_status_updated_at, sove.updated_at), '%d %b %Y %H:%i:%s') as status_updated
      FROM sales_order_variant_entity sove
      JOIN sales_order so ON sove.order_id = so.entity_id
      LEFT JOIN sales_order_variant_entity_varchar shape_attr 
        ON sove.entity_id = shape_attr.entity_id AND shape_attr.attribute_id = 159
      LEFT JOIN sales_order_variant_entity_varchar width_attr 
        ON sove.entity_id = width_attr.entity_id AND width_attr.attribute_id = 168
      LEFT JOIN sales_order_variant_entity_varchar length_attr 
        ON sove.entity_id = length_attr.entity_id AND length_attr.attribute_id = 261
      WHERE sove.item_status = 'cutting_ready'
        AND so.status = 'processing'
      LIMIT 50
    `);

    console.log(`Fetched ${records.length} records`);

    // Parse materials
    function parseMaterial(itemName) {
      if (!itemName) return { material: 'Unknown', thickness: null };
      const name = itemName.toLowerCase();
      let material = 'Other';
      
      if (name.includes('mdf')) material = 'MDF';
      else if (name.includes('plywood')) material = 'Plywood';
      else if (name.includes('acrylic')) material = 'Acrylic';
      else if (name.includes('osb')) material = 'OSB';
      else if (name.includes('polycarbonate')) material = 'Polycarbonate';
      
      const thicknessMatch = itemName.match(/(\d+)mm/i);
      const thickness = thicknessMatch ? thicknessMatch[1] + 'mm' : null;
      
      return { material, thickness };
    }

    // Transform data
    console.log('\n🔄 Transforming data...');
    let transformedData;
    
    if (useReadyCutTable) {
      // For ready2cut_parts table
      transformedData = records.map(r => {
        const parsed = parseMaterial(r.item_name);
        return {
          sheet_id: String(r.sheet_id),
          increment_id: r.increment_id,
          cutting_date: r.cutting_date,
          order_status: r.order_status,
          shipping_name: r.shipping_name,
          material: parsed.material,
          thickness: parsed.thickness,
          shape: r.shape,
          width: r.width,
          length: r.length,
          tags: r.cutting_tag === '0' ? 'Straight' : `Process-${r.cutting_tag}`,
          notes: r.notes,
          action: 'View',
          status_updated: r.status_updated,
          processing_status: 'ready_to_cut'
        };
      });
    } else {
      // For old parts table - create compatible records
      transformedData = records.map(r => {
        const parsed = parseMaterial(r.item_name);
        return {
          order_number: r.increment_id,
          part_number: `SHEET-${r.sheet_id}`,
          quantity: 1,
          material: parsed.material,
          thickness: parsed.thickness ? parseFloat(parsed.thickness) : null,
          notes: r.item_name
        };
      });
    }

    // Clear existing data
    console.log('\n🗑️ Clearing existing data...');
    const deleteResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/${tableName}`,
      {
        method: 'DELETE',
        headers: {
          'apikey': SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
          'Prefer': 'return=minimal'
        }
      }
    );

    if (!deleteResponse.ok) {
      console.log('Note: Could not clear data (might be empty)');
    }

    // Insert new data
    console.log('📤 Inserting data to Supabase...');
    const insertResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/${tableName}`,
      {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify(transformedData)
      }
    );

    if (insertResponse.ok) {
      const inserted = await insertResponse.json();
      console.log(`\n✅ Success! Inserted ${inserted.length} records to ${tableName}`);
      
      // Show sample of what was imported
      console.log('\n📋 Sample of imported data:');
      console.table(inserted.slice(0, 5).map(r => ({
        id: r.sheet_id || r.part_number,
        order: r.increment_id || r.order_number,
        material: r.material,
        thickness: r.thickness
      })));
    } else {
      const error = await insertResponse.text();
      console.error('❌ Insert failed:', error);
    }

  } catch (error) {
    console.error('❌ Import error:', error);
  } finally {
    if (mysqlConnection) {
      await mysqlConnection.end();
    }
  }
}

directImport();