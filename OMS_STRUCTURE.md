# XZ OMS - Unified Structure Documentation

## 🎯 Overview

The XZ OMS now has a unified structure with consistent navigation, dark mode support, and role-based access control. All authenticated users access the same interface at `/oms/*` with features shown/hidden based on their role.

## 📁 Current Structure

```
/oms                          → Dashboard (Homepage)
/oms/calendar                 → Calendar View
/oms/quick-create             → Quick Create Job (AI-powered)
/oms/jobs                     → Jobs Management (TODO)
/oms/clients                  → Clients Management (TODO)
/oms/technicians              → Technicians Management (TODO)
/oms/products                 → Products Management (TODO)
/oms/equipment                → Equipment Management (TODO)
/oms/reports                  → Reports & Analytics (TODO)
/oms/settings                 → Settings (TODO)

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

## 📋 TODO: Remaining Pages

### Jobs Management (`/oms/jobs`)
- [ ] List view with filters
- [ ] Detail view with all fields
- [ ] Create/Edit forms
- [ ] QC workflow interface
- [ ] Status transitions

### Clients Management (`/oms/clients`)
- [ ] List view with search
- [ ] Detail view with job history
- [ ] Create/Edit forms
- [ ] Instruction templates

### Technicians Management (`/oms/technicians`)
- [ ] List view with status
- [ ] Detail view with schedule
- [ ] Create/Edit forms
- [ ] Commission tracking
- [ ] Availability calendar

### Products Management (`/oms/products`)
- [ ] Catalog view
- [ ] Detail view with pricing
- [ ] Create/Edit forms
- [ ] Default instructions

### Equipment Management (`/oms/equipment`)
- [ ] List view with status
- [ ] Detail view with maintenance
- [ ] Create/Edit forms
- [ ] Assignment tracking

### Reports & Analytics (`/oms/reports`)
- [ ] Financial reports
- [ ] Tech performance
- [ ] Client activity
- [ ] Charts and graphs

### Settings (`/oms/settings`)
- [ ] User profile
- [ ] Preferences
- [ ] User management (admin only)
- [ ] System settings

## 🚀 Migration Path

### Phase 1: Core Infrastructure ✅
- [x] Create OMS layout with navigation
- [x] Implement dark mode
- [x] Build dashboard
- [x] Move Calendar to `/oms/calendar`
- [x] Move Quick Create to `/oms/quick-create`

### Phase 2: Data Management (Next)
- [ ] Build Jobs list and detail pages
- [ ] Build Clients management
- [ ] Build Technicians management
- [ ] Build Products catalog
- [ ] Build Equipment tracking

### Phase 3: Advanced Features
- [ ] Reports and analytics
- [ ] Settings and preferences
- [ ] Role-based access control
- [ ] Authentication middleware
- [ ] Advanced workflows

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

1. **Build Jobs Management Pages**
   - List view with filters and search
   - Detail view with all job information
   - Create/Edit forms
   - Link from calendar events

2. **Implement Role-Based Access**
   - Fetch user role from session
   - Filter navigation menu
   - Protect routes with middleware
   - Show/hide features by role

3. **Build Remaining Management Pages**
   - Clients, Technicians, Products, Equipment
   - Follow same pattern as Jobs
   - Consistent styling and UX

4. **Add Advanced Features**
   - Reports and analytics
   - Settings and preferences
   - Bulk operations
   - Export functionality

## 📝 Notes

- Old standalone routes (`/calendar`, `/quick-create`) still exist but should be deprecated
- Payload admin at `/admin` remains for super-admin database access
- All new features should be built under `/oms/*`
- Dark mode works automatically via ThemeContext
- Navigation is role-aware (just need to implement filtering)
