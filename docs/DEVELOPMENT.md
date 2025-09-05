# Development Guide

## Recent Project Cleanup (January 5, 2025)

### What Was Cleaned
- **Removed backup folders**: All `backup_*` directories have been deleted as Git provides version control
- **Consolidated documentation**: Removed duplicate PROJECT-STATUS files and moved guides to `docs/`
- **Removed localStorage**: The workflow-engine.ts no longer uses localStorage (now uses Supabase)
- **Cleaned empty directories**: Removed unused `Fresh Data`, `hooks`, and `types` folders

### Current Architecture
- **Database**: PostgreSQL via Supabase (no localStorage)
- **Authentication**: Supabase Auth with middleware protection
- **State Management**: React state + Supabase real-time updates
- **Deployment**: Vercel with GitHub CI/CD

## Quick Start for Developers

### Setup
1. Clone the repository
2. Copy `.env.example` to `.env.local` and add Supabase credentials
3. Run `npm install`
4. Run `npm run dev`

### Key Files
- `app/page.tsx` - Main dashboard with all workflow logic
- `lib/supabase-client.ts` - Database API functions
- `lib/workflow-engine.ts` - Routing logic (tags → workflow)
- `components/parts-table.tsx` - Reusable table component

### Database Operations
All database operations go through `lib/supabase-client.ts`:
- `partsApi.getAll()` - Fetch all parts
- `partsApi.create()` - Create new part
- `partsApi.update()` - Update single part
- `partsApi.updateMany()` - Batch updates
- `partsApi.bulkInsert()` - Insert multiple parts

### Adding New Features

#### New Workflow Stage
1. Add to `processing_status` type in `app/page.tsx`
2. Update `PartsTable` tableMode prop type
3. Add new tab in main dashboard
4. Update routing logic in `workflow-engine.ts`

#### New Filter
1. Add to filter state in `app/page.tsx`
2. Update `FilterPanel` component
3. Add to `filter-utils.ts` for cascading logic

#### New Operator Station
1. Create route in `app/operator/[station]/page.tsx`
2. Add station name to allowed values
3. Update navigation dropdown in main dashboard

### Testing Locally
- Login with: `admin@test.com` / `test123`
- Sample data auto-loads if database is empty
- Use browser DevTools to monitor Supabase queries

### Common Issues
1. **Build errors**: Run `npx tsc --noEmit` to check TypeScript
2. **Auth issues**: Check Supabase Auth settings and email confirmation
3. **Database errors**: Verify Row Level Security policies in Supabase

### Code Style
- TypeScript for all new code
- Tailwind CSS for styling
- React hooks for state management
- Async/await for all database operations
- No console.log in production code

## Contact
For questions about the architecture or deployment, check the docs/ folder or review commit history.