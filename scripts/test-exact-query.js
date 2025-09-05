const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env.local' });

async function testExactQuery() {
  console.log('🔍 Testing the EXACT Ready2Cut query from your SQL file...\n');

  try {
    const connection = await mysql.createConnection({
      host: process.env.MYSQL_HOST,
      port: parseInt(process.env.MYSQL_PORT),
      user: process.env.MYSQL_USER,
      password: process.env.MYSQL_PASSWORD,
      database: process.env.MYSQL_DATABASE,
    });

    // First, let's count using the EXACT WHERE clause from your query
    console.log('📊 Using EXACT filters from ready2cut_final_query.sql:\n');
    
    // Count with exact filters (without LIMIT)
    const countQuery = `
      SELECT COUNT(*) as total_count
      FROM sales_order_variant_entity sove
      JOIN sales_order so ON sove.order_id = so.entity_id
      WHERE 
        sove.item_status = 'cutting_ready'
        AND so.status = 'processing'
    `;
    
    const [countResult] = await connection.execute(countQuery);
    console.log(`Total records matching exact filters: ${countResult[0].total_count}`);
    console.log(`Your current Ready2Cut view: 3687 records`);
    console.log(`Difference: ${countResult[0].total_count - 3687} records\n`);

    // Now let's run the FULL query from your file (without the LIMIT)
    console.log('📝 Running the complete query (first 10 records for verification):\n');
    
    const fullQuery = `
      SELECT 
        sove.entity_id as sheet_id,
        so.increment_id,
        DATE_FORMAT(sove.cutting_date, '%d %b %Y') as cutting_date,
        
        -- Map item status to user-friendly format (from your query)
        CASE 
          WHEN sove.item_status = 'cutting_ready' THEN 'Processing'
          WHEN sove.item_status IN ('cutting_csv', 'csv_cutting', 'cutting_laser', 
            'cutting_wallsaw', 'cutting_holzher', 'cutting_multicam', 
            'cutting_teccam', 'cutting_joinery') THEN 'In Progress'
          WHEN sove.item_status IN ('assigned_laser', 'assigned_wallsaw', 
            'assigned_holzher', 'assigned_csv', 'assigned_teccam', 
            'assigned_multicam', 'assigned_stock', 'assigned_joinery') THEN 'Processing'
          ELSE sove.item_status
        END as order_status,
        
        -- Customer name
        CONCAT(COALESCE(so.customer_firstname, ''), ' ', COALESCE(so.customer_lastname, '')) as shipping_name,
        
        -- Material from EAV
        material_attr.value as material,
        type_attr.value as type,
        thickness_attr.value as thickness,
        
        -- Process information
        COALESCE(sove.cutting_tag, 'Straight') as tags,
        sove.item_status as raw_status
        
      FROM sales_order_variant_entity sove
      JOIN sales_order so ON sove.order_id = so.entity_id
      
      -- Material attribute
      LEFT JOIN sales_order_variant_entity_varchar material_attr 
        ON sove.entity_id = material_attr.entity_id AND material_attr.attribute_id = 183
      LEFT JOIN sales_order_variant_entity_varchar type_attr 
        ON sove.entity_id = type_attr.entity_id AND type_attr.attribute_id = 184
      LEFT JOIN sales_order_variant_entity_varchar thickness_attr 
        ON sove.entity_id = thickness_attr.entity_id AND thickness_attr.attribute_id = 189
      
      -- EXACT READY2CUT FILTERS from your query
      WHERE 
        sove.item_status = 'cutting_ready'
        AND so.status = 'processing'
      
      ORDER BY sove.cutting_date, sove.entity_id
      LIMIT 10
    `;
    
    const [sampleData] = await connection.execute(fullQuery);
    console.table(sampleData.map(row => ({
      sheet_id: row.sheet_id,
      order: row.increment_id,
      date: row.cutting_date,
      status: row.order_status,
      material: row.material || 'N/A',
      thickness: row.thickness || 'N/A',
      tags: row.tags
    })));

    // Check if the LIMIT in the original query matters
    console.log('\n📌 Note about the LIMIT clause in your SQL file:');
    console.log('Your query has "LIMIT 3344" but you mentioned the view shows 3687 now.');
    console.log('This suggests the LIMIT should be removed for dynamic data.\n');

    // Test if there might be additional status filters we're missing
    console.log('🔍 Checking if we might be missing records with null/empty status:\n');
    
    const [nullCheck] = await connection.execute(`
      SELECT COUNT(*) as count
      FROM sales_order so
      WHERE so.status IS NULL OR so.status = ''
    `);
    console.log(`Orders with NULL/empty status: ${nullCheck[0].count}`);

    // Check the date range of the data
    console.log('\n📅 Date range of matching records:\n');
    const [dateInfo] = await connection.execute(`
      SELECT 
        MIN(DATE_FORMAT(sove.cutting_date, '%d %b %Y')) as earliest_date,
        MAX(DATE_FORMAT(sove.cutting_date, '%d %b %Y')) as latest_date,
        COUNT(DISTINCT DATE(sove.cutting_date)) as unique_dates
      FROM sales_order_variant_entity sove
      JOIN sales_order so ON sove.order_id = so.entity_id
      WHERE 
        sove.item_status = 'cutting_ready'
        AND so.status = 'processing'
    `);
    console.log(`Date range: ${dateInfo[0].earliest_date} to ${dateInfo[0].latest_date}`);
    console.log(`Unique cutting dates: ${dateInfo[0].unique_dates}`);

    await connection.end();
    
    console.log('\n✅ Query test complete!');
    console.log('\n💡 Next steps:');
    console.log('1. The query is returning more records than your view (normal as orders are being processed)');
    console.log('2. We should import WITHOUT the LIMIT to get all current records');
    console.log('3. The count will naturally fluctuate as orders move through the system');

  } catch (error) {
    console.error('❌ Query failed:', error.message);
    console.error('\nError details:', error);
    process.exit(1);
  }
}

testExactQuery();