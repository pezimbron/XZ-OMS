import type { CollectionConfig } from 'payload'

import { isAdmin } from '../access/isAdmin'
import { authenticated } from '../access/authenticated'

export const Products: CollectionConfig = {
  slug: 'products',
  hooks: {
    beforeValidate: [
      ({ data }) => {
        if (!data) return data
        // Sanitize numeric fields to prevent NaN errors
        if (data.basePrice === null || data.basePrice === undefined || isNaN(data.basePrice)) {
          data.basePrice = 0
        }
        if (data.defaultExpenseCost === null || data.defaultExpenseCost === undefined || isNaN(data.defaultExpenseCost)) {
          data.defaultExpenseCost = 0
        }
        return data
      },
    ],
  },
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
      defaultValue: 0,
      validate: (val) => {
        if (val === null || val === undefined || isNaN(val)) {
          return 'Base price must be a valid number'
        }
        return true
      },
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
    {
      name: 'taxable',
      type: 'checkbox',
      label: 'Taxable Product',
      defaultValue: true,
      admin: {
        description: 'Whether this product is subject to sales tax',
      },
    },
    {
      name: 'hasDefaultExpense',
      type: 'checkbox',
      label: 'Auto-Generate Expense',
      defaultValue: false,
      admin: {
        description: 'Automatically add an external expense when this product is added to a job (e.g., floor plans, photo editing)',
      },
    },
    {
      name: 'defaultExpenseCost',
      type: 'number',
      label: 'Default Expense Cost',
      defaultValue: 0,
      admin: {
        step: 0.01,
        description: 'Default cost for the auto-generated expense (can be edited per job)',
        condition: (data) => data.hasDefaultExpense === true,
      },
    },
    {
      name: 'expenseDescription',
      type: 'text',
      label: 'Expense Description',
      admin: {
        placeholder: 'e.g., Floor Plan Drafting',
        description: 'Description for the auto-generated expense',
        condition: (data) => data.hasDefaultExpense === true,
      },
    },
    {
      name: 'excludeFromCalendar',
      type: 'checkbox',
      label: 'Exclude from Tech Calendar by Default',
      defaultValue: false,
      admin: {
        description: 'Hide this product from technician calendar invites by default (e.g., for post-production tasks like floor plans, QC, hosting). Can be overridden per-job.',
      },
    },
  ],
}
