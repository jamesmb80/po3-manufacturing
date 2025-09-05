# Developer Guide - PO3 Manufacturing System

Welcome to the PO3 Manufacturing Control System! This guide will help you understand the codebase and get productive quickly.

## 🎯 What You Need to Know

### System Overview
PO3 is a production workflow management system built for manufacturing operations. It tracks parts through multiple processing stages from initial cutting through final packing.

**Key Concept**: Parts flow through a state machine with 11 different workflow stages, each with specific UI views and operator stations.

### Recent Major Changes (January 5, 2025)

**Dynamic Filter Enhancement (v1.0.2)**:
- Filter panels now automatically show/hide based on visible table columns
- Enhanced user experience by reducing UI complexity
- Maintains full backwards compatibility

**Architecture**: The FilterPanel component now receives `columnConfig` from the parent and uses `isColumnVisible()` to conditionally render filter sections.

## 🚀 Quick Start

### 1. Environment Setup
```bash
# Clone and install
git clone https://github.com/jamesmb80/po3-manufacturing.git
cd po3-manufacturing
npm install

# Environment variables
cp .env.example .env.local
# Edit .env.local with your Supabase credentials

# Start development
npm run dev
```

### 2. Database Setup
- Create Supabase project
- Run `supabase/migrations/*.sql` in order
- Create test user: admin@test.com / test123

### 3. Key Files to Understand
1. `app/page.tsx` - Main dashboard with all workflow views
2. `components/filter-panel.tsx` - Dynamic filtering system  
3. `components/column-visibility.tsx` - Column show/hide controls
4. `lib/workflow-engine.ts` - Core business logic
5. `lib/supabase-client.ts` - Database operations

## 🏗️ Architecture Deep Dive

### Component Hierarchy
```
Page (app/page.tsx)
├── FilterPanel (filters + column awareness)
├── ColumnVisibility (show/hide columns)  
├── PartsTable (main data table)
└── Tabs (workflow stage views)
```

### State Management
```typescript
// Main page state (app/page.tsx)
const [parts, setParts] = useState<Part[]>([])           // All parts data
const [columnConfig, setColumnConfig] = useState(...)    // Column visibility
const [filters, setFilters] = useState(...)             // Filter state

// Data flow: Database → parts → filtered → displayed
const filteredParts = useMemo(() => applyFilters(parts, filters), [parts, filters])
```

### Database Schema
```sql
-- Main table: ready2cut_parts
-- Key fields:
sheet_id           (PK, from Magento)
processing_status  (workflow state)
machine_assignment (saw/router/laser)
tags              (routing logic: "Banding", "Lacquered")
```

## 🔧 Common Development Tasks

### Adding a New Filter Type

**1. Update FilterState interface**:
```typescript
// In filter-panel.tsx
interface FilterPanelProps {
  filters: {
    // existing filters...
    newFieldFilter: string[]  // Add your new filter
  }
}
```

**2. Add column visibility check**:
```typescript
// In FilterPanel component
{isColumnVisible('new_field') && (
  <div>
    <button onClick={() => toggleSection('newField')}>
      New Field Filter
    </button>
    {expandedSections.newField && (
      <NewFieldFilterOptions />
    )}
  </div>
)}
```

**3. Implement filter logic**:
```typescript
const handleNewFieldChange = (value: string) => {
  const updated = filters.newFieldFilter.includes(value)
    ? filters.newFieldFilter.filter(v => v !== value)
    : [...filters.newFieldFilter, value]
  setFilters({ ...filters, newFieldFilter: updated })
}
```

### Adding a New Column

**1. Add to ColumnConfig**:
```typescript
// In column-visibility.tsx DEFAULT_COLUMNS
{
  id: 'new_field',
  label: 'New Field Name', 
  visible: false,           // Default visibility
  category: 'Processing',   // Appropriate category
  required: false          // Can be hidden
}
```

**2. Update database if needed**:
```sql
-- Add migration in supabase/migrations/
ALTER TABLE ready2cut_parts 
ADD COLUMN new_field TEXT;
```

**3. Update Part interface**:
```typescript
// In app/page.tsx
export type Part = {
  // existing fields...
  new_field?: string | null
}
```

### Creating a New Workflow Stage

**1. Add processing status**:
```typescript
// Update processing_status enum in database and types
processing_status?: '...' | 'new_stage' | '...'
```

**2. Add tab configuration**:
```typescript
// In app/page.tsx
const tabs = [
  // existing tabs...
  { 
    key: 'new_stage', 
    label: 'New Stage', 
    icon: NewStageIcon,
    color: 'bg-purple-500' 
  }
]
```

**3. Update workflow engine**:
```typescript
// In lib/workflow-engine.ts
export function getNextDestination(part: Part): string {
  // Add logic for your new stage
  if (part.processing_status === 'new_stage') {
    return determineNextStage(part)
  }
}
```

## 🎨 UI Patterns

