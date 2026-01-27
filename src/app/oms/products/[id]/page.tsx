'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useAutosaveField } from '@/lib/oms/useAutosaveField'
import { SaveIndicator } from '@/components/oms/SaveIndicator'

interface Product {
  id: string
  name: string
  description?: string
  category?: string
  basePrice?: number
  unitType?: string
  isRecurring?: boolean
  requiresVendor?: boolean
  taxable?: boolean
  hasDefaultExpense?: boolean
  defaultExpenseCost?: number
  expenseDescription?: string
  defaultInstructions?: string
  createdAt: string
  updatedAt: string
}

export default function ProductDetailPage() {
  const params = useParams()
  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'details' | 'pricing' | 'instructions' | 'flags'>('details')

  useEffect(() => {
    if (params.id) {
      fetchProduct(params.id as string)
    }
  }, [params.id])

  const fetchProduct = async (id: string) => {
    try {
      const response = await fetch(`/api/products/${id}`)
      const data = await response.json()
      setProduct(data)
    } catch (error) {
      console.error('Error fetching product:', error)
    } finally {
      setLoading(false)
    }
  }

  const patchProduct = async (id: string, update: any) => {
    const response = await fetch(`/api/products/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(update),
    })
    if (!response.ok) {
      throw new Error('Failed to update product')
    }
    const updated = await response.json()
    setProduct(updated)
  }

  // Autosave fields
  const nameField = useAutosaveField({
    value: product?.name || '',
    onSave: async (val) => {
      if (!product?.id) return
      await patchProduct(product.id, { name: val })
    },
    debounceMs: 800,
  })

  const descriptionField = useAutosaveField({
    value: product?.description || '',
    onSave: async (val) => {
      if (!product?.id) return
      await patchProduct(product.id, { description: val })
    },
    debounceMs: 1000,
  })

  const categoryField = useAutosaveField({
    value: product?.category || 'capture-service',
    onSave: async (val) => {
      if (!product?.id) return
      await patchProduct(product.id, { category: val })
    },
  })

  const basePriceField = useAutosaveField({
    value: product?.basePrice?.toString() || '0',
    onSave: async (val) => {
      if (!product?.id) return
      await patchProduct(product.id, { basePrice: parseFloat(val) || 0 })
    },
    debounceMs: 800,
  })

  const unitTypeField = useAutosaveField({
    value: product?.unitType || 'flat',
    onSave: async (val) => {
      if (!product?.id) return
      await patchProduct(product.id, { unitType: val })
    },
  })

  const defaultInstructionsField = useAutosaveField({
    value: product?.defaultInstructions || '',
    onSave: async (val) => {
      if (!product?.id) return
      await patchProduct(product.id, { defaultInstructions: val })
    },
    debounceMs: 1000,
  })

  const isRecurringField = useAutosaveField({
    value: product?.isRecurring || false,
    onSave: async (val) => {
      if (!product?.id) return
      await patchProduct(product.id, { isRecurring: val })
    },
  })

  const requiresVendorField = useAutosaveField({
    value: product?.requiresVendor || false,
    onSave: async (val) => {
      if (!product?.id) return
      await patchProduct(product.id, { requiresVendor: val })
    },
  })

  const taxableField = useAutosaveField({
    value: product?.taxable ?? true,
    onSave: async (val) => {
      if (!product?.id) return
      await patchProduct(product.id, { taxable: val })
    },
  })

  const hasDefaultExpenseField = useAutosaveField({
    value: product?.hasDefaultExpense || false,
    onSave: async (val) => {
      if (!product?.id) return
      await patchProduct(product.id, { hasDefaultExpense: val })
    },
  })

  const defaultExpenseCostField = useAutosaveField({
    value: product?.defaultExpenseCost?.toString() || '0',
    onSave: async (val) => {
      if (!product?.id) return
      await patchProduct(product.id, { defaultExpenseCost: parseFloat(val) || 0 })
    },
    debounceMs: 800,
  })

  const expenseDescriptionField = useAutosaveField({
    value: product?.expenseDescription || '',
    onSave: async (val) => {
      if (!product?.id) return
      await patchProduct(product.id, { expenseDescription: val })
    },
    debounceMs: 800,
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <svg className="animate-spin h-12 w-12 mx-auto mb-4 text-blue-600 dark:text-blue-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-lg font-medium text-gray-700 dark:text-gray-300">Loading product...</p>
        </div>
      </div>
    )
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Product Not Found</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">The product you&apos;re looking for doesn&apos;t exist.</p>
          <Link href="/oms/products" className="text-blue-600 hover:text-blue-700 dark:text-blue-400">
            ← Back to Products
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="px-8 py-6">
          <div className="flex items-center justify-between mb-4">
            <Link
              href="/oms/products"
              className="text-blue-600 hover:text-blue-700 dark:text-blue-400 flex items-center gap-2"
            >
              ← Back to Products
            </Link>
          </div>
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center flex-shrink-0">
              <span className="text-3xl">📦</span>
            </div>
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                {product.name}
              </h1>
              {product.category && (
                <p className="text-gray-600 dark:text-gray-400 mt-1">
                  {product.category.replace('-', ' ').toUpperCase()}
                </p>
              )}
            </div>
            {product.basePrice !== undefined && (
              <div className="text-right">
                <p className="text-sm text-gray-500 dark:text-gray-400">Base Price</p>
                <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                  ${product.basePrice.toFixed(2)}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="px-8">
          <div className="flex gap-4 border-b border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setActiveTab('details')}
              className={`px-4 py-3 font-medium transition-colors ${
                activeTab === 'details'
                  ? 'border-b-2 border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              Details
            </button>
            <button
              onClick={() => setActiveTab('pricing')}
              className={`px-4 py-3 font-medium transition-colors ${
                activeTab === 'pricing'
                  ? 'border-b-2 border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              Pricing
            </button>
            <button
              onClick={() => setActiveTab('instructions')}
              className={`px-4 py-3 font-medium transition-colors ${
                activeTab === 'instructions'
                  ? 'border-b-2 border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              Instructions
            </button>
            <button
              onClick={() => setActiveTab('flags')}
              className={`px-4 py-3 font-medium transition-colors ${
                activeTab === 'flags'
                  ? 'border-b-2 border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              Flags & Options
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-8">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Details Tab */}
          {activeTab === 'details' && (
            <>
              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">Basic Information</h2>
                  <SaveIndicator status={nameField.status} error={nameField.error} />
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Product Name *
                    </label>
                    <input
                      type="text"
                      value={nameField.value}
                      onChange={(e) => nameField.setValue(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Category *
                    </label>
                    <select
                      value={categoryField.value}
                      onChange={(e) => categoryField.setValue(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      <option value="capture-service">Capture Service</option>
                      <option value="documentation-product">Documentation Product</option>
                      <option value="logistics-fee">Logistics / Fee</option>
                    </select>
                    <SaveIndicator status={categoryField.status} error={categoryField.error} />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Description
                    </label>
                    <textarea
                      value={descriptionField.value}
                      onChange={(e) => descriptionField.setValue(e.target.value)}
                      rows={4}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="Product description..."
                    />
                    <SaveIndicator status={descriptionField.status} error={descriptionField.error} />
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Metadata</h2>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Product ID</label>
                    <p className="text-gray-900 dark:text-white font-mono text-sm">{product.id}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Created</label>
                    <p className="text-gray-900 dark:text-white">
                      {new Date(product.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Last Updated</label>
                    <p className="text-gray-900 dark:text-white">
                      {new Date(product.updatedAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Pricing Tab */}
          {activeTab === 'pricing' && (
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Pricing Configuration</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Base Price *
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-2.5 text-gray-500 dark:text-gray-400">$</span>
                    <input
                      type="number"
                      step="0.01"
                      value={basePriceField.value}
                      onChange={(e) => basePriceField.setValue(e.target.value)}
                      className="w-full pl-8 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                  <SaveIndicator status={basePriceField.status} error={basePriceField.error} />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Unit Type *
                  </label>
                  <select
                    value={unitTypeField.value}
                    onChange={(e) => unitTypeField.setValue(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="flat">Flat</option>
                    <option value="per-sq-ft">Per Sq Ft</option>
                    <option value="per-hour">Per Hour</option>
                    <option value="per-day">Per Day</option>
                    <option value="per-item">Per Item</option>
                  </select>
                  <SaveIndicator status={unitTypeField.status} error={unitTypeField.error} />
                </div>

                <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Auto-Generated Expense</h3>
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={hasDefaultExpenseField.value}
                        onChange={(e) => hasDefaultExpenseField.setValue(e.target.checked)}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded"
                      />
                      <label className="text-sm text-gray-700 dark:text-gray-300">
                        Auto-generate expense when this product is added to a job
                      </label>
                      <SaveIndicator status={hasDefaultExpenseField.status} error={hasDefaultExpenseField.error} />
                    </div>

                    {hasDefaultExpenseField.value && (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Default Expense Cost
                          </label>
                          <div className="relative">
                            <span className="absolute left-4 top-2.5 text-gray-500 dark:text-gray-400">$</span>
                            <input
                              type="number"
                              step="0.01"
                              value={defaultExpenseCostField.value}
                              onChange={(e) => defaultExpenseCostField.setValue(e.target.value)}
                              className="w-full pl-8 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            />
                          </div>
                          <SaveIndicator status={defaultExpenseCostField.status} error={defaultExpenseCostField.error} />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Expense Description
                          </label>
                          <input
                            type="text"
                            value={expenseDescriptionField.value}
                            onChange={(e) => expenseDescriptionField.setValue(e.target.value)}
                            placeholder="e.g., Floor Plan Drafting"
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          />
                          <SaveIndicator status={expenseDescriptionField.status} error={expenseDescriptionField.error} />
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Instructions Tab */}
          {activeTab === 'instructions' && (
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Default Instructions Template</h2>
                <SaveIndicator status={defaultInstructionsField.status} error={defaultInstructionsField.error} />
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                These instructions will automatically populate when this product is added to a job. They can be customized per-job.
              </p>
              <textarea
                value={defaultInstructionsField.value}
                onChange={(e) => defaultInstructionsField.setValue(e.target.value)}
                rows={12}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono text-sm"
                placeholder="Enter default instructions for this product..."
              />
            </div>
          )}

          {/* Flags Tab */}
          {activeTab === 'flags' && (
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Product Flags & Options</h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                  <div>
                    <label className="text-sm font-medium text-gray-900 dark:text-white">Recurring Product</label>
                    <p className="text-sm text-gray-500 dark:text-gray-400">e.g., monthly hosting fees</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={isRecurringField.value}
                      onChange={(e) => isRecurringField.setValue(e.target.checked)}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded"
                    />
                    <SaveIndicator status={isRecurringField.status} error={isRecurringField.error} />
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                  <div>
                    <label className="text-sm font-medium text-gray-900 dark:text-white">Requires Vendor</label>
                    <p className="text-sm text-gray-500 dark:text-gray-400">External vendor/subcontractor needed</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={requiresVendorField.value}
                      onChange={(e) => requiresVendorField.setValue(e.target.checked)}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded"
                    />
                    <SaveIndicator status={requiresVendorField.status} error={requiresVendorField.error} />
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                  <div>
                    <label className="text-sm font-medium text-gray-900 dark:text-white">Taxable Product</label>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Subject to sales tax</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={taxableField.value}
                      onChange={(e) => taxableField.setValue(e.target.checked)}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded"
                    />
                    <SaveIndicator status={taxableField.status} error={taxableField.error} />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
