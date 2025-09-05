const mysql = require('mysql2/promise');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY // Use service key for admin operations
);

// Material parser (same as before)
function parseMaterialFromItemName(itemName) {
  if (!itemName) {
    return { material: null, type: null, thickness: null, finish: null, colour: null };
  }

  const name = itemName.toLowerCase();
  let result = { material: null, type: null, thickness: null, finish: null, colour: null };

  // Extract thickness
  const thicknessMatch = itemName.match(/(\d+(?:\.\d+)?)\s*mm/i);
  if (thicknessMatch) {
    result.thickness = thicknessMatch[1] + 'mm';
  }

  // Parse materials
  if (name.includes('mdf')) {
    result.material = 'MDF';
    if (name.includes('moisture resistant') || name.includes('mr mdf')) {
      result.type = 'Moisture Resistant';
    } else if (name.includes('veneered')) {
      result.type = 'Veneered';
      if (name.includes('oak')) result.finish = 'Oak';
      else if (name.includes('walnut')) result.finish = 'Walnut';
      else if (name.includes('maple')) result.finish = 'Maple';
      else if (name.includes('birch')) result.finish = 'Birch';
      else if (name.includes('pine')) result.finish = 'Pine';
      else if (name.includes('ash')) result.finish = 'Ash';
    } else if (name.includes('melamine')) {
      result.type = 'Melamine';
      if (name.includes('white')) result.colour = 'White';
      else if (name.includes('black')) result.colour = 'Black';
    } else if (name.includes('medite')) {
      result.type = 'Medite Premier';
    } else {
      result.type = 'Standard';
    }
  } else if (name.includes('plywood')) {
    result.material = 'Plywood';
    if (name.includes('birch')) result.type = 'Birch';
    else if (name.includes('marine')) result.type = 'Marine';
    else if (name.includes('phenolic')) result.type = 'Phenolic';
    else if (name.includes('hardwood')) result.type = 'Hardwood';
    else result.type = 'Standard';
  } else if (name.includes('acrylic')) {
    result.material = 'Acrylic';
    if (name.includes('clear')) result.type = 'Clear';
    else if (name.includes('frosted')) result.type = 'Frosted';
    else result.type = 'Clear';
  } else if (name.includes('polycarbonate')) {
    result.material = 'Polycarbonate';
    result.type = 'Clear';
  } else if (name.includes('osb')) {
    result.material = 'OSB';
    result.type = 'Standard';
  } else if (name.includes('chipboard')) {
    result.material = 'Chipboard';
    result.type = 'Standard';
  } else if (name.includes('oak') && !name.includes('mdf')) {
    result.material = 'Oak';
    result.type = 'Solid Wood';
  } else if (name.includes('beading') || name.includes('dado') || name.includes('kit')) {
    result.material = 'Component';
    result.type = 'Kit/Profile';
  }

  return result;
}

// Parse tags
function parseTags(cuttingTag) {
  if (!cuttingTag || cuttingTag === '0') {
    return 'Straight';
  }
  
  const tagMap = {
    '1': 'Straight',
    '2': 'Cutouts',
    '3': 'Drilling',
    '4': 'Rounded Corners',
    '5': 'Edge Banding',
    '6': 'Grooves',
    '7': 'Special Cut',
    '8': 'CNC Required'
  };
  
  const tags = cuttingTag.split(',')
    .map(t => tagMap[t.trim()] || `Process-${t.trim()}`)
    .filter(t => t);
    
  return tags.length > 0 ? tags.join(', ') : 'Straight';
}

