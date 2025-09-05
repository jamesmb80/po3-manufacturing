#!/usr/bin/env node

/**
 * Import Ready2Cut Production Data with Proper EAV Joins
 * 
 * This script uses the improved SQL query that properly fetches
 * material data from Magento EAV attributes instead of parsing item_name
 * 
 * Usage: node scripts/import-with-eav.js
 */

const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env.local' });

async function importWithEAV() {
  console.log('🚀 Importing Ready2Cut data with proper EAV structure...\n');

  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

  if (!SUPABASE_SERVICE_KEY) {
    console.error('❌ SUPABASE_SERVICE_KEY not found in .env.local');
    return;
  }

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

    console.log('✅ Connected to MySQL');

    // Check if ready2cut_parts table exists
    console.log('🔍 Checking Supabase tables...');
    
    const checkResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/ready2cut_parts?select=sheet_id&limit=1`,
      {
        headers: {
          'apikey': SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        }
      }
    );

    if (checkResponse.status === 404) {
      console.log('\n⚠️  ready2cut_parts table does not exist!');
      console.log('Run the SQL from: supabase/migrations/002_ready2cut_schema.sql');
      return;
    }

    // Execute the improved EAV query
    console.log('\n📊 Fetching data with proper EAV joins...');
    const [records] = await mysqlConnection.execute(`
      SELECT
          -- Base entity and order information
          e.entity_id as sheet_id,
          sales_order_grid.increment_id,
          DATE_FORMAT(e.cutting_date, '%d %b %Y') as cutting_date,
          -- Map item status to user-friendly format 
          CASE
              WHEN e.item_status = 'cutting_ready' THEN 'Processing'
              WHEN e.item_status IN ('cutting_csv', 'csv_cutting', 'cutting_laser', 'cutting_wallsaw', 'cutting_holzher', 'cutting_multicam', 'cutting_teccam', 'cutting_joinery') THEN 'In_Progress'
              WHEN e.item_status IN ('assigned_laser', 'assigned_wallsaw', 'assigned_holzher', 'assigned_csv', 'assigned_teccam', 'assigned_multicam', 'assigned_stock', 'assigned_joinery') THEN 'Processing'
              ELSE e.item_status
          END as order_status,
          -- Customer and order details
          sales_order_grid.shipping_name,
          sales_order_grid.billing_name,
          sales_order_grid.status as raw_order_status,
          sales_order_grid.shipping_information as order_shipping,
          sales_order_grid.created_at as order_created,
          -- Material attributes from EAV system
          material_attr.value as material,
          type_attr.value as type,
          colour_attr.value as colour,
          finish_attr.value as finish,
          thickness_attr.value as thickness,
          NULL as finish_2,
          -- Shape information
          COALESCE(shape_attr.value, 'rectangle') as shape,
          -- Dimensions - handling both varchar and decimal storage
          COALESCE(depth_varchar.value, CAST(depth_decimal.value AS CHAR)) as depth,
          COALESCE(diameter_varchar.value, CAST(diameter_decimal.value AS CHAR)) as diameter,
          COALESCE(height_varchar.value, CAST(height_decimal.value AS CHAR)) as height,
          COALESCE(length_varchar.value, CAST(length_decimal.value AS CHAR)) as length,
          COALESCE(width_varchar.value, CAST(width_decimal.value AS CHAR)) as width,
          -- Process and tracking information
          COALESCE(e.cutting_tag, 'Straight') as tags,
          e.notes,
          'View' as action,
          DATE_FORMAT(COALESCE(e.item_status_updated_at, e.updated_at), '%d %b %Y %H:%i:%s') as status_updated,
          -- Additional fields
          e.item_name,
          e.product_type,
          e.kit_type,
          e.is_sample,
          e.order_part,
          e.kit_part,
          e.cutter_id,
          e.cutter_date,
          e.further_id,
          e.further_date,
          e.delivery_date,
          e.oversize,
          e.recut_count
      FROM sales_order_variant_entity AS e
      -- Join with order grid table
      LEFT JOIN sales_order_grid ON (sales_order_grid.entity_id = e.order_id)
      -- Material and Type Attributes (VARCHAR)
      LEFT JOIN sales_order_variant_entity_varchar material_attr
          ON e.entity_id = material_attr.entity_id AND material_attr.attribute_id = 183
      LEFT JOIN sales_order_variant_entity_varchar type_attr
          ON e.entity_id = type_attr.entity_id AND type_attr.attribute_id = 184
      LEFT JOIN sales_order_variant_entity_varchar colour_attr
          ON e.entity_id = colour_attr.entity_id AND colour_attr.attribute_id = 185
      LEFT JOIN sales_order_variant_entity_varchar finish_attr
          ON e.entity_id = finish_attr.entity_id AND finish_attr.attribute_id = 190
      LEFT JOIN sales_order_variant_entity_varchar thickness_attr
          ON e.entity_id = thickness_attr.entity_id AND thickness_attr.attribute_id = 189
      LEFT JOIN sales_order_variant_entity_varchar shape_attr
          ON e.entity_id = shape_attr.entity_id AND shape_attr.attribute_id = 159
      -- Dimension Attributes (VARCHAR versions)
      LEFT JOIN sales_order_variant_entity_varchar depth_varchar
          ON e.entity_id = depth_varchar.entity_id AND depth_varchar.attribute_id = 258
      LEFT JOIN sales_order_variant_entity_varchar diameter_varchar
          ON e.entity_id = diameter_varchar.entity_id AND diameter_varchar.attribute_id = 166
      LEFT JOIN sales_order_variant_entity_varchar height_varchar
          ON e.entity_id = height_varchar.entity_id AND height_varchar.attribute_id = 167
      LEFT JOIN sales_order_variant_entity_varchar length_varchar
          ON e.entity_id = length_varchar.entity_id AND length_varchar.attribute_id = 261
      LEFT JOIN sales_order_variant_entity_varchar width_varchar
          ON e.entity_id = width_varchar.entity_id AND width_varchar.attribute_id = 168
      -- Dimension Attributes (DECIMAL versions)
      LEFT JOIN sales_order_variant_entity_decimal depth_decimal
          ON e.entity_id = depth_decimal.entity_id AND depth_decimal.attribute_id = 258
      LEFT JOIN sales_order_variant_entity_decimal diameter_decimal
          ON e.entity_id = diameter_decimal.entity_id AND diameter_decimal.attribute_id = 166
      LEFT JOIN sales_order_variant_entity_decimal height_decimal
          ON e.entity_id = height_decimal.entity_id AND height_decimal.attribute_id = 167
      LEFT JOIN sales_order_variant_entity_decimal length_decimal
          ON e.entity_id = length_decimal.entity_id AND length_decimal.attribute_id = 261
      LEFT JOIN sales_order_variant_entity_decimal width_decimal
          ON e.entity_id = width_decimal.entity_id AND width_decimal.attribute_id = 168
      WHERE
          sales_order_grid.status IN('processing', 'progress', 'holded')
          AND e.item_status = 'cutting_ready'
          AND e.is_sample = ''
          AND ((e.kit_type IS NULL) OR (e.kit_type IN('slatted')))
      ORDER BY e.order_id ASC
    `);

    console.log(`✅ Fetched ${records.length} records with proper EAV data`);

    // Transform data for Supabase (minimal transformation needed now!)
    console.log('\n🔄 Transforming data...');
    const transformedData = records.map(r => ({
      sheet_id: String(r.sheet_id),
      increment_id: r.increment_id,
      cutting_date: r.cutting_date,
      order_status: r.order_status,
      shipping_name: r.shipping_name,
      // Direct material data - no parsing needed!
      material: r.material || 'Unknown',
      type: r.type || null,
      colour: r.colour || null,
      finish: r.finish || null,
      thickness: r.thickness || null,
      finish_2: r.finish_2 || null,
      shape: r.shape || 'rectangle',
      depth: r.depth || null,
      diameter: r.diameter || null,
      height: r.height || null,
      length: r.length || null,
      width: r.width || null,
      tags: r.tags,
      notes: r.notes,
      action: r.action,
      status_updated: r.status_updated,
      processing_status: 'ready_to_cut',
      item_name: r.item_name,
      // Additional fields we might want to add to schema later
      product_type: r.product_type,
      kit_type: r.kit_type,
      cutter_id: r.cutter_id,
      delivery_date: r.delivery_date,
      recut_count: r.recut_count || 0,
      oversize: r.oversize || false
    }));

    // Clear existing data
    console.log('\n🗑️ Clearing existing data...');
    await fetch(
      `${SUPABASE_URL}/rest/v1/ready2cut_parts`,
      {
        method: 'DELETE',
        headers: {
          'apikey': SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
          'Prefer': 'return=minimal'
        }
      }
    );

    // Insert new data in batches
    console.log('📤 Inserting clean EAV data to Supabase...');
    const batchSize = 100;
    let totalInserted = 0;
    
    for (let i = 0; i < transformedData.length; i += batchSize) {
      const batch = transformedData.slice(i, i + batchSize);
      
      const insertResponse = await fetch(
        `${SUPABASE_URL}/rest/v1/ready2cut_parts`,
        {
          method: 'POST',
          headers: {
            'apikey': SUPABASE_SERVICE_KEY,
            'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify(batch)
        }
      );

      if (insertResponse.ok) {
        totalInserted += batch.length;
        console.log(`Inserted batch: ${totalInserted}/${transformedData.length}`);
      } else {
        const error = await insertResponse.text();
        console.error('❌ Batch failed:', error);
      }
    }

    console.log(`\n✅ Success! Imported ${totalInserted} records with proper EAV data`);
    
    // Show material distribution
    console.log('\n📊 Material Distribution (from EAV attributes):');
    const materialCounts = {};
    const typeCounts = {};
    const thicknessCounts = {};
    
    transformedData.forEach(r => {
      if (r.material) materialCounts[r.material] = (materialCounts[r.material] || 0) + 1;
      if (r.type) typeCounts[r.type] = (typeCounts[r.type] || 0) + 1;
      if (r.thickness) thicknessCounts[r.thickness] = (thicknessCounts[r.thickness] || 0) + 1;
    });
    
    console.log('\nMaterials:');
    console.table(Object.entries(materialCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([material, count]) => ({
        Material: material,
        Count: count,
        Percentage: ((count / transformedData.length) * 100).toFixed(1) + '%'
      })));
    
    console.log('\nTypes:');
    console.table(Object.entries(typeCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([type, count]) => ({
        Type: type,
        Count: count,
        Percentage: ((count / transformedData.length) * 100).toFixed(1) + '%'
      })));
    
    console.log('\nThicknesses:');
    console.table(Object.entries(thicknessCounts)
      .sort((a, b) => {
        // Sort thickness numerically
        const aNum = parseFloat(a[0]) || 0;
        const bNum = parseFloat(b[0]) || 0;
        return aNum - bNum;
      })
      .map(([thickness, count]) => ({
        Thickness: thickness,
        Count: count,
        Percentage: ((count / transformedData.length) * 100).toFixed(1) + '%'
      })));

  } catch (error) {
    console.error('❌ Import error:', error);
  } finally {
    if (mysqlConnection) {
      await mysqlConnection.end();
    }
  }
}

importWithEAV();