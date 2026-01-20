import type { CollectionConfig } from 'payload'
import { isAdmin } from '../access/isAdmin'

export const WorkflowTemplates: CollectionConfig = {
  slug: 'workflow-templates',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'jobType', 'isActive'],
    group: 'Configuration',
  },
  access: {
    read: () => true,
    create: isAdmin,
    update: isAdmin,
    delete: isAdmin,
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
      label: 'Template Name',
      admin: {
        description: 'e.g., "Outsourced Scan Only", "Direct Scan + Hosting"',
      },
    },
    {
      name: 'jobType',
      type: 'select',
      required: true,
      options: [
        { label: 'Outsourced - Scan Only', value: 'outsourced-scan-only' },
        { label: 'Direct - Scan + Hosting', value: 'direct-scan-hosted' },
        { label: 'Direct - Scan + Floor Plan', value: 'direct-scan-floorplan' },
        { label: 'Custom', value: 'custom' },
      ],
      admin: {
        description: 'Type of job this workflow applies to',
      },
    },
    {
      name: 'isActive',
      type: 'checkbox',
      defaultValue: true,
      label: 'Active',
      admin: {
        description: 'Only active templates can be assigned to new jobs',
      },
    },
    {
      name: 'description',
      type: 'textarea',
      label: 'Description',
      admin: {
        description: 'Brief description of this workflow',
      },
    },
    {
      name: 'steps',
      type: 'array',
      required: true,
      minRows: 1,
      labels: {
        singular: 'Step',
        plural: 'Steps',
      },
      admin: {
        description: 'Define the workflow steps in order',
      },
      fields: [
        {
          name: 'name',
          type: 'text',
          required: true,
          label: 'Step Name',
          admin: {
            description: 'e.g., "Scan Complete", "Upload to Client Account"',
          },
        },
        {
          name: 'description',
          type: 'textarea',
          label: 'Step Description',
          admin: {
            description: 'What needs to be done in this step',
          },
        },
        {
          name: 'order',
          type: 'number',
          required: true,
          defaultValue: 1,
          admin: {
            description: 'Order of this step (1, 2, 3...)',
          },
        },
        {
          name: 'statusMapping',
          type: 'select',
          required: true,
          label: 'Job Status',
          options: [
            { label: 'Request', value: 'request' },
            { label: 'Scheduled', value: 'scheduled' },
            { label: 'Scanned', value: 'scanned' },
            { label: 'QC', value: 'qc' },
            { label: 'Done', value: 'done' },
            { label: 'Archived', value: 'archived' },
          ],
          admin: {
            description: 'What job status this step represents',
          },
        },
        {
          name: 'requiredRole',
          type: 'select',
          label: 'Who Can Complete',
          options: [
            { label: 'Any Tech', value: 'tech' },
            { label: 'Post Producer', value: 'post-producer' },
            { label: 'QC Team', value: 'qc' },
            { label: 'Ops Manager', value: 'ops-manager' },
            { label: 'Sales Admin', value: 'sales-admin' },
            { label: 'Any Admin', value: 'admin' },
          ],
          admin: {
            description: 'Which role can mark this step as complete',
          },
        },
        {
          name: 'actionLabel',
          type: 'text',
          label: 'Action Button Label',
          admin: {
            description: 'Text for the action button (e.g., "Mark Scan Complete")',
            placeholder: 'Complete Step',
          },
        },
        {
          name: 'requiresDeliverables',
          type: 'checkbox',
          label: 'Requires Deliverables',
          defaultValue: false,
          admin: {
            description: 'Does this step require adding deliverable URLs?',
          },
        },
        {
          name: 'triggers',
          type: 'group',
          label: 'Automation Triggers',
          admin: {
            description: 'What happens automatically when this step is completed',
          },
          fields: [
            {
              name: 'sendNotification',
              type: 'checkbox',
              label: 'Send In-App Notification',
              defaultValue: false,
            },
            {
              name: 'notificationRecipients',
              type: 'select',
              hasMany: true,
              label: 'Notification Recipients',
              options: [
                { label: 'Assigned Tech', value: 'tech' },
                { label: 'Post Production Team', value: 'post-production' },
                { label: 'QC Team', value: 'qc' },
                { label: 'Ops Manager', value: 'ops-manager' },
                { label: 'Sales Team', value: 'sales' },
              ],
              admin: {
                condition: (data, siblingData) => siblingData?.sendNotification === true,
              },
            },
            {
              name: 'notificationMessage',
              type: 'textarea',
              label: 'Notification Message',
              admin: {
                description: 'Use {{jobId}}, {{modelName}}, {{clientName}} as placeholders',
                condition: (data, siblingData) => siblingData?.sendNotification === true,
              },
            },
            {
              name: 'sendClientEmail',
              type: 'checkbox',
              label: 'Send Client Email',
              defaultValue: false,
              admin: {
                description: 'Send email to client when this step completes',
              },
            },
            {
              name: 'emailTemplate',
              type: 'select',
              label: 'Email Template',
              options: [
                { label: 'Job Complete - Deliverables Ready', value: 'job-complete' },
                { label: 'QC Approved', value: 'qc-approved' },
                { label: 'Custom', value: 'custom' },
              ],
              admin: {
                condition: (data, siblingData) => siblingData?.sendClientEmail === true,
              },
            },
            {
              name: 'createInvoice',
              type: 'checkbox',
              label: 'Create Invoice',
              defaultValue: false,
              admin: {
                description: 'Automatically create invoice when this step completes',
              },
            },
            {
              name: 'createRecurringInvoice',
              type: 'checkbox',
              label: 'Create Recurring Invoice',
              defaultValue: false,
              admin: {
                description: 'Create recurring invoice (e.g., yearly hosting)',
              },
            },
            {
              name: 'recurringInvoiceDelay',
              type: 'number',
              label: 'Recurring Invoice Delay (days)',
              admin: {
                description: 'Days after step completion to create recurring invoice (e.g., 365 for 1 year)',
                condition: (data, siblingData) => siblingData?.createRecurringInvoice === true,
              },
            },
            {
              name: 'recurringInvoiceAmount',
              type: 'number',
              label: 'Recurring Invoice Amount',
              admin: {
                description: 'Amount for recurring invoice (e.g., 50 for $50 hosting)',
                condition: (data, siblingData) => siblingData?.createRecurringInvoice === true,
              },
            },
          ],
        },
      ],
    },
  ],
}
