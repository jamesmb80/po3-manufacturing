const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env.local' });

async function checkAttributes() {
  console.log('🔍 Checking EAV attribute configuration...\n');

  try {
    const connection = await mysql.createConnection({
      host: process.env.MYSQL_HOST,
      port: parseInt(process.env.MYSQL_PORT),
      user: process.env.MYSQL_USER,
      password: process.env.MYSQL_PASSWORD,
      database: process.env.MYSQL_DATABASE,
    });

    // First, let's see what attributes exist for a sample entity
    console.log('📊 Sample entity attributes (sheet_id: 2650293):\n');
    
    const [varcharAttrs] = await connection.execute(`
      SELECT 
        attribute_id,
        value
      FROM sales_order_variant_entity_varchar
      WHERE entity_id = 2650293
      ORDER BY attribute_id
    `);
    
    console.log('VARCHAR attributes for sample entity:');
    console.table(varcharAttrs);

    // Check what values are stored for the attribute IDs we're using
    console.log('\n🔍 Checking specific attribute IDs from the query:\n');
    
    const attributeIds = {
      183: 'material',
      184: 'type',
      185: 'colour',
      190: 'finish',
      189: 'thickness',
      159: 'shape',
      258: 'depth',
      166: 'diameter',
      167: 'height',
      261: 'length',
      168: 'width'
    };

    for (const [id, name] of Object.entries(attributeIds)) {
      // Check VARCHAR table
      const [varcharCount] = await connection.execute(`
        SELECT COUNT(*) as count, COUNT(DISTINCT value) as unique_values
        FROM sales_order_variant_entity_varchar
        WHERE attribute_id = ?
        AND value IS NOT NULL AND value != ''
      `, [id]);

      // Check DECIMAL table for dimension attributes
      const [decimalCount] = await connection.execute(`
        SELECT COUNT(*) as count, COUNT(DISTINCT value) as unique_values
        FROM sales_order_variant_entity_decimal
        WHERE attribute_id = ?
        AND value IS NOT NULL
      `, [id]);

      if (varcharCount[0].count > 0 || decimalCount[0].count > 0) {
        console.log(`Attribute ${id} (${name}):`);
        if (varcharCount[0].count > 0) {
          console.log(`  VARCHAR: ${varcharCount[0].count} records, ${varcharCount[0].unique_values} unique values`);
        }
        if (decimalCount[0].count > 0) {
          console.log(`  DECIMAL: ${decimalCount[0].count} records, ${decimalCount[0].unique_values} unique values`);
        }
      } else {
        console.log(`Attribute ${id} (${name}): NO DATA FOUND`);
      }
    }

    // Let's find what attributes actually have data
    console.log('\n📋 Top 20 attributes with data (VARCHAR):\n');
    const [topAttrs] = await connection.execute(`
      SELECT 
        attribute_id,
        COUNT(*) as record_count,
        COUNT(DISTINCT value) as unique_values,
        MIN(value) as sample_value
      FROM sales_order_variant_entity_varchar
      WHERE value IS NOT NULL AND value != ''
      GROUP BY attribute_id
      ORDER BY record_count DESC
      LIMIT 20
    `);
    
    console.table(topAttrs);

    // Check for material-like values in any attribute
    console.log('\n🔍 Looking for material-like values in all attributes:\n');
    const [materialSearch] = await connection.execute(`
      SELECT DISTINCT
        attribute_id,
        value
      FROM sales_order_variant_entity_varchar
      WHERE LOWER(value) IN ('mdf', 'plywood', 'acrylic', 'oak', 'birch', 'walnut')
         OR LOWER(value) LIKE '%wood%'
         OR LOWER(value) LIKE '%mdf%'
         OR LOWER(value) LIKE '%ply%'
      LIMIT 20
    `);
    
    if (materialSearch.length > 0) {
      console.log('Found material-like values:');
      console.table(materialSearch);
    } else {
      console.log('No material-like values found with current search terms');
    }

    await connection.end();
    
    console.log('\n💡 Analysis complete!');
    console.log('If attributes 183, 184, etc. have no data, we need to find the correct attribute IDs');
    console.log('The top attributes table above shows which IDs actually contain data.');

  } catch (error) {
    console.error('❌ Query failed:', error.message);
    process.exit(1);
  }
}

checkAttributes();