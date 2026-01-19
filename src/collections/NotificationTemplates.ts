import type { CollectionConfig } from 'payload'
import { isAdmin } from '../access/isAdmin'

export const NotificationTemplates: CollectionConfig = {
  slug: 'notification-templates',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'type', 'active'],
    group: 'Settings',
  },
  access: {
    create: isAdmin,
    read: isAdmin,
    update: isAdmin,
    delete: isAdmin,
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
      admin: {
        description: 'Internal name for this template',
      },
    },
    {
      name: 'type',
      type: 'select',
      required: true,
      options: [
        { label: 'Job Scheduled', value: 'scheduled' },
        { label: 'Job Completed', value: 'completed' },
        { label: 'Deliverables Ready', value: 'delivered' },
        { label: 'Scan Completed', value: 'scan-completed' },
        { label: 'Upload Completed', value: 'upload-completed' },
        { label: 'QC/Post-Production Completed', value: 'qc-completed' },
        { label: 'Transfer Completed', value: 'transfer-completed' },
        { label: 'Floor Plan Completed', value: 'floorplan-completed' },
        { label: 'Photos Completed', value: 'photos-completed' },
        { label: 'As-Builts Completed', value: 'asbuilts-completed' },
      ],
      admin: {
        description: 'When this notification should be sent',
      },
    },
    {
      name: 'active',
      type: 'checkbox',
      defaultValue: true,
      admin: {
        description: 'Only active templates will be used',
      },
    },
    {
      name: 'subject',
      type: 'text',
      required: true,
      admin: {
        description: 'Email subject line. Available variables: {{jobNumber}}, {{clientName}}, {{location}}',
      },
    },
    {
      name: 'body',
      type: 'textarea',
      required: true,
      admin: {
        description: 'Email body. Available variables: {{jobNumber}}, {{clientName}}, {{location}}, {{targetDate}}, {{scannedDate}}, {{uploadLink}}, {{customMessage}}',
        rows: 15,
      },
    },
    {
      name: 'defaultTemplate',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        description: 'Use this as the default template for this notification type',
      },
    },
  ],
}
