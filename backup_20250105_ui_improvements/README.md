# PO3 - Process Order System

A modern production planning and workflow management system for manufacturing operations, built with Next.js 15 and TypeScript.

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Access at http://localhost:3000
```

## 📋 Features

### Core Workflow Management
- **11 Dashboard Views** - Complete visibility across all production stages
- **Smart Tag-Based Routing** - Automatic workflow routing based on part tags (Banding, Lacquered)
- **Multi-Stage Processing** - Ready → Cutting → Processing → Packing workflow
- **Real-Time Synchronization** - Updates across all open browser windows instantly
- **Data Persistence** - Survives page refreshes using localStorage

### User Interface (Updated January 5, 2025)
- **Collapsible Filter Panel** - Accordion-style filters that start collapsed for cleaner view
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
- Auto-refresh capability
- Real-time sync with main dashboard

### Admin Panel
- **Workflow Configuration** - Drag-and-drop process sequence editor
- **Routing Rules** - Configure tag-based routing without code changes
- **CSV Export** - Export selected parts for machine operations

## 🔧 Technical Stack

- **Framework**: Next.js 15.5.2 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Data Tables**: Tanstack Table
- **Icons**: Lucide React
- **State Management**: React useState + localStorage
- **Cross-Window Sync**: Storage event listeners

## 📁 Project Structure

```
PO3/
├── app/
│   ├── page.tsx                 # Main dashboard with 11 workflow views
│   ├── admin/
│   │   └── page.tsx            # Admin configuration panel
│   └── operator/
│       └── [station]/
│           └── page.tsx        # Dynamic operator station views
├── components/
│   ├── parts-table.tsx        # Data table with actions
│   ├── filter-panel.tsx       # Collapsible filter system
│   └── ui/
│       └── tabs.tsx           # Custom tab components
├── lib/
│   ├── workflow-engine.ts     # Core routing logic
│   ├── filter-utils.ts        # Filter validation logic
│   ├── csv-utils.ts           # Export functionality
│   └── utils.ts               # Utility functions
└── order_data_table.json      # Sample data with tags
```

## 🎮 How to Use

### Main Dashboard
1. **View Parts** - See all parts across 11 different workflow stages
2. **Filter Data** - Click "Filters" to expand filtering options
3. **Assign to Machines** - Select parts and assign to Saw/Router/Laser
4. **Move Through Workflow** - Progress parts through cutting → processing → packing
5. **Handle Exceptions** - Reject parts to send them to Recuts

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

## 🚦 API Strategy (Future)

### Current State
The app uses localStorage for data persistence and cross-window synchronization, which effectively demonstrates the workflow without backend complexity.

### Future Integration Plan
When ready to integrate with Magento:

1. **Optimistic Locking** - Version numbers on each part
2. **Conflict Resolution** - Check before update pattern
3. **Background Sync** - Periodic reconciliation with Magento
4. **Queue System** - Handle updates asynchronously (when Redis/RabbitMQ available)

### Why Not Mock API Now?
- Current localStorage approach already demonstrates real-time sync
- Stakeholders need to validate workflow, not technical implementation
- Adding mock API would complicate without adding business value
- Save complexity for actual Magento integration

## 📊 Performance

- **Load Time**: < 500ms
- **Data Capacity**: Handles 500+ parts smoothly
- **Sync Speed**: Real-time across windows
- **Filter Performance**: Instant with 500+ records

## 🔮 Future Enhancements

### Phase 1 (Immediate)
- [ ] Add "Complete" status after packing
- [ ] Implement barcode scanning
- [ ] Add production metrics dashboard

### Phase 2 (Medium Term)
- [ ] Supabase integration for multi-user support
- [ ] User authentication and roles
- [ ] Production analytics
- [ ] Batch processing capabilities

### Phase 3 (Long Term)
- [ ] Machine learning for optimal routing
- [ ] Predictive maintenance alerts
- [ ] ERP system integration
- [ ] Mobile app for operators

## 🛠 Development

```bash
# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linting
npm run lint
```

## 📝 Notes

- **Reset Data**: Use "Reset Data" button to reload sample data
- **Browser Support**: Tested on Chrome, works on all modern browsers
- **Data Storage**: Uses browser localStorage (clears with "Reset Data")
- **Sample Data**: Includes parts with various tag combinations for testing

## 📄 License

Private project - All rights reserved

---

*Last Updated: January 5, 2025*
*Version: 1.0.0 - MVP with UI Enhancements*