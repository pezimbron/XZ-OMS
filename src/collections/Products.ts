import type { CollectionConfig } from 'payload'

import { isAdmin } from '../access/isAdmin'
import { authenticated } from '../access/authenticated'

export const Products: CollectionConfig = {
  slug: 'products',
  access: {
    create: isAdmin,
    read: authenticated, // All authenticated users can see products
    update: isAdmin,
    delete: isAdmin,
  },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'category', 'unitType', 'basePrice'],
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
    },
    {
      name: 'category',
      type: 'select',
      required: true,
      options: [
        { label: 'Capture Service', value: 'capture-service' },
        { label: 'Documentation Product', value: 'documentation-product' },
        { label: 'Logistics / Fee', value: 'logistics-fee' },
      ],
    },
    {
      name: 'unitType',
      type: 'select',
      required: true,
      defaultValue: 'flat',
      options: [
        { label: 'Flat', value: 'flat' },
        { label: 'Per Sq Ft', value: 'per-sq-ft' },
        { label: 'Per Hour', value: 'per-hour' },
        { label: 'Per Day', value: 'per-day' },
        { label: 'Per Item', value: 'per-item' },
      ],
    },
    {
      name: 'basePrice',
      type: 'number',
      required: true,
    },
    {
      name: 'isRecurring',
      type: 'checkbox',
      label: 'Recurring (e.g. hosting)',
    },
    {
      name: 'requiresVendor',
      type: 'checkbox',
    },
    {
      name: 'description',
      type: 'textarea',
    },
    {
      name: 'defaultInstructions',
      type: 'textarea',
      label: 'Default Instructions Template',
      admin: {
        description: 'Default instructions that will auto-populate when this product is added to a job. Can be customized per-job.',
      },
    },
  ],
}
