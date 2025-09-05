#!/usr/bin/env node

/**
 * Hybrid EAV + Parsing Import
 * 
 * This script combines the best of both approaches:
 * - Uses EAV attributes for dimensions (which work perfectly)
 * - Parses materials from item_name (which has rich data) 
 * - Gets order information from sales_order_grid
 * 
 * Usage: node scripts/import-hybrid-eav.js
 */

const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env.local' });

async function importHybridEAV() {
  console.log('🚀 Importing with Hybrid EAV + Parsing approach...\n');

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

    // First, run your migration to add item_name column
    console.log('🔄 Please run this SQL in Supabase dashboard:');
    console.log('ALTER TABLE ready2cut_parts ADD COLUMN IF NOT EXISTS item_name TEXT;\n');

    // Check if ready2cut_parts table exists and has item_name
    console.log('🔍 Checking Supabase tables...');
    const checkResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/ready2cut_parts?select=sheet_id,item_name&limit=1`,
      {
        headers: {
          'apikey': SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        }
      }
    );

    if (checkResponse.status === 404) {
      console.log('⚠️  ready2cut_parts table does not exist!');
      return;
    }

    // Execute hybrid query - EAV for dimensions, direct fields for the rest
    console.log('\n📊 Fetching data with hybrid approach...');
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
          -- Shape information (EAV - works perfectly!)
          COALESCE(shape_attr.value, 'rectangle') as shape,
          -- Dimensions from EAV (these work great!)
          width_attr.value as width,
          length_attr.value as length,
          height_attr.value as height,
          depth_attr.value as depth,
          diameter_attr.value as diameter,
          -- Process and tracking information
          COALESCE(e.cutting_tag, 'Straight') as tags,
          e.notes,
          'View' as action,
          DATE_FORMAT(COALESCE(e.item_status_updated_at, e.updated_at), '%d %b %Y %H:%i:%s') as status_updated,
          -- Item name for material parsing (this has rich data!)
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
      -- EAV joins for dimensions (these work!)
      LEFT JOIN sales_order_variant_entity_varchar shape_attr
          ON e.entity_id = shape_attr.entity_id AND shape_attr.attribute_id = 159
      LEFT JOIN sales_order_variant_entity_varchar width_attr
          ON e.entity_id = width_attr.entity_id AND width_attr.attribute_id = 168
      LEFT JOIN sales_order_variant_entity_varchar length_attr
          ON e.entity_id = length_attr.entity_id AND length_attr.attribute_id = 261
      LEFT JOIN sales_order_variant_entity_varchar height_attr
          ON e.entity_id = height_attr.entity_id AND height_attr.attribute_id = 167
      LEFT JOIN sales_order_variant_entity_varchar depth_attr
          ON e.entity_id = depth_attr.entity_id AND depth_attr.attribute_id = 258
      LEFT JOIN sales_order_variant_entity_varchar diameter_attr
          ON e.entity_id = diameter_attr.entity_id AND diameter_attr.attribute_id = 166
      WHERE
          sales_order_grid.status IN('processing', 'progress', 'holded')
          AND e.item_status = 'cutting_ready'
          AND e.is_sample = ''
          AND ((e.kit_type IS NULL) OR (e.kit_type IN('slatted')))
      ORDER BY e.order_id ASC
    `);

    console.log(`✅ Fetched ${records.length} records with hybrid approach`);

    // Enhanced material parsing from item_name (now we know what patterns to expect!)
    function parseMaterialFromItemName(itemName) {
      if (!itemName) return { material: 'Unknown', type: null, thickness: null, colour: null, finish: null };
      
      const name = itemName.toLowerCase();
      let material = 'Other';
      let type = null;
      let colour = null;
      let finish = null;
      let thickness = null;
      
      // Parse thickness first (very reliable pattern)
      const thicknessMatch = itemName.match(/(\d+(?:\.\d+)?)mm/i);
      if (thicknessMatch) {
        thickness = thicknessMatch[1] + 'mm';
      }
      
      // Parse materials based on diagnosed patterns
      if (name.includes('mdf')) {
        material = 'MDF';
        if (name.includes('medite premier')) type = 'Medite Premier';
        else if (name.includes('melamine')) type = 'Melamine MDF';
        else if (name.includes('veneered')) type = 'Veneered MDF';
      } else if (name.includes('plywood')) {
        material = 'Plywood';
        if (name.includes('hardwood')) type = 'Hardwood';
        else if (name.includes('marine')) type = 'Marine';
        else if (name.includes('birch')) type = 'Birch';
        else if (name.includes('softwood') || name.includes('spruce')) type = 'Softwood';
      } else if (name.includes('osb')) {
        material = 'OSB';
      }
      
      // Parse colours
      if (name.includes('white')) colour = 'White';
      else if (name.includes('oak')) colour = 'Oak';
      
      // Parse finishes  
      if (name.includes('melamine')) finish = 'Melamine';
      else if (name.includes('veneered')) finish = 'Veneered';
      
      // Parse specific product types
      if (name.includes('shelf') || name.includes('board')) type = 'Shelf/Board';
      else if (name.includes('cupboard')) type = 'Cupboard';
      else if (name.includes('wardrobe')) type = 'Wardrobe';
      
      return { material, type, thickness, colour, finish };
    }

    // Transform data combining EAV dimensions + parsed materials
    console.log('\n🔄 Transforming data with hybrid approach...');
    const transformedData = records.map(r => {
      const parsed = parseMaterialFromItemName(r.item_name);
      
      return {
        sheet_id: String(r.sheet_id),
        increment_id: r.increment_id,
        cutting_date: r.cutting_date,
        order_status: r.order_status,
        shipping_name: r.shipping_name,
        billing_name: r.billing_name,
        
        // Parsed material data (from item_name)
        material: parsed.material,
        type: parsed.type,
        colour: parsed.colour,
        finish: parsed.finish,
        thickness: parsed.thickness,
        finish_2: null,
        
        // EAV dimension data (from attributes - these work!)
        shape: r.shape,
        width: r.width,
        length: r.length,
        height: r.height,
        depth: r.depth,
        diameter: r.diameter,
        
        tags: r.tags,
        notes: r.notes,
        action: r.action,
        status_updated: r.status_updated,
        processing_status: 'ready_to_cut',
        
        // Original and additional fields
        item_name: r.item_name,
        product_type: r.product_type,
        kit_type: r.kit_type,
        is_sample: r.is_sample === '1',
        order_part: r.order_part,
        kit_part: r.kit_part,
        cutter_id: r.cutter_id,
        cutter_date: r.cutter_date,
        further_id: r.further_id,
        further_date: r.further_date,
        delivery_date: r.delivery_date,
        oversize: r.oversize === '1',
        recut_count: r.recut_count || 0,
        raw_order_status: r.raw_order_status,
        order_shipping: r.order_shipping,
        order_created: r.order_created
      };
    });

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
    console.log('📤 Inserting hybrid EAV + parsed data...');
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
        break; // Stop on first error to diagnose
      }
    }

    console.log(`\n✅ Success! Imported ${totalInserted} records with hybrid approach`);
    
    // Show comprehensive statistics
    console.log('\n📊 Import Statistics (Hybrid EAV + Parsing):');
    
    const materialCounts = {};
    const typeCounts = {};  
    const thicknessCounts = {};
    const shapeCounts = {};
    const dimensionStats = {
      width: 0,
      length: 0,
      height: 0,
      depth: 0,
      diameter: 0
    };
    
    transformedData.forEach(r => {
      if (r.material) materialCounts[r.material] = (materialCounts[r.material] || 0) + 1;
      if (r.type) typeCounts[r.type] = (typeCounts[r.type] || 0) + 1;
      if (r.thickness) thicknessCounts[r.thickness] = (thicknessCounts[r.thickness] || 0) + 1;
      if (r.shape) shapeCounts[r.shape] = (shapeCounts[r.shape] || 0) + 1;
      
      // Count dimensions from EAV
      if (r.width) dimensionStats.width++;
      if (r.length) dimensionStats.length++;
      if (r.height) dimensionStats.height++;
      if (r.depth) dimensionStats.depth++;
      if (r.diameter) dimensionStats.diameter++;
    });
    
    console.log('\n🎯 Materials (from item_name parsing):');
    console.table(Object.entries(materialCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([material, count]) => ({
        Material: material,
        Count: count,
        Percentage: ((count / transformedData.length) * 100).toFixed(1) + '%'
      })));
    
    console.log('\n🏷️ Types (from item_name parsing):');
    console.table(Object.entries(typeCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([type, count]) => ({
        Type: type,
        Count: count,
        Percentage: ((count / transformedData.length) * 100).toFixed(1) + '%'
      })));
      
    console.log('\n📏 Shapes (from EAV attributes):');
    console.table(Object.entries(shapeCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([shape, count]) => ({
        Shape: shape,
        Count: count,
        Percentage: ((count / transformedData.length) * 100).toFixed(1) + '%'
      })));
      
    console.log('\n📊 Dimension Coverage (from EAV):');
    console.table(Object.entries(dimensionStats).map(([dim, count]) => ({
      Dimension: dim,
      'Records with Data': count,
      'Coverage %': ((count / transformedData.length) * 100).toFixed(1) + '%'
    })));

  } catch (error) {
    console.error('❌ Import error:', error);
  } finally {
    if (mysqlConnection) {
      await mysqlConnection.end();
    }
  }
}

importHybridEAV();