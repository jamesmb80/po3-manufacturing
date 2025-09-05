import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { 
  fetchReady2CutData, 
  Ready2CutRecord,
  testMySQLConnection,
  closeMySQLPool 
} from './mysql-connection';

// Supabase types matching our new schema
export interface Ready2CutPart {
  sheet_id: string;
  increment_id: string;
  cutting_date: string;
  order_status: string;
  shipping_name: string;
  material: string | null;
  type: string | null;
  colour: string | null;
  finish: string | null;
  thickness: string | null;
  finish_2: string | null;
  shape: string;
  depth: string | null;
  diameter: string | null;
  height: string | null;
  length: string | null;
  width: string | null;
  tags: string;
  notes: string | null;
  action: string;
  status_updated: string;
  machine_assignment?: string | null;
  processing_status?: string;
  completed_processes?: string[];
  next_process?: string | null;
  imported_at?: string;
  last_sync?: string;
}

export interface SyncResult {
  success: boolean;
  recordsImported: number;
  recordsUpdated: number;
  recordsFailed: number;
  errors: string[];
  startTime: Date;
  endTime: Date;
  duration: number;
  uniqueMaterials?: string[];
  uniqueTypes?: string[];
  uniqueThicknesses?: string[];
}

/**
 * Clear all existing data from ready2cut_parts table
 */
export async function clearExistingData(): Promise<boolean> {
  try {
    const supabase = createServerComponentClient({ cookies });
    
    // Delete all records from ready2cut_parts
    const { error } = await supabase
      .from('ready2cut_parts')
      .delete()
      .neq('sheet_id', '0'); // Delete all (neq with impossible value)
    
    if (error) {
      console.error('Error clearing existing data:', error);
      return false;
    }
    
    console.log('Successfully cleared existing data from ready2cut_parts');
    return true;
  } catch (error) {
    console.error('Failed to clear existing data:', error);
    return false;
  }
}

/**
 * Transform MySQL record to Supabase format
 */
function transformRecord(record: Ready2CutRecord): Ready2CutPart {
  return {
    ...record,
    // Ensure all null values are properly handled
    material: record.material || null,
    type: record.type || null,
    colour: record.colour || null,
    finish: record.finish || null,
    thickness: record.thickness || null,
    finish_2: record.finish_2 || null,
    depth: record.depth || null,
    diameter: record.diameter || null,
    height: record.height || null,
    length: record.length || null,
    width: record.width || null,
    notes: record.notes || null,
    // Set default workflow fields
    machine_assignment: null,
    processing_status: 'ready_to_cut',
    completed_processes: [],
    next_process: null,
    imported_at: new Date().toISOString(),
    last_sync: new Date().toISOString(),
  };
}

/**
 * Sync data from MySQL to Supabase
 */
