import type { CollectionConfig } from 'payload'

import { authenticated } from '../../access/authenticated'

export const Users: CollectionConfig = {
  slug: 'users',
  access: {
    admin: authenticated,
    create: authenticated,
    delete: authenticated,
    read: authenticated,
    update: authenticated,
  },
  admin: {
    defaultColumns: ['name', 'email'],
    useAsTitle: 'name',
  },
  auth: true,
  fields: [
    {
      name: 'name',
      type: 'text',
    },
    {
      name: 'role',
      type: 'select',
      required: true,
      defaultValue: 'tech',
      options: [
        { label: 'Super Admin', value: 'super-admin' },
        { label: 'Sales/Admin', value: 'sales-admin' },
        { label: 'Ops Manager', value: 'ops-manager' },
        { label: 'Tech', value: 'tech' },
        { label: 'Client/Partner', value: 'client-partner' },
        { label: 'Post-Producer', value: 'post-producer' },
      ],
    },
  ],
  timestamps: true,
}
