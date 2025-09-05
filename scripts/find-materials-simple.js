const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env.local' });

async function findMaterials() {
  console.log('🔍 Quick search for material data location...\n');

  try {
    const connection = await mysql.createConnection({
      host: process.env.MYSQL_HOST,
      port: parseInt(process.env.MYSQL_PORT),
      user: process.env.MYSQL_USER,
      password: process.env.MYSQL_PASSWORD,
      database: process.env.MYSQL_DATABASE,
    });

    // Quick check - are materials in product tables?
    console.log('📊 Checking for product-related tables:\n');
    
    const [tables] = await connection.execute(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = ?
        AND table_name LIKE '%product%'
      ORDER BY table_name
      LIMIT 10
    `, [process.env.MYSQL_DATABASE]);
    
    if (tables.length > 0) {
      console.log('Found product tables:');
      tables.forEach(t => console.log(`  - ${t.table_name}`));
      
      // Check catalog_product_entity_varchar for materials
      const hasProductVarchar = tables.some(t => t.table_name === 'catalog_product_entity_varchar');
      
      if (hasProductVarchar) {
        console.log('\n🔍 Checking catalog_product_entity_varchar for materials:\n');
        
        // Look for Acrylic in product varchar table
        const [acrylicCheck] = await connection.execute(`
          SELECT 
            attribute_id,
            COUNT(*) as count
          FROM catalog_product_entity_varchar
          WHERE value = 'Acrylic'
          GROUP BY attribute_id
          LIMIT 5
        `);
        
        if (acrylicCheck.length > 0) {
          console.log('Found "Acrylic" in catalog_product_entity_varchar:');
          console.table(acrylicCheck);
          
          // If found, get the attribute name
          const attrId = acrylicCheck[0].attribute_id;
          const [attrInfo] = await connection.execute(`
            SELECT attribute_id, attribute_code
            FROM eav_attribute
            WHERE attribute_id = ?
          `, [attrId]);
          
          if (attrInfo.length > 0) {
            console.log(`\nAttribute ${attrId} is: ${attrInfo[0].attribute_code}`);
          }
        }
      }
    }

    // Check if materials are joined through product_id
    console.log('\n📝 Checking how products link to variants:\n');
    
    const [sampleVariant] = await connection.execute(`
      SELECT 
        sove.entity_id,
        sove.product_id,
        sove.sku,
        p.sku as product_sku
      FROM sales_order_variant_entity sove
      LEFT JOIN catalog_product_entity p ON sove.product_id = p.entity_id
      WHERE sove.item_status = 'cutting_ready'
      LIMIT 3
    `);
    
    console.table(sampleVariant);

    if (sampleVariant.length > 0 && sampleVariant[0].product_id) {
      // Get material for this product
      const productId = sampleVariant[0].product_id;
      
      console.log(`\n🔍 Looking for attributes of product ${productId}:\n`);
      
      // Try different attribute IDs that might be material
      const possibleMaterialIds = [183, 184, 185, 186, 187, 188, 189, 190, 85, 86, 87, 88, 89, 90, 91, 92, 93, 94, 95];
      
      for (const attrId of possibleMaterialIds) {
        const [attrValue] = await connection.execute(`
          SELECT value
          FROM catalog_product_entity_varchar
          WHERE entity_id = ?
            AND attribute_id = ?
          LIMIT 1
        `, [productId, attrId]);
        
        if (attrValue.length > 0 && attrValue[0].value) {
          console.log(`Attribute ${attrId}: ${attrValue[0].value}`);
        }
      }
    }

    await connection.end();
    
    console.log('\n💡 Done! Check the results above.');

  } catch (error) {
    console.error('❌ Query failed:', error.message);
    process.exit(1);
  }
}

findMaterials();