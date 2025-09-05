import mysql from 'mysql2/promise';

// MySQL connection configuration
interface MySQLConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
  connectionLimit?: number;
  enableKeepAlive?: boolean;
  keepAliveInitialDelay?: number;
}

// Connection pool for efficient connection management
let pool: mysql.Pool | null = null;

/**
 * Initialize MySQL connection pool
 * Call this once when starting the application
 */
export async function initializeMySQLPool(): Promise<void> {
  if (pool) {
    console.log('MySQL pool already initialized');
    return;
  }

  const config: MySQLConfig = {
    host: process.env.MYSQL_HOST || 'localhost',
    port: parseInt(process.env.MYSQL_PORT || '3306'),
    user: process.env.MYSQL_USER || '',
    password: process.env.MYSQL_PASSWORD || '',
    database: process.env.MYSQL_DATABASE || 'cut-my',
    connectionLimit: 10,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0,
  };

  try {
    pool = mysql.createPool({
      ...config,
      waitForConnections: true,
      queueLimit: 0,
      namedPlaceholders: false, // Use positional parameters
      dateStrings: true, // Return dates as strings to match SQL output
      timezone: '+00:00', // Use UTC
    });

    // Test the connection
    const connection = await pool.getConnection();
    console.log('MySQL connection pool initialized successfully');
    connection.release();
  } catch (error) {
    console.error('Failed to initialize MySQL pool:', error);
    throw error;
  }
}

/**
 * Get a connection from the pool
 */
export async function getMySQLConnection(): Promise<mysql.PoolConnection> {
  if (!pool) {
    await initializeMySQLPool();
  }
  return pool!.getConnection();
}

/**
 * Execute a query with automatic connection management
 */
export async function executeQuery<T = any>(
  sql: string,
  params?: any[]
): Promise<T[]> {
  let connection: mysql.PoolConnection | null = null;
  
  try {
    connection = await getMySQLConnection();
    const [rows] = await connection.execute(sql, params);
    return rows as T[];
  } catch (error) {
    console.error('Query execution failed:', error);
    throw error;
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

/**
 * Execute the Ready2Cut production query
 */
export async function fetchReady2CutData(limit: number = 3344): Promise<Ready2CutRecord[]> {
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
      
      -- Material attributes from EAV system - Try different attribute IDs
      COALESCE(material_attr.value, material_text.value, sove.item_name) as material,
      type_attr.value as type,
      colour_attr.value as colour,
      finish_attr.value as finish,
      thickness_attr.value as thickness,
      
      NULL as finish_2, -- Additional finish field if needed
      
      -- Shape information
      COALESCE(shape_attr.value, 'rectangle') as shape,
      
      -- Dimensions - handling both varchar and decimal storage
      COALESCE(depth_varchar.value, CAST(depth_decimal.value AS CHAR)) as depth,
      COALESCE(diameter_varchar.value, CAST(diameter_decimal.value AS CHAR)) as diameter,
      COALESCE(height_varchar.value, CAST(height_decimal.value AS CHAR)) as height,
      COALESCE(length_varchar.value, CAST(length_decimal.value AS CHAR)) as length,
      COALESCE(width_varchar.value, CAST(width_decimal.value AS CHAR)) as width,
      
      -- Process information
      COALESCE(sove.cutting_tag, 'Straight') as tags,
      sove.notes,
      'View' as action,
      DATE_FORMAT(COALESCE(sove.item_status_updated_at, sove.updated_at), '%d %b %Y %H:%i:%s') as status_updated
      
    FROM sales_order_variant_entity sove
    JOIN sales_order so ON sove.order_id = so.entity_id
    
    -- Material and Type Attributes (VARCHAR)
    LEFT JOIN sales_order_variant_entity_varchar material_attr 
      ON sove.entity_id = material_attr.entity_id AND material_attr.attribute_id = 183
    LEFT JOIN sales_order_variant_entity_text material_text 
      ON sove.entity_id = material_text.entity_id AND material_text.attribute_id = 183
    LEFT JOIN sales_order_variant_entity_varchar type_attr 
      ON sove.entity_id = type_attr.entity_id AND type_attr.attribute_id = 184
    LEFT JOIN sales_order_variant_entity_varchar colour_attr 
      ON sove.entity_id = colour_attr.entity_id AND colour_attr.attribute_id = 185
    LEFT JOIN sales_order_variant_entity_varchar finish_attr 
      ON sove.entity_id = finish_attr.entity_id AND finish_attr.attribute_id = 190
    LEFT JOIN sales_order_variant_entity_varchar thickness_attr 
      ON sove.entity_id = thickness_attr.entity_id AND thickness_attr.attribute_id = 189
    LEFT JOIN sales_order_variant_entity_varchar shape_attr 
      ON sove.entity_id = shape_attr.entity_id AND shape_attr.attribute_id = 159
    
    -- Dimension Attributes (VARCHAR versions)
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
    
    -- Dimension Attributes (DECIMAL versions)
    LEFT JOIN sales_order_variant_entity_decimal depth_decimal 
      ON sove.entity_id = depth_decimal.entity_id AND depth_decimal.attribute_id = 258
    LEFT JOIN sales_order_variant_entity_decimal diameter_decimal 
      ON sove.entity_id = diameter_decimal.entity_id AND diameter_decimal.attribute_id = 166
    LEFT JOIN sales_order_variant_entity_decimal height_decimal 
      ON sove.entity_id = height_decimal.entity_id AND height_decimal.attribute_id = 167
    LEFT JOIN sales_order_variant_entity_decimal length_decimal 
      ON sove.entity_id = length_decimal.entity_id AND length_decimal.attribute_id = 261
    LEFT JOIN sales_order_variant_entity_decimal width_decimal 
      ON sove.entity_id = width_decimal.entity_id AND width_decimal.attribute_id = 168
    
    WHERE 
      sove.item_status = 'cutting_ready'
      AND so.status = 'processing'
    
    ORDER BY sove.cutting_date, sove.entity_id
    LIMIT ${parseInt(limit.toString())}
  `;

  // Execute without parameters to avoid binding issues
  return executeQuery<Ready2CutRecord>(sql, []);
}

/**
 * Test MySQL connection
 */
export async function testMySQLConnection(): Promise<boolean> {
  try {
    const connection = await getMySQLConnection();
    await connection.ping();
    connection.release();
    return true;
  } catch (error) {
    console.error('MySQL connection test failed:', error);
    return false;
  }
}

/**
 * Close the MySQL connection pool
 */
export async function closeMySQLPool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
    console.log('MySQL pool closed');
  }
}

// Type definition for Ready2Cut records from MySQL
export interface Ready2CutRecord {
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
}

// Export error handling utilities
export class MySQLConnectionError extends Error {
  constructor(message: string, public readonly originalError?: any) {
    super(message);
    this.name = 'MySQLConnectionError';
  }
}

export class MySQLQueryError extends Error {
  constructor(message: string, public readonly query?: string, public readonly originalError?: any) {
    super(message);
    this.name = 'MySQLQueryError';
  }
}