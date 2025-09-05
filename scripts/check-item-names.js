const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env.local' });

async function checkItemNames() {
  console.log('🔍 Checking item_name field for material data...\n');

  try {
    const connection = await mysql.createConnection({
      host: process.env.MYSQL_HOST,
      port: parseInt(process.env.MYSQL_PORT),
      user: process.env.MYSQL_USER,
      password: process.env.MYSQL_PASSWORD,
      database: process.env.MYSQL_DATABASE,
    });

    // Check sample item_name values
    console.log('📝 Sample item_name values from cutting_ready items:\n');
    
    const [samples] = await connection.execute(`
      SELECT DISTINCT item_name
      FROM sales_order_variant_entity sove
      JOIN sales_order so ON sove.order_id = so.entity_id
      WHERE sove.item_status = 'cutting_ready'
        AND so.status = 'processing'
        AND item_name IS NOT NULL
      LIMIT 20
    `);
    
    samples.forEach(s => console.log(`  - ${s.item_name}`));

    // Check if materials are embedded in item_name
    console.log('\n📊 Looking for materials in item_name:\n');
    
    const [materials] = await connection.execute(`
      SELECT 
        CASE 
          WHEN LOWER(item_name) LIKE '%acrylic%' THEN 'Acrylic'
          WHEN LOWER(item_name) LIKE '%mdf%' THEN 'MDF'
          WHEN LOWER(item_name) LIKE '%plywood%' OR LOWER(item_name) LIKE '%ply%' THEN 'Plywood'
          WHEN LOWER(item_name) LIKE '%oak%' THEN 'Oak'
          WHEN LOWER(item_name) LIKE '%walnut%' THEN 'Walnut'
          WHEN LOWER(item_name) LIKE '%birch%' THEN 'Birch'
          WHEN LOWER(item_name) LIKE '%polycarbonate%' THEN 'Polycarbonate'
          WHEN LOWER(item_name) LIKE '%glass%' THEN 'Glass'
          WHEN LOWER(item_name) LIKE '%mirror%' THEN 'Mirror'
          WHEN LOWER(item_name) LIKE '%melamine%' THEN 'Melamine'
          WHEN item_name IS NULL THEN 'NULL'
          ELSE 'Other'
        END as material_type,
        COUNT(*) as count
      FROM sales_order_variant_entity sove
      JOIN sales_order so ON sove.order_id = so.entity_id
      WHERE sove.item_status = 'cutting_ready'
        AND so.status = 'processing'
      GROUP BY material_type
      ORDER BY count DESC
    `);
    
    console.log('Material distribution from item_name:');
    console.table(materials);

    // Check product_type field
    console.log('\n📊 Checking product_type field:\n');
    
    const [productTypes] = await connection.execute(`
      SELECT DISTINCT product_type, COUNT(*) as count
      FROM sales_order_variant_entity sove
      JOIN sales_order so ON sove.order_id = so.entity_id
      WHERE sove.item_status = 'cutting_ready'
        AND so.status = 'processing'
        AND product_type IS NOT NULL
      GROUP BY product_type
      ORDER BY count DESC
      LIMIT 10
    `);
    
    console.log('Product types found:');
    console.table(productTypes);

    // Now let's see if we can get the full data for comparison with your screenshots
    console.log('\n🎯 Sample of complete data (matching your screenshot structure):\n');
    
    const [fullData] = await connection.execute(`
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
        sove.product_type,
        sove.cutting_tag as tags
      FROM sales_order_variant_entity sove
      JOIN sales_order so ON sove.order_id = so.entity_id
      WHERE sove.item_status = 'cutting_ready'
        AND so.status = 'processing'
      ORDER BY sove.cutting_date, sove.entity_id
      LIMIT 5
    `);
    
    console.table(fullData);

    await connection.end();
    
    console.log('\n💡 Analysis complete!');
    console.log('The item_name field seems to contain product descriptions.');
    console.log('Materials might need to be extracted from this field or pulled from elsewhere.');

  } catch (error) {
    console.error('❌ Query failed:', error.message);
    process.exit(1);
  }
}

checkItemNames();