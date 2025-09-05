const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env.local' });

async function verifyRecordCount() {
  console.log('🔍 Verifying Ready2Cut record counts...\n');

  try {
    const connection = await mysql.createConnection({
      host: process.env.MYSQL_HOST,
      port: parseInt(process.env.MYSQL_PORT),
      user: process.env.MYSQL_USER,
      password: process.env.MYSQL_PASSWORD,
      database: process.env.MYSQL_DATABASE,
    });

    // Test different filter combinations to match your view
    console.log('📊 Testing different filter combinations:\n');

    // 1. Just cutting_ready status
    const [result1] = await connection.execute(
      `SELECT COUNT(*) as count 
       FROM sales_order_variant_entity sove
       WHERE sove.item_status = 'cutting_ready'`
    );
    console.log(`1. Only cutting_ready status: ${result1[0].count} records`);

    // 2. Cutting_ready + processing orders (from your SQL)
    const [result2] = await connection.execute(
      `SELECT COUNT(*) as count 
       FROM sales_order_variant_entity sove
       JOIN sales_order so ON sove.order_id = so.entity_id
       WHERE sove.item_status = 'cutting_ready'
       AND so.status = 'processing'`
    );
    console.log(`2. cutting_ready + order status 'processing': ${result2[0].count} records ✅`);

    // 3. Check if there's a limit in the view
    const [result3] = await connection.execute(
      `SELECT COUNT(*) as count 
       FROM sales_order_variant_entity sove
       JOIN sales_order so ON sove.order_id = so.entity_id
       WHERE sove.item_status = 'cutting_ready'
       AND so.status = 'processing'
       ORDER BY sove.cutting_date, sove.entity_id
       LIMIT 3717`
    );
    console.log(`3. With LIMIT 3717: ${result3[0].count} records`);

    // 4. Check other statuses that might be included
    console.log('\n📋 Checking other item_status values that might be "ready":\n');
    
    const statuses = [
      'cutting_ready',
      'assigned_laser',
      'assigned_wallsaw', 
      'assigned_holzher',
      'assigned_csv',
      'assigned_teccam',
      'assigned_multicam',
      'assigned_stock',
      'assigned_joinery'
    ];

    for (const status of statuses) {
      const [count] = await connection.execute(
        `SELECT COUNT(*) as count 
         FROM sales_order_variant_entity sove
         JOIN sales_order so ON sove.order_id = so.entity_id
         WHERE sove.item_status = ?
         AND so.status = 'processing'`,
        [status]
      );
      if (count[0].count > 0) {
        console.log(`  ${status}: ${count[0].count} records`);
      }
    }

    // 5. Check with date range (maybe there's a date filter?)
    console.log('\n📅 Checking if there might be a date filter:\n');
    const [dateRange] = await connection.execute(
      `SELECT 
         MIN(sove.cutting_date) as earliest,
         MAX(sove.cutting_date) as latest,
         COUNT(*) as total
       FROM sales_order_variant_entity sove
       JOIN sales_order so ON sove.order_id = so.entity_id
       WHERE sove.item_status = 'cutting_ready'
       AND so.status = 'processing'
       AND sove.cutting_date IS NOT NULL`
    );
    console.log(`Date range: ${dateRange[0].earliest} to ${dateRange[0].latest}`);
    console.log(`Records with cutting_date: ${dateRange[0].total}`);

    // 6. Get a sample of the actual data
    console.log('\n📝 Sample of first 5 records (matching your query):\n');
    const [sample] = await connection.execute(
      `SELECT 
         sove.entity_id as sheet_id,
         so.increment_id,
         DATE_FORMAT(sove.cutting_date, '%d %b %Y') as cutting_date,
         sove.item_status
       FROM sales_order_variant_entity sove
       JOIN sales_order so ON sove.order_id = so.entity_id
       WHERE sove.item_status = 'cutting_ready'
       AND so.status = 'processing'
       ORDER BY sove.cutting_date, sove.entity_id
       LIMIT 5`
    );
    
    console.table(sample);

    await connection.end();
    
    console.log('\n🎯 Most likely match: cutting_ready + processing = ' + result2[0].count + ' records');
    console.log('   Your Ready2Cut view shows: 3717 records');
    console.log('   Difference: ' + (result2[0].count - 3717) + ' records\n');
    
    if (result2[0].count === 3717) {
      console.log('✅ Perfect match! Ready to import.');
    } else {
      console.log('⚠️  There\'s a difference. The view might have:');
      console.log('   - Additional filters (date range, specific machines, etc.)');
      console.log('   - A LIMIT clause');
      console.log('   - Different join conditions');
    }

  } catch (error) {
    console.error('❌ Query failed:', error.message);
    process.exit(1);
  }
}

verifyRecordCount();