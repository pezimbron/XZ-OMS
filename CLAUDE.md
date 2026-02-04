# Claude Reference Guide - XZ-OMS

> **Purpose**: Quick reference for Claude and AI assistants working on this codebase. Links to all documentation and summarizes key system architecture.

---

## Documentation Index

| Document | Description |
|----------|-------------|
| [SYSTEM_DOCS.md](./SYSTEM_DOCS.md) | **Primary reference** - Comprehensive system documentation, integrations, roadmap, update history |
| [OMS_STRUCTURE.md](./OMS_STRUCTURE.md) | OMS navigation structure, implemented features, file organization |
| [README.md](./README.md) | Project overview, setup instructions, boilerplate info |
| [WORKFLOW_SYSTEM.md](./WORKFLOW_SYSTEM.md) | Workflow automation engine, templates, step completion |
| [QUICKBOOKS_SETUP.md](./QUICKBOOKS_SETUP.md) | QuickBooks OAuth integration setup |
| [GOOGLE_CALENDAR_SETUP.md](./GOOGLE_CALENDAR_SETUP.md) | Google Calendar API integration for tech invites |
| [RESEND_SETUP.md](./RESEND_SETUP.md) | Resend email service configuration |
| [QUICK_CREATE_GUIDE.md](./QUICK_CREATE_GUIDE.md) | AI-powered job creation from emails (Gemini) |
| [EMAIL_AUTOMATION_SETUP.md](./EMAIL_AUTOMATION_SETUP.md) | Email forwarding and auto job creation |
| [CALENDAR_VIEW_GUIDE.md](./CALENDAR_VIEW_GUIDE.md) | Calendar color-coding, region detection, usage |
| [NAVIGATION_GUIDE.md](./NAVIGATION_GUIDE.md) | Quick access features and navigation patterns |
| [SCHEDULING_CRON_SETUP.md](./SCHEDULING_CRON_SETUP.md) | Vercel cron jobs for scheduling reminders |
| [payload-migration-notes.md](./payload-migration-notes.md) | Payload 2 to 3 migration notes |

---

## System Overview

**XZ-OMS** is an Order Management System for a reality capture services business (Matterport scans, LiDAR, drones). Built with:

| Layer | Technology |
|-------|------------|
| **Framework** | Next.js 15 (App Router) |
| **CMS** | Payload CMS 3.73 |
| **Database** | PostgreSQL (Railway) |
| **Language** | TypeScript |
| **Styling** | Tailwind CSS + Radix UI |
| **Deployment** | Vercel (app) + Railway (database) |

---

## Key Integrations

### 1. Email (Resend)
- **Purpose**: Transactional notifications
- **Config**: `RESEND_API_KEY`, `RESEND_DEFAULT_EMAIL`
- **Usage**: `req.payload.sendEmail({ to, subject, html })`
- **Rate Limit**: 2 emails/second (free tier)
- **Triggers**: Job messages, workflow steps, scheduling, QC feedback

### 2. QuickBooks
- **Purpose**: Invoice sync, bill management
- **Auth**: OAuth 2.0 via `intuit-oauth`
- **Config**: `QUICKBOOKS_CLIENT_ID`, `QUICKBOOKS_CLIENT_SECRET`, `QUICKBOOKS_ENVIRONMENT`
- **Features**: Client sync, invoice creation, bill queries
- **Files**: `src/lib/quickbooks/client.ts`, `src/lib/quickbooks/sync.ts`

