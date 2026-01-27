# XZ Reality Capture OMS - System Documentation

> **Purpose**: This document serves as a quick reference for AI assistants and developers working on this codebase. It captures key system configurations, integrations, and architectural decisions to prevent redundant discovery work.

---

## 🔧 Environment & Configuration

### Email Service (Resend)
- **Status**: ✅ Configured and working
- **Provider**: Resend
- **Environment Variables**:
  - `RESEND_API_KEY=re_g73zHyVR_5RkBHG1uE75uxGjkN1ji9DNU`
  - `RESEND_DEFAULT_EMAIL=notifications@xzrealitycapture.com`
- **Usage**: Email notifications for job messages, workflow updates, client notifications
- **Rate Limit**: 2 emails/second (free tier)
- **Implementation**: `req.payload.sendEmail()` in Payload hooks

### Database
- **Type**: PostgreSQL
- **Host**: Railway
- **ORM**: Payload CMS 3.4 built-in

### Authentication
- **Google OAuth**: Configured
- **Client ID**: `115056776638-bg0i7n99o63cn5lm6dbfh63oholoh2pi.apps.googleusercontent.com`

---

## 📊 Collections & Data Model

### Core Collections
1. **Users** - Internal team members (ops, admins, QC, sales)
2. **Technicians** - Field technicians with optional `user` relationship for portal access
3. **Clients** - Customer records with billing preferences and notification settings
4. **Jobs** - Main work orders with workflow, products, and assignments
5. **Products** - Service catalog with pricing and workflow templates
6. **Invoices** - Billing records with QuickBooks sync
7. **Notifications** - In-app notification system
8. **JobMessages** - Per-job messaging system (NEW)
9. **Equipment** - Asset tracking
10. **WorkflowTemplates** - Reusable workflow definitions

### Key Relationships
- **Technicians → Users**: Optional `user` field links tech to user account for portal access
- **Jobs → Technicians**: `tech` field (technician assignment)
- **Jobs → Users**: `qcAssignedTo` field (QC assignment)
- **JobMessages → Jobs**: Polymorphic `author` (can be User or Technician)

---

## 🔔 Notification System

### In-App Notifications
- **Collection**: `notifications`
- **Fields**: `user` (relationship), `title`, `message`, `type`, `read`, `relatedJob`
- **UI Component**: `NotificationBell.tsx` (top navigation)
- **Polling**: 30-second refresh interval
- **Access**: Users can only see their own notifications

### Email Notifications
- **Provider**: Resend
- **Templates**: HTML emails generated in hooks
- **Triggers**:
  - Job messages (new message posted)
  - Workflow step completion
  - Job status changes
  - QC feedback
  - Invoice generation

### Job Messaging Notifications
- **Tech sends message** → Notifies all ops/admin users (super-admin, ops-manager, sales-admin)
- **Admin sends message** → Notifies assigned tech
- **Self-notification prevention**: Compares user account IDs (not collection record IDs)
- **Dual delivery**: Email + in-app notification (for users with accounts)

---

## 🎨 UI/UX Patterns

### Tab Navigation
- **Pattern**: All detail pages support `?tab=` query parameter
- **Implementation**: `useSearchParams()` to read tab from URL
- **Pages with tabs**:
  - Jobs: `details|instructions|tech-feedback|qc|financials|workflow|deliverables|messages`
  - Clients: `details|billing|notifications|integrations|notes`
  - Products: `details|pricing|instructions|flags`

### Autosave
- **Hook**: `useAutosaveField()` from `@/lib/oms/useAutosaveField`
- **Pattern**: Debounced saves (700-1000ms typical)
- **Indicator**: `SaveIndicator` component shows save status

### Real-time Updates
- **Job Messages**: 10-second polling
- **Notifications**: 30-second polling
- **Pattern**: `setInterval()` in `useEffect()` with cleanup

---

## 🔐 Role-Based Access Control

### Roles
1. **super-admin** - Full access
2. **ops-manager** - Operations management
3. **sales-admin** - Sales and client management
4. **post-producer** - QC and post-production
5. **tech** - Field technician (limited access)

### Access Patterns
- **Jobs**: Techs can only see assigned jobs
- **Notifications**: Users only see their own
- **Job Messages**: All job participants can read/write

---

## 🏗️ Architecture Decisions

### Why Technicians Have User Relationships
- Technicians are in a separate collection for organizational clarity
- Optional `user` field allows portal access without mixing data models
- Enables techs to receive in-app notifications when they have accounts
- **Subcontractor Support**: Many jobs are subcontracted outside the service area
  - Subcontractors don't need full user accounts
  - Use temporary form links for job updates (scan completion, questions, etc.)
  - Email-only communication for subcontractors without accounts

### Why Job Messages Use Polymorphic Authors
- Messages can come from Users (ops/admin) OR Technicians (field staff)
- Uses Payload's polymorphic relationship: `{ relationTo: ['users', 'technicians'], value: id }`
- Notification routing logic checks author collection to determine recipients

### Why We Use Query Parameters for Tabs
- Enables direct linking to specific tabs (e.g., from notifications)
- Bookmarkable URLs
- Better UX for navigation from external sources

---

## 🚀 Recent Features (Jan 2026)

### Job Messaging System
- **Status**: ✅ Phase 1 (MVP) Complete
- **Components**: `JobMessaging.tsx`, `forms/job-message/[token]/page.tsx`
- **Collection**: `job-messages`
- **Current Features (Phase 1 - MVP)**:
  - ✅ Per-job conversation threads
  - ✅ Color-coded message types (message, question, answer, issue, qc-feedback, update)
  - ✅ Email + in-app notifications
  - ✅ Real-time polling (10s refresh)
  - ✅ Smart notification routing (ops/admin receive tech messages)
  - ✅ Clickable notifications with direct navigation
  - ✅ **Subcontractor Support**:
    - Token-based message access for techs without user accounts
    - Secure links: `/forms/job-message/[token]`
    - Email notifications include appropriate link (OMS for users, form for subcontractors)
    - Read conversation history + reply form
    - No authentication required (token validates access)
    - Modern, branded UI with gradients and animations
    - Compact design prioritizing communication

