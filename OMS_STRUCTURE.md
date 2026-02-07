# XZ OMS - Unified Structure Documentation

## 🎯 Overview

The XZ OMS now has a unified structure with consistent navigation, dark mode support, and role-based access control. All authenticated users access the same interface at `/oms/*` with features shown/hidden based on their role.

## 📁 Current Structure

```
/oms                          → Dashboard (Homepage)
/oms/calendar                 → Calendar View (color-coded by region)
/oms/quick-create             → Quick Create Job (AI-powered)
/oms/jobs                     → Jobs List (sortable, filterable, tabs)
/oms/jobs/[id]                → Job Detail (8 tabs)
/oms/clients                  → Clients List (sortable, tabs)
/oms/clients/[id]             → Client Detail (5 tabs)
/oms/technicians              → Technicians List (sortable, Active/Inactive tabs)
/oms/technicians/create       → Create Technician
/oms/technicians/[id]         → Technician Detail/Edit
/oms/vendors                  → Vendors List (sortable, tabs, QB import)
/oms/vendors/create           → Create Vendor
/oms/vendors/[id]             → Vendor Detail/Edit
/oms/invoicing                → Invoicing Queue (jobs ready to invoice)
/oms/invoices                 → Invoice List (sortable, status tabs)
/oms/vendor-invoices          → Vendor Invoice Dashboard
/oms/commissions              → Tech Payroll/Commissions
/oms/qc-queue                 → Post-processing Queue
/oms/job-templates            → Job Templates
/oms/notifications            → Full Notifications Page
/oms/reports                  → Reports & Analytics (PLANNED)

/admin/*                      → Payload CMS (Super-admin only)
```

## ✅ Implemented Features

### 1. Unified Layout (`/oms/layout.tsx`)
- Persistent sidebar navigation
- Dark mode support
- Consistent styling across all pages
- Responsive design

### 2. Navigation Component (`/components/oms/Navigation.tsx`)
- Logo and branding
- Menu items with icons
- Active state highlighting
- Dark mode toggle
- User profile section
- Logout button
- Role-based menu filtering (ready for implementation)

### 3. Theme System (`/contexts/ThemeContext.tsx`)
- Light/Dark mode toggle
- Persists preference in localStorage
- Applies to entire OMS section
- Smooth transitions

