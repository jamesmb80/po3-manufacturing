# Component Architecture Guide

This document explains the key components and their relationships in the PO3 Manufacturing Control System.

## Overview

The system uses a modular React component architecture with TypeScript, focusing on:
- **Separation of concerns** - Each component has a single responsibility
- **Reusability** - Components can be used in multiple contexts
- **Type safety** - Full TypeScript coverage with proper interfaces
- **Data flow** - Unidirectional data flow with clear prop interfaces

## Core Components

### FilterPanel Component

**Location**: `/components/filter-panel.tsx`

**Purpose**: Dynamic filtering interface that adapts to visible columns

**Key Features**:
- **Column Visibility Integration**: Automatically shows/hides filter sections based on visible table columns
- **Accordion Interface**: Collapsible sections for better UX
- **Real-time Filtering**: Instant filter application with live preview
- **Backwards Compatibility**: Works with or without columnConfig

**Props Interface**:
```typescript
interface FilterPanelProps {
  filters: FilterState
  setFilters: (filters: FilterState) => void
  allParts: Part[]
  availableOptions?: AvailableOptions
  columnConfig?: ColumnConfig[]  // Optional - enables dynamic behavior
}
```

**Column Visibility Mapping**:
- `material` column → Material filter section
- `type` column → Type filter section  
- `thickness` column → Thickness filter section
- `tags` column → Tags filter section
- `order_status` column → Order Status filter section
- `cutting_date` column → Cutting Date filter section

**Implementation Details**:
```typescript
// Helper function to check column visibility
const isColumnVisible = (columnId: string) => {
  if (!columnConfig) return true // Fallback: show all filters
  const column = columnConfig.find(col => col.id === columnId)
  return column ? column.visible : true
}

// Conditional rendering pattern
{isColumnVisible('material') && (
  <MaterialFilterSection />
)}
```

### ColumnVisibility Component

**Location**: `/components/column-visibility.tsx`

**Purpose**: User interface for showing/hiding table columns

**Key Features**:
- **Persistent Settings**: Saves preferences to localStorage
- **Category Grouping**: Organizes columns by logical categories
- **Bulk Actions**: Show/hide entire categories at once
- **Required Columns**: Some columns cannot be hidden

**Interface**:
```typescript
export interface ColumnConfig {
  id: string           // Column identifier (matches database fields)
  label: string        // Display name for users
  visible: boolean     // Current visibility state
  required?: boolean   // Cannot be hidden if true
  category?: string    // Grouping category
}
```

**Default Columns**: Defined in `DEFAULT_COLUMNS` constant with 30+ fields organized into 7 categories:
- **Core**: sheet_id, increment_id, cutting_date (required fields)
- **Materials**: material, type, colour, finish, thickness, finish_2
- **Dimensions**: shape, depth, diameter, height, length, width
- **Processing**: machine_assignment, processing_status, completed_processes, next_process
- **Workflow**: tags, notes, action, status_updated
- **Order Info**: order_status, shipping_name, billing_name, order_created, order_shipping
- **Extended**: All EAV fields like product_type, kit_type, cutter_id, etc.

### PartsTable Component

**Location**: `/components/parts-table.tsx`

**Purpose**: Main data table with workflow actions

**Key Features**:
- **Dynamic Columns**: Respects column visibility settings
- **Bulk Actions**: Multi-select for workflow operations
- **Sorting & Pagination**: Full table functionality
- **Action Buttons**: Process Complete, Reject, Assign Machine

## Data Flow Architecture

### 1. State Management
```typescript
// Main page state
const [columnConfig, setColumnConfig] = useState<ColumnConfig[]>(DEFAULT_COLUMNS)
const [filters, setFilters] = useState<FilterState>({...})
const [parts, setParts] = useState<Part[]>([])
```

### 2. Component Communication
```typescript
// Parent passes state down to children
<FilterPanel
  columnConfig={columnConfig}        // Enables dynamic filtering
  filters={filters}
  setFilters={setFilters}
  allParts={parts}
/>

<ColumnVisibility
  columns={columnConfig}
  onVisibilityChange={setColumnConfig}  // Updates parent state
/>

<PartsTable
  columns={columnConfig}             // Controls visible columns
  data={filteredParts}
/>
```

### 3. Integration Points

**FilterPanel ↔ ColumnVisibility Integration**:
1. User toggles column visibility in ColumnVisibility component
2. `onVisibilityChange` callback updates parent `columnConfig` state
3. Updated `columnConfig` passed to FilterPanel as prop
4. FilterPanel re-renders with `isColumnVisible()` checks
5. Filter sections show/hide based on column visibility

**Filter ↔ Table Integration**:
1. User changes filters in FilterPanel
2. `setFilters` callback updates parent filter state
3. Parent computes `filteredParts` based on current filters
4. Filtered data passed to PartsTable
5. Table displays only matching records

## Development Patterns

### Adding New Filter Types

1. **Add to FilterState interface**:
```typescript
interface FilterState {
  // existing filters...
  newField: string[]  // or appropriate type
}
```

2. **Add column visibility check**:
```typescript
{isColumnVisible('new_field') && (
  <NewFieldFilterSection />
)}
```

3. **Implement filter logic**:
```typescript
const handleNewFieldChange = (value: string) => {
  const newValues = filters.newField.includes(value)
    ? filters.newField.filter(v => v !== value)
    : [...filters.newField, value]
  setFilters({ ...filters, newField: newValues })
}
```

### Column Configuration Best Practices

1. **Use descriptive IDs**: Match database field names exactly
2. **Provide clear labels**: User-friendly display names
3. **Set appropriate categories**: Group related fields together
4. **Mark required fields**: Core fields that shouldn't be hidden

```typescript
{
  id: 'material',           // Matches database field
  label: 'Material Type',   // User-friendly name
  visible: true,            // Default visibility
  category: 'Materials',    // Logical grouping
  required: false           // Can be hidden
}
```

### TypeScript Integration

**Benefits**:
- **Compile-time safety**: Catch errors before runtime
- **IntelliSense**: Auto-completion and documentation
- **Refactoring support**: Safe renaming and restructuring
- **Interface contracts**: Clear component APIs

**Key Interfaces**:
- `ColumnConfig` - Column configuration structure
- `FilterState` - Filter state shape
- `Part` - Database record type
- `FilterPanelProps` - Component prop interface

## Testing Considerations

### Component Testing
- **Unit tests**: Individual component behavior
- **Integration tests**: Component interactions
- **Visual tests**: UI rendering correctness

### State Testing
- **Filter logic**: Verify filtering works correctly
- **Column visibility**: Test show/hide functionality
- **Data flow**: Ensure proper parent-child communication

## Performance Optimization

### Memoization
```typescript
// Expensive calculations cached
const filteredParts = useMemo(() => {
  return parts.filter(part => 
    // filter logic here
  )
}, [parts, filters])
```

### Debouncing
```typescript
// For search inputs and frequent updates
const debouncedSearch = useDebounce(searchTerm, 300)
```

### Virtual Scrolling
- Large datasets handled efficiently
- Only visible rows rendered
- Smooth scrolling performance

## Future Architecture Considerations

### Scalability
- **Component splitting**: Break down large components
- **Context providers**: Shared state management
- **Custom hooks**: Reusable logic extraction

### Extensibility  
- **Plugin architecture**: Modular filter types
- **Theme support**: Configurable styling
- **Internationalization**: Multi-language support

---

*This document should be updated when architectural changes are made.*