'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Send, XCircle, FileText, Download } from 'lucide-react'

interface Invoice {
  id: string
  invoiceNumber?: string
  status: string
  client: {
    id: string
    name: string
    email?: string
  }
  jobs: Array<{
    id: string
    jobId: string
    modelName: string
  }>
  lineItems: Array<{
    description: string
    quantity: number
    rate: number
    amount: number
    taxable: boolean
  }>
  subtotal: number
  taxRate: number
  taxAmount: number
  total: number
  invoiceDate: string
  dueDate: string
  paidAmount: number
  paidDate?: string
  terms: string
  notes?: string
  internalNotes?: string
  quickbooks?: {
    invoiceId?: string
    syncStatus: string
    lastSyncedAt?: string
    syncError?: string
  }
  approvedBy?: {
    id: string
    name: string
  }
  approvedAt?: string
  createdBy?: {
    id: string
    name: string
  }
  createdAt: string
}

export default function InvoiceDetailPage() {
  const router = useRouter()
  const params = useParams()
  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)

  useEffect(() => {
    if (params.id) {
      fetchInvoice(params.id as string)
    }
  }, [params.id])

  const fetchInvoice = async (id: string) => {
    try {
      const response = await fetch(`/api/invoices/${id}?depth=2`)
      const data = await response.json()
      setInvoice(data)
    } catch (error) {
      console.error('Error fetching invoice:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSyncToQuickBooks = async () => {
    if (!invoice) return
    
    if (!confirm('Sync this invoice to QuickBooks?')) return
    
    setActionLoading(true)
    try {
      const response = await fetch(`/api/invoices/${invoice.id}/sync`, {
        method: 'POST',
      })

      if (response.ok) {
        alert('Invoice synced to QuickBooks successfully!')
        fetchInvoice(invoice.id)
      } else {
        const error = await response.json()
        alert(`Failed to sync invoice: ${error.error}`)
      }
    } catch (error: any) {
      alert('Error syncing invoice: ' + error.message)
    } finally {
      setActionLoading(false)
    }
  }

  const handleVoid = async () => {
    if (!invoice) return
    
    if (!confirm('Are you sure you want to void this invoice? This action cannot be undone.')) return
    
    setActionLoading(true)
    try {
      const response = await fetch(`/api/invoices/${invoice.id}/void`, {
        method: 'POST',
      })

      if (response.ok) {
        alert('Invoice voided successfully!')
        fetchInvoice(invoice.id)
      } else {
        const error = await response.json()
        alert(`Failed to void invoice: ${error.error}`)
      }
    } catch (error: any) {
      alert('Error voiding invoice: ' + error.message)
    } finally {
      setActionLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const styles = {
      draft: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
      'pending-approval': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
      approved: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
      sent: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
      paid: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
      'partial-payment': 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
      overdue: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
      void: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
    }
    
    return (
      <span className={`px-3 py-1 text-sm font-medium rounded-full ${styles[status as keyof typeof styles] || styles.draft}`}>
        {status?.replace('-', ' ').toUpperCase() || 'DRAFT'}
      </span>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading invoice...</p>
        </div>
      </div>
    )
  }

  if (!invoice) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-gray-600 dark:text-gray-400">Invoice not found</p>
          <button
            onClick={() => router.push('/oms/invoices')}
            className="mt-4 text-blue-600 hover:text-blue-800"
          >
            Back to Invoices
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.push('/oms/invoices')}
            className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Invoices
          </button>
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Invoice {invoice.invoiceNumber || `#${String(invoice.id).slice(0, 8)}`}
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Created {new Date(invoice.createdAt).toLocaleDateString()}
              </p>
            </div>
            <div className="flex items-center gap-3">
              {getStatusBadge(invoice.status)}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700 mb-6">
          <div className="flex gap-3 flex-wrap">
            {invoice.status !== 'void' && (
              <button
                onClick={handleSyncToQuickBooks}
                disabled={actionLoading}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors"
              >
                <Send className="h-4 w-4" />
                Sync to QuickBooks
              </button>
            )}
            
            {['draft', 'approved', 'sent'].includes(invoice.status) && (
              <button
                onClick={handleVoid}
                disabled={actionLoading}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors"
              >
                <XCircle className="h-4 w-4" />
                Void Invoice
              </button>
            )}

            {invoice.quickbooks?.invoiceId && (
              <a
                href={`https://app.qbo.intuit.com/app/invoice?txnId=${invoice.quickbooks.invoiceId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors"
              >
                <FileText className="h-4 w-4" />
                View in QuickBooks
              </a>
            )}
          </div>
        </div>

        {/* QuickBooks Sync Status */}
        {invoice.quickbooks?.syncStatus === 'error' && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
            <h3 className="text-red-800 dark:text-red-300 font-semibold mb-2">QuickBooks Sync Error</h3>
            <p className="text-red-700 dark:text-red-400 text-sm">{invoice.quickbooks.syncError}</p>
          </div>
        )}

        {/* Invoice Preview */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-8">
          {/* Invoice Header */}
          <div className="flex justify-between mb-8">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">INVOICE</h2>
              <p className="text-gray-600 dark:text-gray-400">
                Invoice #: {invoice.invoiceNumber || `INV-${String(invoice.id).slice(0, 8)}`}
              </p>
              <p className="text-gray-600 dark:text-gray-400">
                Date: {new Date(invoice.invoiceDate).toLocaleDateString()}
              </p>
              <p className="text-gray-600 dark:text-gray-400">
                Due: {new Date(invoice.dueDate).toLocaleDateString()}
              </p>
              <p className="text-gray-600 dark:text-gray-400">
                Terms: {invoice.terms?.replace('-', ' ').toUpperCase()}
              </p>
            </div>
            
            <div className="text-right">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Bill To:</h3>
              <p className="text-gray-900 dark:text-white font-medium">{invoice.client.name}</p>
              {invoice.client.email && (
                <p className="text-gray-600 dark:text-gray-400 text-sm">{invoice.client.email}</p>
              )}
            </div>
          </div>

          {/* Related Jobs */}
          <div className="mb-6">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Related Jobs:</h3>
            <div className="flex gap-2 flex-wrap">
              {invoice.jobs.map((job) => (
                <Link
                  key={job.id}
                  href={`/oms/jobs/${job.id}`}
                  className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded text-sm hover:bg-blue-200 dark:hover:bg-blue-900/50"
                >
                  {job.jobId} - {job.modelName}
                </Link>
              ))}
            </div>
          </div>

          {/* Line Items */}
          <table className="w-full mb-6">
            <thead className="border-b-2 border-gray-300 dark:border-gray-600">
              <tr>
                <th className="text-left py-2 text-gray-700 dark:text-gray-300">Description</th>
                <th className="text-right py-2 text-gray-700 dark:text-gray-300">Qty</th>
                <th className="text-right py-2 text-gray-700 dark:text-gray-300">Rate</th>
                <th className="text-right py-2 text-gray-700 dark:text-gray-300">Amount</th>
              </tr>
            </thead>
            <tbody>
              {invoice.lineItems.map((item, index) => (
                <tr key={index} className="border-b border-gray-200 dark:border-gray-700">
                  <td className="py-3 text-gray-900 dark:text-white">
                    {item.description}
                    {!item.taxable && (
                      <span className="ml-2 text-xs text-gray-500">(Non-taxable)</span>
                    )}
                  </td>
                  <td className="text-right py-3 text-gray-900 dark:text-white">{item.quantity}</td>
                  <td className="text-right py-3 text-gray-900 dark:text-white">${item.rate.toFixed(2)}</td>
                  <td className="text-right py-3 text-gray-900 dark:text-white">${item.amount.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals */}
          <div className="flex justify-end">
            <div className="w-64">
              <div className="flex justify-between py-2">
                <span className="text-gray-600 dark:text-gray-400">Subtotal:</span>
                <span className="text-gray-900 dark:text-white">${invoice.subtotal.toFixed(2)}</span>
              </div>
              {invoice.taxAmount > 0 && (
                <div className="flex justify-between py-2">
                  <span className="text-gray-600 dark:text-gray-400">Tax ({invoice.taxRate}%):</span>
                  <span className="text-gray-900 dark:text-white">${invoice.taxAmount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between py-2 border-t-2 border-gray-300 dark:border-gray-600 font-bold">
                <span className="text-gray-900 dark:text-white">Total:</span>
                <span className="text-gray-900 dark:text-white">${invoice.total.toFixed(2)}</span>
              </div>
              {invoice.paidAmount > 0 && (
                <>
                  <div className="flex justify-between py-2 text-green-600 dark:text-green-400">
                    <span>Paid:</span>
                    <span>-${invoice.paidAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between py-2 font-bold">
                    <span className="text-gray-900 dark:text-white">Balance Due:</span>
                    <span className="text-gray-900 dark:text-white">${(invoice.total - invoice.paidAmount).toFixed(2)}</span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Notes */}
          {invoice.notes && (
            <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Notes:</h3>
              <p className="text-gray-600 dark:text-gray-400 whitespace-pre-wrap">{invoice.notes}</p>
            </div>
          )}

          {/* Internal Notes */}
          {invoice.internalNotes && (
            <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded">
              <h3 className="font-semibold text-yellow-800 dark:text-yellow-300 mb-2">Internal Notes:</h3>
              <p className="text-yellow-700 dark:text-yellow-400 text-sm whitespace-pre-wrap">{invoice.internalNotes}</p>
            </div>
          )}

          {/* Metadata */}
          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700 text-sm text-gray-500 dark:text-gray-400">
            {invoice.approvedBy && invoice.approvedAt && (
              <p>Approved by {invoice.approvedBy.name} on {new Date(invoice.approvedAt).toLocaleString()}</p>
            )}
            {invoice.createdBy && (
              <p>Created by {invoice.createdBy.name}</p>
            )}
            {invoice.quickbooks?.lastSyncedAt && (
              <p>Last synced to QuickBooks: {new Date(invoice.quickbooks.lastSyncedAt).toLocaleString()}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
