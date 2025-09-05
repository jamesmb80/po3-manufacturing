const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env.local' });

// Simple material parser
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

  // Determine main material
  if (name.includes('mdf')) {
    result.material = 'MDF';
    if (name.includes('moisture resistant')) result.type = 'Moisture Resistant';
    else if (name.includes('veneered')) {
      result.type = 'Veneered';
      if (name.includes('oak')) result.finish = 'Oak';
      else if (name.includes('walnut')) result.finish = 'Walnut';
      else if (name.includes('maple')) result.finish = 'Maple';
      else if (name.includes('birch')) result.finish = 'Birch';
    } else if (name.includes('melamine')) {
      result.type = 'Melamine';
    } else {
      result.type = 'Standard';
    }
  } else if (name.includes('plywood')) {
    result.material = 'Plywood';
    if (name.includes('birch')) result.type = 'Birch';
    else if (name.includes('marine')) result.type = 'Marine';
    else if (name.includes('phenolic')) result.type = 'Phenolic';
    else result.type = 'Standard';
  } else if (name.includes('acrylic')) {
    result.material = 'Acrylic';
    result.type = name.includes('clear') ? 'Clear' : 'Coloured';
  } else if (name.includes('osb')) {
    result.material = 'OSB';
    result.type = 'Standard';
  } else if (name.includes('oak') && !name.includes('mdf')) {
    result.material = 'Oak';
    result.type = 'Solid Wood';
  }

  return result;
}

async function testImport() {
  console.log('🔍 Testing Ready2Cut data import with material parsing...\n');

  try {
    const connection = await mysql.createConnection({
      host: process.env.MYSQL_HOST,
      port: parseInt(process.env.MYSQL_PORT),
      user: process.env.MYSQL_USER,
      password: process.env.MYSQL_PASSWORD,
      database: process.env.MYSQL_DATABASE,
    });

    // Get count
    const [countResult] = await connection.execute(`
      SELECT COUNT(*) as count
      FROM sales_order_variant_entity sove
      JOIN sales_order so ON sove.order_id = so.entity_id
      WHERE sove.item_status = 'cutting_ready'
        AND so.status = 'processing'
    `);
    console.log(`📊 Total Ready2Cut records: ${countResult[0].count}\n`);

    // Fetch sample data
    console.log('📝 Fetching first 30 records with material parsing:\n');
    
    const [records] = await connection.execute(`
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
        width_attr.value as width,
        length_attr.value as length,
        sove.cutting_tag as tags
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
      ORDER BY sove.cutting_date, sove.entity_id
      LIMIT 30
    `);

    // Parse materials and display
    const parsedRecords = records.map(r => {
      const parsed = parseMaterialFromItemName(r.item_name);
      return {
        sheet_id: r.sheet_id,
        order: r.increment_id,
        item: (r.item_name || '').substring(0, 35),
        material: parsed.material || 'N/A',
        type: parsed.type || 'N/A',
        thickness: parsed.thickness || 'N/A',
        finish: parsed.finish || 'N/A'
      };
    });

    console.table(parsedRecords.slice(0, 15));

    // Analyze materials found
    console.log('\n📊 Material distribution:\n');
    const materials = {};
    const types = {};
    
    parsedRecords.forEach(r => {
      if (r.material !== 'N/A') {
        materials[r.material] = (materials[r.material] || 0) + 1;
        const key = `${r.material} - ${r.type}`;
        types[key] = (types[key] || 0) + 1;
      }
    });
    
    console.log('Materials:');
    console.table(materials);
    
    console.log('\nMaterial Types:');
    console.table(types);

    await connection.end();
    console.log('\n✅ Test complete! Ready to import data to Supabase.');
    console.log('\nNext step: Run the sync to import all records with parsed materials.');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

testImport();