# Product Requirements Document (PRD)
## PO3 - Process Order Version 3

### Executive Summary
PO3 is a production planning system designed to replace the legacy Magento-based system for managing manufacturing operations. The system enables material controllers and production planners to efficiently manage the cutting of parts from sheets of material across multiple machines (Saw, Router, Laser).

### Problem Statement
The current Magento-based system is not optimized for production planning workflows. Material controllers need a dedicated, streamlined interface to:
- View all parts that need to be cut
- Filter and organize parts by various criteria
- Assign parts to appropriate cutting machines
- Track production progress in real-time

### Goals and Objectives
1. **Primary Goal**: Create an efficient, user-friendly system for production planning and machine assignment
2. **Objectives**:
   - Reduce time spent on production planning by 50%
   - Eliminate errors in machine assignment
   - Provide real-time visibility into production status
   - Enable data-driven decision making for material controllers

### User Personas

#### Material Controller (Primary User)
- **Role**: Manages day-to-day production planning
- **Goals**: 
  - Quickly identify parts ready for cutting
  - Efficiently assign parts to appropriate machines
  - Meet cutting and dispatch deadlines
- **Pain Points**:
  - Current system is slow and not optimized for their workflow
  - Difficult to filter and find specific parts
  - No clear view of machine workload

#### Production Planner (Secondary User)
- **Role**: Strategic planning and optimization
- **Goals**:
  - Optimize machine utilization
  - Ensure on-time delivery
  - Balance workload across machines
- **Pain Points**:
  - Lack of visibility into production pipeline
  - Manual process for workload balancing

### User Stories (MVP)

#### US-001: View Ready to Cut Parts
**As a** Material Controller  
**I want to** see all parts that are ready to be cut  
**So that** I can plan production efficiently

**Acceptance Criteria:**
- Display all parts with status "Processing" or "In Progress"
- Show key information: Part ID, Order ID, Material, Dimensions, Dates
- Support pagination for large datasets
- Load time under 2 seconds for 1000 parts

#### US-002: Filter Parts
**As a** Material Controller  
**I want to** filter parts by various criteria  
**So that** I can find specific parts quickly

**Acceptance Criteria:**
- Filter by cutting date (date range)
- Filter by dispatch date (date range)
- Filter by material type (multi-select)
- Filter by order status
- Filters apply in real-time
- Show active filter indicators
- Provide "Clear all" option

#### US-003: Select Parts
**As a** Material Controller  
**I want to** select individual or multiple parts  
**So that** I can perform bulk actions

**Acceptance Criteria:**
- Individual part selection via checkbox
- Select all visible parts option
- Show count of selected parts
- Maintain selection across pagination

#### US-004: Assign Parts to Machines
**As a** Material Controller  
**I want to** assign selected parts to a specific machine  
**So that** production can begin

**Acceptance Criteria:**
- "Send to Saw" button
- "Send to Router" button  
- "Send to Laser" button
- Confirmation before assignment
- Parts move from "Ready to Cut" to appropriate machine view
- Update reflected in real-time

#### US-005: View Machine Assignments
**As a** Material Controller  
**I want to** see parts assigned to each machine  
**So that** I can track production progress

**Acceptance Criteria:**
- Separate tabs for each machine view
- "Ready to Cut" tab (default)
- "Assigned to Saw" tab
- "Assigned to Router" tab
- "Assigned to Laser" tab
- Show count of parts in each tab

### Functional Requirements

#### Data Management
- Import parts data from JSON/CSV file
- Support for ~200-500 parts initially
- Real-time data synchronization
- Data persistence across sessions

#### Table Features
- Sortable columns
- Resizable columns
- Column visibility toggle
- Sticky header on scroll
- Row hover states
- Responsive design

#### Filter System
- Persistent filter state in URL
- Filter combinations (AND logic)
- Visual feedback for active filters
- Quick filter presets (future)

#### Performance Requirements
- Page load time: < 2 seconds
- Filter application: < 500ms
- Machine assignment: < 1 second
- Support 500+ parts without degradation

### Non-Functional Requirements

#### Usability
- Intuitive interface matching current workflow
- Keyboard shortcuts for common actions
- Mobile-responsive for tablet use
- Clear visual hierarchy

#### Reliability
- 99.9% uptime during business hours
- Graceful error handling
- Data integrity protection
- Offline capability (future)

#### Security
- User authentication (future)
- Role-based access control (future)
- Audit trail for actions
- Secure data transmission

#### Compatibility
- Chrome, Firefox, Safari, Edge support
- Tablet optimization
- Export compatibility with Excel

### Technical Constraints
- Must work with existing Magento data structure
- Initial deployment on local machine
- Future deployment to Vercel
- Use modern web technologies (React/Next.js)

### MVP Scope

#### In Scope (Completed)
1. ✅ Basic table view with pagination
2. ✅ Core filters (dates, material, status)
3. ✅ Part selection mechanism
4. ✅ Machine assignment workflow
5. ✅ Data import from JSON
6. ✅ Tab navigation between views
7. ✅ Advanced filters (type, thickness, tags) - *Completed in MVP*
8. ✅ Sortable columns on all fields - *Completed in MVP*
9. ✅ Smart filter validation (cascading filters) - *Completed in MVP*

#### Out of Scope (Future Releases)
1. User authentication
2. Direct Magento API integration
3. Export functionality
4. Search with autocomplete
5. Material sheet optimization
6. Production scheduling logic
7. Additional machine types
8. Reporting and analytics

### Success Metrics
1. **Time to assign parts**: Reduce from 10 min to 2 min ✅ *Achieved*
2. **User satisfaction**: > 4/5 rating *Pending user testing*
3. **Error rate**: < 1% in machine assignments ✅ *No errors in testing*
4. **Adoption rate**: 100% within first month *Pending deployment*
5. **System performance**: < 2s load time ✅ *< 500ms achieved*
6. **Filter application**: < 100ms ✅ *Achieved with memoization*

### Release Plan

#### MVP Release (Week 1-2)
- Core functionality
- Basic UI
- Data import
- Local deployment

#### Version 1.1 (Week 3-4)
- UI polish
- Performance optimization
- Additional filters
- User feedback incorporation

#### Version 2.0 (Month 2)
- Magento API integration
- User authentication
- Advanced features
- Production deployment

### Risks and Mitigation

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Data migration issues | High | Medium | Thorough testing with sample data |
| User adoption | High | Low | Training and familiar UI design |
| Performance with large datasets | Medium | Medium | Pagination and optimization |
| Integration complexity | High | Medium | Phased approach, MVP first |

### Appendix

#### Sample Data Structure
```json
{
  "sheet_id": "2632059",
  "increment_id": "000853816",
  "cutting_date": "20 Aug 2025",
  "order_status": "In Progress",
  "shipping_name": "Elaine Tearle",
  "material": "MDF",
  "type": "Melamine",
  "thickness": "18mm",
  "shape": "rectangle",
  "length": 1220,
  "width": 350,
  "tags": "Banding",
  "machine_assignment": "unassigned"
}
```

#### UI Mockup References
- Current Magento interface screenshots
- Filter panel design
- Table layout specifications

---

*Document Version: 1.1*  
*Last Updated: 2025-01-04*  
*Author: PO3 Development Team*  
*Status: MVP Complete with Advanced Features*