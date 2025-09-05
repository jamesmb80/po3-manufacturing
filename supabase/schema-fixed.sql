-- Create parts table
CREATE TABLE parts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  
  -- Part information
  order_number TEXT NOT NULL,
  part_number TEXT NOT NULL UNIQUE,
  quantity INTEGER NOT NULL DEFAULT 1,
  material TEXT,
  thickness DECIMAL(10,2),
  finish TEXT,
  notes TEXT,
  
  -- Workflow states
  cutting_completed BOOLEAN DEFAULT FALSE,
  cutting_completed_at TIMESTAMP WITH TIME ZONE,
  cutting_completed_by UUID REFERENCES auth.users(id),
  
  edging_completed BOOLEAN DEFAULT FALSE,
  edging_completed_at TIMESTAMP WITH TIME ZONE,
  edging_completed_by UUID REFERENCES auth.users(id),
  
  grooving_completed BOOLEAN DEFAULT FALSE,
  grooving_completed_at TIMESTAMP WITH TIME ZONE,
  grooving_completed_by UUID REFERENCES auth.users(id)
);

-- Create indexes separately
CREATE INDEX idx_parts_order_number ON parts(order_number);
CREATE INDEX idx_parts_status ON parts(cutting_completed, edging_completed, grooving_completed);

-- Create RLS policies
ALTER TABLE parts ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read parts
CREATE POLICY "Public parts are viewable by everyone" 
ON parts FOR SELECT 
TO authenticated 
USING (true);

-- Policy: Authenticated users can insert parts
CREATE POLICY "Authenticated users can insert parts" 
ON parts FOR INSERT 
TO authenticated 
WITH CHECK (true);

-- Policy: Authenticated users can update parts
CREATE POLICY "Authenticated users can update parts" 
ON parts FOR UPDATE 
TO authenticated 
USING (true)
WITH CHECK (true);

-- Policy: Only admins can delete parts (we'll create admin check later)
CREATE POLICY "Only admins can delete parts" 
ON parts FOR DELETE 
TO authenticated 
USING (
  auth.uid() IN (
    SELECT id FROM auth.users WHERE raw_user_meta_data->>'role' = 'admin'
  )
);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to auto-update updated_at
CREATE TRIGGER update_parts_updated_at BEFORE UPDATE ON parts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();