### 3. Google Calendar
- **Purpose**: Automatic calendar invites when tech assigned
- **Auth**: OAuth 2.0 + refresh token
- **Config**: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REFRESH_TOKEN`
- **Hook**: `src/collections/Jobs/hooks/createCalendarInvite.ts`
- **Content**: To-do list, location, POC, instructions, tech portal link

### 4. Google AI (Gemini)
- **Purpose**: Parse job request emails for Quick Create
- **Config**: `GEMINI_API_KEY`
- **Endpoint**: `/api/parse-job-email`
- **UI**: `/oms/quick-create`

### 5. Google Maps
- **Purpose**: Address display and location services
- **Config**: `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`

---

## Collections (Data Model)

| Collection | Purpose |
|------------|---------|
| `Users` | Internal team (ops, admins, QC, sales) |
| `Technicians` | Field techs with optional `user` relationship |
| `Vendors` | Subcontractor companies |
| `Clients` | Customer records with billing/notification prefs |
| `Jobs` | Main work orders (1198 lines - largest collection) |
| `Products` | Service catalog with pricing |
| `Invoices` | Billing records with QB sync |
| `Notifications` | In-app notification system |
| `JobMessages` | Per-job messaging threads |
| `WorkflowTemplates` | Reusable workflow definitions |
| `JobTemplates` | Quick-start job templates |
| `Equipment` | Asset tracking |

### Key Relationships
```
Technicians → Users (optional, for portal access)
Technicians → Vendors (for subcontractors)
Jobs → Technicians (tech assignment)
Jobs → Vendors (auto-populated from tech)
Jobs → WorkflowTemplates
JobMessages → Jobs (polymorphic author: User OR Technician)
```

---

## OMS Routes

| Route | Purpose |
|-------|---------|
| `/oms` | Dashboard with stats and quick actions |
| `/oms/calendar` | Visual calendar (color-coded by region) |
| `/oms/jobs` | Job list and management |
| `/oms/jobs/[id]` | Job detail (8 tabs) |
| `/oms/clients` | Client management |
| `/oms/clients/[id]` | Client detail (5 tabs) |
| `/oms/invoices` | Invoice management |
| `/oms/vendor-invoices` | Vendor invoice dashboard (subcontractor expenses) |
| `/oms/invoicing` | Invoicing queue |
| `/oms/commissions` | Tech payroll/commissions |
| `/oms/qc-queue` | Post-processing queue |
| `/oms/job-templates` | Job templates |
| `/oms/quick-create` | AI job creation |
| `/oms/notifications` | Full notifications page |

---

## Public Forms (Token-Based)

| Route | Purpose |
|-------|---------|
| `/forms/job/[token]` | Unified tech portal (Job Info, Schedule, Messages, Complete) |

**Access Model**: Token-based - no auth required. `completionToken` field on Jobs provides secure access for subcontractors.

---

## API Endpoints

### Job Management
- `GET/POST /api/jobs` - Job CRUD
- `PATCH /api/jobs/[id]` - Update job fields

### Forms (Public)
- `GET /api/forms/job/[token]` - Get job by token
- `POST /api/forms/job/[token]` - Submit completion
- `GET /api/forms/job/[token]/messages` - Get messages
- `POST /api/forms/job/[token]/send` - Send message

### Scheduling
- `POST /api/scheduling/notify-request` - Notify tech of request
- `POST /api/scheduling/notify-response` - Notify ops of response
- `POST /api/scheduling/notify-confirmation` - Confirm schedule
- `GET /api/scheduling/send-reminders` - Cron: 6-hour reminders

### QuickBooks
- `GET /api/quickbooks/auth` - OAuth initiation
- `GET /api/quickbooks/callback` - OAuth callback
- `POST /api/quickbooks/sync` - Sync client
- `GET /api/quickbooks/bills/query` - Query bills
- `POST /api/quickbooks/bills` - Create bill
- `POST /api/quickbooks/bills/sync-status` - Sync bill payment status from QB

### Vendor Invoices
- `GET /api/vendor-invoices` - Aggregated vendor expenses (filterable, paginated). Excludes auto-generated product expenses.

### Invoice Processing
- `POST /api/sub-invoice/parse-pdf` - Parse PDF invoice
- `POST /api/sub-invoice/parse` - Parse CSV invoice

---

## Role-Based Access Control

| Role | Access |
|------|--------|
| `super-admin` | Full access + Payload admin |
| `ops-manager` | Operations, jobs, techs, equipment |
| `sales-admin` | Sales, clients, reports |
| `post-producer` | QC/post-processing workflows |
| `tech` | Assigned jobs only |
| `client-partner` | Own clients' jobs |

**Admin Panel**: Restricted to `super-admin`, `ops-manager`, `sales-admin`

---

## Key Patterns

### Autosave
```typescript
// Hook: src/lib/oms/useAutosaveField.ts
const { value, setValue, status } = useAutosaveField(job.id, 'fieldName', initialValue)
// Status: 'idle' | 'saving' | 'saved' | 'error'
```

### Tab Navigation
```typescript
// Query parameter pattern: ?tab=details
const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'details')
```

### Real-Time Polling
- **Messages**: 10-second interval
- **Notifications**: 30-second interval

### Notification Creation
```typescript
await req.payload.create({
  collection: 'notifications',
  data: {
    user: userId,
    title: 'Title',
    message: 'Message',
    type: 'info',
    relatedJob: jobId,
    actionUrl: '/oms/jobs/123?tab=messages'
  }
})
```

---

## Environment Variables

```env
# Database
DATABASE_URI=postgres://...

