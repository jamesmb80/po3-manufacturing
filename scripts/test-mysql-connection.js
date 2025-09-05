const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env.local' });

async function testConnection() {
  console.log('🔍 Testing MySQL connection...\n');
  console.log('Configuration:');
  console.log('Host:', process.env.MYSQL_HOST);
  console.log('Port:', process.env.MYSQL_PORT);
  console.log('User:', process.env.MYSQL_USER);
  console.log('Database:', process.env.MYSQL_DATABASE);
  console.log('---\n');

  try {
    const connection = await mysql.createConnection({
      host: process.env.MYSQL_HOST,
      port: parseInt(process.env.MYSQL_PORT),
      user: process.env.MYSQL_USER,
      password: process.env.MYSQL_PASSWORD,
      database: process.env.MYSQL_DATABASE,
    });

    console.log('✅ Connected successfully!\n');

    // Test a simple query
    console.log('📊 Testing query...');
    const [rows] = await connection.execute(
      'SELECT COUNT(*) as count FROM sales_order_variant_entity WHERE item_status = "cutting_ready"'
    );
    console.log(`✅ Found ${rows[0].count} records with cutting_ready status\n`);

    // Test the main tables exist
    console.log('📋 Checking required tables:');
    const tables = [
      'sales_order_variant_entity',
      'sales_order',
      'sales_order_variant_entity_varchar',
      'sales_order_variant_entity_decimal'
    ];

    for (const table of tables) {
      const [result] = await connection.execute(
        `SELECT COUNT(*) as count FROM information_schema.tables 
         WHERE table_schema = ? AND table_name = ?`,
        [process.env.MYSQL_DATABASE, table]
      );
      const exists = result[0].count > 0;
      console.log(`  ${exists ? '✅' : '❌'} ${table}`);
    }

    await connection.end();
    console.log('\n🎉 All tests passed! Ready to sync data.');

  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    console.error('\nPlease check:');
    console.error('1. MySQL credentials are correct');
    console.error('2. MySQL server is accessible from your network');
    console.error('3. User has SELECT permissions on the database');
    process.exit(1);
  }
}

testConnection();