#!/usr/bin/env node

/**
 * Production Data Sync Script
 * 
 * This script syncs production data from the Magento MySQL database
 * to replace the sample data that only contains MDF and Plywood.
 * 
 * Usage:
 *   node scripts/sync-production-data.js [options]
 * 
 * Options:
 *   --analyze    - Just analyze what data is available without syncing
 *   --test       - Test the MySQL connection
 *   --clear      - Clear existing data before sync
 *   --limit=N    - Limit number of records to sync (default: 1000)
 */

const https = require('https');
const { parse } = require('url');

// Configuration
const config = {
  baseUrl: process.env.NEXTAUTH_URL || 'http://localhost:3000',
  defaultLimit: 1000,
};

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  analyze: args.includes('--analyze'),
  test: args.includes('--test'),
  clear: args.includes('--clear'),
  limit: parseInt(args.find(arg => arg.startsWith('--limit='))?.split('=')[1]) || config.defaultLimit,
};

console.log('🔄 Production Data Sync Script');
console.log('==============================');
console.log(`Options:`, options);
console.log('');

// Helper function to make HTTP requests
function makeRequest(url, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const { protocol, hostname, port, pathname, search } = parse(url);
    const options = {
      hostname,
      port: port || (protocol === 'https:' ? 443 : 80),
      path: pathname + (search || ''),
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const req = (protocol === 'https:' ? https : require('http')).request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve({ status: res.statusCode, data: jsonData });
        } catch (e) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });

    req.on('error', reject);

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

// Test MySQL connection
async function testConnection() {
  console.log('🔍 Testing MySQL connection...');
  
  try {
    const response = await makeRequest(`${config.baseUrl}/api/sync?action=test`);
    
    if (response.status === 200 && response.data.success) {
      console.log('✅ MySQL connection successful');
      return true;
    } else {
      console.log('❌ MySQL connection failed:', response.data.message);
      return false;
    }
  } catch (error) {
    console.error('❌ Connection test error:', error.message);
    return false;
  }
}

// Analyze current data
async function analyzeData() {
  console.log('📊 Analyzing current data...');
  
  try {
    const response = await makeRequest(`${config.baseUrl}/api/sync?action=analyze`);
    
    if (response.status === 200 && response.data.success) {
      const analysis = response.data.data;
      console.log('');
      console.log('📈 Current Data Analysis:');
      console.log(`  Total Parts: ${analysis.totalParts}`);
      console.log(`  Materials: ${analysis.materials?.join(', ') || 'None found'}`);
      console.log(`  Types: ${analysis.types?.join(', ') || 'None found'}`);
      console.log(`  Thicknesses: ${analysis.thicknesses?.join(', ') || 'None found'}`);
      console.log(`  Date Range: ${analysis.dateRange?.min || 'N/A'} to ${analysis.dateRange?.max || 'N/A'}`);
      
      return analysis;
    } else {
      console.log('❌ Analysis failed:', response.data.message);
      return null;
    }
  } catch (error) {
    console.error('❌ Analysis error:', error.message);
    return null;
  }
}

// Clear existing data
async function clearData() {
  console.log('🗑️  Clearing existing data...');
  
  try {
    const response = await makeRequest(`${config.baseUrl}/api/sync`, 'DELETE');
    
    if (response.status === 200 && response.data.success) {
      console.log('✅ Data cleared successfully');
      return true;
    } else {
      console.log('❌ Failed to clear data:', response.data.message);
      return false;
    }
  } catch (error) {
    console.error('❌ Clear data error:', error.message);
    return false;
  }
}

// Sync production data
async function syncData() {
  console.log(`🔄 Syncing production data (limit: ${options.limit})...`);
  
  try {
    const syncOptions = {
      clearExisting: options.clear,
      limit: options.limit,
      batchSize: 100
    };
    
    const response = await makeRequest(`${config.baseUrl}/api/sync`, 'POST', syncOptions);
    
    if (response.status === 200 && response.data.success) {
      console.log('✅ Sync completed successfully!');
      console.log('');
      console.log('📊 Sync Results:');
      console.log(`  Records Imported: ${response.data.details.recordsImported}`);
      console.log(`  Records Updated: ${response.data.details.recordsUpdated}`);
      console.log(`  Records Failed: ${response.data.details.recordsFailed}`);
      console.log(`  Duration: ${response.data.details.duration}`);
      
      if (response.data.details.discoveries) {
        console.log('');
        console.log('🔍 Materials Discovered:');
        console.log(`  Materials: ${response.data.details.discoveries.materials?.join(', ') || 'None'}`);
        console.log(`  Types: ${response.data.details.discoveries.types?.join(', ') || 'None'}`);
        console.log(`  Thicknesses: ${response.data.details.discoveries.thicknesses?.join(', ') || 'None'}`);
      }
      
      if (response.data.details.errors?.length > 0) {
        console.log('');
        console.log('⚠️  Sync Errors:');
        response.data.details.errors.forEach((error, i) => {
          console.log(`  ${i + 1}. ${error}`);
        });
      }
      
      return true;
    } else {
      console.log('❌ Sync failed:', response.data.message);
      if (response.data.error) {
        console.log('Error details:', response.data.error);
      }
      return false;
    }
  } catch (error) {
    console.error('❌ Sync error:', error.message);
    return false;
  }
}

// Main execution
async function main() {
  try {
    // Test connection first
    const connectionOk = await testConnection();
    if (!connectionOk) {
      console.log('');
      console.log('💡 Make sure your MySQL connection is configured in .env.local');
      console.log('   Required variables: DB_HOST, DB_USER, DB_PASSWORD, DB_NAME');
      process.exit(1);
    }
    
    console.log('');
    
    // Handle different modes
    if (options.test) {
      console.log('✅ Connection test passed. MySQL database is accessible.');
      process.exit(0);
    }
    
    if (options.analyze) {
      await analyzeData();
      process.exit(0);
    }
    
    // Clear data if requested
    if (options.clear) {
      const cleared = await clearData();
      if (!cleared) {
        process.exit(1);
      }
      console.log('');
    }
    
    // Sync data
    const synced = await syncData();
    if (!synced) {
      process.exit(1);
    }
    
    console.log('');
    console.log('🎉 Production data sync completed!');
    console.log('   You should now see the full range of materials including acrylic, MFC, etc.');
    console.log('   Refresh your browser to see the updated data.');
    
  } catch (error) {
    console.error('❌ Script error:', error.message);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = { testConnection, analyzeData, clearData, syncData };