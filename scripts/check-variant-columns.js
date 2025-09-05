const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env.local' });

async function checkVariantColumns() {
  console.log('🔍 Checking sales_order_variant_entity structure...\n');

  try {
    const connection = await mysql.createConnection({
      host: process.env.MYSQL_HOST,
      port: parseInt(process.env.MYSQL_PORT),
      user: process.env.MYSQL_USER,
      password: process.env.MYSQL_PASSWORD,
      database: process.env.MYSQL_DATABASE,
    });

    // Get all columns from sales_order_variant_entity
    console.log('📊 Columns in sales_order_variant_entity:\n');
    
    const [columns] = await connection.execute(`
      SHOW COLUMNS FROM sales_order_variant_entity
    `);
    
    console.table(columns.map(c => ({
      Field: c.Field,
      Type: c.Type,
      Null: c.Null,
      Key: c.Key
    })));

    // Get sample data to understand structure
    console.log('\n📝 Sample data from sales_order_variant_entity:\n');
    
    const [sample] = await connection.execute(`
      SELECT *
      FROM sales_order_variant_entity
      WHERE item_status = 'cutting_ready'
      LIMIT 2
    `);
    
    // Show just key fields
    if (sample.length > 0) {
      console.log('Key fields from sample:');
      const keyData = sample.map(s => ({
        entity_id: s.entity_id,
        order_id: s.order_id,
        sku: s.sku || 'null',
        name: s.name || 'null',
        cutting_tag: s.cutting_tag || 'null',
        item_status: s.item_status
      }));
      console.table(keyData);
    }

    // Look for materials in the SKU or name fields
    console.log('\n🔍 Checking if materials are in SKU or name fields:\n');
    
    const [materialPatterns] = await connection.execute(`
      SELECT DISTINCT
        CASE 
          WHEN LOWER(name) LIKE '%acrylic%' THEN 'Acrylic'
          WHEN LOWER(name) LIKE '%mdf%' THEN 'MDF'
          WHEN LOWER(name) LIKE '%plywood%' THEN 'Plywood'
          WHEN LOWER(name) LIKE '%oak%' THEN 'Oak'
          WHEN LOWER(name) LIKE '%polycarbonate%' THEN 'Polycarbonate'
          ELSE 'Other'
        END as material_from_name,
        COUNT(*) as count
      FROM sales_order_variant_entity
      WHERE item_status = 'cutting_ready'
        AND status = 'processing'
      GROUP BY material_from_name
      ORDER BY count DESC
    `);
    
    console.log('Materials found in name field:');
    console.table(materialPatterns);

    // Check a few actual name values
    console.log('\n📝 Sample name values:\n');
    
    const [nameExamples] = await connection.execute(`
      SELECT DISTINCT name
      FROM sales_order_variant_entity
      WHERE item_status = 'cutting_ready'
      LIMIT 10
    `);
    
    nameExamples.forEach(n => console.log(`  - ${n.name}`));

    await connection.end();
    
    console.log('\n💡 Analysis complete!');

  } catch (error) {
    console.error('❌ Query failed:', error.message);
    process.exit(1);
  }
}

checkVariantColumns();