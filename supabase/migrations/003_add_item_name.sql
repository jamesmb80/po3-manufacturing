-- Add item_name column to ready2cut_parts if it doesn't exist
ALTER TABLE ready2cut_parts 
ADD COLUMN IF NOT EXISTS item_name TEXT;