# Ready2Cut EAV Migration Guide

## Overview

This guide covers the migration from test data to production data using the proper Magento EAV (Entity-Attribute-Value) structure. The new approach eliminates parsing and fetches material data directly from EAV attributes.

## ✅ Key Improvements

### 1. Direct EAV Attribute Access
- **Materials**: Attribute ID 183 (direct from database)
- **Types**: Attribute ID 184 (no more parsing)
- **Colours**: Attribute ID 185 
- **Finishes**: Attribute ID 190
- **Thickness**: Attribute ID 189
- **Shapes**: Attribute ID 159

### 2. Smart Dimension Handling
- Handles both VARCHAR and DECIMAL storage
- Uses COALESCE to get the best available value
- Properly converts DECIMAL to CHAR when needed

### 3. Production-Ready Filtering
```sql
WHERE
    sales_order_grid.status IN('processing', 'progress', 'holded')  -- Active orders only
    AND e.item_status = 'cutting_ready'                             -- Ready to cut
    AND e.is_sample = ''                                            -- No samples
    AND ((e.kit_type IS NULL) OR (e.kit_type IN('slatted')))      -- Business logic
```

### 4. Enhanced Status Mapping
```sql
CASE
    WHEN e.item_status = 'cutting_ready' THEN 'Processing'
    WHEN e.item_status IN ('cutting_csv', 'csv_cutting', ...) THEN 'In_Progress'
    WHEN e.item_status IN ('assigned_laser', ...) THEN 'Processing'
    ELSE e.item_status
END
```

## 🚀 Migration Steps

### Step 1: Update Supabase Schema
Run both migration files in your Supabase dashboard:

1. **Base Schema**: `supabase/migrations/002_ready2cut_schema.sql`
2. **EAV Fields**: `supabase/migrations/004_add_eav_fields.sql`

### Step 2: Import Production Data
Use the new EAV-aware import script:

```bash
node scripts/import-with-eav.js
```

This script will:
- Connect to your MySQL database
- Execute the EAV query with proper joins
- Transform data with minimal processing (no parsing!)
- Import to Supabase in batches
- Show detailed statistics

### Step 3: Verify Data
The import will show:
- Material distribution (from actual EAV attributes)
- Type breakdown
- Thickness varieties
- Total record count

## 📊 Data Structure

### Original Fields (Enhanced)
```typescript
export type Part = {
  // Core identification
  sheet_id: string
  increment_id: string
  cutting_date: string
  
  // Enhanced status handling
  order_status: string  // Mapped from item_status
  processing_status: string  // Internal workflow
  
  // Direct EAV material data
  material: string
  type: string | null
  colour: string | null
  finish: string | null
  thickness: string | null
  
  // Customer information
  shipping_name: string
  billing_name?: string | null
  
  // Dimensions (string format)
  shape: string
  length: string | null
  width: string | null
  height: string | null
  depth: string | null
  diameter: string | null
  
  // NEW EAV Fields:
  product_type?: string | null
  kit_type?: string | null
  cutter_id?: string | null
  delivery_date?: string | null
  recut_count?: number
  oversize?: boolean
  
  // ... and more
}
```

### New Column Categories

The column visibility system now includes:

1. **Material** - Direct from EAV attributes
2. **Product** - Product type, kit information
3. **Production** - Cutter tracking, recuts, oversize flags
4. **Scheduling** - Delivery dates, order creation
5. **Advanced** - Raw statuses, debugging info

## 🔧 Configuration

### Column Visibility
The new fields are organized by category:

- **Material**: Material, type, colour, finish, thickness
- **Product**: Product type, kit type, order/kit parts  
- **Production**: Cutter ID, cut date, recuts, oversize
- **Scheduling**: Delivery date, order created
- **Advanced**: Raw statuses, original item names

### Filtering Enhancement
All EAV fields are now filterable:
- Material dropdown with actual values
- Type selection from database
- Thickness filtering with proper values
- Colour and finish options

## 📈 Benefits

### 1. Data Accuracy
- ✅ No more parsing errors
- ✅ Direct from authoritative source
- ✅ Proper data types
- ✅ NULL handling

### 2. Performance
- ✅ Single optimized query
- ✅ Proper indexing on EAV attributes
- ✅ Efficient batch processing
- ✅ Reduced transformation overhead

### 3. Completeness  
- ✅ All EAV attributes available
- ✅ Order information included
- ✅ Production tracking data
- ✅ Business logic fields

### 4. Maintainability
- ✅ Schema matches Magento exactly
- ✅ Easy to add new attributes
- ✅ Clear field documentation
- ✅ Organized column structure

## 🐛 Troubleshooting

### Common Issues

1. **Missing EAV Attributes**
   - Verify attribute IDs match your Magento instance
   - Check if attributes exist in `eav_attribute` table

2. **Empty Material Data**
   - Ensure EAV joins are working
   - Check attribute_id values for your system

3. **Dimension Inconsistencies**
   - The query handles both VARCHAR and DECIMAL storage
   - COALESCE selects the best available value

### Verification Queries

**Check Attribute IDs:**
```sql
SELECT attribute_id, attribute_code, frontend_label 
FROM eav_attribute 
WHERE entity_type_id = (SELECT entity_type_id FROM eav_entity_type WHERE entity_type_code = 'ready2cut_variant');
```

**Test EAV Joins:**
```sql
SELECT e.entity_id, material_attr.value as material
FROM sales_order_variant_entity e
LEFT JOIN sales_order_variant_entity_varchar material_attr ON e.entity_id = material_attr.entity_id AND material_attr.attribute_id = 183
LIMIT 10;
```

## 📞 Support

If you encounter issues:
1. Check the attribute IDs match your Magento setup
2. Verify EAV table structure
3. Run test queries to validate joins
4. Check Supabase schema is properly created

The EAV approach is now production-ready and provides complete, accurate data from your Magento system!