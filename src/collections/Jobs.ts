import type { CollectionConfig } from 'payload'
import type { Access } from 'payload'

import { isAdmin } from '../access/isAdmin'
import { populateLineItemInstructions, populateTechInstructions } from './Jobs/hooks/populateInstructions'
import { afterWorkflowStepUpdate } from './Jobs/hooks/afterWorkflowStepUpdate'
import { autoGenerateExpenses } from './Jobs/hooks/autoGenerateExpenses'
import { workflowStepCompletion } from './Jobs/hooks/workflowStepCompletion'
import { populateWorkflowSteps } from './Jobs/hooks/populateWorkflowSteps'
import { updateInvoiceStatus } from './Jobs/hooks/updateInvoiceStatus'
import { applyClientDefaultWorkflow } from './Jobs/hooks/applyClientDefaultWorkflow'
import { validateTechAssignment } from './Jobs/hooks/validateTechAssignment'

export const Jobs: CollectionConfig = {
  slug: 'jobs',
  hooks: {
    beforeChange: [applyClientDefaultWorkflow, populateWorkflowSteps, validateTechAssignment, autoGenerateExpenses, workflowStepCompletion, updateInvoiceStatus, populateTechInstructions],
    afterChange: [afterWorkflowStepUpdate],
  },
  access: {
    create: isAdmin,
    read: ({ req: { user } }) => {
      if (!user) return false
      if (['super-admin', 'sales-admin', 'ops-manager', 'post-producer'].includes(user.role)) {
        return true
      }
      return true
    },
    update: ({ req: { user } }) => {
      if (!user) return false
      if (['super-admin', 'sales-admin', 'ops-manager', 'post-producer'].includes(user.role)) {
        return true
      }
      if (user.role === 'tech') {
        return true
      }
      return false
    },
    delete: isAdmin,
  },
  admin: {
    useAsTitle: 'modelName',
    defaultColumns: ['jobId', 'modelName', 'status', 'priority'],
  },
  fields: [
    {
      name: 'jobId',
      type: 'text',
      unique: true,
      admin: {
        description: 'Unique job identifier. Can be manually set for outsourcing partners who use their own IDs.',
      },
    },
    {
      name: 'apInvoiceNumber',
      type: 'text',
      admin: {
        description: 'Matterport AP Invoice Number for payment matching (e.g., AP-recXXX)',
      },
    },
    {
      name: 'modelName',
      type: 'text',
      required: true,
    },
    {
      name: 'priority',
      type: 'select',
      defaultValue: 'normal',
      options: [
        { label: 'Low', value: 'low' },
        { label: 'Normal', value: 'normal' },
        { label: 'High', value: 'high' },
        { label: 'Rush', value: 'rush' },
      ],
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'request',
      options: [
        { label: 'Request', value: 'request' },
        { label: 'Scheduled', value: 'scheduled' },
        { label: 'Scanned', value: 'scanned' },
        { label: 'QC', value: 'qc' },
        { label: 'Done', value: 'done' },
        { label: 'Archived', value: 'archived' },
      ],
      access: {
        update: ({ req: { user } }) => {
          if (!user) return false
          // Allow admins and tech users to update status
          if (['super-admin', 'sales-admin', 'ops-manager', 'post-producer', 'tech'].includes(user.role)) {
            return true
          }
          return false
        },
      },
    },
    {
      name: 'invoiceStatus',
      type: 'select',
      label: 'Invoice Status',
      defaultValue: 'not-invoiced',
      options: [
        { label: 'Not Invoiced', value: 'not-invoiced' },
        { label: 'Ready', value: 'ready' },
        { label: 'Invoiced', value: 'invoiced' },
        { label: 'Paid', value: 'paid' },
      ],
      admin: {
        description: 'Track invoicing status of completed jobs',
      },
    },
    {
      name: 'invoice',
      type: 'relationship',
      relationTo: 'invoices' as any,
      hasMany: false,
      admin: {
        description: 'Invoice this job is included in',
      },
    },
    {
      name: 'invoicedAt',
      type: 'date',
      admin: {
        description: 'Date this job was invoiced',
        readOnly: true,
      },
    },
    {
      name: 'client',
      type: 'relationship',
      relationTo: 'clients' as any,
      required: true,
      label: 'Client / Outsourcing Partner',
      admin: {
        description: 'For outsourced jobs, this is the partner (e.g., Matterport). For direct jobs, this is the actual client.',
      },
    },
    {
      name: 'endClientName',
      type: 'text',
      label: 'End Client Name',
      admin: {
        condition: (data) => data.isOutsourced === true,
        description: 'The actual end client when job is outsourced (e.g., "Spencer Technologies (4)")',
      },
    },
    {
      name: 'endClientCompany',
      type: 'text',
      label: 'End Client Company',
      admin: {
        condition: (data) => data.isOutsourced === true,
        description: 'Company name only, for filtering and reporting',
      },
    },
    {
      name: 'tech',
      type: 'relationship',
      relationTo: 'technicians' as any,
      label: 'Assigned Technician',
    },
    {
      name: 'sitePOCName',
      type: 'text',
    },
    {
      name: 'sitePOCPhone',
      type: 'text',
    },
    {
      name: 'sitePOCEmail',
      type: 'email',
    },
    {
      name: 'captureAddress',
      type: 'text',
      label: 'Capture Address',
    },
    {
      name: 'city',
      type: 'text',
    },
    {
      name: 'state',
      type: 'text',
    },
    {
      name: 'zip',
      type: 'text',
    },
    {
      name: 'sqFt',
      type: 'number',
      label: 'Square Feet',
    },
    {
      name: 'estimatedDuration',
      type: 'number',
      label: 'Estimated Duration (hours)',
      admin: {
        description: 'Estimated time to complete this job. Auto-calculated from square footage (30 min per 1000 sqft) or manually entered.',
      },
      hooks: {
        beforeChange: [
          async ({ data, req, operation, value, previousValue }) => {
            // Auto-calculate on create if not manually set
            if (operation === 'create' && data && data.sqFt !== undefined && value === undefined) {
              return (data.sqFt / 1000) * 0.5
            }
            
            // Auto-recalculate on update if sqFt changed and estimatedDuration wasn't manually edited
            if (operation === 'update' && data && data.sqFt !== undefined) {
              // Check if estimatedDuration is being explicitly set in this update
              if (value !== undefined && value !== previousValue) {
                // User is manually editing estimatedDuration, don't override
                return value
              }
              
              // sqFt changed but estimatedDuration wasn't touched, recalculate
              return (data.sqFt / 1000) * 0.5
            }
            
            return value
          }
        ]
      }
    },
    {
      name: 'propertyType',
      type: 'select',
      options: [
        { label: 'Commercial', value: 'commercial' },
        { label: 'Residential', value: 'residential' },
        { label: 'Industrial', value: 'industrial' },
        { label: 'Other', value: 'other' },
      ],
    },
    {
      name: 'schedulingNotes',
      type: 'textarea',
      label: 'Scheduling Notes / Restrictions',
    },
    {
      name: 'region',
      type: 'select',
      label: 'Service Region',
      options: [
        { label: 'Austin Area', value: 'austin' },
        { label: 'San Antonio Area', value: 'san-antonio' },
        { label: 'Outsourced (Other Areas)', value: 'outsourced' },
        { label: 'Other', value: 'other' },
      ],
      admin: {
        description: 'Geographic region for calendar color-coding',
      },
    },
    {
      name: 'captureType',
      type: 'select',
      options: [
        { label: 'Matterport', value: 'matterport' },
        { label: 'LiDAR', value: 'lidar' },
        { label: 'Drone', value: 'drone' },
        { label: 'Other', value: 'other' },
      ],
    },
    {
      name: 'equipment',
      type: 'relationship',
      relationTo: 'equipment' as any,
    },
    {
      name: 'purposeOfScan',
      type: 'textarea',
      label: 'Purpose of Scan',
    },
    {
      name: 'techInstructions',
      type: 'textarea',
      label: 'General Instructions for Tech',
      admin: {
        description: 'Overall instructions/notes for the technician assigned to this job',
      },
      // hooks: {
      //   beforeChange: [populateTechInstructions],
      // },
    },
    {
      name: 'lineItems',
      type: 'array',
      label: 'To-Do List / Services',
      // hooks: {
      //   beforeChange: [populateLineItemInstructions],
      // },
      fields: [
        {
          name: 'product',
          type: 'relationship',
          relationTo: 'products' as any,
          required: true,
        },
        {
          name: 'quantity',
          type: 'number',
          required: true,
          defaultValue: 1,
        },
        {
          name: 'instructions',
          type: 'textarea',
          label: 'Specific Instructions',
          admin: {
            description: 'Detailed instructions for completing this specific item',
          },
        },
        {
          name: 'excludeFromCalendar',
          type: 'checkbox',
          label: 'Exclude from Tech Calendar',
          defaultValue: false,
          admin: {
            description: 'Hide this item from the technician\'s calendar invite to-do list (e.g., for post-production only tasks)',
          },
        },
        {
          name: 'amount',
          type: 'number',
          label: 'Custom Amount',
          min: 0,
          admin: {
            description: 'Override the product base price with a custom amount. Leave empty to use product default.',
          },
        },
      ],
    },
    {
      name: 'customTodoItems',
      type: 'array',
      label: 'Custom To-Do Items',
      admin: {
        description: 'Add custom to-do items that are not products (e.g., specific tasks, reminders)',
      },
      fields: [
        {
          name: 'task',
          type: 'text',
          required: true,
          label: 'Task Description',
        },
        {
          name: 'notes',
          type: 'textarea',
          label: 'Additional Notes',
        },
      ],
    },
    {
      name: 'targetDate',
      type: 'date',
      admin: {
        date: {
          pickerAppearance: 'dayAndTime',
        },
      },
    },
    {
      name: 'timezone',
      type: 'select',
      label: 'Timezone',
      defaultValue: 'America/Chicago',
      options: [
        { label: 'Central Time (Austin/San Antonio)', value: 'America/Chicago' },
        { label: 'Eastern Time', value: 'America/New_York' },
        { label: 'Mountain Time', value: 'America/Denver' },
        { label: 'Pacific Time', value: 'America/Los_Angeles' },
        { label: 'Arizona (No DST)', value: 'America/Phoenix' },
      ],
      admin: {
        description: 'Timezone for the job location',
      },
    },
    {
      name: 'scannedDate',
      type: 'date',
    },
    {
      name: 'googleCalendarEventId',
      type: 'text',
      admin: {
        description: 'Google Calendar event ID for updating existing events',
        readOnly: true,
      },
    },
    {
      name: 'uploadLink',
      type: 'text',
      label: 'Primary Upload Link',
      admin: {
        description: 'Where to upload the main project files (e.g., Matterport scans)',
      },
    },
    {
      name: 'mediaUploadLink',
      type: 'text',
      label: 'Media Upload Link',
      admin: {
        description: 'Where to upload additional media (photos, videos, etc.)',
      },
    },
    {
      name: 'gasExpense',
      type: 'number',
    },
    {
      name: 'isOutsourced',
      type: 'checkbox',
    },
    {
      name: 'vendorPrice',
      type: 'number',
      label: 'Capture Payout (from vendor)',
    },
    {
      name: 'travelPayout',
      type: 'number',
      label: 'Travel Payout',
    },
    {
      name: 'offHoursPayout',
      type: 'number',
      label: 'Off-Hours Payout',
    },
    {
      name: 'commissionPayoutDate',
      type: 'date',
      label: 'Commission Payout Date',
      index: true,
    },
    {
      name: 'commissionPaymentStatus',
      type: 'select',
      label: 'Commission Payment Status',
      defaultValue: 'pending',
      index: true,
      options: [
        { label: 'Pending', value: 'pending' },
        { label: 'Paid', value: 'paid' },
      ],
    },
    {
      name: 'commissionPaidAt',
      type: 'date',
      label: 'Commission Paid At',
      index: true,
    },
    {
      name: 'workflowTemplate',
      type: 'relationship',
      relationTo: 'workflow-templates' as any,
      label: 'Workflow Template',
      admin: {
        description: 'The workflow template that defines steps and automation for this job',
      },
    },
    {
      name: 'workflowSteps',
      type: 'array',
      label: 'Workflow Progress',
      admin: {
        description: 'Track completion of workflow steps',
      },
      fields: [
        {
          name: 'stepName',
          type: 'text',
          required: true,
        },
        {
          name: 'completed',
          type: 'checkbox',
          defaultValue: false,
        },
        {
          name: 'completedAt',
          type: 'date',
          admin: {
            date: {
              pickerAppearance: 'dayAndTime',
            },
          },
        },
        {
          name: 'completedBy',
          type: 'text',
        },
        {
          name: 'notes',
          type: 'textarea',
        },
      ],
    },
    {
      name: 'qcChecklist',
      type: 'group',
      fields: [
        {
          name: 'accuracyOk',
          type: 'checkbox',
        },
        {
          name: 'coverageOk',
          type: 'checkbox',
        },
        {
          name: 'fileNamingOk',
          type: 'checkbox',
        },
      ],
    },
    {
      name: 'qcStatus',
      type: 'select',
      defaultValue: 'pending',
      options: [
        { label: 'Pending', value: 'pending' },
        { label: 'In Review', value: 'in-review' },
        { label: 'Passed', value: 'passed' },
        { label: 'Needs Revision', value: 'needs-revision' },
        { label: 'Rejected', value: 'rejected' },
      ],
    },
    {
      name: 'qcAssignedTo',
      type: 'relationship',
      relationTo: 'users',
      hasMany: false,
      label: 'QC Assigned To',
      admin: {
        description: 'Post-producer assigned to review this job',
      },
    },
    {
      name: 'qcNotes',
      type: 'textarea',
      label: 'QC Notes',
      admin: {
        description: 'Notes from QC review process',
        rows: 4,
      },
    },
    {
      name: 'qcStartTime',
      type: 'date',
      label: 'QC Started At',
      admin: {
        date: {
          pickerAppearance: 'dayAndTime',
        },
        description: 'When QC review started',
      },
    },
    {
      name: 'qcEndTime',
      type: 'date',
      label: 'QC Completed At',
      admin: {
        date: {
          pickerAppearance: 'dayAndTime',
        },
        description: 'When QC review was completed',
      },
    },
    {
      name: 'revisionRequests',
      type: 'array',
      label: 'Revision Requests',
      admin: {
        description: 'Track revision requests during QC',
      },
      fields: [
        {
          name: 'requestedBy',
          type: 'text',
          label: 'Requested By',
        },
        {
          name: 'requestedAt',
          type: 'date',
          label: 'Requested At',
          admin: {
            date: {
              pickerAppearance: 'dayAndTime',
            },
          },
        },
        {
          name: 'description',
          type: 'textarea',
          label: 'Revision Description',
          required: true,
        },
        {
          name: 'resolved',
          type: 'checkbox',
          label: 'Resolved',
          defaultValue: false,
        },
        {
          name: 'resolvedAt',
          type: 'date',
          label: 'Resolved At',
          admin: {
            date: {
              pickerAppearance: 'dayAndTime',
            },
            condition: (data, siblingData) => siblingData?.resolved === true,
          },
        },
      ],
    },
    {
      name: 'totalPrice',
      type: 'number',
    },
    {
      name: 'vendorCost',
      type: 'number',
    },
    {
      name: 'margin',
      type: 'number',
    },
    {
      name: 'externalExpenses',
      type: 'array',
      label: 'External Supplier Expenses',
      admin: {
        description: 'Track costs for floor plans, as-builts, photo editing, etc.',
      },
      fields: [
        {
          name: 'description',
          type: 'text',
          required: true,
          label: 'Service Description',
          admin: {
            placeholder: 'e.g., Floor Plans, Photo Editing, As-Builts',
          },
        },
        {
          name: 'supplier',
          type: 'text',
          label: 'Supplier/Vendor Name',
          admin: {
            placeholder: 'e.g., John Doe Drafting',
          },
        },
        {
          name: 'contactInfo',
          type: 'text',
          label: 'Supplier Contact',
          admin: {
            placeholder: 'Email or phone',
          },
        },
        {
          name: 'amount',
          type: 'number',
          required: true,
          label: 'Amount',
          admin: {
            step: 0.01,
          },
        },
        {
          name: 'paymentStatus',
          type: 'select',
          label: 'Payment Status',
          defaultValue: 'unpaid',
          options: [
            { label: 'Unpaid', value: 'unpaid' },
            { label: 'Paid', value: 'paid' },
            { label: 'Pending', value: 'pending' },
          ],
        },
        {
          name: 'paidDate',
          type: 'date',
          label: 'Date Paid',
          admin: {
            condition: (data, siblingData) => siblingData?.paymentStatus === 'paid',
            date: {
              pickerAppearance: 'dayAndTime',
            },
          },
        },
        {
          name: 'notes',
          type: 'textarea',
          label: 'Notes',
        },
        {
          name: 'autoGenerated',
          type: 'checkbox',
          label: 'Auto-generated from product',
          defaultValue: false,
          admin: {
            readOnly: true,
            description: 'Indicates this expense was automatically created based on product settings',
          },
        },
        {
          name: 'quickbooksId',
          type: 'text',
          label: 'QuickBooks Bill ID',
          admin: {
            readOnly: true,
            description: 'ID of the corresponding bill in QuickBooks',
          },
        },
        {
          name: 'quickbooksDocNumber',
          type: 'text',
          label: 'QuickBooks Doc Number',
          admin: {
            readOnly: true,
            description: 'Document number of the bill in QuickBooks',
          },
        },
        {
          name: 'quickbooksSyncedAt',
          type: 'date',
          label: 'Last QB Sync',
          admin: {
            readOnly: true,
            description: 'When this expense was last synced with QuickBooks',
            date: {
              pickerAppearance: 'dayAndTime',
            },
          },
        },
      ],
    },
    {
      name: 'subcontractorVendor',
      type: 'relationship',
      relationTo: 'vendors',
      label: 'Subcontractor Vendor',
      admin: {
        description: 'Auto-populated when outsourced tech is assigned, or manually set',
        readOnly: false,
        position: 'sidebar',
      },
      access: {
        read: ({ req: { user } }) => {
          if (!user) return false
          return ['super-admin', 'ops-manager', 'sales-admin', 'post-producer'].includes(user.role)
        },
        update: ({ req: { user } }) => {
          if (!user) return false
          return ['super-admin', 'ops-manager', 'sales-admin'].includes(user.role)
        },
      },
      hooks: {
        beforeChange: [
          async ({ data, req, operation, value, siblingData }) => {
            if (siblingData?.tech) {
              const techId = typeof siblingData.tech === 'string' 
                ? siblingData.tech 
                : siblingData.tech.id

              try {
                const tech = await req.payload.findByID({
                  collection: 'technicians',
                  id: techId,
                })

                if (tech?.type === 'partner' && tech?.vendor) {
                  // tech.vendor can be a number (ID), string (ID), or the full vendor object
                  const vendorId = typeof tech.vendor === 'object' && tech.vendor !== null
                    ? tech.vendor.id
                    : tech.vendor
                  
                  console.log(`[Auto-populate] Setting vendor ${vendorId} from tech ${techId}`)
                  return vendorId
                }
              } catch (error: any) {
                if (error.status !== 404) {
                  console.error('[Auto-populate vendor] Error fetching tech:', error)
                }
              }
            }

            return value
          }
        ]
      }
    },
    {
      name: 'subcontractorInvoiceAttachment',
      type: 'relationship',
      relationTo: 'media',
      label: 'Subcontractor Invoice Attachment',
      admin: {
        description: 'PDF or CSV invoice from subcontractor',
        position: 'sidebar',
      },
      access: {
        read: ({ req: { user } }) => {
          if (!user) return false
          return ['super-admin', 'ops-manager', 'sales-admin', 'post-producer'].includes(user.role)
        },
        update: ({ req: { user } }) => {
          if (!user) return false
          return ['super-admin', 'ops-manager', 'sales-admin'].includes(user.role)
        },
      },
    },
    {
      name: 'subInvoiceData',
      type: 'json',
      label: 'Subcontractor Invoice Data',
      admin: {
        description: 'Parsed or manually entered invoice details',
        position: 'sidebar',
      },
      access: {
        read: ({ req: { user } }) => {
          if (!user) return false
          return ['super-admin', 'ops-manager', 'sales-admin', 'post-producer'].includes(user.role)
        },
        update: ({ req: { user } }) => {
          if (!user) return false
          return ['super-admin', 'ops-manager', 'sales-admin'].includes(user.role)
        },
      },
    },
    {
      name: 'subInvoiceImported',
      type: 'checkbox',
      label: 'Subcontractor Invoice Imported',
      defaultValue: false,
      admin: {
        description: 'Indicates invoice has been imported to QuickBooks and added to expenses',
        position: 'sidebar',
      },
      access: {
        read: ({ req: { user } }) => {
          if (!user) return false
          return ['super-admin', 'ops-manager', 'sales-admin', 'post-producer'].includes(user.role)
        },
        update: ({ req: { user } }) => {
          if (!user) return false
          return ['super-admin', 'ops-manager', 'sales-admin'].includes(user.role)
        },
      },
    },
    {
      name: 'discount',
      type: 'group',
      label: 'Discount',
      fields: [
        {
          name: 'type',
          type: 'select',
          label: 'Discount Type',
          defaultValue: 'none',
          options: [
            { label: 'None', value: 'none' },
            { label: 'Fixed Amount', value: 'fixed' },
            { label: 'Percentage', value: 'percentage' },
          ],
        },
        {
          name: 'value',
          type: 'number',
          label: 'Discount Value',
          admin: {
            step: 0.01,
            description: 'Enter dollar amount for fixed or percentage for percentage discount',
            condition: (data) => data.discount?.type !== 'none',
          },
        },
        {
          name: 'amount',
          type: 'number',
          label: 'Calculated Discount Amount',
          admin: {
            readOnly: true,
            description: 'Automatically calculated discount in dollars',
          },
        },
      ],
    },
    {
      name: 'subtotal',
      type: 'number',
      label: 'Subtotal (before tax & discount)',
      admin: {
        readOnly: true,
        description: 'Auto-calculated from line items',
      },
    },
    {
      name: 'taxAmount',
      type: 'number',
      label: 'Tax Amount',
      admin: {
        readOnly: true,
        description: 'Auto-calculated based on client tax rate and taxable products',
      },
    },
    {
      name: 'totalWithTax',
      type: 'number',
      label: 'Total Invoice Amount',
      admin: {
        readOnly: true,
        description: 'Subtotal + Tax - Discount',
      },
    },
    {
      name: 'completionToken',
      type: 'text',
      admin: {
        description: 'Unique token for tech portal access',
      },
    },
    {
      name: 'deliverables',
      type: 'group',
      label: 'Deliverables & Assets',
      admin: {
        description: 'Links to final deliverables for client access',
      },
      fields: [
        {
          name: 'model3dLink',
          type: 'text',
          label: '3D Model Link',
          admin: {
            description: 'Link to the 3D model (e.g., Matterport, CloudPano)',
            placeholder: 'https://my.matterport.com/show/?m=...',
          },
        },
        {
          name: 'floorPlansLink',
          type: 'text',
          label: 'Floor Plans Link',
          admin: {
            description: 'Link or zip file URL for floor plans',
            placeholder: 'https://drive.google.com/... or https://dropbox.com/...',
          },
        },
        {
          name: 'photosVideosLink',
          type: 'text',
          label: 'Photos/Videos Link',
          admin: {
            description: 'Link or zip file URL for photos and videos',
            placeholder: 'https://drive.google.com/... or https://dropbox.com/...',
          },
        },
        {
          name: 'asBuiltsLink',
          type: 'text',
          label: 'As-Built Files Link',
          admin: {
            description: 'Link or zip file URL for as-built documentation',
            placeholder: 'https://drive.google.com/... or https://dropbox.com/...',
          },
        },
        {
          name: 'otherAssetsLink',
          type: 'text',
          label: 'Other Assets Link',
          admin: {
            description: 'Link for any additional deliverables',
            placeholder: 'https://...',
          },
        },
        {
          name: 'deliveryNotes',
          type: 'textarea',
          label: 'Delivery Notes',
          admin: {
            description: 'Internal notes about the deliverables',
            rows: 3,
          },
        },
        {
          name: 'deliveredDate',
          type: 'date',
          label: 'Date Delivered',
          admin: {
            description: 'When the deliverables were provided to the client',
          },
        },
      ],
    },
    {
      name: 'messageToken',
      type: 'text',
      admin: {
        hidden: true,
        description: 'Secure token for subcontractor message access',
      },
      hooks: {
        beforeChange: [
          ({ value, operation }) => {
            // Auto-generate token on job creation if not provided
            if (operation === 'create' && !value) {
              return Math.random().toString(36).substring(2) + Date.now().toString(36)
            }
            return value
          },
        ],
      },
    },
    {
      name: 'schedulingRequest',
      type: 'group',
      label: 'Scheduling Request',
      admin: {
        description: 'Scheduling request sent to technician',
      },
      fields: [
        {
          name: 'requestType',
          type: 'select',
          label: 'Request Type',
          options: [
            { label: 'Time Windows (You provide options)', value: 'time-windows' },
            { label: 'Specific Time (You propose exact time)', value: 'specific-time' },
            { label: 'Tech Proposes (Tech provides options)', value: 'tech-proposes' },
          ],
        },
        {
          name: 'sentAt',
          type: 'date',
          label: 'Request Sent At',
          admin: {
            date: {
              pickerAppearance: 'dayAndTime',
            },
          },
        },
        {
          name: 'deadline',
          type: 'date',
          label: 'Response Deadline',
          admin: {
            date: {
              pickerAppearance: 'dayAndTime',
            },
            description: 'When the tech must respond by (typically 24 hours)',
          },
        },
        {
          name: 'reminderSent',
          type: 'checkbox',
          label: 'Reminder Email Sent',
          defaultValue: false,
        },
        {
          name: 'reminderSentAt',
          type: 'date',
          label: 'Reminder Sent At',
          admin: {
            date: {
              pickerAppearance: 'dayAndTime',
            },
          },
        },
        {
          name: 'timeOptions',
          type: 'array',
          label: 'Time Options',
          admin: {
            description: 'For time-windows and specific-time request types',
            condition: (data, siblingData) => {
              return siblingData?.requestType === 'time-windows' || siblingData?.requestType === 'specific-time'
            },
          },
          fields: [
            {
              name: 'optionNumber',
              type: 'number',
              label: 'Option #',
              required: true,
            },
            {
              name: 'date',
              type: 'date',
              label: 'Date',
              required: true,
              admin: {
                date: {
                  pickerAppearance: 'dayOnly',
                },
              },
            },
            {
              name: 'timeWindow',
              type: 'select',
              label: 'Time Window',
              options: [
                { label: 'Morning', value: 'morning' },
                { label: 'Afternoon', value: 'afternoon' },
                { label: 'Evening', value: 'evening' },
                { label: 'Custom', value: 'custom' },
              ],
            },
            {
              name: 'startTime',
              type: 'text',
              label: 'Start Time',
              admin: {
                description: 'e.g., 9:00am',
              },
            },
            {
              name: 'endTime',
              type: 'text',
              label: 'End Time',
              admin: {
                description: 'e.g., 12:00pm',
              },
            },
            {
              name: 'specificTime',
              type: 'text',
              label: 'Specific Time',
              admin: {
                description: 'For specific-time requests (e.g., 2:00pm)',
              },
            },
          ],
        },
        {
          name: 'requestMessage',
          type: 'textarea',
          label: 'Request Message',
          admin: {
            description: 'For tech-proposes request type',
            condition: (data, siblingData) => {
              return siblingData?.requestType === 'tech-proposes'
            },
          },
        },
        {
          name: 'specialInstructions',
          type: 'textarea',
          label: 'Special Instructions',
        },
      ],
    },
    {
      name: 'techResponse',
      type: 'group',
      label: 'Tech Response',
      admin: {
        description: 'Technician response to scheduling request',
      },
      fields: [
        {
          name: 'respondedAt',
          type: 'date',
          label: 'Responded At',
          admin: {
            date: {
              pickerAppearance: 'dayAndTime',
            },
          },
        },
        {
          name: 'interested',
          type: 'checkbox',
          label: 'Interested in Job',
        },
        {
          name: 'selectedOption',
          type: 'number',
          label: 'Selected Time Option',
          admin: {
            description: 'Which option number the tech selected',
          },
        },
        {
          name: 'preferredStartTime',
          type: 'text',
          label: 'Preferred Start Time',
          admin: {
            description: 'Tech\'s preferred start time within the selected window',
          },
        },
        {
          name: 'proposedOptions',
          type: 'array',
          label: 'Tech Proposed Options',
          admin: {
            description: 'For tech-proposes request type',
          },
          fields: [
            {
              name: 'date',
              type: 'date',
              label: 'Date',
              required: true,
              admin: {
                date: {
                  pickerAppearance: 'dayOnly',
                },
              },
            },
            {
              name: 'startTime',
              type: 'text',
              label: 'Start Time',
              required: true,
            },
            {
              name: 'notes',
              type: 'text',
              label: 'Notes',
            },
          ],
        },
        {
          name: 'declineReason',
          type: 'textarea',
          label: 'Decline Reason',
        },
        {
          name: 'notes',
          type: 'textarea',
          label: 'Additional Notes',
        },
      ],
    },
  ],
}