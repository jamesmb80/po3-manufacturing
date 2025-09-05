#!/usr/bin/env node

/**
 * Add item_name column to ready2cut_parts table via Supabase REST API
 * 
 * This script uses the Supabase REST API to execute the ALTER TABLE command
 * 
 * Usage: node scripts/add-item-name-column.js
 */

require('dotenv').config({ path: '.env.local' });

async function addItemNameColumn() {
  console.log('🔧 Adding item_name column to ready2cut_parts table...\n');

  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

  if (!SUPABASE_SERVICE_KEY) {
    console.error('❌ SUPABASE_SERVICE_KEY not found in .env.local');
    return;
  }

  try {
    // Use Supabase RPC to execute SQL
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        sql: 'ALTER TABLE ready2cut_parts ADD COLUMN IF NOT EXISTS item_name TEXT;'
      })
    });

    if (response.ok) {
      console.log('✅ Successfully added item_name column to ready2cut_parts table');
    } else {
      // Try alternative approach using PostgREST schema endpoint
      console.log('RPC method not available, trying direct SQL execution...');
      
      // This won't work for DDL, but let's see what error we get
      const directResponse = await fetch(`${SUPABASE_URL}/rest/v1/ready2cut_parts`, {
        method: 'GET',
        headers: {
          'apikey': SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        }
      });
      
      if (directResponse.ok) {
        console.log('✅ Table exists and is accessible');
        console.log('\nℹ️  The ALTER TABLE command needs to be run in the Supabase dashboard:');
        console.log('📋 Copy this SQL and run it in the SQL Editor:');
        console.log('   ALTER TABLE ready2cut_parts ADD COLUMN IF NOT EXISTS item_name TEXT;');
      } else {
        console.error('❌ Cannot access ready2cut_parts table');
      }
    }

  } catch (error) {
    console.error('❌ Error adding column:', error.message);
    console.log('\nℹ️  Please run this SQL command in your Supabase dashboard:');
    console.log('📋 ALTER TABLE ready2cut_parts ADD COLUMN IF NOT EXISTS item_name TEXT;');
  }
}

addItemNameColumn();