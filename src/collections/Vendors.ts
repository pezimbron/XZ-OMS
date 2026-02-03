import type { CollectionConfig } from 'payload'

export const Vendors: CollectionConfig = {
  slug: 'vendors',
  admin: {
    useAsTitle: 'companyName',
    defaultColumns: ['companyName', 'billingEmail', 'active'],
    description: 'Subcontractor vendor companies for outsourced work',
  },
  access: {
    create: ({ req: { user } }) => {
      if (!user) return false
      return ['super-admin', 'ops-manager', 'sales-admin'].includes(user.role)
    },
    read: ({ req: { user } }) => {
      if (!user) return false
      return ['super-admin', 'ops-manager', 'sales-admin', 'post-producer'].includes(user.role)
    },
    update: ({ req: { user } }) => {
      if (!user) return false
      return ['super-admin', 'ops-manager', 'sales-admin'].includes(user.role)
    },
    delete: ({ req: { user } }) => {
      if (!user) return false
      return ['super-admin'].includes(user.role)
    },
  },
  fields: [
    {
      name: 'companyName',
      type: 'text',
      required: true,
      unique: true,
      label: 'Company Name',
    },
    {
      name: 'contactPerson',
      type: 'text',
      label: 'Primary Contact Person',
    },
    {
      name: 'billingEmail',
      type: 'email',
      required: true,
      label: 'Billing Email',
    },
    {
      name: 'billingPhone',
      type: 'text',
      label: 'Billing Phone',
    },
    {
      name: 'taxID',
      type: 'text',
      label: 'EIN or Tax ID',
    },
    {
      name: 'paymentTerms',
      type: 'text',
      label: 'Payment Terms',
      admin: {
        placeholder: 'e.g., Net 30, Due on Receipt',
      },
    },
    {
      name: 'notes',
      type: 'textarea',
      label: 'Internal Notes',
    },
    {
      name: 'active',
      type: 'checkbox',
      defaultValue: true,
      label: 'Active',
    },
    {
      name: 'integrations',
      type: 'group',
      label: 'Integrations',
      fields: [
        {
          name: 'quickbooks',
          type: 'group',
          label: 'QuickBooks',
          fields: [
            {
              name: 'vendorId',
              type: 'text',
              label: 'QuickBooks Vendor ID',
              admin: {
                description: 'The vendor ID from QuickBooks for API queries',
              },
            },
            {
              name: 'syncStatus',
              type: 'select',
              label: 'Sync Status',
              defaultValue: 'not-synced',
              options: [
                { label: 'Not Synced', value: 'not-synced' },
                { label: 'Synced', value: 'synced' },
                { label: 'Error', value: 'error' },
              ],
            },
            {
              name: 'lastSyncedAt',
              type: 'date',
              label: 'Last Synced',
              admin: {
                date: {
                  pickerAppearance: 'dayAndTime',
                },
              },
            },
          ],
        },
      ],
    },
  ],
}
