-- Add additional fields from EAV query to ready2cut_parts table
-- These fields provide valuable tracking and business logic information

-- Add product and kit information
ALTER TABLE ready2cut_parts 
ADD COLUMN IF NOT EXISTS product_type TEXT,
ADD COLUMN IF NOT EXISTS kit_type TEXT,
ADD COLUMN IF NOT EXISTS is_sample BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS order_part TEXT,
ADD COLUMN IF NOT EXISTS kit_part TEXT;

-- Add cutter tracking fields
ALTER TABLE ready2cut_parts 
ADD COLUMN IF NOT EXISTS cutter_id TEXT,
ADD COLUMN IF NOT EXISTS cutter_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS further_id TEXT,
ADD COLUMN IF NOT EXISTS further_date TIMESTAMP WITH TIME ZONE;

-- Add delivery and processing fields
ALTER TABLE ready2cut_parts 
ADD COLUMN IF NOT EXISTS delivery_date DATE,
ADD COLUMN IF NOT EXISTS oversize BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS recut_count INTEGER DEFAULT 0;

-- Add order information from sales_order_grid
ALTER TABLE ready2cut_parts 
ADD COLUMN IF NOT EXISTS billing_name TEXT,
ADD COLUMN IF NOT EXISTS raw_order_status TEXT,
ADD COLUMN IF NOT EXISTS order_shipping TEXT,
ADD COLUMN IF NOT EXISTS order_created TIMESTAMP WITH TIME ZONE;

-- Create indexes for new fields that might be queried frequently
CREATE INDEX IF NOT EXISTS idx_ready2cut_product_type ON ready2cut_parts(product_type);
CREATE INDEX IF NOT EXISTS idx_ready2cut_kit_type ON ready2cut_parts(kit_type);
CREATE INDEX IF NOT EXISTS idx_ready2cut_cutter_id ON ready2cut_parts(cutter_id);
CREATE INDEX IF NOT EXISTS idx_ready2cut_delivery_date ON ready2cut_parts(delivery_date);
CREATE INDEX IF NOT EXISTS idx_ready2cut_recut_count ON ready2cut_parts(recut_count);

-- Add comment documentation
COMMENT ON COLUMN ready2cut_parts.product_type IS 'Product type from Magento';
COMMENT ON COLUMN ready2cut_parts.kit_type IS 'Kit type for grouped products';
COMMENT ON COLUMN ready2cut_parts.cutter_id IS 'ID of the cutter who processed this part';
COMMENT ON COLUMN ready2cut_parts.cutter_date IS 'Date when part was cut';
COMMENT ON COLUMN ready2cut_parts.delivery_date IS 'Scheduled delivery date';
COMMENT ON COLUMN ready2cut_parts.recut_count IS 'Number of times this part has been recut';
COMMENT ON COLUMN ready2cut_parts.oversize IS 'Flag for oversized parts requiring special handling';