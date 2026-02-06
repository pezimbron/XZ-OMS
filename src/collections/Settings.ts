import type { CollectionConfig } from 'payload'

export const Settings: CollectionConfig = {
  slug: 'settings',
  admin: {
    useAsTitle: 'key',
    group: 'System',
    hidden: true, // Hide from admin nav - internal use only
  },
  access: {
    create: () => true, // Allow internal API access
    read: () => true,
    update: () => true,
    delete: () => true,
  },
  fields: [
    {
      name: 'key',
      type: 'text',
      required: true,
      unique: true,
      index: true,
    },
    {
      name: 'value',
      type: 'textarea',
      required: true,
    },
  ],
}
