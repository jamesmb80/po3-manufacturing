-- Migration: Create Ready2Cut production schema
-- This replaces the test parts table with production-ready structure

-- First, backup and drop existing parts table if it exists
DROP TABLE IF EXISTS parts_backup CASCADE;
CREATE TABLE IF NOT EXISTS parts_backup AS SELECT * FROM parts;
DROP TABLE IF EXISTS parts CASCADE;

-- Create the new ready2cut_parts table matching production data structure
CREATE TABLE ready2cut_parts (
  -- Primary key from Magento
  sheet_id TEXT PRIMARY KEY,
  
  -- Order information
  increment_id TEXT NOT NULL,
  cutting_date TEXT,
  order_status TEXT, -- Magento order status (Processing, In Progress, etc.)
  shipping_name TEXT,
  
  -- Material attributes from Magento EAV
  material TEXT,
  type TEXT,
  colour TEXT,
  finish TEXT,
  thickness TEXT,
  finish_2 TEXT,
  
  -- Shape and dimensions
  shape TEXT DEFAULT 'rectangle',
  depth TEXT,
  diameter TEXT,
  height TEXT,
  length TEXT,
  width TEXT,
  
  -- Process information
  tags TEXT,
  notes TEXT,
  action TEXT DEFAULT 'View',
  status_updated TEXT,
  
  -- Application workflow fields
  machine_assignment TEXT CHECK (machine_assignment IN ('saw', 'router', 'laser', NULL)),
  processing_status TEXT DEFAULT 'ready_to_cut' CHECK (processing_status IN (
    'ready_to_cut',
    'assigned_to_saw',
    'assigned_to_router', 
    'assigned_to_laser',
    'cutting_saw',
    'cutting_router',
    'cutting_laser',
    'parts_to_edge_band',
    'parts_to_lacquer',
    'ready_to_pack',
    'recuts',
    NULL
  )),
  completed_processes TEXT[],
  next_process TEXT,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  imported_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  last_sync TIMESTAMP WITH TIME ZONE
);

-- Create indexes for performance
CREATE INDEX idx_ready2cut_increment_id ON ready2cut_parts(increment_id);
CREATE INDEX idx_ready2cut_cutting_date ON ready2cut_parts(cutting_date);
CREATE INDEX idx_ready2cut_order_status ON ready2cut_parts(order_status);
CREATE INDEX idx_ready2cut_material ON ready2cut_parts(material);
CREATE INDEX idx_ready2cut_processing_status ON ready2cut_parts(processing_status);
CREATE INDEX idx_ready2cut_machine ON ready2cut_parts(machine_assignment);
CREATE INDEX idx_ready2cut_thickness ON ready2cut_parts(thickness);

-- Enable Row Level Security
ALTER TABLE ready2cut_parts ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Allow all authenticated users to read
CREATE POLICY "Allow authenticated users to read ready2cut_parts"
ON ready2cut_parts FOR SELECT
TO authenticated
USING (true);

-- Allow authenticated users to insert (for imports)
CREATE POLICY "Allow authenticated users to insert ready2cut_parts"
ON ready2cut_parts FOR INSERT
TO authenticated
WITH CHECK (true);

-- Allow authenticated users to update (for workflow status)
CREATE POLICY "Allow authenticated users to update ready2cut_parts"
ON ready2cut_parts FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Only admins can delete
CREATE POLICY "Only admins can delete ready2cut_parts"
ON ready2cut_parts FOR DELETE
TO authenticated
USING (
  auth.uid() IN (
    SELECT id FROM auth.users WHERE raw_user_meta_data->>'role' = 'admin'
  )
);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_ready2cut_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for auto-updating updated_at
CREATE TRIGGER update_ready2cut_parts_updated_at
BEFORE UPDATE ON ready2cut_parts
FOR EACH ROW
EXECUTE FUNCTION update_ready2cut_updated_at();

-- Create a view for easier querying with formatted dates
CREATE OR REPLACE VIEW ready2cut_parts_view AS
SELECT 
  *,
  -- Parse cutting_date for sorting (format: "DD Mon YYYY")
  CASE 
    WHEN cutting_date IS NOT NULL AND cutting_date != '' THEN
      TO_DATE(cutting_date, 'DD Mon YYYY')
    ELSE NULL
  END as cutting_date_parsed
FROM ready2cut_parts;

-- Create sync log table to track imports
CREATE TABLE IF NOT EXISTS ready2cut_sync_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sync_started_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  sync_completed_at TIMESTAMP WITH TIME ZONE,
  records_imported INTEGER DEFAULT 0,
  records_updated INTEGER DEFAULT 0,
  records_failed INTEGER DEFAULT 0,
  status TEXT CHECK (status IN ('running', 'completed', 'failed')),
  error_message TEXT,
  sync_type TEXT CHECK (sync_type IN ('full', 'incremental', 'manual'))
);

-- Grant permissions on sync log
ALTER TABLE ready2cut_sync_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to read sync log"
ON ready2cut_sync_log FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow authenticated users to insert sync log"
ON ready2cut_sync_log FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update sync log"
ON ready2cut_sync_log FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Add comment to table for documentation
COMMENT ON TABLE ready2cut_parts IS 'Production Ready2Cut data imported from Magento MySQL database';
COMMENT ON COLUMN ready2cut_parts.sheet_id IS 'Primary key from Magento sales_order_variant_entity';
COMMENT ON COLUMN ready2cut_parts.processing_status IS 'Internal workflow status managed by the application';
COMMENT ON COLUMN ready2cut_parts.order_status IS 'Original status from Magento (mapped from item_status)';