'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function CreateProductPage() {
  const router = useRouter()
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const [formData, setFormData] = useState({
    name: '',
    category: 'capture-service',
    unitType: 'flat',
    basePrice: 0,
    description: '',
    defaultInstructions: '',
    isRecurring: false,
    requiresVendor: false,
    taxable: true,
    hasDefaultExpense: false,
    defaultExpenseCost: 0,
    expenseDescription: '',
    excludeFromCalendar: false,
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    setError(null)

    try {
      const response = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.errors?.[0]?.message || 'Failed to create product')
      }

      const data = await response.json()
      const newProduct = data.doc || data
      
      // Redirect to the new product's edit page
      router.push(`/oms/products/${newProduct.id}`)
    } catch (err: any) {
      setError(err.message)
      setIsSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <Link
            href="/oms/products"
            className="inline-flex items-center text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Products
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Create New Product</h1>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Basic Information</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Product Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="e.g., Matterport 3D Scan"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Category *
                </label>
                <select
                  required
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="capture-service">Capture Service</option>
                  <option value="documentation-product">Documentation Product</option>
                  <option value="logistics-fee">Logistics / Fee</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Product description..."
                />
              </div>
            </div>
          </div>

          {/* Pricing */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Pricing</h2>
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
                    min="0"
                    required
                    value={formData.basePrice}
                    onChange={(e) => setFormData({ ...formData, basePrice: parseFloat(e.target.value) || 0 })}
                    className="w-full pl-8 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Unit Type *
                </label>
                <select
                  required
                  value={formData.unitType}
                  onChange={(e) => setFormData({ ...formData, unitType: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="flat">Flat</option>
                  <option value="per-sq-ft">Per Sq Ft</option>
                  <option value="per-hour">Per Hour</option>
                  <option value="per-day">Per Day</option>
                  <option value="per-item">Per Item</option>
                </select>
              </div>
            </div>
          </div>

          {/* Flags */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Product Flags</h2>
            <div className="space-y-3">
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={formData.taxable}
                  onChange={(e) => setFormData({ ...formData, taxable: e.target.checked })}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">Taxable Product</span>
              </label>

              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={formData.isRecurring}
                  onChange={(e) => setFormData({ ...formData, isRecurring: e.target.checked })}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">Recurring Product (e.g., monthly hosting)</span>
              </label>

              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={formData.requiresVendor}
                  onChange={(e) => setFormData({ ...formData, requiresVendor: e.target.checked })}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">Requires Vendor/Subcontractor</span>
              </label>

              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={formData.excludeFromCalendar}
                  onChange={(e) => setFormData({ ...formData, excludeFromCalendar: e.target.checked })}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">Exclude from Tech Calendar (post-production tasks)</span>
              </label>

              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={formData.hasDefaultExpense}
                  onChange={(e) => setFormData({ ...formData, hasDefaultExpense: e.target.checked })}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">Auto-Generate Expense</span>
              </label>

              {formData.hasDefaultExpense && (
                <div className="ml-7 mt-3 space-y-3 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Default Expense Cost
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-2.5 text-gray-500 dark:text-gray-400">$</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.defaultExpenseCost}
                        onChange={(e) => setFormData({ ...formData, defaultExpenseCost: parseFloat(e.target.value) || 0 })}
                        className="w-full pl-8 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Expense Description
                    </label>
                    <input
                      type="text"
                      value={formData.expenseDescription}
                      onChange={(e) => setFormData({ ...formData, expenseDescription: e.target.value })}
                      placeholder="e.g., Floor Plan Drafting"
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Default Instructions */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Default Instructions</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              These instructions will automatically populate when this product is added to a job.
            </p>
            <textarea
              value={formData.defaultInstructions}
              onChange={(e) => setFormData({ ...formData, defaultInstructions: e.target.value })}
              rows={6}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono text-sm"
              placeholder="Enter default instructions for this product..."
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 justify-end">
            <Link
              href="/oms/products"
              className="px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 font-medium transition-colors"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={isSaving}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg font-medium transition-colors"
            >
              {isSaving ? 'Creating...' : 'Create Product'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
