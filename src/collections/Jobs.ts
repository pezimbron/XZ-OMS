import type { CollectionConfig } from 'payload'
import type { Access } from 'payload'

import { isAdmin } from '../access/isAdmin'
import { populateLineItemInstructions, populateTechInstructions } from './Jobs/hooks/populateInstructions'
import { createCalendarInvite } from './Jobs/hooks/createCalendarInvite'

export const Jobs: CollectionConfig = {
  slug: 'jobs',
  hooks: {
    afterChange: [createCalendarInvite],
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
      defaultValue: 'scheduled',
      options: [
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
        { label: 'Passed', value: 'passed' },
        { label: 'Rejected', value: 'rejected' },
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
  ],
}