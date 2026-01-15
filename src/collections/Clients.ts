import type { CollectionConfig } from 'payload'

import { isAdmin } from '../access/isAdmin'

export const Clients: CollectionConfig = {
  slug: 'clients',
  access: {
    create: isAdmin,
    read: ({ req: { user } }) => {
      if (!user) return false
      // Admin/Ops/Sales see all clients
      if (['super-admin', 'sales-admin', 'ops-manager'].includes(user.role)) {
        return true
      }
      // Techs can see clients (for job context)
      if (user.role === 'tech') {
        return true
      }
      // Client-partners see only themselves (would need email matching logic)
      return false
    },
    update: isAdmin,
    delete: isAdmin,
  },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'clientType', 'billingPreference'],
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
    },
    {
      name: 'clientType',
      type: 'select',
      required: true,
      defaultValue: 'retail',
      options: [
        { label: 'Retail', value: 'retail' },
        { label: 'Outsourcing Partner', value: 'outsourcing-partner' },
      ],
    },
    {
      name: 'billingPreference',
      type: 'select',
      required: true,
      defaultValue: 'immediate',
      options: [
        { label: 'Immediate', value: 'immediate' },
        { label: 'Weekly Batch', value: 'weekly-batch' },
        { label: 'Monthly Batch', value: 'monthly-batch' },
        { label: 'Payment First', value: 'payment-first' },
      ],
    },
    {
      name: 'email',
      type: 'email',
    },
    {
      name: 'phone',
      type: 'text',
    },
    {
      name: 'companyName',
      type: 'text',
    },
    {
      name: 'billingAddress',
      type: 'textarea',
    },
    {
      name: 'notes',
      type: 'textarea',
    },
    {
      name: 'instructionTemplate',
      type: 'textarea',
      label: 'Client-Specific Instruction Template',
      admin: {
        description: 'Client-specific instructions that will auto-populate in the "General Instructions for Tech" field when this client is selected for a job. Use for recurring client requirements (e.g., "Always call POC 30 min before arrival").',
      },
    },
  ],
}
