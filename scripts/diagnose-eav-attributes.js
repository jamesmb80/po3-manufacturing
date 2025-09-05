#!/usr/bin/env node

/**
 * Diagnose EAV Attributes
 * 
 * This script checks which EAV attribute IDs actually contain data
 * for the Ready2Cut records, helping us identify the correct attribute IDs
 * 
 * Usage: node scripts/diagnose-eav-attributes.js
 */

const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env.local' });

async function diagnoseEAVAttributes() {
  console.log('🔍 Diagnosing EAV attributes for Ready2Cut data...\n');

  let mysqlConnection;

  try {
    // Connect to MySQL
    mysqlConnection = await mysql.createConnection({
      host: process.env.MYSQL_HOST,
      port: parseInt(process.env.MYSQL_PORT),
      user: process.env.MYSQL_USER,
      password: process.env.MYSQL_PASSWORD,
      database: process.env.MYSQL_DATABASE,
    });

    console.log('✅ Connected to MySQL\n');

    // First, let's see what Ready2Cut entities we have
    console.log('📊 Checking Ready2Cut entities...');
    const [entities] = await mysqlConnection.execute(`
      SELECT COUNT(*) as count, MIN(e.entity_id) as min_id, MAX(e.entity_id) as max_id
      FROM sales_order_variant_entity e
      JOIN sales_order_grid ON (sales_order_grid.entity_id = e.order_id)
      WHERE sales_order_grid.status IN('processing', 'progress', 'holded')
        AND e.item_status = 'cutting_ready'
        AND e.is_sample = ''
        AND ((e.kit_type IS NULL) OR (e.kit_type IN('slatted')))
    `);

    console.log(`Found ${entities[0].count} Ready2Cut entities (IDs: ${entities[0].min_id} - ${entities[0].max_id})\n`);

    // Now let's see what VARCHAR EAV attributes have data for these entities
    console.log('🔍 Checking VARCHAR EAV attributes with data...');
    const [varcharAttrs] = await mysqlConnection.execute(`
      SELECT 
        eav.attribute_id,
        COUNT(DISTINCT eav.entity_id) as entity_count,
        COUNT(DISTINCT eav.value) as unique_values,
        GROUP_CONCAT(DISTINCT LEFT(eav.value, 50) SEPARATOR ', ') as sample_values
      FROM sales_order_variant_entity_varchar eav
      WHERE eav.entity_id IN (
        SELECT e.entity_id 
        FROM sales_order_variant_entity e
        JOIN sales_order_grid ON (sales_order_grid.entity_id = e.order_id)
        WHERE sales_order_grid.status IN('processing', 'progress', 'holded')
          AND e.item_status = 'cutting_ready'
          AND e.is_sample = ''
          AND ((e.kit_type IS NULL) OR (e.kit_type IN('slatted')))
      )
      AND eav.value IS NOT NULL 
      AND eav.value != ''
      GROUP BY eav.attribute_id
      HAVING entity_count > 10  -- Only show attributes with significant data
      ORDER BY entity_count DESC
    `);

    console.log('VARCHAR Attributes with data:');
    console.table(varcharAttrs.map(attr => ({
      'Attribute ID': attr.attribute_id,
      'Entities': attr.entity_count,
      'Unique Values': attr.unique_values,
      'Sample Values': attr.sample_values.substring(0, 100) + (attr.sample_values.length > 100 ? '...' : '')
    })));

    console.log('\n🔍 Checking DECIMAL EAV attributes with data...');
    const [decimalAttrs] = await mysqlConnection.execute(`
      SELECT 
        eav.attribute_id,
        COUNT(DISTINCT eav.entity_id) as entity_count,
        COUNT(DISTINCT eav.value) as unique_values,
        MIN(eav.value) as min_value,
        MAX(eav.value) as max_value,
        AVG(eav.value) as avg_value
      FROM sales_order_variant_entity_decimal eav
      WHERE eav.entity_id IN (
        SELECT e.entity_id 
        FROM sales_order_variant_entity e
        JOIN sales_order_grid ON (sales_order_grid.entity_id = e.order_id)
        WHERE sales_order_grid.status IN('processing', 'progress', 'holded')
          AND e.item_status = 'cutting_ready'
          AND e.is_sample = ''
          AND ((e.kit_type IS NULL) OR (e.kit_type IN('slatted')))
      )
      AND eav.value IS NOT NULL
      GROUP BY eav.attribute_id
      HAVING entity_count > 10
      ORDER BY entity_count DESC
    `);

    console.log('DECIMAL Attributes with data:');
    console.table(decimalAttrs.map(attr => ({
      'Attribute ID': attr.attribute_id,
      'Entities': attr.entity_count,
      'Unique Values': attr.unique_values,
      'Min': parseFloat(attr.min_value).toFixed(2),
      'Max': parseFloat(attr.max_value).toFixed(2),
      'Avg': parseFloat(attr.avg_value).toFixed(2)
    })));

    // Let's also check what's in the item_name field
    console.log('\n🔍 Checking item_name patterns...');
    const [itemNames] = await mysqlConnection.execute(`
      SELECT 
        LEFT(e.item_name, 50) as item_name_sample,
        COUNT(*) as count
      FROM sales_order_variant_entity e
      JOIN sales_order_grid ON (sales_order_grid.entity_id = e.order_id)
      WHERE sales_order_grid.status IN('processing', 'progress', 'holded')
        AND e.item_status = 'cutting_ready'
        AND e.is_sample = ''
        AND ((e.kit_type IS NULL) OR (e.kit_type IN('slatted')))
        AND e.item_name IS NOT NULL
      GROUP BY LEFT(e.item_name, 50)
      ORDER BY count DESC
      LIMIT 20
    `);

    console.log('\nItem Name Samples:');
    console.table(itemNames.map(item => ({
      'Item Name Sample': item.item_name_sample,
      'Count': item.count
    })));

    // Check a few specific attribute IDs we're trying to use
    console.log('\n🔍 Checking our target attribute IDs...');
    const targetAttributes = [159, 166, 167, 168, 183, 184, 185, 189, 190, 258, 261];
    
    for (const attrId of targetAttributes) {
      const [varcharCount] = await mysqlConnection.execute(`
        SELECT COUNT(DISTINCT entity_id) as count 
        FROM sales_order_variant_entity_varchar 
        WHERE attribute_id = ? AND value IS NOT NULL AND value != ''
      `, [attrId]);
      
      const [decimalCount] = await mysqlConnection.execute(`
        SELECT COUNT(DISTINCT entity_id) as count 
        FROM sales_order_variant_entity_decimal 
        WHERE attribute_id = ? AND value IS NOT NULL
      `, [attrId]);
      
      console.log(`Attribute ${attrId}: ${varcharCount[0].count} varchar entities, ${decimalCount[0].count} decimal entities`);
    }

  } catch (error) {
    console.error('❌ Diagnosis error:', error);
  } finally {
    if (mysqlConnection) {
      await mysqlConnection.end();
    }
  }
}

diagnoseEAVAttributes();