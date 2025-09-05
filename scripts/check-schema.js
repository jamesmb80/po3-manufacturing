#!/usr/bin/env node

/**
 * Check ready2cut_parts table schema
 * 
 * This script checks what columns exist in the ready2cut_parts table
 * to verify if item_name has been added
 * 
 * Usage: node scripts/check-schema.js
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function checkSchema() {
  console.log('🔍 Checking ready2cut_parts table schema...\n');

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );

  try {
    // Try to select with item_name to see if column exists
    const { data, error } = await supabase
      .from('ready2cut_parts')
      .select('sheet_id, item_name')
      .limit(1);

    if (error) {
      if (error.message.includes('item_name')) {
        console.log('❌ item_name column does not exist yet');
        console.log('\n📋 Please run this SQL in your Supabase dashboard:');
        console.log('   ALTER TABLE ready2cut_parts ADD COLUMN IF NOT EXISTS item_name TEXT;');
      } else {
        console.log('❌ Other error:', error.message);
      }
    } else {
      console.log('✅ item_name column exists and is accessible!');
      console.log('🚀 Ready to run the hybrid import script');
    }

    // Also test a simple insert to see what columns are expected
    console.log('\n🔍 Testing table structure...');
    const testData = {
      sheet_id: 'TEST123',
      increment_id: 'TEST456',
      cutting_date: '01 Jan 2025',
      order_status: 'Processing',
      shipping_name: 'Test Customer',
      material: 'MDF',
      processing_status: 'ready_to_cut'
    };

    const { data: insertData, error: insertError } = await supabase
      .from('ready2cut_parts')
      .insert(testData)
      .select()
      .single();

    if (insertError) {
      console.log('📋 Missing columns detected:', insertError.message);
      if (insertError.message.includes('item_name')) {
        console.log('   ➤ Need to add: item_name TEXT');
      }
    } else {
      console.log('✅ Test insert successful, schema looks good');
      
      // Clean up test data
      await supabase
        .from('ready2cut_parts')
        .delete()
        .eq('sheet_id', 'TEST123');
      console.log('🧹 Test data cleaned up');
    }

  } catch (error) {
    console.error('❌ Schema check error:', error.message);
  }
}

checkSchema();