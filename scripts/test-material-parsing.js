require('dotenv').config({ path: '.env.local' });
const { fetchReady2CutDataWithParsing, getReady2CutCount, closePool } = require('../lib/mysql-ready2cut');

async function testMaterialParsing() {
  console.log('🔍 Testing material parsing from item_name...\n');

  try {
    // Get total count
    const count = await getReady2CutCount();
    console.log(`📊 Total Ready2Cut records: ${count}\n`);

    // Fetch sample data with parsing
    console.log('📝 Fetching and parsing first 20 records:\n');
    const records = await fetchReady2CutDataWithParsing(20);

    // Show parsed materials
    console.log('Parsed material data:');
    console.table(records.map((r, i) => ({
      '#': i + 1,
      sheet_id: r.sheet_id,
      item_name: r.item_name ? r.item_name.substring(0, 40) + '...' : 'N/A',
      material: r.material || 'N/A',
      type: r.type || 'N/A',
      thickness: r.thickness || 'N/A',
      finish: r.finish || 'N/A',
      colour: r.colour || 'N/A'
    })));

    // Analyze material distribution
    console.log('\n📊 Material distribution in sample:\n');
    const materials = {};
    records.forEach(r => {
      const mat = r.material || 'Unknown';
      materials[mat] = (materials[mat] || 0) + 1;
    });
    console.table(materials);

    // Show dimensions for a few records
    console.log('\n📐 Sample dimensions:\n');
    console.table(records.slice(0, 5).map(r => ({
      sheet_id: r.sheet_id,
      shape: r.shape,
      length: r.length || 'N/A',
      width: r.width || 'N/A',
      height: r.height || 'N/A',
      depth: r.depth || 'N/A',
      diameter: r.diameter || 'N/A'
    })));

    // Show tags
    console.log('\n🏷️ Tags/Processes:\n');
    console.table(records.slice(0, 10).map(r => ({
      sheet_id: r.sheet_id,
      tags: r.tags
    })));

    await closePool();
    console.log('\n✅ Material parsing test complete!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error);
    process.exit(1);
  }
}

testMaterialParsing();