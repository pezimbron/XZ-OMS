import type { CollectionConfig } from 'payload'
import { isAdmin } from '../access/isAdmin'

export const Payments: CollectionConfig = {
  slug: 'payments',
  admin: {
    useAsTitle: 'referenceNumber',
    defaultColumns: ['client', 'amount', 'paymentDate', 'status', 'referenceNumber'],
    group: 'Financial',
  },
  access: {
    create: isAdmin,
    read: ({ req: { user } }) => {
      if (!user) return false
      if (['super-admin', 'sales-admin', 'ops-manager'].includes(user.role)) {
        return true
      }
      return false
    },
    update: isAdmin,
    delete: isAdmin,
  },
  fields: [
    {
      name: 'client',
      type: 'relationship',
      relationTo: 'clients',
      required: true,
      hasMany: false,
    },
    {
      name: 'amount',
      type: 'number',
      required: true,
      min: 0,
    },
    {
      name: 'paymentDate',
      type: 'date',
      required: true,
      admin: {
        date: {
          pickerAppearance: 'dayOnly',
        },
      },
    },
    {
      name: 'referenceNumber',
      type: 'text',
    },
    {
      name: 'source',
      type: 'select',
      options: [
        { label: 'CSV Import', value: 'csv-import' },
        { label: 'Manual', value: 'manual' },
      ],
      defaultValue: 'manual',
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'unmatched',
      options: [
        { label: 'Unmatched', value: 'unmatched' },
        { label: 'Matched', value: 'matched' },
      ],
    },
    {
      name: 'matchedJob',
      type: 'relationship',
      relationTo: 'jobs',
      hasMany: false,
    },
    {
      name: 'matchedInvoice',
      type: 'relationship',
      relationTo: 'invoices',
      hasMany: false,
    },
    {
      name: 'notes',
      type: 'textarea',
    },
    {
      name: 'importedBy',
      type: 'relationship',
      relationTo: 'users',
      hasMany: false,
      admin: {
        readOnly: true,
      },
    },
  ],
  timestamps: true,
}