export async function syncReady2CutData(
  options: {
    clearExisting?: boolean;
    limit?: number;
    batchSize?: number;
  } = {}
): Promise<SyncResult> {
  const {
    clearExisting = false,
    limit = 3344,
    batchSize = 100
  } = options;

  const result: SyncResult = {
    success: false,
    recordsImported: 0,
    recordsUpdated: 0,
    recordsFailed: 0,
    errors: [],
    startTime: new Date(),
    endTime: new Date(),
    duration: 0,
  };

  try {
    const supabase = createServerComponentClient({ cookies });
    
    // Test MySQL connection first
    console.log('Testing MySQL connection...');
    const isConnected = await testMySQLConnection();
    if (!isConnected) {
      throw new Error('Failed to connect to MySQL database');
    }
    console.log('MySQL connection successful');

    // Clear existing data if requested
    if (clearExisting) {
      console.log('Clearing existing data...');
      const cleared = await clearExistingData();
      if (!cleared) {
        result.errors.push('Failed to clear existing data');
      }
    }

    // Create sync log entry
    const { data: syncLog, error: syncLogError } = await supabase
      .from('ready2cut_sync_log')
      .insert({
        status: 'running',
        sync_type: clearExisting ? 'full' : 'incremental'
      })
      .select()
      .single();

    if (syncLogError) {
      console.error('Failed to create sync log:', syncLogError);
    }

    // Fetch data from MySQL
    console.log(`Fetching up to ${limit} records from MySQL...`);
    const mysqlRecords = await fetchReady2CutData(limit);
    console.log(`Fetched ${mysqlRecords.length} records from MySQL`);

    // Transform records
    const transformedRecords = mysqlRecords.map(transformRecord);

    // Collect unique values for analysis
    const uniqueMaterials = new Set<string>();
    const uniqueTypes = new Set<string>();
    const uniqueThicknesses = new Set<string>();

    transformedRecords.forEach(record => {
      if (record.material) uniqueMaterials.add(record.material);
      if (record.type) uniqueTypes.add(record.type);
      if (record.thickness) uniqueThicknesses.add(record.thickness);
    });

    result.uniqueMaterials = Array.from(uniqueMaterials).sort();
    result.uniqueTypes = Array.from(uniqueTypes).sort();
    result.uniqueThicknesses = Array.from(uniqueThicknesses).sort();

    // Process in batches for better performance
    console.log(`Processing ${transformedRecords.length} records in batches of ${batchSize}...`);
    
    for (let i = 0; i < transformedRecords.length; i += batchSize) {
      const batch = transformedRecords.slice(i, i + batchSize);
      
      try {
        // Use upsert to handle both inserts and updates
        const { data, error } = await supabase
          .from('ready2cut_parts')
          .upsert(batch, {
            onConflict: 'sheet_id',
            ignoreDuplicates: false
          })
          .select();

        if (error) {
          console.error(`Batch ${i / batchSize + 1} failed:`, error);
          result.errors.push(`Batch ${i / batchSize + 1}: ${error.message}`);
          result.recordsFailed += batch.length;
        } else {
          result.recordsImported += data?.length || 0;
          console.log(`Batch ${i / batchSize + 1} completed: ${data?.length} records`);
        }
      } catch (batchError) {
        console.error(`Batch ${i / batchSize + 1} error:`, batchError);
        result.errors.push(`Batch ${i / batchSize + 1}: ${batchError}`);
        result.recordsFailed += batch.length;
      }
    }

    // Update sync log
    if (syncLog) {
      await supabase
        .from('ready2cut_sync_log')
        .update({
          sync_completed_at: new Date().toISOString(),
          records_imported: result.recordsImported,
          records_updated: result.recordsUpdated,
          records_failed: result.recordsFailed,
          status: result.errors.length === 0 ? 'completed' : 'completed_with_errors',
          error_message: result.errors.length > 0 ? result.errors.join('; ') : null
        })
        .eq('id', syncLog.id);
    }

    result.success = result.recordsImported > 0;
    result.endTime = new Date();
    result.duration = result.endTime.getTime() - result.startTime.getTime();

    console.log('Sync completed:', {
      imported: result.recordsImported,
      failed: result.recordsFailed,
      duration: `${result.duration}ms`,
      uniqueMaterials: result.uniqueMaterials?.length,
      uniqueTypes: result.uniqueTypes?.length,
      uniqueThicknesses: result.uniqueThicknesses?.length
    });

    return result;
  } catch (error) {
    console.error('Sync failed:', error);
    result.errors.push(error instanceof Error ? error.message : String(error));
    result.endTime = new Date();
    result.duration = result.endTime.getTime() - result.startTime.getTime();
    return result;
  } finally {
    // Don't close the pool here as it might be reused
    // await closeMySQLPool();
  }
}

/**
 * Get sync history from the log table
 */
export async function getSyncHistory(limit: number = 10) {
  try {
    const supabase = createServerComponentClient({ cookies });
    
    const { data, error } = await supabase
      .from('ready2cut_sync_log')
      .select('*')
      .order('sync_started_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Failed to fetch sync history:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error fetching sync history:', error);
    return [];
  }
}

/**
 * Analyze data patterns in the imported records
 */
export async function analyzeImportedData() {
  try {
    const supabase = createServerComponentClient({ cookies });
    
    // Fetch all unique values for analysis
    const queries = [
      supabase.from('ready2cut_parts').select('material').not('material', 'is', null),
      supabase.from('ready2cut_parts').select('type').not('type', 'is', null),
      supabase.from('ready2cut_parts').select('colour').not('colour', 'is', null),
      supabase.from('ready2cut_parts').select('finish').not('finish', 'is', null),
      supabase.from('ready2cut_parts').select('thickness').not('thickness', 'is', null),
      supabase.from('ready2cut_parts').select('shape').not('shape', 'is', null),
      supabase.from('ready2cut_parts').select('tags').not('tags', 'is', null),
    ];

    const results = await Promise.all(queries);
    
    const analysis = {
      materials: [...new Set(results[0].data?.map((r: any) => r.material) || [])].sort(),
      types: [...new Set(results[1].data?.map((r: any) => r.type) || [])].sort(),
      colours: [...new Set(results[2].data?.map((r: any) => r.colour) || [])].sort(),
      finishes: [...new Set(results[3].data?.map((r: any) => r.finish) || [])].sort(),
      thicknesses: [...new Set(results[4].data?.map((r: any) => r.thickness) || [])].sort(),
      shapes: [...new Set(results[5].data?.map((r: any) => r.shape) || [])].sort(),
      tags: [...new Set(results[6].data?.map((r: any) => r.tags) || [])].sort(),
    };

    // Count records
    const { count } = await supabase
      .from('ready2cut_parts')
      .select('*', { count: 'exact', head: true });

    return {
      totalRecords: count || 0,
      uniqueValues: analysis,
      summary: {
        materialCount: analysis.materials.length,
        typeCount: analysis.types.length,
        colourCount: analysis.colours.length,
        finishCount: analysis.finishes.length,
        thicknessCount: analysis.thicknesses.length,
        shapeCount: analysis.shapes.length,
        tagCount: analysis.tags.length,
      }
    };
  } catch (error) {
    console.error('Failed to analyze imported data:', error);
    return null;
  }
}