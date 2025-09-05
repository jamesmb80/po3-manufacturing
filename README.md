# PO3 - Process Order System

A modern production planning and workflow management system for manufacturing operations, built with Next.js 15 and TypeScript.

## 🚀 Live Deployment

**Production URL**: Deployed on Vercel  
**Status**: ✅ Live in Production (January 5, 2025)  
**Version**: 1.0.0 - Production Release with Supabase Database

## 📋 Features

### Core Workflow Management
- **11 Dashboard Views** - Complete visibility across all production stages
- **Smart Tag-Based Routing** - Automatic workflow routing based on part tags (Banding, Lacquered)
- **Multi-Stage Processing** - Ready → Cutting → Processing → Packing workflow
- **Real-Time Database Sync** - Multi-user support with Supabase PostgreSQL
- **Authentication** - Secure login with Supabase Auth

### User Interface (Updated January 5, 2025)
- **Dynamic Filter Panel** - Accordion-style filters that automatically show/hide based on visible columns
- **Column Visibility Control** - Show/hide table columns with filters adapting accordingly
- **Organized Tab Bar** - Visual grouping of related processes with color coding:
  - Initial stage (blue)
  - Machine groups (yellow/green)
  - Post-processing (purple)
  - Final stages (orange/red)
- **Responsive Design** - Mobile-friendly with abbreviated labels on smaller screens
- **Visual Icons** - Clear icons for Ready (scissors), Pack (package), and Recuts (rotate)
- **Smart Filters** - Filter by material, type, thickness, tags, dates, and order status

### Operator Stations
Five dedicated production floor interfaces:
- `/operator/saw` - Saw cutting station
- `/operator/router` - Router cutting station
- `/operator/laser` - Laser cutting station
- `/operator/edge-bander` - Edge banding station
- `/operator/lacquering` - Lacquering station

Each station features:
- Minimal, focused UI for production floor use
- Process Complete/Reject buttons
- Real-time database synchronization
- Auto-refresh every 2 seconds

### Admin Panel
- **Workflow Configuration** - Drag-and-drop process sequence editor
- **Routing Rules** - Configure tag-based routing without code changes
- **CSV Export** - Export selected parts for machine operations

## 🔧 Technical Stack

- **Framework**: Next.js 15.5.2 with App Router and Turbopack
- **Language**: TypeScript
- **Database**: PostgreSQL via Supabase
- **Authentication**: Supabase Auth
- **Styling**: Tailwind CSS
- **Data Tables**: Tanstack Table
- **Icons**: Lucide React
- **State Management**: React useState + Supabase real-time
- **Deployment**: Vercel (Production) + GitHub CI/CD

## 📁 Project Structure

```
PO3/
├── app/
│   ├── page.tsx                 # Main dashboard with 11 workflow views
│   ├── login/
│   │   └── page.tsx            # Authentication page
│   ├── admin/
│   │   └── page.tsx            # Admin configuration panel
│   └── operator/
│       └── [station]/
│           └── page.tsx        # Dynamic operator station views
├── components/
│   ├── parts-table.tsx        # Data table with actions
│   ├── filter-panel.tsx       # Dynamic filter system with column visibility integration
│   ├── column-visibility.tsx  # Column show/hide controls with localStorage persistence
│   └── ui/
│       └── tabs.tsx           # Custom tab components
├── lib/
│   ├── supabase-client.ts     # Database client and API
│   ├── workflow-engine.ts     # Core routing logic (no localStorage)
│   ├── filter-utils.ts        # Filter validation logic
│   ├── csv-utils.ts           # Export functionality
│   └── utils.ts               # Utility functions
├── docs/
│   ├── DEPLOYMENT-GUIDE.md    # Deployment instructions
│   └── SUPABASE-SETUP.md      # Database setup guide
├── scripts/
│   └── setup-database.js      # Database initialization
├── supabase/
│   └── parts-table.sql        # Database schema
├── middleware.ts               # Authentication middleware
└── order_data_table.json      # Sample data with tags
```

## 🎮 Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Supabase account
- Vercel account (for deployment)

### Environment Variables
Create a `.env.local` file:
```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-key
```

### Installation
```bash
# Clone the repository
git clone https://github.com/jamesmb80/po3-manufacturing.git
cd po3-manufacturing

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your Supabase credentials

# Run development server
npm run dev

# Access at http://localhost:3000
```

### Database Setup
1. Create a Supabase project
2. Run the SQL from `supabase/parts-table.sql` in SQL Editor
3. Disable email confirmation in Authentication settings
4. Create a demo user (admin@test.com / test123)

## 🎯 How to Use

### Authentication
- Default credentials: `admin@test.com` / `test123`
- All routes except `/login` require authentication

