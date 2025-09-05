-- Drop existing table if it exists
DROP TABLE IF EXISTS parts CASCADE;

-- Create parts table with all fields from the app
CREATE TABLE parts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Core part information
  sheet_id TEXT NOT NULL UNIQUE,
  increment_id TEXT,
  cutting_date TEXT,
  order_status TEXT,
  shipping_name TEXT,
  
  -- Material specifications
  material TEXT,
  type TEXT,
  colour TEXT,
  finish TEXT,
  thickness TEXT,
  finish_2 TEXT,
  
  -- Dimensions
  shape TEXT,
  depth DECIMAL,
  diameter DECIMAL,
  height DECIMAL,
  length DECIMAL,
  width DECIMAL,
  
  -- Metadata
  tags TEXT,
  notes TEXT,
  action TEXT,
  status_updated TEXT,
  
  -- Workflow tracking
  machine_assignment TEXT, -- 'saw', 'router', 'laser', or null
  processing_status TEXT DEFAULT 'ready_to_cut',
  completed_processes TEXT[], -- Array of completed process names
  next_process TEXT,
  
  -- User tracking (optional, for later)
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

-- Create indexes for performance
CREATE INDEX idx_parts_sheet_id ON parts(sheet_id);
CREATE INDEX idx_parts_processing_status ON parts(processing_status);
CREATE INDEX idx_parts_machine_assignment ON parts(machine_assignment);
CREATE INDEX idx_parts_order_status ON parts(order_status);
CREATE INDEX idx_parts_material ON parts(material);

-- Enable Row Level Security
ALTER TABLE parts ENABLE ROW LEVEL SECURITY;

-- Create a policy that allows all authenticated users to do everything (for demo)
CREATE POLICY "Allow all for authenticated users" ON parts
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create a policy for anonymous access (for demo purposes)
CREATE POLICY "Allow read for anon" ON parts
  FOR SELECT
  TO anon
  USING (true);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_parts_updated_at BEFORE UPDATE ON parts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();