# Payload
PAYLOAD_SECRET=...
NEXT_PUBLIC_SERVER_URL=https://...

# Email (Resend)
RESEND_API_KEY=re_...
RESEND_DEFAULT_EMAIL=notifications@domain.com

# QuickBooks
QUICKBOOKS_CLIENT_ID=...
QUICKBOOKS_CLIENT_SECRET=...
QUICKBOOKS_ENVIRONMENT=sandbox|production
QUICKBOOKS_REDIRECT_URI=.../api/quickbooks/callback

# Google Calendar
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REFRESH_TOKEN=...
TIMEZONE=America/Chicago

# Google AI
GEMINI_API_KEY=...

# Google Maps
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=...
```

---

## Project Structure

```
src/
├── app/
│   ├── (payload)/admin/     # Payload admin panel
│   ├── api/                 # API routes
│   │   ├── forms/           # Public form endpoints
│   │   ├── jobs/            # Job management
│   │   ├── quickbooks/      # QB integration
│   │   ├── scheduling/      # Scheduling notifications
│   │   └── sub-invoice/     # Invoice parsing
│   └── oms/                 # OMS dashboard & pages
│       ├── layout.tsx       # Unified layout with nav
│       ├── page.tsx         # Dashboard
│       ├── calendar/
│       ├── jobs/[id]/
│       ├── clients/[id]/
│       ├── invoices/
│       ├── commissions/
│       └── qc-queue/
├── collections/             # Payload collections
│   ├── Jobs.ts              # Main collection (1198 lines)
│   ├── Clients.ts
│   ├── Technicians.ts
│   ├── Vendors.ts
│   └── Jobs/hooks/          # Job-specific hooks
├── components/oms/          # OMS UI components
│   ├── Navigation.tsx
│   ├── JobMessaging.tsx
│   ├── WorkflowTimeline.tsx
│   └── NotificationBell.tsx
├── lib/
│   ├── oms/                 # OMS utilities
│   ├── quickbooks/          # QB client
│   └── invoices/
├── contexts/
│   └── ThemeContext.tsx     # Dark mode
└── payload.config.ts        # Main config
```

---

## Common Gotchas

1. **User ID Types**: Payload relationships can be numbers or strings. Always use `String(userId)` for comparisons.

2. **Self-Notification Prevention**: Compare user account IDs, not collection record IDs. Tech record ID ≠ User account ID.

3. **Email Rate Limiting**: Resend free tier is 2/second. Use try-catch for individual sends.

4. **Polymorphic Relationships**: Check `relationTo` field to determine collection. Extract ID from `value` field.

5. **Payload 3.74.0 Bug**: ESM import error with `image-size/fromFile`. Fixed by downgrading to 3.73.0.

6. **Array.prototype Pollution**: Unknown source adds `Array.prototype.random`. Cleaned in parse-pdf route before PDF.js execution.

7. **Payload Group Fields Can't Be `null`**: Setting a `group` type field to `null` in a PATCH crashes Payload's `beforeValidate` traversal (`Cannot read properties of null`). Use `{}` to clear a group — Payload will null out each sub-field individually.

8. **Payload `dayOnly` Dates Are Midnight UTC**: A `date` field with `pickerAppearance: 'dayOnly'` returns values like `"2026-02-26T00:00:00.000Z"`. In negative-offset timezones (e.g. US Central), `toLocaleDateString()` correctly shows Feb 25, but `.split('T')[0]` extracts `"2026-02-26"` (the UTC date). Always use local Date methods (`getFullYear`, `getMonth`, `getDate`) when extracting dates for display-consistent operations.

---

## Development Commands

```bash
pnpm install          # Install dependencies
pnpm dev              # Start dev server
pnpm build            # Production build
pnpm start            # Start production
pnpm lint             # Run ESLint
pnpm lint:fix         # Fix lint issues
pnpm payload generate:types  # Regenerate types
```

---

## Project Status

### Phase 1: Core Operations - COMPLETE
- Dashboard, Calendar, Jobs, Clients, Technicians
- Workflow System, Messaging, QC Queue
- Invoicing, Commissions, Subcontractor Invoice Import

### Phase 2: Business Integrations - NOT STARTED
- HubSpot integration
- Payment matching system
- SMS notifications (Twilio)

### Phase 3: Client Experience - NOT STARTED
- Client portal
- Enhanced reporting
- Mobile app

---

**Last Updated**: February 3, 2026
