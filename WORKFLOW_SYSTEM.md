# Workflow Automation System

## Overview
This document describes the new workflow automation system that replaces manual status management with configurable, template-driven workflows.

## Architecture

### Collections

#### WorkflowTemplates
Admin-configurable workflow definitions that can be assigned to jobs.

**Key Fields:**
- `name`: Template name (e.g., "Outsourced - Scan Only")
- `jobType`: Type of job this applies to
- `isActive`: Whether this template can be used for new jobs
- `steps`: Array of workflow steps (ordered)

**Step Configuration:**
Each step includes:
- `name`: Step name
- `description`: What needs to be done
- `order`: Sequence number
- `statusMapping`: What job status this step represents
- `requiredRole`: Who can complete this step
- `actionLabel`: Button text for completing step
- `requiresDeliverables`: Whether deliverable URLs must be added
- `triggers`: Automation actions when step completes

**Automation Triggers:**
- `sendNotification`: Create in-app notification
- `notificationRecipients`: Who receives the notification
- `notificationMessage`: Message template (supports {{jobId}}, {{modelName}}, etc.)
- `sendClientEmail`: Send email to client
- `emailTemplate`: Which email template to use
- `createInvoice`: Auto-create invoice
- `createRecurringInvoice`: Create recurring invoice (e.g., hosting)
- `recurringInvoiceDelay`: Days until recurring invoice (e.g., 365)
- `recurringInvoiceAmount`: Amount for recurring invoice

#### Jobs (Updated)
Added `workflowTemplate` relationship field to link jobs to their workflow.

**Legacy Fields:**
- `workflowType`: Marked as read-only, kept for backward compatibility
- `status`: Still exists but will be computed from current workflow step

## Default Templates

### 1. Outsourced - Scan Only
**Steps:**
1. Job Scheduled → Status: scheduled
2. Scan Complete → Status: scanned
3. Uploaded to Client Account → Status: scanned
4. QC Review → Status: qc (requires deliverables)
5. Ready for Invoice → Status: done (creates invoice)

### 2. Direct - Scan + Hosting
**Steps:**
1. Job Scheduled → Status: scheduled
2. Scan Complete → Status: scanned
3. Model Uploaded → Status: scanned
4. Post-Production → Status: qc (requires deliverables)
5. Quality Check → Status: qc (sends client email)
6. Delivered to Client → Status: done (creates invoice + recurring hosting invoice after 1 year)

### 3. Direct - Scan + Floor Plan
**Steps:**
1. Job Scheduled → Status: scheduled
2. Scan Complete → Status: scanned
3. Model Uploaded → Status: scanned
4. Floor Plan Drafting → Status: qc
5. Post-Production → Status: qc (requires deliverables)
6. Quality Check → Status: qc (sends client email)
7. Delivered to Client → Status: done (creates invoice)

## Implementation Status

### Phase 1: Foundation ✅ COMPLETE
- ✅ WorkflowTemplates collection created
- ✅ Jobs collection updated with workflow template link
- ✅ Default templates seeded (3 workflows)
- ✅ Documentation created

### Phase 2: Automation Engine ✅ COMPLETE
- ✅ Workflow step completion hook (`workflowStepCompletion.ts`)
- ✅ Auto-update job status based on current step
- ✅ Trigger notifications on step completion
- ✅ Placeholder for invoice generation
- ✅ Placeholder for recurring invoices
- ✅ Timeline UI component (`WorkflowTimeline.tsx`)
- ✅ Timeline integrated into job detail page

### Phase 3: Action Buttons & Interactions (NEXT)
- [ ] Add "Complete Step" action buttons
- [ ] Step completion modal (with notes, deliverables if required)
- [ ] Role-based button visibility
- [ ] Deliverables validation

### Phase 4: Tech Portal (FUTURE)
- [ ] Simplified job list (my assigned jobs only)
- [ ] Action-focused detail view
- [ ] Quick complete buttons
- [ ] Hide admin fields

### Phase 5: Advanced Features (FUTURE)
- [ ] Email integration for client notifications
- [ ] Invoice creation integration
- [ ] Recurring invoice scheduling system
- [ ] Admin template editor UI

## Benefits

1. **Consistency**: Every job follows the same process
2. **Automation**: Status updates, notifications, and invoices happen automatically
3. **Visibility**: Timeline shows exactly where each job is
4. **Flexibility**: Admins can create/modify workflows without code changes
5. **Role-Based**: Each step specifies who can complete it
6. **Accountability**: Track who completed each step and when

## Usage

### For Admins
1. Go to Configuration → Workflow Templates
2. Create or edit templates
3. Define steps, roles, and automation triggers
4. Assign templates to jobs

### For Techs
1. View assigned jobs
2. See current step and action button
3. Click "Mark Scan Complete" (or similar)
4. Add notes if needed
5. System auto-advances workflow

### For Ops/QC
1. Receive notifications when jobs reach their steps
2. Complete QC reviews
3. Add deliverable URLs
4. System notifies next person in workflow

## Technical Notes

### Files Created/Modified:
- **Collections:**
  - `src/collections/WorkflowTemplates.ts` - Template collection definition
  - `src/collections/Jobs.ts` - Added `workflowTemplate` field and hook registration
  
- **Hooks:**
  - `src/collections/Jobs/hooks/workflowStepCompletion.ts` - Main automation engine
  - Registered in `beforeChange` hooks array
  
- **Components:**
  - `src/components/oms/WorkflowTimeline.tsx` - Visual timeline component
  - Integrated in `src/app/oms/jobs/[id]/page.tsx`
  
- **Seed Data:**
  - `src/seed/workflowTemplates.ts` - Default workflow templates
  
- **Documentation:**
  - `WORKFLOW_SYSTEM.md` - This file

### How It Works:
1. Admin assigns workflow template to job
2. Job starts at first step (Job Request)
3. When step is marked complete in `workflowSteps` array:
   - Hook detects completion
   - Updates job status based on step's `statusMapping`
   - Creates in-app notifications based on triggers
   - Executes other triggers (email, invoice, etc.)
4. Timeline UI shows visual progress
5. Next step becomes active

### Database Schema:
- Jobs have `workflowTemplate` (relationship to workflow-templates)
- Jobs have `workflowSteps` (array of completed steps)
- Status is auto-updated by hook based on current step

### Next Steps for Completion:
1. Add action buttons to complete workflow steps
2. Implement step completion modal
3. Add role-based permissions for buttons
4. Implement email sending for client notifications
5. Implement invoice creation logic