async function importData() {
  console.log('🚀 Starting Ready2Cut data import...\n');
  console.log('Time:', new Date().toLocaleString('en-GB'));
  console.log('---\n');

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
    console.log('✅ Connected to MySQL\n');

    // First, clear existing data in Supabase
    console.log('🗑️  Clearing existing data in Supabase...');
    const { error: deleteError } = await supabase
      .from('ready2cut_parts')
      .delete()
      .neq('sheet_id', ''); // Delete all
    
    if (deleteError) {
      console.log('Note: Table might not exist yet or is already empty');
    } else {
      console.log('✅ Cleared existing data\n');
    }

    // Fetch all Ready2Cut data
    console.log('📊 Fetching Ready2Cut data from MySQL...');
    const [records] = await mysqlConnection.execute(`
      SELECT 
        sove.entity_id as sheet_id,
        so.increment_id,
        DATE_FORMAT(sove.cutting_date, '%d %b %Y') as cutting_date,
        CASE 
          WHEN sove.item_status = 'cutting_ready' THEN 'Processing'
          ELSE sove.item_status
        END as order_status,
        CONCAT(COALESCE(so.customer_firstname, ''), ' ', COALESCE(so.customer_lastname, '')) as shipping_name,
        sove.item_name,
        COALESCE(shape_attr.value, 'rectangle') as shape,
        depth_attr.value as depth,
        diameter_attr.value as diameter,
        height_attr.value as height,
        length_attr.value as length,
        width_attr.value as width,
        sove.cutting_tag,
        sove.notes,
        DATE_FORMAT(COALESCE(sove.item_status_updated_at, sove.updated_at), '%d %b %Y %H:%i:%s') as status_updated
      FROM sales_order_variant_entity sove
      JOIN sales_order so ON sove.order_id = so.entity_id
      LEFT JOIN sales_order_variant_entity_varchar shape_attr 
        ON sove.entity_id = shape_attr.entity_id AND shape_attr.attribute_id = 159
      LEFT JOIN sales_order_variant_entity_varchar depth_attr 
        ON sove.entity_id = depth_attr.entity_id AND depth_attr.attribute_id = 258
      LEFT JOIN sales_order_variant_entity_varchar diameter_attr 
        ON sove.entity_id = diameter_attr.entity_id AND diameter_attr.attribute_id = 166
      LEFT JOIN sales_order_variant_entity_varchar height_attr 
        ON sove.entity_id = height_attr.entity_id AND height_attr.attribute_id = 167
      LEFT JOIN sales_order_variant_entity_varchar length_attr 
        ON sove.entity_id = length_attr.entity_id AND length_attr.attribute_id = 261
      LEFT JOIN sales_order_variant_entity_varchar width_attr 
        ON sove.entity_id = width_attr.entity_id AND width_attr.attribute_id = 168
      WHERE sove.item_status = 'cutting_ready'
        AND so.status = 'processing'
      ORDER BY sove.cutting_date, sove.entity_id
    `);
    
    console.log(`✅ Fetched ${records.length} records\n`);

    // Transform records with parsed materials
    console.log('🔄 Parsing materials and transforming data...');
    const transformedRecords = records.map(r => {
      const parsed = parseMaterialFromItemName(r.item_name);
      const tags = parseTags(r.cutting_tag);
      
      return {
        sheet_id: String(r.sheet_id),
        increment_id: r.increment_id,
        cutting_date: r.cutting_date,
        order_status: r.order_status,
        shipping_name: r.shipping_name,
        material: parsed.material,
        type: parsed.type,
        colour: parsed.colour,
        finish: parsed.finish,
        thickness: parsed.thickness,
        finish_2: null,
        shape: r.shape,
        depth: r.depth,
        diameter: r.diameter,
        height: r.height,
        length: r.length,
        width: r.width,
        tags: tags,
        notes: r.notes,
        action: 'View',
        status_updated: r.status_updated,
        // Keep original for reference
        item_name: r.item_name,
        // Add workflow fields
        processing_status: 'ready_to_cut',
        machine_assignment: null,
        completed_processes: [],
        next_process: null
      };
    });

    // Analyze what we're importing
    const materials = {};
    const types = {};
    const thicknesses = {};
    
    transformedRecords.forEach(r => {
      if (r.material) {
        materials[r.material] = (materials[r.material] || 0) + 1;
        if (r.type) {
          const key = `${r.material} - ${r.type}`;
          types[key] = (types[key] || 0) + 1;
        }
      }
      if (r.thickness) {
        thicknesses[r.thickness] = (thicknesses[r.thickness] || 0) + 1;
      }
    });

    console.log('\n📊 Data Analysis:');
    console.log('Materials found:', Object.keys(materials).length);
    console.log('Material types:', Object.keys(types).length);
    console.log('Thickness variations:', Object.keys(thicknesses).length);
    
    console.log('\nTop Materials:');
    Object.entries(materials)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .forEach(([mat, count]) => console.log(`  ${mat}: ${count}`));

    // Import to Supabase in batches
    console.log('\n📤 Importing to Supabase...');
    const batchSize = 100;
    let imported = 0;
    let failed = 0;

    for (let i = 0; i < transformedRecords.length; i += batchSize) {
      const batch = transformedRecords.slice(i, i + batchSize);
      
      const { error } = await supabase
        .from('ready2cut_parts')
        .insert(batch);
      
      if (error) {
        console.error(`Batch ${Math.floor(i/batchSize) + 1} failed:`, error.message);
        failed += batch.length;
      } else {
        imported += batch.length;
        process.stdout.write(`\rImported: ${imported}/${transformedRecords.length}`);
      }
    }

    console.log('\n\n✅ Import Complete!');
    console.log(`   Imported: ${imported} records`);
    console.log(`   Failed: ${failed} records`);
    
    // Create sync log entry
    const { error: logError } = await supabase
      .from('ready2cut_sync_log')
      .insert({
        sync_started_at: new Date().toISOString(),
        sync_completed_at: new Date().toISOString(),
        records_imported: imported,
        records_updated: 0,
        records_failed: failed,
        status: failed > 0 ? 'completed_with_errors' : 'completed',
        sync_type: 'full'
      });

    if (logError) {
      console.log('Could not create sync log:', logError.message);
    }

    console.log('\n📋 Summary:');
    console.log(`Materials: ${Object.keys(materials).join(', ')}`);
    console.log(`\nNext steps:`);
    console.log('1. Update the Part type in app/page.tsx');
    console.log('2. Update table columns in parts-table.tsx');
    console.log('3. Update filters in filter-panel.tsx');
    console.log('4. Test the application');

  } catch (error) {
    console.error('\n❌ Import failed:', error.message);
    console.error(error);
  } finally {
    if (mysqlConnection) {
      await mysqlConnection.end();
    }
  }
}

// Run import
importData();