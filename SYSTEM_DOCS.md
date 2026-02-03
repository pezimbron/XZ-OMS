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
8. **JobMessages** - Per-job messaging system
9. **Equipment** - Asset tracking
10. **WorkflowTemplates** - Reusable workflow definitions
11. **Vendors** - Subcontractor vendor companies (NEW)

### Key Relationships
- **Technicians → Users**: Optional `user` field links tech to user account for portal access
- **Technicians → Vendors**: `vendor` field links outsourced partners to their vendor company
- **Jobs → Technicians**: `tech` field (technician assignment)
- **Jobs → Vendors**: `subcontractorVendor` field (auto-populated from tech's vendor)
- **Jobs → Users**: `qcAssignedTo` field (QC assignment)
- **JobMessages → Jobs**: Polymorphic `author` (can be User or Technician)

---

## 🔔 Notification System

### In-App Notifications
- **Collection**: `notifications`
- **Fields**: `user` (relationship), `title`, `message`, `type`, `read`, `relatedJob`, `actionUrl`
- **UI Components**: 
  - `NotificationBell.tsx` (top navigation dropdown)
  - `/oms/notifications` (full notifications page)
- **Polling**: 30-second refresh interval
- **Access**: Users can only see their own notifications
- **Features**:
  - ✅ Notification bell with unread count badge
  - ✅ Dropdown with recent 10 notifications
  - ✅ "Mark all as read" bulk action
  - ✅ "View All" link to full notifications page
  - ✅ Full notifications page with filtering (all/unread/read)
  - ✅ Individual mark as read/unread actions
  - ✅ Delete notifications
  - ✅ Clickable notifications with smart routing to related jobs/actions

### Email Notifications
- **Provider**: Resend
- **Templates**: HTML emails generated in hooks
- **Triggers**:
  - Job messages (new message posted)
  - Workflow step completion
  - Job status changes
  - QC feedback
  - Invoice generation
  - Scheduling requests and responses

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

- **Phase 1.5 (Unified Tech Portal)** - ✅ COMPLETED:
  - ✅ Consolidated `/forms/job/[token]` completion form with messaging
  - ✅ Tab navigation: Job Info | Schedule | Messages | Complete Job
  - ✅ Single URL for all tech interactions
  - ✅ Token-based access (all techs): Email link → Direct access to single job
  - ✅ Scheduling workflow integration (full system)
  - ✅ Smart tab visibility (Schedule tab hides when date confirmed)
  - ✅ Client privacy protection (client name hidden from techs)

- **Planned Features**:
  - **Phase 2 (Email Notifications)** - Next Priority:
    - Email notification when scheduling request created
    - Confirmation email when ops accepts time
    - 6-hour reminder if no tech response
    - Notify ops when tech responds
  - **Phase 3 (Enhanced)**:
    - SMS integration via Twilio
    - File/photo attachments
    - Real-time updates (WebSocket/SSE)
    - Read receipts
    - Subcontractor dashboard (for regular partners)
  - **Phase 4 (Advanced)**:
    - Voice messages
    - Auto-suggestions based on job context
    - Integration with workflow triggers
    - Mobile app push notifications

### Unified Tech Portal Architecture ✅ IMPLEMENTED
- **Goal**: Single portal for all tech interactions
- **URL**: `/forms/job/[token]` (uses existing `completionToken`)
- **Access Model**: Token-based (all techs) - Email link → Direct access to single job
- **Tab Structure**:
  1. **Job Info**: Job details, address, instructions, services, scheduled date
  2. **Schedule**: Scheduling request/response (conditionally shown)
  3. **Messages**: Conversation with ops team (10s polling)
  4. **Complete Job**: Completion form, status, feedback, issues
- **Smart UI**:
  - Schedule tab only shows when `schedulingRequest` exists AND `targetDate` is empty
  - Scheduled date shows "To be determined" when scheduling pending
  - Client information hidden for privacy
- **Components**:
  - ✅ `UnifiedPortal.tsx` - Main portal with tab navigation
  - ✅ `JobPortalTabs.tsx` - Tab navigation component
  - ✅ `ScheduleTab.tsx` - Scheduling request/response UI
  - ✅ API endpoints: `/api/forms/job/[token]` (GET/POST), `/messages`, `/send`

### Scheduling System ✅ IMPLEMENTED
- **Collections**: Jobs collection with `schedulingRequest` and `techResponse` fields
- **Request Types**:
  1. **Time Windows**: Ops provides 2-5 date/time ranges, tech selects preferred + start time
  2. **Specific Time**: Ops proposes exact date/time, tech accepts/declines
  3. **Tech Proposes**: Ops requests availability, tech provides 3 date/time options
- **Ops-Side Features**:
  - ✅ `SchedulingRequestPanel.tsx` - Create scheduling requests in job detail page
  - ✅ View tech responses in Instructions tab
  - ✅ One-click "Accept This Time" buttons on each proposed option
  - ✅ Auto-set target date with proper timezone handling
  - ✅ Target date auto-clears when scheduling request sent
  - ✅ Clear buttons for date inputs
- **Tech-Side Features**:
  - ✅ View scheduling requests in portal Schedule tab
  - ✅ Submit responses (accept/decline with time preferences)
  - ✅ See confirmation of submitted response
  - ✅ Response persists and displays on return visits
- **Data Model**:
  ```typescript
  schedulingRequest: {
    requestType: 'time-windows' | 'specific-time' | 'tech-proposes'
    sentAt: Date
    deadline: Date
    reminderSent: boolean
    reminderSentAt?: Date
    timeOptions?: Array<{optionNumber, date, timeWindow, startTime, endTime, specificTime}>
    requestMessage?: string
  }
  techResponse: {
    respondedAt: Date
    interested: boolean
    selectedOption?: number
    preferredStartTime?: string
    proposedOptions?: Array<{date, startTime, notes}>
    declineReason?: string
    notes?: string
  }
  ```
- **Workflow**:
  1. Ops creates scheduling request → Target date clears
  2. Tech views request in portal → Schedule tab visible
  3. Tech responds with availability
  4. Ops reviews response → Clicks "Accept This Time"
  5. Target date set automatically → Schedule tab hides
  6. Both sides see confirmed schedule
- **Email Notifications** ✅ IMPLEMENTED:
  - ✅ Scheduling request created → Tech receives email with request details
  - ✅ Tech responds → Ops team receives email with response (accepted/declined)
  - ✅ Schedule confirmed → Tech receives confirmation email with final date/time
  - ✅ 6-hour reminder → Automated reminder if no tech response (Vercel Cron)
  - Beautiful HTML emails with gradient styling
  - Smart routing (tech email vs ops team)
  - Resend email service integration
  - API endpoints: `/api/scheduling/notify-request`, `/notify-response`, `/notify-confirmation`, `/send-reminders`

### Google Calendar Integration ✅ ENHANCED
- **Feature**: Automatic calendar invites when tech assigned to job
- **Hook**: `createCalendarInvite.ts` (afterChange hook)
- **Calendar Description Includes**:
  - TO-DO LIST (workflow steps for tech)
  - Additional items (products/services not excluded from calendar)
  - Purpose of scan and capture type
  - Location and property details
  - On-site contact information
  - General and specific instructions
  - Upload locations
  - **🔗 Tech Portal Link** - Direct access to job portal for techs without accounts
  - Job info (ID, priority)
- **Privacy**: Client name removed from calendar title (shows model name and job ID only)
- **Product Exclusion**: Products can be excluded from calendar via `excludeFromCalendar` flag
- **Smart Updates**: Only triggers on calendar-relevant field changes (tech, date, address, products, instructions)
- **Environment**: Uses `NEXT_PUBLIC_SERVER_URL` for portal links

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

## �️ Product Roadmap

### Phase 1: Core Operations & Workflow ✅ **COMPLETE**

**1. Post-Producer/QC Queue** - ✅ IMPLEMENTED
- **Location**: `/oms/qc-queue`
- **Features**:
  - QC dashboard with stats (Pending, In Review, Needs Revision, Passed)
  - Filter by QC status, priority, assignee
  - Search by job ID, model, client
  - Batch approval/rejection
  - Assign QC tasks to specific post-producers
  - Time tracking (qcStartTime, qcEndTime)
  - Revision tracking via qcStatus field

**2. QuickBooks Invoice Creation** - ✅ IMPLEMENTED
- **Location**: `/oms/invoices` and `/oms/invoices/[id]`
- **Features**:
  - Invoice dashboard with stats
  - Filter by status, client, date range
  - QuickBooks sync status tracking
  - Invoice CRUD operations
  - Batch invoicing
  - Status tracking (draft, approved, sent, paid, overdue)
  - One-click invoice creation from jobs
  - Auto-populate line items from job products

**3. Bi-Weekly Payroll/Commissions** - ✅ IMPLEMENTED
- **Location**: `/oms/commissions`
- **Features**:
  - Summary cards (Pending Payment, Total Paid, Total Jobs)
  - Bi-weekly pay run system with automatic 2-week window calculation
  - Bulk operations (select multiple jobs, set payout date, mark as paid)
  - Filtering by payment status, tech, payout date range
  - Per-job breakdown (capture, travel, off-hours payouts)
  - Dual view (tech view for own jobs, admin view for all techs)
  - Commission payout date tracking
  - Payment status tracking (pending/paid)
- **Note**: Subcontractors paid separately from their invoice (varies by contractor)

**3.1 Subcontractor Invoice Import System** - ✅ IMPLEMENTED (Feb 2, 2026)
- **Location**: Job Financials Tab → External Supplier Expenses section
- **Purpose**: Hybrid system for importing subcontractor invoices via QuickBooks or manual entry
- **Collections**:
  - `Vendors` - Subcontractor vendor companies with QuickBooks integration
  - `Technicians.vendor` - Links outsourced partners to their vendor company
  - `Jobs.subcontractorVendor` - Auto-populated from assigned tech's vendor
  - `Jobs.subcontractorInvoiceAttachment` - PDF/CSV invoice upload
  - `Jobs.subInvoiceData` - Parsed invoice details (JSON)
  - `Jobs.subInvoiceImported` - Import status flag
- **Features**:
  - **Auto-Population**: Vendor auto-populated when outsourced tech assigned to job
  - **QuickBooks Pull**: Fetch existing bills from QuickBooks by vendor
  - **Manual Entry**: Enter invoice details manually or upload PDF/CSV
  - **PDF Parsing**: AI-powered text extraction from PDF invoices (unpdf library)
  - **CSV Parsing**: Parse invoice data from CSV files
  - **Auto-Fill Forms**: Extracted data auto-populates invoice fields (editable before save)
  - **QuickBooks Bill Creation**: Create bills in QuickBooks for manual entries
  - **Expense Integration**: Imported invoices automatically added to External Supplier Expenses
  - **Privacy**: All subcontractor invoice data restricted to admin/ops/sales roles
- **API Endpoints**:
  - `/api/quickbooks/bills/query` - Query bills from QuickBooks by vendor
  - `/api/quickbooks/bills` - Create bills in QuickBooks
  - `/api/sub-invoice/parse-pdf` - Parse PDF invoice files with text extraction
  - `/api/sub-invoice/parse` - Parse CSV invoice files
- **QuickBooks Client Methods**:
  - `queryBills(vendorId, fromDate, toDate)` - Query bills by vendor and date range
  - `createBill(billData)` - Create a new bill in QuickBooks
  - `getBill(billId)` - Retrieve a specific bill
- **UI Component**: `SubInvoiceImportPanel.tsx` - Integrated into FinancialsTab
- **Workflow**:
  1. Assign outsourced tech to job → Vendor auto-populated
  2. Navigate to Financials tab → Import panel appears
  3. Choose import method (QuickBooks or Manual)
  4. QuickBooks: Fetch bills, select, import
  5. Manual: Upload PDF/CSV or enter manually
  6. PDF uploaded → Text extracted → Fields auto-populate (editable)
  7. Click "Import Invoice" → Added to expenses (not saved yet)
  8. Review/edit expenses → Click "Done" → Saved to database
- **Technical Details**:
  - PDF parsing uses `unpdf` library (Next.js compatible)
  - Regex patterns extract: invoice number, date, amount, description
  - Array.prototype pollution cleaned before parsing (PDF.js compatibility)
  - Dates converted to YYYY-MM-DD format for HTML date inputs
  - Local form state prevents autosave interference
  - QuickBooks Bill created automatically if vendor has `quickbooks.vendorId`
- **Status**: ✅ FULLY FUNCTIONAL (Feb 3, 2026)
  - End-to-end workflow tested and deployed
  - PDF upload → parse → edit → save → QuickBooks sync working
  - Railway production deployment successful
- **Known Issues & Resolutions**:
  - ⚠️ **Payload CMS 3.74.0 Bug**: ESM import error with `image-size/fromFile`
    - **Fix**: Downgraded to Payload 3.73.0
    - **Root Cause**: image-size package changed exports, Payload hasn't updated
    - **Impact**: None (we don't use image uploads)
  - ⚠️ **Array.prototype Pollution**: Unknown source adding `Array.prototype.random`
    - **Workaround**: Cleaned in parse-pdf route before PDF.js execution
    - **TODO**: Find and remove pollution source permanently
  - ⚠️ **TypeScript Error**: `serialize.tsx` accessing `children` on nodes without it
    - **Fix**: Added type guard `if (!('children' in node) || node.children == null)`
- **Missing Features / Next Steps**:
  - ❌ **Vendor Invoice Dashboard** - No centralized view of all vendor invoices
    - Currently: Invoices only visible per-job in Financials tab
    - Needed: `/oms/vendor-invoices` page showing all invoices across all jobs
    - Features: Filter by vendor, date range, payment status; link to source job
  - ❌ **Payment Status Sync** - One-way sync only (OMS → QuickBooks)
    - Currently: Bills created in QB, but no sync back for payment status
    - Needed: Poll QB API to update `paymentStatus` field on expenses
    - Fields needed: `quickbooksId`, `paymentStatus`, `lastSyncedAt`
    - API: `/api/quickbooks/bills/sync-status` endpoint
  - ❌ **QuickBooks Bill ID Tracking** - Not stored on imported expenses
    - Currently: Bill created but ID not saved to expense record
    - Needed: Store QB Bill ID to enable status sync and avoid duplicates

**4. Invoicing Queue** - ✅ REDESIGNED (Jan 28, 2026)
- **Location**: `/oms/invoicing`
- **Features**:
  - Table layout (replaced card-based UI)
  - Workflow completion date tracking (last completed workflow step)
  - Total price calculation from line items
  - Filter by billing preference (invoice/statement), client, search
  - Sort by completion date, job ID, client
  - Quick actions (create invoice, mark as invoiced)
  - Invoice status tracking
  - Batch invoicing support

### Job Assignment Validation ✅ IMPLEMENTED (Jan 28, 2026)
- **Hook**: `validateTechAssignment.ts` (beforeChange hook)
- **Purpose**: Ensures essential job information exists before tech assignment
- **Validation Rules**:
  - ✅ At least one Product/Service must be added
  - ✅ Capture Address must be filled
  - ✅ Workflow Template must be assigned
  - ❌ Target Date NOT required (allows scheduling requests)
- **Error Message**: Lists missing fields with clear explanation
- **Benefits**:
  - Prevents incomplete jobs from being assigned
  - Ensures techs receive complete information
  - Works with scheduling request workflow
  - Flexible for both direct assignment and scheduling

### Phase 2: Business Integrations ❌ **NOT STARTED**

**4. HubSpot Integration**
- Goal: Sync CRM data between XZ-OMS and HubSpot
- Features:
  - Bi-directional client sync
  - Job activity tracking in HubSpot
  - Deal creation from jobs
  - Contact property updates
  - Activity timeline sync
  - Lead source tracking

**5. Payment Matching System**
- Goal: Match bulk payments to jobs and auto-generate internal invoices
- Features:
  - Payment import (CSV/manual entry)
  - Smart matching algorithm (by client, date range, amount)
  - Suggest job matches with manual override
  - Auto-generate internal invoices (batch invoice with job per line item)
  - Payment allocation tracking
  - Unmatched payment queue

**6. Twilio SMS Notifications**
- Goal: Add SMS notifications alongside email
- Features:
  - SMS notification preferences per client
  - SMS templates (similar to email templates)
  - Send SMS for job scheduled reminders, completion alerts, deliverables ready, payment confirmations
  - SMS delivery status tracking
  - Opt-out management

### Phase 3: Client Experience & Analytics ❌ **NOT STARTED**

**7. Client Portal**
- Goal: Self-service portal for clients
- Features:
  - Client authentication
  - Job dashboard (active/completed)
  - Download deliverables
  - Job status tracking
  - Request new jobs
  - View invoices
  - Communication history
  - Manage 3D model hosting

**8. Enhanced Reporting & Analytics**
- Goal: Business intelligence and performance tracking
- Features:
  - Revenue reports (by client, period, service)
  - Tech performance metrics
  - Job completion time analysis
  - Client activity reports
  - Profit margin tracking
  - Workflow bottleneck identification
  - CSV/Excel export
  - Email report delivery

**9. Mobile App for Technicians**
- **Goal**: Native mobile app for field technicians (Phase 3 strategic initiative)
- **Current State**: 
  - Employee techs use full OMS interface (desktop/tablet optimized)
  - Subcontractors use token-based web portal (mobile-friendly)
  - Both approaches are functional and meet current needs
- **Strategic Decision**: Keep current setup, build dedicated mobile app later when resources allow
- **Rationale**:
  - Current interfaces work well for their respective use cases
  - Avoid duplicating effort on responsive web when native app is the end goal
  - Focus development resources on core business features (Phase 1-2)
  - Mobile app requires proper planning, budget, and time for offline sync, native features
  - Build app when workflows are proven and stable
- **Planned Features**:
  - Job list and calendar view
  - Job details with color-coded sections
  - To-do list with completion tracking
  - Messaging with ops team
  - Job completion forms
  - Commission/payout tracking
  - Camera integration for photo uploads
  - GPS location tracking
  - Offline mode with sync
  - Push notifications
  - Barcode/QR scanning for equipment
- **Technology Options**: React Native, Flutter, or Native (iOS/Android)
- **Timeline**: Phase 3 (after Client Portal and Analytics)

---

##  Update History

### January 29, 2026 - Job Detail Page Refinements & Templating System
- **Job Templating System**:
  - Created `JobTemplates` collection with workflow, products, pricing, required fields
  - Template management pages: `/oms/job-templates`, `/oms/job-templates/create`, `/oms/job-templates/[id]`
  - Job creation form integrates templates (auto-populate fields, pre-fill products, non-blocking warnings)
  - Template dropdown filters by client-specific and general templates
  - Products from templates auto-added silently after job creation
  - Default job status changed to 'request' (removed Status field from creation form)
  - Added Job Templates link to OMS navigation (Sales/Ops access)
- **Estimated Duration Field**:
  - Auto-calculated from square footage (30 min per 1000 sqft)
  - Editable on job detail page with autosave
  - Recalculates when sqFt changes (unless manually overridden)
  - Hook logic: preserves manual edits, auto-updates on sqFt changes
- **Job ID Field Enhancements**:
  - Made editable for outsourcing partners with custom IDs
  - Added to job creation form (optional)
  - Autosave on job detail page
  - Generate button for random ID when empty
- **Job Detail Page Reorganization**:
  - Removed duplicate Status field from Basic Information (already shown at top)
  - Moved Client to Basic Information as first field
  - Added "View Client" button next to client field (navigates to `/oms/clients/{id}`)
  - Removed standalone Client Information section
  - Reorganized Location section:
    - Row 1: City, State, ZIP
    - Row 2: Region, Property Type
    - Row 3: Square Feet, Estimated Duration
  - All location and property details now grouped together
- **Workflow Field Consistency**:
  - Removed "Assign Workflow" and "Change Template" buttons
  - Workflow now uses autosave pattern (saves on selection)
  - Consistent with all other fields on job detail page
  - Helpful text: "Workflow will be assigned/updated automatically when you select a template"

### January 28, 2026 - Session 4 - Post-Processing Workflow Integration
- **Renamed "QC" to "Post-Processing"**:
  - Tab renamed from "QC" to "Post-Processing" for accurate terminology
  - Section header updated to "🎬 Post-Processing"
  - Backend field names remain as `qcStatus`, `qcNotes` for consistency
  - Better reflects actual work (editing, processing, quality checks)
- **Messaging System Integration**:
  - All post-processing actions now create messages in job thread
  - **Start Review**: Creates "Post-processing review started" message (type: update)
  - **Approve & Complete**: Creates "Post-processing approved. Job ready for client delivery" message (type: update)
  - **Request Revision**: Creates "Revision requested: [description]" message (type: qc-feedback)
  - **Reject**: Creates "Post-processing rejected" message (type: update)
  - Messages automatically trigger email notifications to relevant parties
  - Tech receives notification for revision requests and can reply in message thread
- **Workflow Synchronization**:
  - "Approve & Complete" now completes the "Post-Production" workflow step
  - Automatically advances workflow to next step
  - Marks step as completed with timestamp
  - Triggers downstream workflow automations
  - Provides visual feedback in workflow timeline
- **Two-Way Communication**:
  - Revision requests notify tech via existing messaging system
  - Tech can ask clarifying questions in message thread
  - Full conversation history preserved in Messages tab
  - Works for both employee techs and subcontractors
- **UX Improvements**:
  - Error messages now display cleanly without JSON formatting
  - Error display duration increased to 8 seconds for better readability
  - Smart error parsing extracts clean messages from API responses
  - Styled error boxes with proper spacing and colors
- **Bug Fixes**:
  - Fixed BeforeDashboard Client Component error (added 'use client' directive)
  - Fixed message creation API calls (added required `author` field)
  - Corrected field names (`message` instead of `content`)
  - Moved hover effects from JavaScript to CSS

### January 28, 2026 - Session 3 - Instructions Tab & Tech Portal Enhancements
- **Instructions Tab Reorganization**:
  - 3-column layout: POC, Upload Links, To-Do List (first row)
  - Full-width sections: Scheduling Notes, General Instructions (subsequent rows)
  - Moved Scheduling Request panels to Details tab
  - To-Do List converted to clean bullet format
  - Filters out products with `excludeFromCalendar` flag
- **Custom To-Do Items**:
  - Added `customTodoItems` field to Jobs collection (array with task/notes)
  - Inline form UI for adding custom tasks (not product-based)
  - Hover-to-remove functionality for custom items
  - Autosave integration
  - Synced with tech portal and calendar invites
- **Calendar Invite Restructuring**:
  - New 8-section format: To-Do List, Job Details, Location, POC, Tech Portal Access, Scheduling Notes, Instructions, Upload Locations
  - Combined product items and custom tasks in single numbered list
  - Added timezone to target date display
  - POC email excluded from calendar (privacy)
  - Tech portal access link included
  - Auto-updates on all field changes (POC, notes, links, custom items, etc.)
- **Tech Portal Layout Improvements**:
  - Color-coded sections with icons
  - Numbered badges for to-do items (1, 2, 3...)
  - Prominent blue card for Services/To-Do List
  - Improved visual hierarchy with better spacing
  - Clickable upload link cards with hover effects
  - 2-column grid for key details at top
- **Security Fixes**:
  - **CRITICAL**: Restricted admin panel access to admin roles only (super-admin, sales-admin, ops-manager)
  - Techs and non-admin users can no longer access `/admin`
  - Updated Users collection access control from `authenticated` to `isAdmin`
- **Navigation Improvements**:
  - Added prominent "Go to OMS" button on admin dashboard
  - Created custom unauthorized page with "Go to Operations Dashboard" button
  - Removed Reports link from navigation (not yet built)
- **Bug Fixes**:
  - Fixed upload link autosave race condition (removed unnecessary `fetchJob` calls)
  - Fixed empty string handling for upload links (null vs empty string)
  - Resolved 404 errors from Reports prefetching

### January 28, 2026 - Session 2
- **Notifications Page**: Full-featured notifications page at `/oms/notifications` with all/unread/read filters, mark as read/unread, delete actions
- **Calendar Invite Enhancement**: Added tech portal link to calendar invites for direct access without login
- **Tech Assignment Validation**: Validates essential fields (products, address, workflow) before allowing tech assignment
- **Invoicing Queue Redesign**: Converted to table layout with workflow completion dates and price calculation
- **Timezone/Target Date Fix**: Fixed autosave issues using `commit()` method and `params.id` to avoid closure problems

### January 28, 2026 - Session 1
- **Client Default Workflow**: Auto-applied on job creation and client changes
- **Quick Edit Fields**: Client and Model Name with instant autosave
- **Enhanced Job Details**: Added `propertyType` and `purposeOfScan` fields
- **Removed Redundant Fields**: Completion fields now tracked via workflow system
- **Dropdown Autosave Fix**: Using `commit()` method for immediate saves
- **Tech Feedback Tab**: Refined layout with timeline and tech contact info
- **Workflow Completion**: Per-step notes tracking in tech portal
- **Scheduling System**: 3 request types (time-windows, specific-time, tech-proposes)
- **Calendar Exclusion**: Products can be excluded from calendar invites
- **Modal Save Behavior**: Products/Services and External Expenses save only on "Done" click

### January 27, 2026
- **Subcontractor Messaging**: Token-based links for techs without accounts
- **Job Messaging System**: Dual notifications (email + in-app)
- **Tab Navigation**: Site-wide query parameter support
- **Workflow Calendar**: Product exclusion feature
- **OMS-Native CRUD**: Client and product management

---

**Last Updated**: January 29, 2026
**Maintained By**: Development Team
**Purpose**: Quick reference for AI assistants and developers
