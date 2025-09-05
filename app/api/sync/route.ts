import { NextRequest, NextResponse } from 'next/server';
import { syncReady2CutData, analyzeImportedData, getSyncHistory } from '@/lib/data-sync';
import { testMySQLConnection } from '@/lib/mysql-connection';

// POST /api/sync - Trigger data sync from MySQL to Supabase
export async function POST(request: NextRequest) {
  try {
    // Parse request body for options
    const body = await request.json().catch(() => ({}));
    const {
      clearExisting = false,
      limit = 3344,
      batchSize = 100
    } = body;

    console.log('Starting data sync with options:', { clearExisting, limit, batchSize });

    // Execute sync
    const result = await syncReady2CutData({
      clearExisting,
      limit,
      batchSize
    });

    return NextResponse.json({
      success: result.success,
      message: result.success 
        ? `Successfully synced ${result.recordsImported} records` 
        : 'Sync failed',
      details: {
        recordsImported: result.recordsImported,
        recordsUpdated: result.recordsUpdated,
        recordsFailed: result.recordsFailed,
        duration: `${result.duration}ms`,
        errors: result.errors,
        discoveries: {
          materials: result.uniqueMaterials,
          types: result.uniqueTypes,
          thicknesses: result.uniqueThicknesses
        }
      }
    }, { 
      status: result.success ? 200 : 500 
    });
  } catch (error) {
    console.error('Sync API error:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Internal server error during sync',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// GET /api/sync - Get sync status and history
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    // Test connection
    if (action === 'test') {
      const isConnected = await testMySQLConnection();
      return NextResponse.json({
        success: isConnected,
        message: isConnected 
          ? 'MySQL connection successful' 
          : 'Failed to connect to MySQL',
        timestamp: new Date().toISOString()
      });
    }

    // Analyze imported data
    if (action === 'analyze') {
      const analysis = await analyzeImportedData();
      return NextResponse.json({
        success: !!analysis,
        data: analysis,
        timestamp: new Date().toISOString()
      });
    }

    // Get sync history
    const limit = parseInt(searchParams.get('limit') || '10');
    const history = await getSyncHistory(limit);
    
    return NextResponse.json({
      success: true,
      history,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Sync API GET error:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Failed to fetch sync information',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// DELETE /api/sync - Clear all synced data
export async function DELETE(request: NextRequest) {
  try {
    const { clearExistingData } = await import('@/lib/data-sync');
    const success = await clearExistingData();
    
    return NextResponse.json({
      success,
      message: success 
        ? 'Successfully cleared all Ready2Cut data' 
        : 'Failed to clear data',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Clear data error:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Failed to clear data',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}