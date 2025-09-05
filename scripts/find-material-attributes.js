const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env.local' });

async function findMaterialAttributes() {
  console.log('🔍 Finding the correct attribute IDs for materials...\n');

  try {
    const connection = await mysql.createConnection({
      host: process.env.MYSQL_HOST,
      port: parseInt(process.env.MYSQL_PORT),
      user: process.env.MYSQL_USER,
      password: process.env.MYSQL_PASSWORD,
      database: process.env.MYSQL_DATABASE,
    });

    // Let's look for the specific values we see in your screenshots
    console.log('📊 Searching for material values from your screenshots:\n');
    
    const materialValues = ['Acrylic', 'Polycarbonate', 'Oak'];
    const typeValues = ['Clear'];
    
    for (const material of materialValues) {
      const [results] = await connection.execute(`
        SELECT DISTINCT
          attribute_id,
          COUNT(*) as count
        FROM sales_order_variant_entity_varchar
        WHERE value = ?
        GROUP BY attribute_id
        ORDER BY count DESC
        LIMIT 5
      `, [material]);
      
      if (results.length > 0) {
        console.log(`Found "${material}" in attributes:`);
        console.table(results);
      }
    }

    // Check for "Clear" (type value)
    const [clearResults] = await connection.execute(`
      SELECT DISTINCT
        attribute_id,
        COUNT(*) as count
      FROM sales_order_variant_entity_varchar
      WHERE value = 'Clear'
      GROUP BY attribute_id
      ORDER BY count DESC
      LIMIT 5
    `);
    
    if (clearResults.length > 0) {
      console.log('Found "Clear" (type) in attributes:');
      console.table(clearResults);
    }

    // Let's check if there's a catalog_product table or similar
    console.log('\n📋 Checking for product catalog tables:\n');
    
    const [tables] = await connection.execute(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = ?
        AND (table_name LIKE '%product%' 
          OR table_name LIKE '%catalog%'
          OR table_name LIKE '%material%'
          OR table_name LIKE '%variant%')
      ORDER BY table_name
      LIMIT 20
    `, [process.env.MYSQL_DATABASE]);
    
    console.log('Found relevant tables:');
    tables.forEach(t => console.log(`  - ${t.table_name}`));

    // Check if materials might be in the main entity table
    console.log('\n🔍 Checking sales_order_variant_entity columns:\n');
    
    const [columns] = await connection.execute(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = ?
        AND table_name = 'sales_order_variant_entity'
      ORDER BY ordinal_position
    `, [process.env.MYSQL_DATABASE]);
    
    console.log('Columns in sales_order_variant_entity:');
    columns.forEach(c => console.log(`  - ${c.column_name}`));

    // Sample some actual data with the cutting_ready status
    console.log('\n📝 Sample of actual variant data:\n');
    
    const [sampleData] = await connection.execute(`
      SELECT 
        entity_id,
        product_id,
        sku,
        cutting_tag
      FROM sales_order_variant_entity
      WHERE item_status = 'cutting_ready'
      LIMIT 5
    `);
    
    console.table(sampleData);

    // Check if product_id links to another table
    if (sampleData.length > 0 && sampleData[0].product_id) {
      console.log('\n🔍 Checking for product details using product_id:\n');
      
      const productId = sampleData[0].product_id;
      
      // Try catalog_product_entity
      const [productCheck] = await connection.execute(`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = ?
          AND table_name = 'catalog_product_entity'
      `, [process.env.MYSQL_DATABASE]);
      
      if (productCheck.length > 0) {
        const [productData] = await connection.execute(`
          SELECT *
          FROM catalog_product_entity
          WHERE entity_id = ?
          LIMIT 1
        `, [productId]);
        
        if (productData.length > 0) {
          console.log('Found product data:');
          console.table(productData);
        }
      }
    }

    await connection.end();
    
    console.log('\n💡 Analysis complete!');
    console.log('Materials appear to be stored differently than expected.');
    console.log('They might be in product catalog tables or different attribute IDs.');

  } catch (error) {
    console.error('❌ Query failed:', error.message);
    process.exit(1);
  }
}

findMaterialAttributes();