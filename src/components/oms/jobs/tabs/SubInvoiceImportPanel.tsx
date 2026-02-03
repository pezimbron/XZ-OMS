'use client'

import React, { useState } from 'react'

interface Vendor {
  id: string
  companyName: string
  billingEmail: string
  integrations?: {
    quickbooks?: {
      vendorId?: string
      syncStatus?: string
    }
  }
}

interface QuickBooksBill {
  Id: string
  DocNumber: string
  TxnDate: string
  DueDate: string
  TotalAmt: number
  Balance: number
  PrivateNote?: string
  Line: Array<{
    Description: string
    Amount: number
  }>
}

interface SubInvoiceData {
  vendorName?: string
  vendorEmail?: string
  invoiceNumber?: string
  invoiceDate?: string
  dueDate?: string
  amount?: number
  description?: string
}

interface SubInvoiceImportPanelProps {
  job: any
  vendors: Vendor[]
  selectedVendor: string
  setSelectedVendor: (vendorId: string) => void
  subInvoiceData: SubInvoiceData
  setSubInvoiceData: (data: SubInvoiceData) => void
  onImportSuccess: (newExpense: any) => void
}

export default function SubInvoiceImportPanel({
  job,
  vendors,
  selectedVendor,
  setSelectedVendor,
  subInvoiceData,
  setSubInvoiceData,
  onImportSuccess,
}: SubInvoiceImportPanelProps) {
  const [importMethod, setImportMethod] = useState<'quickbooks' | 'manual'>('manual')
  const [availableBills, setAvailableBills] = useState<QuickBooksBill[]>([])
  const [selectedBills, setSelectedBills] = useState<string[]>([])
  const [loadingBills, setLoadingBills] = useState(false)
  const [importing, setImporting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  
  // Local form state (not controlled by parent)
  const [formData, setFormData] = useState<SubInvoiceData>(subInvoiceData || {})

  // Check if vendor was auto-populated from tech
  const assignedTech = job.tech
  const isVendorAutoPopulated = assignedTech?.type === 'partner' && assignedTech?.vendor

  const selectedVendorData = vendors.find(v => v.id === selectedVendor)
  const hasQBVendorId = selectedVendorData?.integrations?.quickbooks?.vendorId

  // Fetch bills from QuickBooks
  const handleFetchBills = async () => {
    if (!selectedVendor || !hasQBVendorId) {
      setError('Please select a vendor with QuickBooks integration')
      return
    }

    setLoadingBills(true)
    setError(null)

    try {
      const response = await fetch('/api/quickbooks/bills/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vendorId: selectedVendorData?.integrations?.quickbooks?.vendorId,
          dateRange: {
            from: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            to: new Date().toISOString().split('T')[0],
          },
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch bills')
      }

      setAvailableBills(data.bills || [])
      if (data.bills.length === 0) {
        setError('No bills found for this vendor in the last 90 days')
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch bills from QuickBooks')
      console.error('Error fetching bills:', err)
    } finally {
      setLoadingBills(false)
    }
  }

  // Import selected bills from QuickBooks
  const handleImportQBBills = async () => {
    if (selectedBills.length === 0) {
      setError('Please select at least one bill to import')
      return
    }

    setImporting(true)
    setError(null)

    try {
      const billsToImport = availableBills.filter(b => selectedBills.includes(b.Id))

      for (const bill of billsToImport) {
        // Determine payment status from bill balance
        let paymentStatus: 'unpaid' | 'pending' | 'paid' = 'unpaid'
        if (bill.Balance === 0) {
          paymentStatus = 'paid'
        } else if (bill.Balance < bill.TotalAmt) {
          paymentStatus = 'pending'
        }

        const newExpense = {
          description: bill.Line[0]?.Description || `Bill ${bill.DocNumber}`,
          supplier: selectedVendorData?.companyName || '',
          contactInfo: selectedVendorData?.billingEmail || '',
          amount: bill.TotalAmt,
          paymentStatus,
          notes: `Imported from QuickBooks - Bill #${bill.DocNumber}`,
          // Store QuickBooks tracking info
          quickbooksId: bill.Id,
          quickbooksDocNumber: bill.DocNumber,
          quickbooksSyncedAt: new Date().toISOString(),
        }

        onImportSuccess(newExpense)
      }

      setSuccess(`Successfully imported ${billsToImport.length} bill(s)`)
      setSelectedBills([])
      setAvailableBills([])
    } catch (err: any) {
      setError(err.message || 'Failed to import bills')
      console.error('Error importing bills:', err)
    } finally {
      setImporting(false)
    }
  }

  // Handle manual invoice import
  const handleManualImport = async () => {
    if (!selectedVendor) {
      setError('Please select a vendor')
      return
    }

    if (!formData.amount || formData.amount <= 0) {
      setError('Please enter a valid amount')
      return
    }

    setImporting(true)
    setError(null)

    try {
      let qbBillId: string | undefined
      let qbDocNumber: string | undefined

      // If vendor has QB integration, create bill in QuickBooks
      if (hasQBVendorId) {
        const response = await fetch('/api/quickbooks/bills', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            vendorId: selectedVendor,
            invoiceData: formData,
            jobId: job.id,
          }),
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Failed to create bill in QuickBooks')
        }

        // Capture the bill ID and doc number from QB response
        if (data.bill) {
          qbBillId = data.bill.Id
          qbDocNumber = data.bill.DocNumber
        }
      }

      // Add to external expenses
      const newExpense: Record<string, any> = {
        description: formData.description || 'Subcontractor services',
        supplier: selectedVendorData?.companyName || '',
        contactInfo: selectedVendorData?.billingEmail || '',
        amount: formData.amount,
        paymentStatus: 'unpaid',
        notes: formData.invoiceNumber ? `Invoice #${formData.invoiceNumber}` : '',
      }

      // Add QuickBooks tracking info if bill was created
      if (qbBillId) {
        newExpense.quickbooksId = qbBillId
        newExpense.quickbooksDocNumber = qbDocNumber
        newExpense.quickbooksSyncedAt = new Date().toISOString()
      }

      onImportSuccess(newExpense)
      setSuccess(qbBillId ? 'Invoice imported and bill created in QuickBooks' : 'Invoice imported successfully')

      // Reset form
      setFormData({
        vendorName: selectedVendorData?.companyName,
        vendorEmail: selectedVendorData?.billingEmail,
      })
    } catch (err: any) {
      setError(err.message || 'Failed to import invoice')
      console.error('Error importing invoice:', err)
    } finally {
      setImporting(false)
    }
  }

  // Handle file upload (CSV or PDF)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const isPDF = file.name.toLowerCase().endsWith('.pdf')
    const isCSV = file.name.toLowerCase().endsWith('.csv')

    if (!isPDF && !isCSV) {
      setError('Please upload a PDF or CSV file')
      return
    }

    const uploadData = new FormData()
    uploadData.append(isPDF ? 'pdf' : 'csv', file)

    const endpoint = isPDF ? '/api/sub-invoice/parse-pdf' : '/api/sub-invoice/parse'

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        body: uploadData,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || `Failed to parse ${isPDF ? 'PDF' : 'CSV'}`)
      }

      setFormData({
        ...formData,
        ...data.data,
      })
      setSuccess(`${isPDF ? 'PDF' : 'CSV'} parsed successfully`)
    } catch (err: any) {
      setError(err.message || `Failed to parse ${isPDF ? 'PDF' : 'CSV'}`)
      console.error('Error parsing file:', err)
    }
  }

  return (
    <div className="space-y-4">
      {/* Tech-Vendor Relationship Indicator */}
      {isVendorAutoPopulated && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <span className="text-blue-600 dark:text-blue-400 text-lg">ℹ️</span>
            <div className="flex-1">
              <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                Outsourced Job
              </p>
              <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                Assigned to: <strong>{assignedTech.name}</strong>
                {assignedTech.vendor && (
                  <>
                    {' from '}
                    <strong>
                      {typeof assignedTech.vendor === 'object' 
                        ? assignedTech.vendor.companyName 
                        : vendors.find(v => v.id === assignedTech.vendor)?.companyName}
                    </strong>
                  </>
                )}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Error/Success Messages */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
          <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}

      {success && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
          <p className="text-sm text-green-800 dark:text-green-200">{success}</p>
        </div>
      )}

      {/* Vendor Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Vendor / Subcontractor Company
          {isVendorAutoPopulated && (
            <span className="ml-2 text-xs text-green-600 dark:text-green-400">
              ✓ Auto-populated from tech
            </span>
          )}
        </label>
        
        <select
          value={selectedVendor}
          onChange={(e) => {
            setSelectedVendor(e.target.value)
            const vendor = vendors.find(v => v.id === e.target.value)
            if (vendor) {
              setSubInvoiceData({
                ...subInvoiceData,
                vendorName: vendor.companyName,
                vendorEmail: vendor.billingEmail,
              })
            }
            setAvailableBills([])
            setSelectedBills([])
            setError(null)
            setSuccess(null)
          }}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
        >
          <option value="">Select a vendor...</option>
          {vendors.map((vendor) => (
            <option key={vendor.id} value={vendor.id}>
              {vendor.companyName}
              {vendor.integrations?.quickbooks?.vendorId && ' (QB Synced)'}
            </option>
          ))}
        </select>
      </div>

      {selectedVendor && (
        <>
          {/* Import Method Toggle */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Import Method
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setImportMethod('manual')
                  setAvailableBills([])
                  setSelectedBills([])
                }}
                className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                  importMethod === 'manual'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                }`}
              >
                Manual Entry / Upload
              </button>
              <button
                onClick={() => setImportMethod('quickbooks')}
                disabled={!hasQBVendorId}
                className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                  importMethod === 'quickbooks'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                Pull from QuickBooks
              </button>
            </div>
            {!hasQBVendorId && importMethod === 'quickbooks' && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                This vendor is not synced with QuickBooks
              </p>
            )}
          </div>

          {/* QuickBooks Pull Method */}
          {importMethod === 'quickbooks' && hasQBVendorId && (
            <div className="space-y-3">
              <button
                onClick={handleFetchBills}
                disabled={loadingBills}
                className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loadingBills ? 'Fetching Bills...' : 'Fetch Bills from QuickBooks'}
              </button>

              {availableBills.length > 0 && (
                <div className="border border-gray-300 dark:border-gray-600 rounded-lg p-3 space-y-2">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Available Bills ({availableBills.length})
                  </p>
                  <div className="max-h-60 overflow-y-auto space-y-2">
                    {availableBills.map((bill) => (
                      <label
                        key={bill.Id}
                        className="flex items-start gap-3 p-2 border border-gray-200 dark:border-gray-700 rounded hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedBills.includes(bill.Id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedBills([...selectedBills, bill.Id])
                            } else {
                              setSelectedBills(selectedBills.filter(id => id !== bill.Id))
                            }
                          }}
                          className="mt-1"
                        />
                        <div className="flex-1 text-sm">
                          <div className="font-medium text-gray-900 dark:text-white">
                            Bill #{bill.DocNumber}
                          </div>
                          <div className="text-gray-600 dark:text-gray-400">
                            Date: {new Date(bill.TxnDate).toLocaleDateString()} | 
                            Amount: ${bill.TotalAmt.toFixed(2)}
                          </div>
                          {bill.Line[0]?.Description && (
                            <div className="text-gray-500 dark:text-gray-500 text-xs">
                              {bill.Line[0].Description}
                            </div>
                          )}
                        </div>
                      </label>
                    ))}
                  </div>

                  <button
                    onClick={handleImportQBBills}
                    disabled={selectedBills.length === 0 || importing}
                    className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {importing ? 'Importing...' : `Import Selected (${selectedBills.length})`}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Manual Entry Method */}
          {importMethod === 'manual' && (
            <div className="space-y-3">
              {/* File Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Upload Invoice (PDF or CSV)
                </label>
                <input
                  type="file"
                  accept=".csv,.pdf"
                  onChange={handleFileUpload}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Upload a PDF or CSV file to auto-fill invoice details
                </p>
              </div>

              {/* Manual Entry Fields */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Invoice Number
                  </label>
                  <input
                    type="text"
                    value={formData.invoiceNumber || ''}
                    onChange={(e) => setFormData({ ...formData, invoiceNumber: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="INV-001"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Amount *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.amount || ''}
                    onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="0.00"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Invoice Date
                  </label>
                  <input
                    type="date"
                    value={formData.invoiceDate || ''}
                    onChange={(e) => setFormData({ ...formData, invoiceDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Due Date
                  </label>
                  <input
                    type="date"
                    value={formData.dueDate || ''}
                    onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description || ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Service description..."
                />
              </div>

              <button
                onClick={handleManualImport}
                disabled={importing || !formData.amount}
                className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {importing ? 'Importing...' : 'Import Invoice'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