### Filter Section Pattern
```typescript
{isColumnVisible('field_name') && (
  <div>
    <button onClick={() => toggleSection('section')}>
      Section Title {activeCount > 0 && `(${activeCount})`}
    </button>
    {expanded && (
      <div className="space-y-1 max-h-32 overflow-y-auto">
        {options.map(option => (
          <FilterOption 
            key={option}
            value={option}
            checked={selected.includes(option)}
            onChange={handleChange}
          />
        ))}
      </div>
    )}
  </div>
)}
```

### Column Definition Pattern
```typescript
{
  id: 'database_field',      // Exact database field name
  label: 'User Display',     // What users see
  visible: boolean,          // Current state  
  category: 'Group Name',    // Logical grouping
  required?: boolean         // Cannot be hidden
}
```

### Workflow State Pattern
```typescript
// All states follow this pattern
processing_status: 
  | 'ready_to_cut'           // Initial
  | 'assigned_to_saw'        // Assigned
  | 'cutting_saw'            // In progress
  | 'parts_to_edge_band'     // Next destination
  | 'ready_to_pack'          // Complete
```

## 🧪 Testing Guidelines

### Component Testing
```typescript
// Test filter visibility integration
test('hides material filter when material column hidden', () => {
  const columnConfig = [
    { id: 'material', visible: false }
  ]
  render(<FilterPanel columnConfig={columnConfig} />)
  expect(screen.queryByText('Material')).not.toBeInTheDocument()
})
```

### Integration Testing
```typescript
// Test column visibility → filter integration
test('filter adapts to column changes', () => {
  const { rerender } = render(<App />)
  
  // Hide material column
  fireEvent.click(screen.getByRole('checkbox', { name: /material/i }))
  
  // Material filter should disappear
  expect(screen.queryByText('Material Filter')).not.toBeInTheDocument()
})
```

## 🐛 Common Issues & Solutions

### TypeScript Errors
**Issue**: `Property 'columnConfig' does not exist on type 'FilterPanelProps'`
**Solution**: Import ColumnConfig interface and add to props:
```typescript
import { ColumnConfig } from '@/components/column-visibility'
interface FilterPanelProps {
  columnConfig?: ColumnConfig[]
}
```

### Filter Not Working
**Issue**: New filter doesn't affect displayed data
**Solution**: Check filter logic in parent component:
```typescript
// Make sure new filter is included in filtering logic
const filteredParts = parts.filter(part => {
  // existing filters...
  if (filters.newFilter.length > 0) {
    return filters.newFilter.includes(part.newField)
  }
  return true
})
```

### Database Schema Issues
**Issue**: Column doesn't exist in database
**Solution**: Add migration and run it:
```sql
-- supabase/migrations/XXX_add_new_field.sql
ALTER TABLE ready2cut_parts 
ADD COLUMN IF NOT EXISTS new_field TEXT;
```

## 📚 Key Resources

### Documentation
- `docs/COMPONENT-ARCHITECTURE.md` - Component relationships
- `docs/DEPLOYMENT-GUIDE.md` - Production deployment
- `docs/SUPABASE-SETUP.md` - Database configuration
- `README.md` - Project overview

### External Dependencies
- **Next.js 15** - React framework with App Router
- **TypeScript** - Type safety and developer experience  
- **Tailwind CSS** - Utility-first styling
- **Supabase** - Database and authentication
- **Tanstack Table** - Data table functionality

### Development Tools
```bash
npm run dev        # Development server
npm run build      # Production build
npm run lint       # ESLint checking
npm run type-check # TypeScript validation
```

## 🔄 Code Review Checklist

### New Features
- [ ] TypeScript interfaces updated
- [ ] Component props properly typed
- [ ] Column visibility integration (if applicable)
- [ ] Backwards compatibility maintained
- [ ] Tests added for new functionality
- [ ] Documentation updated

### Bug Fixes
- [ ] Root cause identified and addressed
- [ ] Edge cases considered
- [ ] No regression introduced
- [ ] Test coverage for fix scenario

### Performance
- [ ] useMemo for expensive calculations
- [ ] useCallback for event handlers
- [ ] Proper dependency arrays
- [ ] No unnecessary re-renders

## 🚀 Deployment Process

### Development → Production
1. **Feature Development**: Work on feature branch
2. **Testing**: Ensure all tests pass
3. **Code Review**: PR review and approval
4. **Merge**: Merge to main branch
5. **Auto-Deploy**: Vercel automatically deploys
6. **Verification**: Check production site

### Database Changes
1. **Create Migration**: Add `.sql` file to `supabase/migrations/`
2. **Test Locally**: Verify migration works
3. **Production Apply**: Run migration in Supabase dashboard
4. **Verify**: Check data integrity

---

*Happy coding! 🎉*

**Questions?** Check existing documentation or ask the team.
**Found a bug?** Create an issue with reproduction steps.
**Have an idea?** Discuss in team chat before implementing.