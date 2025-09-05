import mysql from 'mysql2/promise';
import { parseMaterialFromItemName, extractShape, parseTags } from './material-parser';

// Connection pool
let pool: mysql.Pool | null = null;

/**
 * Initialize MySQL connection pool for Ready2Cut
 */
export async function initializePool(): Promise<void> {
  if (pool) return;

  pool = mysql.createPool({
    host: process.env.MYSQL_HOST,
    port: parseInt(process.env.MYSQL_PORT || '3306'),
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
    connectionLimit: 10,
    waitForConnections: true,
    queueLimit: 0,
    dateStrings: true,
    timezone: '+00:00',
  });
}

/**
 * Fetch Ready2Cut data with material parsing
 */
export async function fetchReady2CutDataWithParsing(limit?: number) {
  await initializePool();
  
  const sql = `
    SELECT 
      sove.entity_id as sheet_id,
      so.increment_id,
      DATE_FORMAT(sove.cutting_date, '%d %b %Y') as cutting_date,
      
      -- Map item status to user-friendly format
      CASE 
        WHEN sove.item_status = 'cutting_ready' THEN 'Processing'
        WHEN sove.item_status IN ('cutting_csv', 'csv_cutting', 'cutting_laser', 
          'cutting_wallsaw', 'cutting_holzher', 'cutting_multicam', 
          'cutting_teccam', 'cutting_joinery') THEN 'In Progress'
        WHEN sove.item_status IN ('assigned_laser', 'assigned_wallsaw', 
          'assigned_holzher', 'assigned_csv', 'assigned_teccam', 
          'assigned_multicam', 'assigned_stock', 'assigned_joinery') THEN 'Processing'
        ELSE sove.item_status
      END as order_status,
      
      -- Customer name from order
      CONCAT(COALESCE(so.customer_firstname, ''), ' ', COALESCE(so.customer_lastname, '')) as shipping_name,
      
      -- Item name contains material info
      sove.item_name,
      
      -- Shape information  
      COALESCE(shape_attr.value, 'rectangle') as shape,
      
      -- Dimensions from VARCHAR attributes
      depth_varchar.value as depth,
      diameter_varchar.value as diameter,
      height_varchar.value as height,
      length_varchar.value as length,
      width_varchar.value as width,
      
      -- Process information
      sove.cutting_tag,
      sove.notes,
      'View' as action,
      DATE_FORMAT(COALESCE(sove.item_status_updated_at, sove.updated_at), '%d %b %Y %H:%i:%s') as status_updated
      
    FROM sales_order_variant_entity sove
    JOIN sales_order so ON sove.order_id = so.entity_id
    
    -- Shape attribute
    LEFT JOIN sales_order_variant_entity_varchar shape_attr 
      ON sove.entity_id = shape_attr.entity_id AND shape_attr.attribute_id = 159
    
    -- Dimension Attributes (VARCHAR only)
    LEFT JOIN sales_order_variant_entity_varchar depth_varchar 
      ON sove.entity_id = depth_varchar.entity_id AND depth_varchar.attribute_id = 258
    LEFT JOIN sales_order_variant_entity_varchar diameter_varchar 
      ON sove.entity_id = diameter_varchar.entity_id AND diameter_varchar.attribute_id = 166
    LEFT JOIN sales_order_variant_entity_varchar height_varchar 
      ON sove.entity_id = height_varchar.entity_id AND height_varchar.attribute_id = 167
    LEFT JOIN sales_order_variant_entity_varchar length_varchar 
      ON sove.entity_id = length_varchar.entity_id AND length_varchar.attribute_id = 261
    LEFT JOIN sales_order_variant_entity_varchar width_varchar 
      ON sove.entity_id = width_varchar.entity_id AND width_varchar.attribute_id = 168
    
    WHERE 
      sove.item_status = 'cutting_ready'
      AND so.status = 'processing'
    
    ORDER BY sove.cutting_date, sove.entity_id
    ${limit ? 'LIMIT ?' : ''}
  `;

  const [rows] = limit 
    ? await pool!.execute(sql, [limit])
    : await pool!.execute(sql);

  // Parse materials from item_name and transform the data
  const transformedRows = (rows as any[]).map(row => {
    const parsed = parseMaterialFromItemName(row.item_name);
    const shape = extractShape(row.item_name, row.shape);
    const tags = parseTags(row.cutting_tag);
    
    return {
      sheet_id: row.sheet_id,
      increment_id: row.increment_id,
      cutting_date: row.cutting_date,
      order_status: row.order_status,
      shipping_name: row.shipping_name,
      
      // Parsed material data
      material: parsed.material,
      type: parsed.type,
      colour: parsed.colour,
      finish: parsed.finish,
      thickness: parsed.thickness,
      finish_2: null, // Can be used for secondary finish info
      
      // Shape and dimensions
      shape: shape,
      depth: row.depth,
      diameter: row.diameter,
      height: row.height,
      length: row.length,
      width: row.width,
      
      // Process info
      tags: tags,
      notes: row.notes,
      action: row.action,
      status_updated: row.status_updated,
      
      // Keep original item_name for reference
      item_name: row.item_name
    };
  });

  return transformedRows;
}

/**
 * Get count of Ready2Cut records
 */
export async function getReady2CutCount(): Promise<number> {
  await initializePool();
  
  const sql = `
    SELECT COUNT(*) as count
    FROM sales_order_variant_entity sove
    JOIN sales_order so ON sove.order_id = so.entity_id
    WHERE 
      sove.item_status = 'cutting_ready'
      AND so.status = 'processing'
  `;

  const [result] = await pool!.execute(sql) as any;
  return result[0].count;
}

/**
 * Close the connection pool
 */
export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}