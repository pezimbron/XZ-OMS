import type { CollectionConfig } from 'payload'
import type { Access } from 'payload'

import { isAdmin } from '../access/isAdmin'
import { populateLineItemInstructions, populateTechInstructions } from './Jobs/hooks/populateInstructions'
import { createCalendarInvite } from './Jobs/hooks/createCalendarInvite'
import { afterWorkflowStepUpdate } from './Jobs/hooks/afterWorkflowStepUpdate'

export const Jobs: CollectionConfig = {
  slug: 'jobs',
  hooks: {
    afterChange: [createCalendarInvite, afterWorkflowStepUpdate],
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
      ],
    },
    {
      name: 'targetDate',
      type: 'date',
      label: 'Scheduled Date & Time',
      admin: {
        date: {
          pickerAppearance: 'dayAndTime',
        },
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
      name: 'workflowType',
      type: 'select',
      label: 'Workflow Type',
      admin: {
        description: 'The workflow process for this job. Defaults to client\'s default workflow but can be overridden.',
      },
      options: [
        { label: 'Outsourced: Scan & Upload to Client', value: 'outsourced-scan-upload-client' },
        { label: 'Outsourced: Scan & Transfer', value: 'outsourced-scan-transfer' },
        { label: 'Outsourced: Scan, Survey & Images', value: 'outsourced-scan-survey-images' },
        { label: 'Direct: Scan Hosted by Us', value: 'direct-scan-hosted' },
        { label: 'Direct: Scan & Transfer', value: 'direct-scan-transfer' },
        { label: 'Direct: Scan + Floor Plan', value: 'direct-scan-floorplan' },
        { label: 'Direct: Scan + Floor Plan + Photos', value: 'direct-scan-floorplan-photos' },
        { label: 'Direct: Scan + As-Builts', value: 'direct-scan-asbuilts' },
      ],
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
      relationTo: 'users' as any,
      label: 'QC Assigned To',
      admin: {
        description: 'Post-producer assigned to review this job',
        condition: (data) => data.status === 'qc',
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
      name: 'completionToken',
      type: 'text',
      admin: {
        description: 'Unique token for tech completion form access',
      },
    },
    {
      name: 'completionFormSubmitted',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        description: 'Whether the tech has submitted the completion form',
      },
    },
    {
      name: 'completionStatus',
      type: 'select',
      options: [
        { label: 'Completed', value: 'completed' },
        { label: 'Incomplete', value: 'incomplete' },
      ],
      admin: {
        description: 'Status reported by tech in completion form',
      },
    },
    {
      name: 'incompletionReason',
      type: 'select',
      options: [
        { label: 'Not able to access location', value: 'no-access' },
        { label: "POC didn't show up", value: 'poc-no-show' },
        { label: 'POC asked to reschedule', value: 'poc-reschedule' },
        { label: 'Other', value: 'other' },
      ],
      admin: {
        description: 'Reason for incompletion if applicable',
        condition: (data) => data.completionStatus === 'incomplete',
      },
    },
    {
      name: 'incompletionNotes',
      type: 'textarea',
      admin: {
        description: 'Additional details about incompletion',
        condition: (data) => data.completionStatus === 'incomplete',
      },
    },
    {
      name: 'techFeedback',
      type: 'textarea',
      admin: {
        description: 'Feedback from tech about the job',
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
  ],
}