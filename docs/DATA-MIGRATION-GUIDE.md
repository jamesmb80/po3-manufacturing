# Ready2Cut Data Migration Guide

## Overview
This guide documents the migration from test data to production data from the Magento MySQL database, including discovered data patterns and UI enhancements needed to handle the increased complexity.

## Table of Contents
1. [Data Source](#data-source)
2. [Expected Data Patterns](#expected-data-patterns)
3. [Migration Process](#migration-process)
4. [API Endpoints](#api-endpoints)
5. [Data Quality Considerations](#data-quality-considerations)
6. [UI Enhancements Required](#ui-enhancements-required)

## Data Source

### MySQL Connection
- **Database**: `cut-my` (Magento production)
- **Main Table**: `sales_order_variant_entity`
- **EAV Attributes**: Material, Type, Colour, Finish, Thickness, Shape, Dimensions
- **Current Record Count**: ~3,344 records (changes as orders are processed)

### SQL Query Structure
The production query joins multiple EAV attribute tables to construct complete records:
- VARCHAR attributes for material properties
- DECIMAL attributes for dimensions
- Status mapping from Magento to application states

## Expected Data Patterns

### Materials (Expected 15-20+ types)
Based on manufacturing capabilities, expect:

**Wood-based**:
- MDF (Medium Density Fiberboard)
- Plywood (various grades)
- MFC (Melamine Faced Chipboard)
- Chipboard
- OSB (Oriented Strand Board)
- Hardwood (Oak, Beech, Walnut, etc.)
- Softwood (Pine, Cedar, etc.)

**Plastics**:
- Acrylic (Clear, Colored, Frosted)
- Polycarbonate
- Perspex
- PVC
- HDPE (High-Density Polyethylene)
- Nylon

**Metals** (if applicable):
- Aluminium sheets
- Steel plates
- Brass
- Copper

**Other**:
- Glass
- Mirror
- Foam boards
- Rubber sheets

### Types
Expected product type variations:
- Sheet Material
- Board
- Panel
- Custom Cut
- Standard Size
- Bespoke

### Finishes
Expected finish options:
- Raw/Unfinished
- Sanded
- Primed
- Painted (various colors)
- Varnished
- Lacquered
- Laminated
- Veneer (various wood types)
- Melamine (various patterns/colors)
- High Gloss
- Matt
- Satin

### Thickness Variations
Expected formats in production data:
- Numeric only: "18"
- With units: "18mm", "18 mm"
- Decimal values: "18.5", "18.5mm"
- Range: 3mm to 50mm+ for various materials

### Shapes
- rectangle (default)
- square
- circle
- semi_circle
- oval
- triangle
- hexagon
- octagon
- custom

### Dimension Data
Dimensions may appear in various formats:
- Pure numeric: "1000"
- With units: "1000mm", "100cm", "1m"
- Decimals: "1000.5"
- Null values for non-applicable shapes

## Migration Process

### Step 1: Environment Setup
```bash
# Add to .env.local
MYSQL_HOST=your-host
MYSQL_PORT=3306
MYSQL_USER=your-user
MYSQL_PASSWORD=your-password
MYSQL_DATABASE=cut-my
```

### Step 2: Run Database Migration
```sql
-- Execute the migration script in Supabase
-- File: supabase/migrations/002_ready2cut_schema.sql
```

### Step 3: Initial Data Sync
```bash
# Test MySQL connection
curl -X GET http://localhost:3000/api/sync?action=test

# Run full sync (clears existing data)
curl -X POST http://localhost:3000/api/sync \
  -H "Content-Type: application/json" \
  -d '{"clearExisting": true, "limit": 3344}'

# Run incremental sync (updates only)
curl -X POST http://localhost:3000/api/sync \
  -H "Content-Type: application/json" \
  -d '{"clearExisting": false}'
```

### Step 4: Analyze Imported Data
```bash
# Basic analysis
curl -X GET http://localhost:3000/api/analyze

# Detailed analysis with counts
curl -X GET http://localhost:3000/api/analyze?detailed=true
```

## API Endpoints

### Sync Endpoints

#### POST /api/sync
Trigger data synchronization from MySQL to Supabase.

**Request Body**:
```json
{
  "clearExisting": false,  // Clear all data before import
  "limit": 3344,           // Number of records to import
  "batchSize": 100         // Batch size for processing
}
```

**Response**:
```json
{
  "success": true,
  "message": "Successfully synced 3344 records",
  "details": {
    "recordsImported": 3344,
    "recordsUpdated": 0,
    "recordsFailed": 0,
    "duration": "15000ms",
    "discoveries": {
      "materials": ["MDF", "Plywood", "Acrylic", ...],
      "types": ["Sheet", "Board", ...],
      "thicknesses": ["3mm", "6mm", "9mm", ...]
    }
  }
}
```

#### GET /api/sync
Get sync status and history.

**Query Parameters**:
- `action=test`: Test MySQL connection
- `action=analyze`: Analyze imported data
- `limit=10`: Number of history records

#### DELETE /api/sync
Clear all synced data from Supabase.

### Analysis Endpoints

#### GET /api/analyze
Comprehensive analysis of imported data.

**Query Parameters**:
- `detailed=true`: Include value counts for each unique value

**Response Structure**:
```json
{
  "success": true,
  "data": {
    "summary": {
      "totalRecords": 3344,
      "uniqueCounts": {
        "materials": 18,
        "types": 6,
        "colours": 25,
        "finishes": 12,
        "thicknesses": 15,
        "shapes": 5
      }
    },
    "uniqueValues": {
      "materials": ["MDF", "Plywood", ...],
      "types": [...],
      // etc.
    },
    "dimensions": {
      "formats": {
        "length": ["numeric", "with_units"],
        "width": ["numeric", "decimal"]
      },
      "nullPercentage": {
        "diameter": "95.2"  // Most rectangles don't have diameter
      }
    },
    "dataQuality": {
      "nullValues": {
        "colour": 1523,
        "finish": 892
      },
      "inconsistentFormats": ["thickness"],
      "missingCriticalData": 12
    },
    "recommendations": [
      "Normalize thickness values to consistent format",
      "Add search functionality to material filter",
      "Handle null values in UI appropriately"
    ]
  }
}
```

## Data Quality Considerations

### Common Issues to Handle

1. **Null Values**:
   - Many optional fields (colour, finish, some dimensions)
   - Handle gracefully in UI with "N/A" or "-"

2. **Inconsistent Formats**:
   - Thickness: "18", "18mm", "18 mm"
   - Normalize on import or display

3. **Large Value Lists**:
   - Materials: 15-20+ options
   - Colours: 20-30+ options
   - Need searchable dropdowns

4. **Dimension Logic**:
   - Rectangles: length, width
   - Circles: diameter
   - Some shapes: all dimensions null

### Data Validation Rules

```typescript
// Thickness: 1-100mm
// Dimensions: 1-5000mm
// Required: sheet_id, increment_id, material
// Date format: "DD Mon YYYY"
```

## UI Enhancements Required

### 1. Column Visibility Management
- [ ] Toggle columns on/off
- [ ] Save user preferences
- [ ] Default visible columns configuration
- [ ] Responsive column priorities

### 2. Enhanced Filtering
- [ ] Multi-select for all categorical fields
- [ ] Search within filter options
- [ ] Filter count badges
- [ ] Clear individual filters
- [ ] Save filter presets

### 3. Material Grouping
- [ ] Group by category (Wood, Plastic, Metal, Other)
- [ ] Expandable categories
- [ ] Quick select common materials
- [ ] Visual material indicators

### 4. Data Display
- [ ] Format thickness consistently
- [ ] Handle null values gracefully
- [ ] Shape icons/indicators
- [ ] Color swatches for colours
- [ ] Finish texture indicators

### 5. Performance
- [ ] Virtual scrolling for 3000+ records
- [ ] Lazy loading filters
- [ ] Debounced search
- [ ] Optimistic UI updates

## Troubleshooting

### Connection Issues
```bash
# Test MySQL connection
curl -X GET http://localhost:3000/api/sync?action=test

# Check environment variables
echo $MYSQL_HOST
```

### Data Issues
- Duplicate records: Check sheet_id uniqueness
- Missing data: Verify MySQL query joins
- Wrong counts: Check WHERE clause filters

### Performance Issues
- Slow sync: Adjust batch size
- UI lag: Implement virtual scrolling
- Filter lag: Add debouncing

## Next Steps

1. **Immediate**:
   - Configure MySQL connection
   - Run initial data sync
   - Analyze imported data

2. **Short-term**:
   - Implement column visibility
   - Enhance filters for large lists
   - Add data normalization

3. **Long-term**:
   - Real-time sync with MySQL
   - Advanced analytics dashboard
   - Machine learning for predictions

## Support

For issues or questions:
- Check sync logs in Supabase
- Review `/api/sync` response for errors
- Analyze data quality with `/api/analyze?detailed=true`