import type { CollectionConfig } from 'payload'

import { isAdmin } from '../access/isAdmin'
import { authenticated } from '../access/authenticated'

export const Equipment: CollectionConfig = {
  slug: 'equipment',
  access: {
    create: isAdmin,
    read: authenticated, // All authenticated users can see equipment
    update: isAdmin,
    delete: isAdmin,
  },
  admin: {
    useAsTitle: 'label',
    defaultColumns: ['label', 'assetId', 'type'],
  },
  fields: [
    {
      name: 'label',
      type: 'text',
      required: true,
    },
    {
      name: 'assetId',
      type: 'text',
      required: true,
      unique: true,
    },
    {
      name: 'type',
      type: 'select',
      required: true,
      options: [
        { label: 'Camera', value: 'camera' },
        { label: 'Drone', value: 'drone' },
        { label: 'LiDAR', value: 'lidar' },
        { label: 'Other', value: 'other' },
      ],
    },
    {
      name: 'lastCalibrationDate',
      type: 'date',
    },
    {
      name: 'nextMaintenanceDue',
      type: 'date',
    },
    {
      name: 'assignedTo',
      type: 'relationship',
      relationTo: 'technicians' as any,
    },
  ],
}
