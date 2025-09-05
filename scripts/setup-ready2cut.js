#!/usr/bin/env node

/**
 * Setup Ready2Cut Production Database
 * 
 * This script:
 * 1. Creates the ready2cut_parts table in Supabase (if not exists)
 * 2. Imports all production data from MySQL
 * 3. Parses materials from item_name field
 * 
 * Usage: node scripts/setup-ready2cut.js
 */

const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env.local' });

// Direct database setup using fetch API to Supabase REST API
async function setupReady2Cut() {
  console.log('🚀 Setting up Ready2Cut Production Database...\n');

  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

  if (!SUPABASE_SERVICE_KEY) {
    console.error('❌ SUPABASE_SERVICE_KEY not found in .env.local');
    console.error('Please add your service role key to .env.local');
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
    console.log('\n🔍 Checking Supabase tables...');
    
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
      console.log('\n⚠️  ready2cut_parts table does not exist in Supabase!');
      console.log('Please run the following SQL in your Supabase dashboard:');
      console.log('---------------------------------------------------------------');
      console.log('Go to: https://supabase.com/dashboard/project/[your-project]/sql/new');
      console.log('Run the SQL from: supabase/migrations/002_ready2cut_schema.sql');
      console.log('---------------------------------------------------------------\n');
      return;
    }

    console.log('✅ ready2cut_parts table exists');

    // Fetch all Ready2Cut records from MySQL
    console.log('\n📊 Fetching data from MySQL...');
    const [records] = await mysqlConnection.execute(`
      SELECT 
        sove.entity_id as sheet_id,
        so.increment_id,
        DATE_FORMAT(sove.cutting_date, '%d %b %Y') as cutting_date,
        'Processing' as order_status,
        CONCAT(COALESCE(so.customer_firstname, ''), ' ', COALESCE(so.customer_lastname, '')) as shipping_name,
        sove.item_name,
        COALESCE(shape_attr.value, 'rectangle') as shape,
        width_attr.value as width,
        length_attr.value as length,
        sove.cutting_tag,
        sove.notes,
        DATE_FORMAT(COALESCE(sove.item_status_updated_at, sove.updated_at), '%d %b %Y %H:%i:%s') as status_updated
      FROM sales_order_variant_entity sove
      JOIN sales_order so ON sove.order_id = so.entity_id
      LEFT JOIN sales_order_variant_entity_varchar shape_attr 
        ON sove.entity_id = shape_attr.entity_id AND shape_attr.attribute_id = 159
      LEFT JOIN sales_order_variant_entity_varchar width_attr 
        ON sove.entity_id = width_attr.entity_id AND width_attr.attribute_id = 168
      LEFT JOIN sales_order_variant_entity_varchar length_attr 
        ON sove.entity_id = length_attr.entity_id AND length_attr.attribute_id = 261
      WHERE sove.item_status = 'cutting_ready'
        AND so.status = 'processing'
    `);

    console.log(`Fetched ${records.length} records`);

    // Parse materials from item_name
    function parseMaterial(itemName) {
      if (!itemName) return { material: 'Unknown', type: null, thickness: null, colour: null, finish: null };
      
      const name = itemName.toLowerCase();
      let material = 'Other';
      let type = null;
      let colour = null;
      let finish = null;
      
      // Parse material
      if (name.includes('mdf')) {
        material = 'MDF';
      } else if (name.includes('plywood')) {
        material = 'Plywood';
      } else if (name.includes('acrylic')) {
        material = 'Acrylic';
      } else if (name.includes('osb')) {
        material = 'OSB';
      } else if (name.includes('polycarbonate')) {
        material = 'Polycarbonate';
      } else if (name.includes('chipboard')) {
        material = 'Chipboard';
      } else if (name.includes('oak') && !name.includes('mdf')) {
        material = 'Oak';
      } else if (name.includes('maple')) {
        material = 'Maple';
      } else if (name.includes('birch')) {
        material = 'Birch';
      } else if (name.includes('walnut')) {
        material = 'Walnut';
      }
      
      // Parse thickness
      const thicknessMatch = itemName.match(/(\d+(?:\.\d+)?)\s*mm/i);
      const thickness = thicknessMatch ? thicknessMatch[1] + 'mm' : null;
      
      // Parse colour
      const colours = ['white', 'black', 'grey', 'brown', 'natural', 'clear', 'red', 'blue', 'green'];
      for (const c of colours) {
        if (name.includes(c)) {
          colour = c.charAt(0).toUpperCase() + c.slice(1);
          break;
        }
      }
      
      // Parse finish
      if (name.includes('veneered')) finish = 'Veneered';
      else if (name.includes('melamine')) finish = 'Melamine';
      else if (name.includes('laminate')) finish = 'Laminate';
      else if (name.includes('painted')) finish = 'Painted';
      else if (name.includes('raw')) finish = 'Raw';
      
      // Parse type
      if (name.includes('desk') || name.includes('table')) type = 'Desktop';
      else if (name.includes('shelf') || name.includes('shelving')) type = 'Shelving';
      else if (name.includes('door')) type = 'Door';
      else if (name.includes('panel')) type = 'Panel';
      
      return { material, type, thickness, colour, finish };
    }

    // Transform data for ready2cut_parts table
    console.log('\n🔄 Transforming data...');
    const transformedData = records.map(r => {
      const parsed = parseMaterial(r.item_name);
      return {
        sheet_id: String(r.sheet_id),
        increment_id: r.increment_id,
        cutting_date: r.cutting_date,
        order_status: r.order_status,
        shipping_name: r.shipping_name,
        material: parsed.material,
        type: parsed.type,
        colour: parsed.colour,
        finish: parsed.finish,
        thickness: parsed.thickness,
        shape: r.shape,
        width: r.width,
        length: r.length,
        tags: r.cutting_tag === '0' ? 'Straight' : `Process-${r.cutting_tag}`,
        notes: r.notes,
        action: 'View',
        status_updated: r.status_updated,
        processing_status: 'ready_to_cut',
        item_name: r.item_name
      };
    });

    // Clear existing data
    console.log('\n🗑️ Clearing existing data...');
    const deleteResponse = await fetch(
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

    if (!deleteResponse.ok) {
      console.log('Note: Could not clear data (might be empty)');
    }

    // Insert new data in batches
    console.log('📤 Inserting data to Supabase...');
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

    console.log(`\n✅ Success! Imported ${totalInserted} records`);
    
    // Show statistics
    console.log('\n📊 Import Statistics:');
    const materialCounts = {};
    transformedData.forEach(r => {
      materialCounts[r.material] = (materialCounts[r.material] || 0) + 1;
    });
    
    console.table(Object.entries(materialCounts).map(([material, count]) => ({
      Material: material,
      Count: count,
      Percentage: ((count / transformedData.length) * 100).toFixed(1) + '%'
    })));

  } catch (error) {
    console.error('❌ Setup error:', error);
  } finally {
    if (mysqlConnection) {
      await mysqlConnection.end();
    }
  }
}

setupReady2Cut();