'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { SaveIndicator } from '@/components/oms/SaveIndicator'
import SubInvoiceImportPanel from './SubInvoiceImportPanel'

interface Job {
  id: string
  invoiceStatus?: string
  invoice?: {
    id: string
    invoiceNumber?: string
    total: number
  }
  invoicedAt?: string
  lineItems?: any[]
  externalExpenses?: any[]
  discount?: {
    type?: string
    value?: number
    amount?: number
  }
  subtotal?: number
  taxAmount?: number
  totalWithTax?: number
  vendorPrice?: number
  travelPayout?: number
  offHoursPayout?: number
  sqFt?: number
  client?: any
  tech?: any
  subcontractorVendor?: string | { id: string; companyName: string }
  subInvoiceData?: any
  subInvoiceImported?: boolean
}

interface User {
  role: string
}

interface Client {
  id: string
  name: string
  invoicingPreferences?: {
    taxExempt?: boolean
    taxRate?: number
  }
}

interface Product {
  id: string
  name: string
  basePrice: number
  unitType?: string
  excludeFromCalendar?: boolean
  taxable?: boolean
}

interface AutosaveField<T> {
  value: T
  status: 'idle' | 'saving' | 'saved' | 'error'
  error?: string | null
  setValue: (value: T) => void
  commit?: (value: T) => void
  onBlur?: () => void
}

interface FinancialsTabProps {
  job: Job
  user: User
  clients: Client[]
  products: Product[]
  vendors: any[]
  // Edit state
  productsEditOpen: boolean
  setProductsEditOpen: (open: boolean) => void
  expensesEditOpen: boolean
  setExpensesEditOpen: (open: boolean) => void
  discountEditOpen: boolean
  setDiscountEditOpen: (open: boolean) => void
  // Autosave fields
  lineItemsField: AutosaveField<any[]>
  externalExpensesField: AutosaveField<any[]>
  discountField: AutosaveField<any>
  vendorPriceField: AutosaveField<string>
  travelPayoutField: AutosaveField<string>
  offHoursPayoutField: AutosaveField<string>
}

