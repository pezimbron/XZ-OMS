import type { CollectionConfig } from 'payload'
import { authenticated } from '../access/authenticated'

export const JobTemplates: CollectionConfig = {
  slug: 'job-templates',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'client', 'isActive'],
    group: 'Configuration',
  },
  access: {
    read: () => true,
    create: authenticated, // Sales/Ops can create
    update: authenticated,
    delete: authenticated,
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
      label: 'Template Name',
      admin: {
        description: 'e.g., "Standard 3D Scan", "Scan + As-Builts + Hosting"',
      },
    },
    {
      name: 'client',
      type: 'relationship',
      relationTo: 'clients',
      admin: {
        description: 'Leave empty for general template, or select client for client-specific template',
      },
    },
    {
      name: 'isActive',
      type: 'checkbox',
      defaultValue: true,
      label: 'Active',
      admin: {
        description: 'Only active templates appear in job creation',
      },
    },
    {
      name: 'defaultWorkflow',
      type: 'relationship',
      relationTo: 'workflow-templates',
      required: true,
      label: 'Default Workflow',
    },
    {
      name: 'defaultProducts',
      type: 'relationship',
      relationTo: 'products',
      hasMany: true,
      label: 'Default Products',
      admin: {
        description: 'Products will be automatically added to jobs created with this template',
      },
    },
    {
      name: 'defaultInstructions',
      type: 'textarea',
      label: 'Default Tech Instructions',
      admin: {
        description: 'Pre-filled instructions (will be combined with client template + product instructions)',
      },
    },
    {
      name: 'defaultPricing',
      type: 'number',
      label: 'Suggested Total Price',
      admin: {
        description: 'Suggested price (user can override)',
      },
    },
    {
      name: 'requiredFields',
      type: 'select',
      hasMany: true,
      options: [
        { label: 'Capture Address', value: 'captureAddress' },
        { label: 'City', value: 'city' },
        { label: 'State', value: 'state' },
        { label: 'Zip', value: 'zip' },
        { label: 'Target Date', value: 'targetDate' },
        { label: 'Square Feet', value: 'sqFt' },
        { label: 'Property Type', value: 'propertyType' },
      ],
      admin: {
        description: 'Show warning if these fields are empty (non-blocking)',
      },
    },
  ],
}