### 4. Dashboard (`/oms/page.tsx`)
- Stats cards (Total Jobs, Active, Unassigned, Today's Jobs)
- Quick action buttons
- Recent activity sections
- Fully responsive

### 5. Calendar View (`/oms/calendar`)
- Color-coded by region (Austin, San Antonio, Outsourced, Other)
- Tech assignment status visualization
- Stats dashboard
- Legend bar
- Click events to view job details
- Dark mode support

### 6. Quick Create Job (`/oms/quick-create`)
- AI-powered email parsing with Gemini
- Auto-populates all job fields
- Beautiful gradient design
- Dark mode support
- Error handling

## 🎨 Design System

### Color Scheme
- **Light Mode**: White backgrounds, gray accents, colorful gradients
- **Dark Mode**: Dark gray backgrounds, lighter text, same colorful gradients

### Component Patterns
- **Headers**: Consistent page headers with title and description
- **Cards**: Rounded corners, shadows, borders
- **Buttons**: Gradient backgrounds for primary actions
- **Stats**: Icon + label + value layout
- **Forms**: Clean inputs with focus states

### Dark Mode Classes
All components use Tailwind's dark mode classes:
- `dark:bg-gray-900` for backgrounds
- `dark:text-white` for text
- `dark:border-gray-700` for borders
- Gradients work in both modes

## 🔐 Role-Based Access Control (Ready to Implement)

### User Roles
1. **Super Admin** - Full access to everything + Payload admin
2. **Sales Admin** - Dashboard, Calendar, Quick Create, Jobs, Clients, Reports
3. **Ops Manager** - Dashboard, Calendar, Jobs, Clients, Techs, Equipment, Reports
4. **Tech** - Dashboard, Calendar (own jobs), Jobs (assigned only)
5. **Client Partner** - Dashboard, Jobs (own clients), Reports (own data)
6. **Post Producer** - Dashboard, Jobs (QC workflow), Reports

### Implementation Notes
- Navigation component has `roles` property on menu items
- Need to fetch user role from session/API
- Filter menu items based on user role
- Protect routes with middleware

## ✅ Completed Features

### Jobs Management (`/oms/jobs`) ✅
- [x] List view with sortable columns and filters
- [x] Tab-based filtering (Active/Completed/All)
- [x] Detail view with 8 tabs (Details, Location, Workflow, Scheduling, Messages, Invoicing, Files, Settings)
- [x] Inline editing with autosave
- [x] QC workflow interface
- [x] Status transitions

### Clients Management (`/oms/clients`) ✅
- [x] List view with search and sortable columns
- [x] Detail view with 5 tabs
- [x] Create/Edit forms
- [x] QuickBooks sync
- [x] Job history

### Technicians Management (`/oms/technicians`) ✅
- [x] List view with Active/Inactive tabs
- [x] Sortable columns (Name, Email, Type, Rate)
- [x] Detail view with job stats
- [x] Create/Edit forms
- [x] Commission tracking

### Vendors Management (`/oms/vendors`) ✅
- [x] List view with Active/Inactive tabs
- [x] QuickBooks import
- [x] Detail view with QB sync status
- [x] Create/Edit forms

### Invoicing System ✅
- [x] Invoicing queue with sortable columns
- [x] Bulk invoice generation
- [x] Invoice list with status tabs
- [x] Vendor invoices dashboard
- [x] Commissions page

### Products & Equipment
- [x] Products managed via Payload admin
- [x] Equipment managed via Payload admin

## 📋 TODO: Remaining Features

### Reports & Analytics (`/oms/reports`) - PLANNED
- [ ] Revenue reports (by period, by client)
- [ ] Tech performance metrics
- [ ] Client activity reports
- [ ] Operations overview
- [ ] Charts with recharts
- [ ] CSV/PDF export

### Public Scheduling - PLANNED
- [ ] Public scheduling page at `/schedule`
- [ ] Tech availability by region
- [ ] SchedulingRequests collection
- [ ] Admin approval workflow

### HubSpot Integration - PLANNED
- [ ] Client/contact sync
- [ ] Deal creation from jobs
- [ ] Activity logging

## 🚀 Migration Path

### Phase 1: Core Infrastructure ✅
- [x] Create OMS layout with navigation
- [x] Implement dark mode
- [x] Build dashboard
- [x] Move Calendar to `/oms/calendar`
- [x] Move Quick Create to `/oms/quick-create`

### Phase 2: Data Management ✅
- [x] Build Jobs list and detail pages
- [x] Build Clients management
- [x] Build Technicians management
- [x] Build Vendors management
- [x] Build Invoicing system
- [x] Sortable columns on all list pages
- [x] Tab-based filtering (Active/Inactive/Completed)

### Phase 3: Business Integrations (Current)
- [ ] Enhanced Reporting & Analytics
- [ ] HubSpot Integration
- [ ] Public Scheduling Page
- [ ] SMS notifications (Twilio)

## 🔧 Technical Details

### File Structure
```
src/
├── app/
│   └── oms/
│       ├── layout.tsx           # Main OMS layout
│       ├── page.tsx             # Dashboard
│       ├── calendar/
│       │   └── page.tsx
│       ├── quick-create/
│       │   └── page.tsx
│       └── [other pages...]
├── components/
│   └── oms/
│       ├── Navigation.tsx       # Sidebar navigation
│       ├── JobsCalendarContent.tsx
│       └── QuickCreateJobContent.tsx
└── contexts/
    └── ThemeContext.tsx         # Dark mode context
```

### Key Dependencies
- `react-big-calendar` - Calendar component
- `date-fns` - Date formatting
- Tailwind CSS - Styling with dark mode
- Next.js 15 - App router

### API Endpoints
- `/api/jobs` - Jobs CRUD operations
- `/api/parse-job-email` - Gemini AI parsing
- `/api/users/logout` - User logout

## 🎯 Next Steps

1. **Enhanced Reporting & Analytics** (Recommended first)
   - Revenue reports with date range filters
   - Tech performance metrics
   - Client activity reports
   - Charts using `recharts`
   - CSV export functionality

2. **HubSpot Integration**
   - Create HubSpot client library (similar to QuickBooks pattern)
   - Sync clients/contacts to HubSpot
   - Create deals from jobs
   - Log activities to timeline

3. **Public Scheduling Page**
   - Add availability fields to Technicians
   - Create SchedulingRequests collection
   - Build public form at `/schedule`
   - Admin queue for approvals

## 📝 Notes

- Payload admin at `/admin` remains for super-admin database access
- All new features should be built under `/oms/*`
- Dark mode works automatically via ThemeContext
- All list pages have consistent UX: sortable columns, tab filters, compact search
- Navigation is role-aware with role-based visibility

**Last Updated**: February 6, 2026
