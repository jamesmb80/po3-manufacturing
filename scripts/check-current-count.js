const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env.local' });

async function checkCurrentCount() {
  console.log('🔍 Checking current Ready2Cut record count...\n');
  console.log('Time checked:', new Date().toLocaleString('en-GB', { timeZone: 'Europe/London' }));
  console.log('---\n');

  try {
    const connection = await mysql.createConnection({
      host: process.env.MYSQL_HOST,
      port: parseInt(process.env.MYSQL_PORT),
      user: process.env.MYSQL_USER,
      password: process.env.MYSQL_PASSWORD,
      database: process.env.MYSQL_DATABASE,
    });

    // Main count - exact filters from production query
    const [mainCount] = await connection.execute(`
      SELECT COUNT(*) as count
      FROM sales_order_variant_entity sove
      JOIN sales_order so ON sove.order_id = so.entity_id
      WHERE sove.item_status = 'cutting_ready'
        AND so.status = 'processing'
    `);
    
    console.log(`📊 Records with cutting_ready + processing status: ${mainCount[0].count}`);
    console.log(`📊 Your Ready2Cut screen shows: 3391`);
    console.log(`📊 Difference: ${mainCount[0].count - 3391}\n`);

    // Check if there might be additional filters
    console.log('🔍 Checking for possible additional filters:\n');

    // Check by date range
    const [dateCheck] = await connection.execute(`
      SELECT 
        COUNT(*) as count,
        MIN(cutting_date) as earliest,
        MAX(cutting_date) as latest
      FROM sales_order_variant_entity sove
      JOIN sales_order so ON sove.order_id = so.entity_id
      WHERE sove.item_status = 'cutting_ready'
        AND so.status = 'processing'
        AND cutting_date IS NOT NULL
    `);
    
    console.log(`Records with cutting_date: ${dateCheck[0].count}`);
    console.log(`Date range: ${dateCheck[0].earliest} to ${dateCheck[0].latest}\n`);

    // Check for null item_name (maybe filtered out?)
    const [nullCheck] = await connection.execute(`
      SELECT 
        COUNT(CASE WHEN item_name IS NULL THEN 1 END) as null_names,
        COUNT(CASE WHEN item_name IS NOT NULL THEN 1 END) as with_names
      FROM sales_order_variant_entity sove
      JOIN sales_order so ON sove.order_id = so.entity_id
      WHERE sove.item_status = 'cutting_ready'
        AND so.status = 'processing'
    `);
    
    console.log(`Records with item_name: ${nullCheck[0].with_names}`);
    console.log(`Records without item_name: ${nullCheck[0].null_names}\n`);

    // Sample the data to see what we're getting
    console.log('📝 Sample of first 5 records:\n');
    const [sample] = await connection.execute(`
      SELECT 
        sove.entity_id as sheet_id,
        so.increment_id,
        sove.item_name,
        sove.cutting_date,
        sove.item_status
      FROM sales_order_variant_entity sove
      JOIN sales_order so ON sove.order_id = so.entity_id
      WHERE sove.item_status = 'cutting_ready'
        AND so.status = 'processing'
      ORDER BY sove.cutting_date, sove.entity_id
      LIMIT 5
    `);
    
    console.table(sample.map(s => ({
      sheet_id: s.sheet_id,
      order: s.increment_id,
      cutting_date: s.cutting_date,
      item: s.item_name ? s.item_name.substring(0, 30) + '...' : 'NULL'
    })));

    await connection.end();
    
    if (Math.abs(mainCount[0].count - 3391) < 10) {
      console.log('✅ Count is very close! The small difference is likely due to:');
      console.log('   - Orders being processed in real-time');
      console.log('   - Timing difference between checks');
    } else {
      console.log('⚠️  There\'s a noticeable difference. Possible reasons:');
      console.log('   - Additional filters in the view');
      console.log('   - Different time zones affecting date filters');
      console.log('   - Some records being processed between checks');
    }

  } catch (error) {
    console.error('❌ Query failed:', error.message);
    process.exit(1);
  }
}

checkCurrentCount();