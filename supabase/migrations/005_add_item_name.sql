-- Add missing item_name column to ready2cut_parts table
ALTER TABLE ready2cut_parts 
ADD COLUMN IF NOT EXISTS item_name TEXT;

COMMENT ON COLUMN ready2cut_parts.item_name IS 'Original item name from Magento sales_order_variant_entity';