export default function FinancialsTab({
  job,
  user,
  clients,
  products,
  vendors,
  productsEditOpen,
  setProductsEditOpen,
  expensesEditOpen,
  setExpensesEditOpen,
  discountEditOpen,
  setDiscountEditOpen,
  lineItemsField,
  externalExpensesField,
  discountField,
  vendorPriceField,
  travelPayoutField,
  offHoursPayoutField,
}: FinancialsTabProps) {
  const isTech = user?.role === 'tech'

  // QuickBooks sync state
  const [syncing, setSyncing] = useState(false)
  const [syncError, setSyncError] = useState<string | null>(null)
  const [syncSuccess, setSyncSuccess] = useState<string | null>(null)

  // Check if any expenses have QuickBooks IDs
  const expensesWithQB = (job.externalExpenses || []).filter((exp: any) => exp.quickbooksId)
  const hasQBExpenses = expensesWithQB.length > 0

  // Sync QB status for all expenses
  const handleSyncQBStatus = async () => {
    setSyncing(true)
    setSyncError(null)
    setSyncSuccess(null)

    try {
      const response = await fetch('/api/quickbooks/bills/sync-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId: job.id }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to sync status')
      }

      setSyncSuccess(data.message)

      // If any statuses were updated, refresh the expenses field
      if (data.updatedCount > 0) {
        // Update the local state with new data
        const updatedExpenses = [...(job.externalExpenses || [])]
        data.results.forEach((result: any) => {
          if (result.updated && updatedExpenses[result.expenseIndex]) {
            updatedExpenses[result.expenseIndex] = {
              ...updatedExpenses[result.expenseIndex],
              paymentStatus: result.newStatus,
              quickbooksSyncedAt: new Date().toISOString(),
            }
          }
        })
        externalExpensesField.setValue(updatedExpenses)
        externalExpensesField.commit?.(updatedExpenses)
      }
    } catch (err: any) {
      setSyncError(err.message || 'Failed to sync QuickBooks status')
      console.error('QB sync error:', err)
    } finally {
      setSyncing(false)
    }
  }

  // Payment status badge component
  const PaymentStatusBadge = ({ status }: { status: string }) => {
    const styles: Record<string, string> = {
      paid: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
      unpaid: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
    }
    return (
      <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${styles[status] || styles.unpaid}`}>
        {status?.toUpperCase() || 'UNPAID'}
      </span>
    )
  }

  return (
    <div className="space-y-6">
      {/* Invoice Status */}
      {job.invoiceStatus && job.invoiceStatus !== 'not-invoiced' && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Invoice Status</h2>
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="text-gray-600 dark:text-gray-400">Status:</span>
                <span className={`px-3 py-1 text-sm font-medium rounded-full ${
                  job.invoiceStatus === 'paid' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' :
                  job.invoiceStatus === 'invoiced' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' :
                  job.invoiceStatus === 'ready' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300' :
                  'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
                }`}>
                  {job.invoiceStatus?.toUpperCase()}
                </span>
              </div>
              {job.invoice && (
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  <p>Invoice: {job.invoice.invoiceNumber || `#${String(job.invoice.id).slice(0, 8)}`}</p>
                  <p>Amount: ${job.invoice.total?.toFixed(2)}</p>
                  {job.invoicedAt && (
                    <p>Invoiced: {new Date(job.invoicedAt).toLocaleDateString()}</p>
                  )}
                </div>
              )}
            </div>
            {job.invoice && (
              <Link
                href={`/oms/invoices/${job.invoice.id}`}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
              >
                View Invoice
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Line Items / Products */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Products / Services</h2>
          {!isTech && (
            <div className="flex gap-2">
              {productsEditOpen ? (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      lineItemsField.commit?.(lineItemsField.value)
                      setProductsEditOpen(false)
                    }}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                  >
                    Done
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      lineItemsField.setValue(job.lineItems ?? [])
                      setProductsEditOpen(false)
                    }}
                    className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors"
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => setProductsEditOpen(true)}
                  className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors"
                >
                  Edit
                </button>
              )}
            </div>
          )}
        </div>

        {productsEditOpen && !isTech ? (
          <div className="space-y-3">
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => {
                  const next = [...(lineItemsField.value || []), { product: '', quantity: 1, instructions: '' }]
                  lineItemsField.setValue(next)
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
              >
                + Add Product
              </button>
            </div>
            {(lineItemsField.value || []).map((item: any, index: number) => (
              <div key={index} className="flex gap-3 items-start p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                <div className="flex-1">
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-400 block mb-1">Product</label>
                  <select
                    value={typeof item.product === 'object' ? item.product?.id : item.product}
                    onChange={(e) => {
                      const selectedProduct = products.find(p => String(p.id) === String(e.target.value))
                      const next = [...(lineItemsField.value || [])]
                      const updatedItem: any = {
                        ...next[index],
                        product: e.target.value,
                      }
                      if (selectedProduct?.excludeFromCalendar) {
                        updatedItem.excludeFromCalendar = true
                      }
                      next[index] = updatedItem
                      lineItemsField.setValue(next)
                    }}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="">Select Product...</option>
                    {products.map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.name} - ${product.basePrice}
                      </option>
                    ))}
                  </select>

                  <label className="mt-3 text-sm font-medium text-gray-500 dark:text-gray-400 block mb-1">Instructions</label>
                  <textarea
                    value={item.instructions || ''}
                    onChange={(e) => {
                      const next = [...(lineItemsField.value || [])]
                      next[index] = { ...next[index], instructions: e.target.value }
                      lineItemsField.setValue(next)
                    }}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="Optional instructions for this service..."
                  />

                  <div className="mt-3">
                    <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                      <input
                        type="checkbox"
                        checked={(() => {
                          if (item.excludeFromCalendar !== undefined) {
                            return item.excludeFromCalendar
                          }
                          const productId = typeof item.product === 'object' ? item.product?.id : item.product
                          const product = products.find(p => p.id === productId)
                          return product?.excludeFromCalendar || false
                        })()}
                        onChange={(e) => {
                          const next = [...(lineItemsField.value || [])]
                          next[index] = { ...next[index], excludeFromCalendar: e.target.checked }
                          lineItemsField.setValue(next)
                        }}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded"
                      />
                      Exclude from tech calendar (post-production only)
                    </label>
                  </div>
                </div>
                <div className="w-24">
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-400 block mb-1">Qty</label>
                  <input
                    type="number"
                    min="1"
                    value={item.quantity || 1}
                    onChange={(e) => {
                      const next = [...(lineItemsField.value || [])]
                      next[index] = { ...next[index], quantity: parseInt(e.target.value) }
                      lineItemsField.setValue(next)
                    }}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const next = (lineItemsField.value || []).filter((_: any, i: number) => i !== index)
                    lineItemsField.setValue(next)
                  }}
                  className="mt-7 p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            ))}
            {(!lineItemsField.value || lineItemsField.value.length === 0) && (
              <p className="text-gray-400 italic text-center py-4">No products added yet. Click &quot;Add Product&quot; to get started.</p>
            )}
            <SaveIndicator status={lineItemsField.status} error={lineItemsField.error} />
          </div>
        ) : (
          <div className="space-y-2">
            {job.lineItems && job.lineItems.length > 0 ? (
              job.lineItems.map((item: any, index: number) => (
                <div key={index} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {item.product?.name || 'Unknown Product'}
                    </p>
                    {item.instructions && (
                      <p className="text-sm text-gray-600 dark:text-gray-400">{item.instructions}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-gray-900 dark:text-white">Qty: {item.quantity || 1}</p>
                    {item.product?.basePrice && (
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        ${(() => {
                          const price = item.product.basePrice
                          const jobSqFt = job.sqFt || 0
                          const multiplier = item.product.unitType === 'per-sq-ft' ? jobSqFt : (item.quantity || 1)
                          return (price * multiplier).toFixed(2)
                        })()}
                        {item.product.unitType === 'per-sq-ft' && ` (${job.sqFt || 0} sq ft)`}
                      </p>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-400 italic text-center py-4">No products added</p>
            )}
          </div>
        )}
      </div>

      {/* Invoice Breakdown */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Invoice Breakdown</h2>

        {(() => {
          const currentJob = {
            ...job,
            lineItems: productsEditOpen ? lineItemsField.value : (job.lineItems ?? []),
            discount: discountEditOpen ? discountField.value : (job.discount ?? { type: 'none', value: 0 }),
            externalExpenses: expensesEditOpen ? externalExpensesField.value : (job.externalExpenses ?? []),
          }
          const jobSqFt = job.sqFt || 0

          // Calculate subtotal
          let subtotal = 0
          if (currentJob.lineItems && currentJob.lineItems.length > 0) {
            currentJob.lineItems.forEach((item: any) => {
              const productId = typeof item.product === 'object' ? item.product?.id : item.product
              const product = products.find(p => p.id === productId)
              if (product?.basePrice) {
                const price = product.basePrice
                const multiplier = product.unitType === 'per-sq-ft' ? jobSqFt : (item.quantity || 1)
                subtotal += price * multiplier
              }
            })
          }

          // Calculate discount
          const discountType = currentJob.discount?.type || 'none'
          const discountValue = currentJob.discount?.value || 0
          const discountAmount = discountType === 'fixed'
            ? discountValue
            : discountType === 'percentage'
            ? subtotal * (discountValue / 100)
            : 0

          // Calculate tax
          let taxAmount = 0
          const clientData = clients.find(c => c.id === (typeof currentJob.client === 'object' ? currentJob.client?.id : currentJob.client))
          if (clientData && !clientData.invoicingPreferences?.taxExempt && clientData.invoicingPreferences?.taxRate) {
            let taxableAmount = 0
            currentJob.lineItems?.forEach((item: any) => {
              const productId = typeof item.product === 'object' ? item.product?.id : item.product
              const product = products.find(p => p.id === productId)
              if (product?.taxable) {
                const price = product.basePrice || 0
                const multiplier = product.unitType === 'per-sq-ft' ? jobSqFt : (item.quantity || 1)
                taxableAmount += price * multiplier
              }
            })
            taxAmount = taxableAmount * ((clientData.invoicingPreferences.taxRate || 0) / 100)
          }

          const totalWithTax = subtotal + taxAmount - discountAmount

          return (
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-600 dark:text-gray-400">Subtotal:</span>
                <span className="text-lg font-semibold text-gray-900 dark:text-white">
                  ${subtotal.toFixed(2)}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span className="text-gray-600 dark:text-gray-400">Tax:</span>
                  {clientData?.invoicingPreferences?.taxRate && (
                    <span className="text-sm text-gray-500">({clientData.invoicingPreferences.taxRate}%)</span>
                  )}
                  {clientData?.invoicingPreferences?.taxExempt && (
                    <span className="text-sm text-gray-500">(Tax Exempt)</span>
                  )}
                </div>
                <span className="text-lg font-semibold text-gray-900 dark:text-white">
                  ${taxAmount.toFixed(2)}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span className="text-gray-600 dark:text-gray-400">Discount:</span>
                  {!isTech && discountEditOpen ? (
                    <>
                      <select
                        value={discountField.value?.type || 'none'}
                        onChange={(e) =>
                          discountField.setValue({
                            ...(discountField.value || {}),
                            type: e.target.value,
                            value: e.target.value === 'none' ? 0 : discountField.value?.value || 0,
                          })
                        }
                        onBlur={() => discountField.onBlur?.()}
                        className="text-sm px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      >
                        <option value="none">None</option>
                        <option value="fixed">Fixed $</option>
                        <option value="percentage">Percentage %</option>
                      </select>
                      {(discountField.value?.type || 'none') !== 'none' && (
                        <input
                          type="number"
                          step="0.01"
                          value={discountField.value?.value || 0}
                          onChange={(e) =>
                            discountField.setValue({
                              ...(discountField.value || {}),
                              value: parseFloat(e.target.value) || 0,
                            })
                          }
                          onBlur={() => discountField.onBlur?.()}
                          className="w-20 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          placeholder="0"
                        />
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          discountField.commit?.(discountField.value)
                          setDiscountEditOpen(false)
                        }}
                        className="ml-2 px-3 py-1 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                      >
                        Done
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          discountField.setValue(job.discount ?? { type: 'none', value: 0 })
                          setDiscountEditOpen(false)
                        }}
                        className="px-3 py-1 text-sm bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors"
                      >
                        Cancel
                      </button>
                    </>
                  ) : !isTech ? (
                    <button
                      type="button"
                      onClick={() => setDiscountEditOpen(true)}
                      className="px-3 py-1 text-sm bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors"
                    >
                      Edit
                    </button>
                  ) : null}
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span
                    className={`text-lg font-semibold ${
                      discountAmount > 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white'
                    }`}
                  >
                    {discountAmount > 0 ? `-$${discountAmount.toFixed(2)}` : '$0.00'}
                  </span>
                  {discountEditOpen && <SaveIndicator status={discountField.status} error={discountField.error} />}
                </div>
              </div>

              {discountAmount > 0 && (
                <div className="flex justify-between items-center text-red-600 dark:text-red-400">
                  <span>Discount:</span>
                  <span className="text-lg font-semibold">
                    -${discountAmount.toFixed(2)}
                  </span>
                </div>
              )}

              <div className="border-t-2 border-gray-300 dark:border-gray-600 my-3"></div>

              <div className="flex justify-between items-center">
                <span className="text-xl font-bold text-gray-900 dark:text-white">
                  Total (Client Invoice):
                </span>
                <span className="text-2xl font-bold text-green-600 dark:text-green-400">
                  ${totalWithTax.toFixed(2)}
                </span>
              </div>
            </div>
          )
        })()}
      </div>

      {/* Costs & Expenses */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Costs & Expenses</h2>

        {/* Tech Payouts Section */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Tech Payouts</h3>
          <div className="space-y-2 pl-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-600 dark:text-gray-400">Capture Payout:</span>
              {isTech ? (
                <span className="font-semibold text-gray-900 dark:text-white">
                  ${job.vendorPrice?.toFixed(2) || '0.00'}
                </span>
              ) : (
                <div className="flex flex-col items-end gap-1">
                  <input
                    type="number"
                    step="0.01"
                    value={vendorPriceField.value}
                    onChange={(e) => vendorPriceField.setValue(e.target.value)}
                    onBlur={() => vendorPriceField.onBlur?.()}
                    className="w-32 px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-right"
                    placeholder="0.00"
                  />
                  <SaveIndicator status={vendorPriceField.status} error={vendorPriceField.error} />
                </div>
              )}
            </div>

            <div className="flex justify-between items-center">
              <span className="text-gray-600 dark:text-gray-400">Travel Payout:</span>
              {isTech ? (
                <span className="font-semibold text-gray-900 dark:text-white">
                  ${job.travelPayout?.toFixed(2) || '0.00'}
                </span>
              ) : (
                <div className="flex flex-col items-end gap-1">
                  <input
                    type="number"
                    step="0.01"
                    value={travelPayoutField.value}
                    onChange={(e) => travelPayoutField.setValue(e.target.value)}
                    onBlur={() => travelPayoutField.onBlur?.()}
                    className="w-32 px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-right"
                    placeholder="0.00"
                  />
                  <SaveIndicator status={travelPayoutField.status} error={travelPayoutField.error} />
                </div>
              )}
            </div>

            <div className="flex justify-between items-center">
              <span className="text-gray-600 dark:text-gray-400">Off-Hours Payout:</span>
              {isTech ? (
                <span className="font-semibold text-gray-900 dark:text-white">
                  ${job.offHoursPayout?.toFixed(2) || '0.00'}
                </span>
              ) : (
                <div className="flex flex-col items-end gap-1">
                  <input
                    type="number"
                    step="0.01"
                    value={offHoursPayoutField.value}
                    onChange={(e) => offHoursPayoutField.setValue(e.target.value)}
                    onBlur={() => offHoursPayoutField.onBlur?.()}
                    className="w-32 px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-right"
                    placeholder="0.00"
                  />
                  <SaveIndicator status={offHoursPayoutField.status} error={offHoursPayoutField.error} />
                </div>
              )}
            </div>

            <div className="border-t border-gray-200 dark:border-gray-700 pt-2 mt-2">
              <div className="flex justify-between font-semibold">
                <span className="text-gray-900 dark:text-white">Subtotal Tech:</span>
                <span className="text-gray-900 dark:text-white">
                  ${(
                    (parseFloat(vendorPriceField.value) || job.vendorPrice || 0) +
                    (parseFloat(travelPayoutField.value) || job.travelPayout || 0) +
                    (parseFloat(offHoursPayoutField.value) || job.offHoursPayout || 0)
                  ).toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* External Expenses Section */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">External Supplier Expenses</h3>
            {!isTech && (
              <div className="flex gap-2">
                {/* QB Sync Button - only show if there are expenses with QB IDs */}
                {hasQBExpenses && !expensesEditOpen && (
                  <button
                    type="button"
                    onClick={handleSyncQBStatus}
                    disabled={syncing}
                    className="px-3 py-1 text-sm bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                  >
                    {syncing ? (
                      <>
                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Syncing...
                      </>
                    ) : (
                      <>Sync QB Status</>
                    )}
                  </button>
                )}
                {expensesEditOpen ? (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        externalExpensesField.commit?.(externalExpensesField.value)
                        setExpensesEditOpen(false)
                      }}
                      className="px-3 py-1 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                    >
                      Done
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        externalExpensesField.setValue(job.externalExpenses ?? [])
                        setExpensesEditOpen(false)
                      }}
                      className="px-3 py-1 text-sm bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors"
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => setExpensesEditOpen(true)}
                    className="px-3 py-1 text-sm bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors"
                  >
                    Edit
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Sync Status Messages */}
          {syncError && (
            <div className="mb-3 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-800 dark:text-red-200">{syncError}</p>
            </div>
          )}
          {syncSuccess && (
            <div className="mb-3 p-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
              <p className="text-sm text-green-800 dark:text-green-200">{syncSuccess}</p>
            </div>
          )}

          <div className="space-y-2 pl-4">
            {expensesEditOpen && !isTech ? (
              <>
                <div className="flex justify-between items-center mb-4">
                  <button
                    type="button"
                    onClick={() => {
                      const next = [...(externalExpensesField.value || []), {
                        description: '',
                        supplier: '',
                        contactInfo: '',
                        amount: 0,
                        paymentStatus: 'unpaid',
                        notes: '',
                      }]
                      externalExpensesField.setValue(next)
                    }}
                    className="px-3 py-1 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                  >
                    + Add Expense
                  </button>
                </div>

                {/* Subcontractor Invoice Import Panel */}
                {(() => {
                  // Check if job has vendor OR if assigned tech has vendor
                  const hasVendor = job.subcontractorVendor || (job.tech?.type === 'partner' && job.tech?.vendor)
                  const vendorId = job.subcontractorVendor 
                    ? (typeof job.subcontractorVendor === 'string' ? job.subcontractorVendor : job.subcontractorVendor?.id)
                    : (job.tech?.vendor ? (typeof job.tech.vendor === 'string' ? job.tech.vendor : job.tech.vendor?.id) : '')
                  
                  return hasVendor ? (
                    <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-lg">
                      <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Import Subcontractor Invoice</h4>
                      <SubInvoiceImportPanel
                        job={job}
                        vendors={vendors}
                        selectedVendor={vendorId || ''}
                        setSelectedVendor={(vendorId) => {
                          // This would need to be handled via a job update
                          console.log('Vendor changed to:', vendorId)
                        }}
                        subInvoiceData={job.subInvoiceData || {}}
                        setSubInvoiceData={(data) => {
                          // This would need to be handled via a job update
                          console.log('Invoice data updated:', data)
                        }}
                        onImportSuccess={(newExpense) => {
                          const next = [...(externalExpensesField.value || []), newExpense]
                          externalExpensesField.setValue(next)
                          // Don't commit immediately - let user click "Done" to save
                        }}
                      />
                    </div>
                  ) : null
                })()}
                {(externalExpensesField.value || []).map((expense: any, index: number) => (
                  <div key={index} className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg space-y-2">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={expense.description || ''}
                        onChange={(e) => {
                          const next = [...(externalExpensesField.value || [])]
                          next[index] = { ...next[index], description: e.target.value }
                          externalExpensesField.setValue(next)
                        }}
                        className="flex-1 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        placeholder="Description (e.g., Floor Plans)"
                      />
                      <input
                        type="number"
                        step="0.01"
                        value={expense.amount || ''}
                        onChange={(e) => {
                          const next = [...(externalExpensesField.value || [])]
                          next[index] = { ...next[index], amount: parseFloat(e.target.value) || 0 }
                          externalExpensesField.setValue(next)
                        }}
                        className="w-28 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-right"
                        placeholder="0.00"
                      />
                      <button
                        onClick={() => {
                          const next = (externalExpensesField.value || []).filter((_: any, i: number) => i !== index)
                          externalExpensesField.setValue(next)
                        }}
                        className="p-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                    <input
                      type="text"
                      value={expense.supplier || ''}
                      onChange={(e) => {
                        const next = [...(externalExpensesField.value || [])]
                        next[index] = { ...next[index], supplier: e.target.value }
                        externalExpensesField.setValue(next)
                      }}
                      className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="Supplier name (optional)"
                    />
                  </div>
                ))}
                {(!externalExpensesField.value || externalExpensesField.value.length === 0) && (
                  <p className="text-gray-400 italic text-center py-2 text-sm">No external expenses. Click &quot;Add Expense&quot; to add one.</p>
                )}
                <SaveIndicator status={externalExpensesField.status} error={externalExpensesField.error} />
              </>
            ) : (
              <>
                {job.externalExpenses && job.externalExpenses.length > 0 ? (
                  job.externalExpenses.map((expense: any, index: number) => (
                    <div key={index} className="p-3 bg-gray-50 dark:bg-gray-900 rounded space-y-2">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-900 dark:text-white">{expense.description}</span>
                            {expense.autoGenerated ? (
                              <span className="text-xs text-gray-400 dark:text-gray-500 italic">from product</span>
                            ) : (
                              <PaymentStatusBadge status={expense.paymentStatus} />
                            )}
                          </div>
                          {expense.supplier && (
                            <p className="text-sm text-gray-500 dark:text-gray-400">{expense.supplier}</p>
                          )}
                        </div>
                        <span className="font-semibold text-gray-900 dark:text-white">${expense.amount?.toFixed(2) || '0.00'}</span>
                      </div>
                      {/* QB info only for manually imported invoices */}
                      {!expense.autoGenerated && (
                        expense.quickbooksId ? (
                          <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400 border-t border-gray-200 dark:border-gray-700 pt-2">
                            <span className="flex items-center gap-1">
                              <svg className="w-3.5 h-3.5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                              </svg>
                              QB Bill #{expense.quickbooksDocNumber || expense.quickbooksId}
                            </span>
                            {expense.quickbooksSyncedAt && (
                              <span>
                                Synced: {new Date(expense.quickbooksSyncedAt).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        ) : (
                          <div className="text-xs text-gray-400 dark:text-gray-500 border-t border-gray-200 dark:border-gray-700 pt-2">
                            Not synced with QuickBooks
                          </div>
                        )
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-gray-400 italic text-center py-2 text-sm">No external expenses</p>
                )}
              </>
            )}

            <div className="border-t border-gray-200 dark:border-gray-700 pt-2 mt-2">
              <div className="flex justify-between font-semibold">
                <span className="text-gray-900 dark:text-white">Subtotal Expenses:</span>
                <span className="text-gray-900 dark:text-white">
                  ${(() => {
                    const currentJob = expensesEditOpen
                      ? { externalExpenses: externalExpensesField.value }
                      : job
                    return (currentJob?.externalExpenses || []).reduce((sum: number, exp: any) => sum + (exp.amount || 0), 0).toFixed(2)
                  })()}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Total Costs & Profit */}
        {(() => {
          const currentJob = {
            ...job,
            lineItems: productsEditOpen ? lineItemsField.value : (job.lineItems ?? []),
            externalExpenses: expensesEditOpen ? externalExpensesField.value : (job.externalExpenses ?? []),
          }
          const jobSqFt = job.sqFt || 0

          // Calculate revenue
          let subtotal = 0
          if (currentJob.lineItems && currentJob.lineItems.length > 0) {
            currentJob.lineItems.forEach((item: any) => {
              const productId = typeof item.product === 'object' ? item.product?.id : item.product
              const product = products.find(p => p.id === productId)
              if (product?.basePrice) {
                const price = product.basePrice
                const multiplier = product.unitType === 'per-sq-ft' ? jobSqFt : (item.quantity || 1)
                subtotal += price * multiplier
              }
            })
          }

          const discountType = currentJob.discount?.type || 'none'
          const discountValue = currentJob.discount?.value || 0
          const discountAmount = discountType === 'fixed'
            ? discountValue
            : discountType === 'percentage'
            ? subtotal * (discountValue / 100)
            : 0

          let taxAmount = 0
          const clientData = clients.find(c => c.id === (typeof currentJob.client === 'object' ? currentJob.client?.id : currentJob.client))
          if (clientData && !clientData.invoicingPreferences?.taxExempt && clientData.invoicingPreferences?.taxRate) {
            let taxableAmount = 0
            currentJob.lineItems?.forEach((item: any) => {
              const productId = typeof item.product === 'object' ? item.product?.id : item.product
              const product = products.find(p => p.id === productId)
              if (product?.taxable) {
                const price = product.basePrice || 0
                const multiplier = product.unitType === 'per-sq-ft' ? jobSqFt : (item.quantity || 1)
                taxableAmount += price * multiplier
              }
            })
            taxAmount = taxableAmount * ((clientData.invoicingPreferences.taxRate || 0) / 100)
          }

          const revenue = subtotal + taxAmount - discountAmount

          // Calculate costs
          const techPayout = (parseFloat(vendorPriceField.value) || job.vendorPrice || 0) +
                           (parseFloat(travelPayoutField.value) || job.travelPayout || 0) +
                           (parseFloat(offHoursPayoutField.value) || job.offHoursPayout || 0)
          const externalExpenses = (currentJob.externalExpenses || []).reduce((sum: number, exp: any) => sum + (exp.amount || 0), 0)
          const totalCosts = techPayout + externalExpenses

          // Calculate profit and margin
          const grossProfit = revenue - totalCosts
          const margin = revenue > 0 ? (grossProfit / revenue) * 100 : 0

          return (
            <div className="border-t-2 border-gray-300 dark:border-gray-600 pt-4 space-y-3">
              <div className="flex justify-between items-center text-lg font-bold">
                <span className="text-gray-900 dark:text-white">Total Costs:</span>
                <span className="text-red-600 dark:text-red-400">
                  ${totalCosts.toFixed(2)}
                </span>
              </div>

              <div className="flex justify-between items-center text-xl font-bold">
                <span className="text-gray-900 dark:text-white">Gross Profit:</span>
                <span className={grossProfit >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}>
                  ${grossProfit.toFixed(2)}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-gray-600 dark:text-gray-400">Margin:</span>
                <span className={`text-lg font-semibold ${margin >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                  {margin.toFixed(1)}%
                </span>
              </div>
            </div>
          )
        })()}
      </div>
    </div>
  )
}