### Main Dashboard
1. **View Parts** - See all parts across 11 different workflow stages
2. **Control Columns** - Use column visibility controls to show/hide data fields
3. **Filter Data** - Click "Filters" to expand filtering options (adapts to visible columns)
4. **Assign to Machines** - Select parts and assign to Saw/Router/Laser
5. **Move Through Workflow** - Progress parts through cutting → processing → packing
6. **Handle Exceptions** - Reject parts to send them to Recuts

### Operator Stations
1. Open from main dashboard dropdown menu
2. View only parts relevant to that station
3. Click "Process Complete" when work is done
4. Parts automatically route to next destination

### Admin Panel
1. Access via "Admin Panel" button
2. Configure process sequence order
3. Set routing rules based on tags
4. Changes apply immediately

## 🔄 Workflow Logic

### Default Routing Rules
- **No tags** → Ready to Pack
- **"Banding" tag** → Edge Band → Ready to Pack
- **"Lacquered" tag** → Lacquer → Ready to Pack
- **Both tags** → Edge Band → Lacquer → Ready to Pack
- **Rejected parts** → Recuts

### Processing Status States
- `ready_to_cut` - Initial state
- `assigned_to_[saw|router|laser]` - Assigned to machine
- `cutting_[saw|router|laser]` - Currently being cut
- `parts_to_edge_band` - Awaiting edge banding
- `parts_to_lacquer` - Awaiting lacquering
- `ready_to_pack` - Complete and ready
- `recuts` - Failed/rejected parts

## 🗄️ Database Schema

The application uses a PostgreSQL database (via Supabase) with:
- **parts** table - All part information and workflow status
- **Row Level Security** - Authenticated users have full access
- **Indexes** - Optimized for performance on key fields
- **Real-time updates** - 5-second polling (main), 2-second (operator stations)

## 📊 Performance

- **Load Time**: < 500ms
- **Data Capacity**: Handles 500+ parts smoothly
- **Sync Speed**: 2-5 second polling intervals
- **Filter Performance**: Instant with 500+ records
- **Multi-user**: Full support with database persistence

## 🚀 Deployment

### Production Deployment (Vercel)
1. Fork/clone the repository to GitHub
2. Import to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy automatically on push to main branch

### CI/CD Pipeline
- GitHub Actions for automated testing
- Automatic deployment to Vercel on main branch
- Environment variable validation
- TypeScript and ESLint checks

## 🔮 Future Enhancements

### Phase 1 (Immediate)
- [x] Database integration (Completed)
- [x] User authentication (Completed)
- [ ] Add "Complete" status after packing
- [ ] Implement barcode scanning
- [ ] Add production metrics dashboard

### Phase 2 (Medium Term)
- [ ] Real-time WebSocket updates
- [ ] User roles and permissions
- [ ] Production analytics
- [ ] Batch processing capabilities

### Phase 3 (Long Term)
- [ ] Machine learning for optimal routing
- [ ] Predictive maintenance alerts
- [ ] ERP system integration
- [ ] Mobile app for operators

## 🛠 Development

```bash
# Run development server with Turbopack
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linting
npm run lint

# Database setup script
node scripts/setup-database.js
```

## 📝 Notes

- **Authentication**: Protected routes redirect to login
- **Sample Data**: Automatically loads if database is empty
- **Browser Support**: Tested on Chrome, works on all modern browsers
- **Data Persistence**: PostgreSQL via Supabase (no localStorage)
- **Multi-user**: All users see same data in real-time

## 🔒 Security

- Authentication via Supabase Auth
- Protected API routes with middleware
- Environment variables for sensitive data
- Row Level Security on database
- Secure password handling

## 📄 License

Private project - All rights reserved

## 📝 Changelog

### January 5, 2025 - v1.0.2
**Dynamic Filter Enhancement**
- 🎛️ Filter panel now adapts to visible columns automatically
- 👁️ Only shows relevant filters based on column visibility settings
- 🔧 Enhanced FilterPanel component with columnConfig integration
- 📱 Improved user experience by reducing UI complexity
- ✅ Maintains backwards compatibility with fallback behavior

### January 5, 2025 - v1.0.1
**Project Cleanup & Optimization**
- 🗑️ Removed 1.5MB of backup folders (now using Git for version control)
- 📁 Created organized `docs/` directory for documentation
- 🔧 Removed localStorage dependencies from workflow-engine.ts
- 📋 Consolidated duplicate documentation files
- 🚀 Fixed deployment build errors (TypeScript and prop mismatches)
- ✨ Updated .gitignore with comprehensive patterns

### January 5, 2025 - v1.0.0
**Production Release**
- 🎯 Full Supabase database integration
- 🔐 Authentication system implementation
- 🎨 UI improvements with collapsible filters
- 📱 Responsive design updates

---

*Last Updated: January 5, 2025*  
*Version: 1.0.2 - Dynamic Filter Enhancement*  
*Repository: [github.com/jamesmb80/po3-manufacturing](https://github.com/jamesmb80/po3-manufacturing)*