- **Planned Features**:
  - **Phase 1.5 (Unified Tech Portal)** - Next Priority:
    - Consolidate `/forms/job/[token]` completion form with messaging
    - Tab navigation: Job Info | Messages | Complete Job
    - Single URL for all tech interactions
    - Hybrid access: Token-based (all techs) + Optional login (regular subcontractors)
    - Scheduling workflow integration
    - Workflow-based action buttons
  - **Phase 2 (Enhanced)**:
    - SMS integration via Twilio
    - File/photo attachments
    - Real-time updates (WebSocket/SSE)
    - Read receipts
    - Subcontractor dashboard (for regular partners)
  - **Phase 3 (Advanced)**:
    - Voice messages
    - Auto-suggestions based on job context
    - Integration with workflow triggers
    - Mobile app push notifications

### Unified Tech Portal Architecture (Planned)
- **Goal**: Single portal for all tech interactions
- **URL**: `/forms/job/[token]` (uses existing `completionToken`)
- **Access Models**:
  - **Token-based** (all techs): Email link → Direct access to single job
  - **Optional login** (regular subcontractors): Dashboard → View all jobs
- **Tab Structure**:
  1. **Job Info**: Job details, address, instructions, services, scheduling notes
  2. **Messages**: Conversation with ops team (existing messaging feature)
  3. **Complete Job**: Completion form, status, feedback, issues
- **Workflow Actions**: Dynamic buttons based on job status
  - `scheduled` → "Mark as Scanned"
  - `scanned` → "Submit Completion Report"
  - `done` → Read-only view
- **Components Ready**:
  - ✅ `JobPortalTabs.tsx` - Tab navigation component
  - ✅ API endpoints: `/api/forms/job/[token]/messages` and `/send`
  - ⏳ Main portal page transformation (pending clean implementation)

### Workflow-Based Calendar
- **Feature**: Products can be excluded from calendar via `excludeFromCalendar` flag
- **Use Case**: Admin tasks, recurring services that don't need calendar entries
- **Implementation**: Job detail page shows workflow steps with calendar toggle

### OMS-Native CRUD
- **Clients**: Full edit/create flows with 5 tabs
- **Products**: Full edit/create flows with 4 tabs
- **Pattern**: Autosave fields, tab navigation, validation

---

## 📝 Development Patterns

### Adding a New Collection
1. Create collection file in `src/collections/`
2. Import and add to `collections` array in `payload.config.ts`
3. Define access control, fields, hooks
4. Create UI components in `src/components/oms/`
5. Add routes in `src/app/oms/`

### Adding Notifications
1. Create notification in `afterChange` hook
2. Use `req.payload.create({ collection: 'notifications', data: {...} })`
3. Send email via `req.payload.sendEmail({ to, subject, html })`
4. Check for email config before sending

### Adding a New Tab
1. Update `activeTab` type in page component
2. Add tab button to UI
3. Add tab content section
4. Initialize from `searchParams.get('tab')` for URL support

---

## 🐛 Common Gotchas

### User ID Type Mismatches
- Payload relationships can be numbers or strings depending on context
- Always convert to consistent type when comparing: `String(userId)`
- In-app notifications require numeric user IDs, not strings

### Self-Notification Prevention
- Compare user account IDs, not collection record IDs
- Technician record ID ≠ User account ID
- Extract tech's user ID via `tech.user` relationship

### Email Rate Limiting
- Resend free tier: 2 emails/second
- Use try-catch for individual email sends
- Don't fail entire notification flow if one email fails

### Polymorphic Relationships
- Check `relationTo` field to determine collection
- Extract ID from `value` field (can be object or string)
- Use depth parameter to populate nested relationships

---

## 📚 Key Files Reference

### Configuration
- `src/payload.config.ts` - Main Payload configuration
- `.env` - Environment variables (DO NOT COMMIT)

### Collections
- `src/collections/JobMessages.ts` - Job messaging with notifications
- `src/collections/Notifications.ts` - In-app notification system
- `src/collections/Jobs.ts` - Main job collection with workflows (includes messageToken)
- `src/collections/Technicians.ts` - Tech profiles with user relationships

### Components
- `src/components/oms/NotificationBell.tsx` - Notification UI
- `src/components/oms/JobMessaging.tsx` - Job messaging UI
- `src/components/oms/SaveIndicator.tsx` - Autosave status

### Forms (Public Access)
- `src/app/forms/job-message/[token]/page.tsx` - Subcontractor message form

### API Routes
- `src/app/api/forms/job-message/[token]/route.ts` - Validate token & get job
- `src/app/api/forms/job-message/[token]/messages/route.ts` - Fetch messages
- `src/app/api/forms/job-message/[token]/send/route.ts` - Send message as tech

### Utilities
- `src/lib/oms/useAutosaveField.ts` - Autosave hook
- `src/lib/oms/patchJob.ts` - Job update utility

---

## 🔄 Update History

- **2026-01-27**: Subcontractor messaging via token-based links (no account required)
- **2026-01-27**: Job messaging system with dual notifications (email + in-app)
- **2026-01-27**: Site-wide tab query parameter support
- **2026-01-27**: Workflow-based calendar with product exclusion
- **2026-01-27**: OMS-native client and product CRUD

---

**Last Updated**: January 27, 2026
**Maintained By**: Development Team
**Purpose**: Quick reference for AI assistants and developers
