import type { CollectionConfig } from 'payload'

import { isAdmin } from '../access/isAdmin'

export const Technicians: CollectionConfig = {
  slug: 'technicians',
  access: {
    create: isAdmin,
    read: ({ req: { user } }) => {
      if (!user) return false
      // Admin/Ops see all technicians
      if (['super-admin', 'sales-admin', 'ops-manager'].includes(user.role)) {
        return true
      }
      // Techs can see other techs (for coordination)
      if (user.role === 'tech') {
        return true
      }
      return false
    },
    update: isAdmin,
    delete: isAdmin,
  },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'type', 'email'],
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
    },
    {
      name: 'email',
      type: 'email',
      required: true,
      unique: true,
    },
    {
      name: 'user',
      type: 'relationship',
      relationTo: 'users',
      label: 'User Account',
      admin: {
        description: 'Link this technician to a user account for portal access',
      },
    },
    {
      name: 'type',
      type: 'select',
      required: true,
      defaultValue: 'commission',
      options: [
        { label: 'Commission-Based', value: 'commission' },
        { label: 'W2 Employee', value: 'w2' },
        { label: 'Outsourced Partner', value: 'partner' },
      ],
    },
    {
      name: 'vendor',
      type: 'relationship',
      relationTo: 'vendors',
      label: 'Vendor Company',
      admin: {
        description: 'For outsourced partners: the vendor company they work for',
        condition: (data) => data.type === 'partner',
      },
    },
    {
      name: 'baseCommissionRate',
      type: 'number',
      label: 'Commission Rate (decimal, e.g. 0.5)',
    },
    {
      name: 'phone',
      type: 'text',
    },
    {
      name: 'active',
      type: 'checkbox',
      defaultValue: true,
    },
  ],
}
