'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { FileText, CheckCircle, Clock, AlertCircle, DollarSign } from 'lucide-react'

interface Invoice {
  id: string
  invoiceNumber?: string
  status: string
  client: {
    id: string
    name: string
  }
  jobs: any[]
  subtotal: number
  taxAmount: number
  total: number
  invoiceDate: string
  dueDate: string
  paidAmount: number
  quickbooks?: {
    syncStatus: string
    invoiceId?: string
  }
}

// Map of invoice ID -> count of jobs linked to that invoice
type JobCountMap = Record<string, number>

// Sort helper types
type SortField = 'invoiceNumber' | 'client' | 'jobs' | 'amount' | 'dueDate' | 'status'

export default function InvoicesPage() {
  const router = useRouter()
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [jobCountByInvoice, setJobCountByInvoice] = useState<JobCountMap>({})
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('all')
  const [clientFilter, setClientFilter] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [selectedInvoices, setSelectedInvoices] = useState<Set<string>>(new Set())
  const [bulkActionLoading, setBulkActionLoading] = useState(false)
  const [importing, setImporting] = useState(false)
  const [sortBy, setSortBy] = useState<string>('dueDate-desc')
  const [showFilters, setShowFilters] = useState(false)

  // Sort helper
  const handleSort = (field: string) => {
    const [currentField, currentDirection] = sortBy.split('-')
    if (currentField === field) {
      setSortBy(`${field}-${currentDirection === 'asc' ? 'desc' : 'asc'}`)
    } else {
      const defaultDir = field === 'dueDate' || field === 'amount' ? 'desc' : 'asc'
      setSortBy(`${field}-${defaultDir}`)
    }
  }

  const SortIndicator = ({ field }: { field: string }) => {
    const [currentField, direction] = sortBy.split('-')
    if (currentField !== field) return null
    return <span className="ml-1 text-blue-500">{direction === 'asc' ? '↑' : '↓'}</span>
  }

  useEffect(() => {
    fetchInvoices()
  }, [])

  const fetchInvoices = async () => {
    try {
      // Fetch invoices and jobs in parallel
      const [invoicesResponse, jobsResponse] = await Promise.all([
        fetch('/api/invoices?limit=1000&depth=1&sort=-createdAt'),
        // Fetch jobs that have an invoice linked (to count jobs per invoice)
        fetch('/api/jobs?limit=2000&depth=0&where[invoice][exists]=true')
      ])

      const invoicesData = await invoicesResponse.json()
      const jobsData = await jobsResponse.json()

      setInvoices(invoicesData.docs || [])

      // Build job count map from jobs that have invoice relationship set
      const countMap: JobCountMap = {}
      for (const job of (jobsData.docs || [])) {
        // job.invoice can be an ID (number/string) or an object with id
        const invoiceId = typeof job.invoice === 'object' ? job.invoice?.id : job.invoice
        if (invoiceId) {
          const key = String(invoiceId)
          countMap[key] = (countMap[key] || 0) + 1
        }
      }
      setJobCountByInvoice(countMap)
    } catch (error) {
      console.error('Error fetching invoices:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredInvoices = invoices.filter(invoice => {
    // Status filter
    if (statusFilter !== 'all' && invoice.status !== statusFilter) return false
    
    // Client filter
    if (clientFilter !== 'all' && invoice.client?.id !== clientFilter) return false
    
    // Search term (invoice number or client name)
    if (searchTerm) {
      const search = searchTerm.toLowerCase()
      const matchesInvoiceNumber = invoice.invoiceNumber?.toLowerCase().includes(search)
      const matchesClientName = invoice.client?.name?.toLowerCase().includes(search)
      if (!matchesInvoiceNumber && !matchesClientName) return false
    }
    
    // Date range filter
    if (dateFrom && new Date(invoice.invoiceDate) < new Date(dateFrom)) return false
    if (dateTo && new Date(invoice.invoiceDate) > new Date(dateTo)) return false
    
    return true
  })

  // Sort invoices
  const sortedInvoices = [...filteredInvoices].sort((a, b) => {
    const [field, direction] = sortBy.split('-')
    let comparison = 0

    switch (field) {
      case 'invoiceNumber':
        comparison = (a.invoiceNumber || '').localeCompare(b.invoiceNumber || '')
        break
      case 'client':
        comparison = (a.client?.name || '').localeCompare(b.client?.name || '')
        break
      case 'jobs':
        const jobsA = jobCountByInvoice[a.id] || a.jobs?.length || 0
        const jobsB = jobCountByInvoice[b.id] || b.jobs?.length || 0
        comparison = jobsA - jobsB
        break
      case 'amount':
        comparison = (a.total || 0) - (b.total || 0)
        break
      case 'dueDate':
        comparison = new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
        break
      case 'status':
        comparison = (a.status || '').localeCompare(b.status || '')
        break
      default:
        comparison = 0
    }

    return direction === 'desc' ? -comparison : comparison
  })

  const stats = {
    total: invoices.length,
    draft: invoices.filter(i => i.status === 'draft').length,
    approved: invoices.filter(i => i.status === 'approved').length,
    sent: invoices.filter(i => i.status === 'sent').length,
    paid: invoices.filter(i => i.status === 'paid').length,
    overdue: invoices.filter(i => i.status === 'overdue').length,
    totalOutstanding: invoices
      .filter(i => ['sent', 'overdue', 'partial-payment'].includes(i.status))
      .reduce((sum, i) => sum + (i.total - i.paidAmount), 0),
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
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${styles[status as keyof typeof styles] || styles.draft}`}>
        {status?.replace('-', ' ').toUpperCase() || 'DRAFT'}
      </span>
    )
  }

  const getSyncStatusBadge = (syncStatus?: string) => {
    if (!syncStatus || syncStatus === 'not-synced') return null
    
    const styles = {
      synced: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
      error: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
    }
    
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded ${styles[syncStatus as keyof typeof styles]}`}>
        QB: {syncStatus}
      </span>
    )
  }

  const toggleInvoiceSelection = (invoiceId: string) => {
    const newSelection = new Set(selectedInvoices)
    if (newSelection.has(invoiceId)) {
      newSelection.delete(invoiceId)
    } else {
      newSelection.add(invoiceId)
    }
    setSelectedInvoices(newSelection)
  }

  const toggleSelectAll = () => {
    if (selectedInvoices.size === sortedInvoices.length) {
      setSelectedInvoices(new Set())
    } else {
      setSelectedInvoices(new Set(sortedInvoices.map(inv => inv.id)))
    }
  }

  const handleBulkApprove = async () => {
    if (selectedInvoices.size === 0) return
    
    if (!confirm(`Approve ${selectedInvoices.size} invoice(s)?`)) return
    
    setBulkActionLoading(true)
    try {
      const userResponse = await fetch('/api/users/me')
      const userData = await userResponse.json()
      const userId = userData.user?.id

      let successCount = 0
      let errorCount = 0

      for (const invoiceId of Array.from(selectedInvoices)) {
        try {
          const response = await fetch(`/api/invoices/${invoiceId}/approve`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId }),
          })
          if (response.ok) successCount++
          else errorCount++
        } catch (error) {
          errorCount++
        }
      }

      alert(`Approved ${successCount} invoice(s). ${errorCount > 0 ? `${errorCount} failed.` : ''}`)
      setSelectedInvoices(new Set())
      fetchInvoices()
    } catch (error: any) {
      alert('Error approving invoices: ' + error.message)
    } finally {
      setBulkActionLoading(false)
    }
  }

  const handleBulkSync = async () => {
    if (selectedInvoices.size === 0) return
    
    if (!confirm(`Sync ${selectedInvoices.size} invoice(s) to QuickBooks?`)) return
    
    setBulkActionLoading(true)
    try {
      let successCount = 0
      let errorCount = 0

      for (const invoiceId of Array.from(selectedInvoices)) {
        try {
          const response = await fetch(`/api/invoices/${invoiceId}/sync`, {
            method: 'POST',
          })
          if (response.ok) successCount++
          else errorCount++
        } catch (error) {
          errorCount++
        }
      }

      alert(`Synced ${successCount} invoice(s) to QuickBooks. ${errorCount > 0 ? `${errorCount} failed.` : ''}`)
      setSelectedInvoices(new Set())
      fetchInvoices()
    } catch (error: any) {
      alert('Error syncing invoices: ' + error.message)
    } finally {
      setBulkActionLoading(false)
    }
  }

  const handleImportFromQuickBooks = async () => {
    if (!confirm('Import invoices from QuickBooks? This will import the last 100 invoices.')) return
    
    setImporting(true)
    try {
      const response = await fetch('/api/quickbooks/import-invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          limit: 100,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to import invoices')
      }

      alert(data.message || `Imported ${data.imported} invoice(s)`)
      fetchInvoices()
    } catch (error: any) {
      alert('Error importing invoices: ' + error.message)
    } finally {
      setImporting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading invoices...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Invoices
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Manage and track all invoices
            </p>
          </div>
          <button
            onClick={handleImportFromQuickBooks}
            disabled={importing}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
          >
            {importing ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                Importing...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                </svg>
                Import from QuickBooks
              </>
            )}
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Invoices</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stats.total}
                </p>
              </div>
              <FileText className="h-8 w-8 text-gray-400" />
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Awaiting Approval</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stats.draft + stats.approved}
                </p>
              </div>
              <Clock className="h-8 w-8 text-yellow-400" />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Outstanding</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  ${stats.totalOutstanding.toFixed(2)}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-orange-400" />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Paid</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stats.paid}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-400" />
            </div>
          </div>
        </div>

        {/* Bulk Actions */}
        {selectedInvoices.size > 0 && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-blue-900 dark:text-blue-300">
                {selectedInvoices.size} invoice(s) selected
              </span>
              <div className="flex gap-3">
                <button
                  onClick={handleBulkApprove}
                  disabled={bulkActionLoading}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors"
                >
                  Approve Selected
                </button>
                <button
                  onClick={handleBulkSync}
                  disabled={bulkActionLoading}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors"
                >
                  Sync to QuickBooks
                </button>
                <button
                  onClick={() => setSelectedInvoices(new Set())}
                  className="px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium transition-colors"
                >
                  Clear Selection
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700 mb-6">
          {/* Compact filter row */}
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center mb-4">
            <div className="sm:w-64">
              <input
                type="text"
                placeholder="Search invoices..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
              />
            </div>
            <select
              value={clientFilter}
              onChange={(e) => setClientFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
            >
              <option value="all">All Clients</option>
              {Array.from(new Set(invoices.map(inv => inv.client?.id))).filter(Boolean).map(clientId => {
                const client = invoices.find(inv => inv.client?.id === clientId)?.client
                return client ? <option key={clientId} value={clientId}>{client.name}</option> : null
              })}
            </select>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-900 dark:text-white text-sm font-medium whitespace-nowrap"
            >
              {showFilters ? '− Less' : '+ More Filters'}
            </button>
            <button
              onClick={() => {
                setStatusFilter('all')
                setClientFilter('all')
                setSearchTerm('')
                setDateFrom('')
                setDateTo('')
              }}
              className="px-3 py-2 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-sm font-medium whitespace-nowrap"
            >
              Clear All
            </button>
          </div>

          {/* Extended filters */}
          {showFilters && (
            <div className="flex flex-wrap gap-3 mb-4 pb-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600 dark:text-gray-400">From:</label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600 dark:text-gray-400">To:</label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                />
              </div>
            </div>
          )}

          {/* Status Tabs */}
          <div className="flex gap-1 border-b border-gray-200 dark:border-gray-700">
            {[
              { value: 'all', label: 'All', count: stats.total },
              { value: 'draft', label: 'Draft', count: stats.draft },
              { value: 'approved', label: 'Approved', count: stats.approved },
              { value: 'sent', label: 'Sent', count: stats.sent },
              { value: 'paid', label: 'Paid', count: stats.paid },
              { value: 'overdue', label: 'Overdue', count: stats.overdue },
            ].map(({ value, label, count }) => (
              <button
                key={value}
                onClick={() => setStatusFilter(value)}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  statusFilter === value
                    ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                    : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
              >
                {label} ({count})
              </button>
            ))}
          </div>

          <div className="mt-3 text-sm text-gray-600 dark:text-gray-400">
            Showing {sortedInvoices.length} invoices
          </div>
        </div>

        {/* Invoices Table */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selectedInvoices.size === sortedInvoices.length && sortedInvoices.length > 0}
                      onChange={toggleSelectAll}
                      className="w-4 h-4 rounded border-gray-300 dark:border-gray-600"
                    />
                  </th>
                  <th
                    onClick={() => handleSort('invoiceNumber')}
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 select-none"
                  >
                    Invoice #<SortIndicator field="invoiceNumber" />
                  </th>
                  <th
                    onClick={() => handleSort('client')}
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 select-none"
                  >
                    Client<SortIndicator field="client" />
                  </th>
                  <th
                    onClick={() => handleSort('jobs')}
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 select-none"
                  >
                    Jobs<SortIndicator field="jobs" />
                  </th>
                  <th
                    onClick={() => handleSort('amount')}
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 select-none"
                  >
                    Amount<SortIndicator field="amount" />
                  </th>
                  <th
                    onClick={() => handleSort('dueDate')}
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 select-none"
                  >
                    Due Date<SortIndicator field="dueDate" />
                  </th>
                  <th
                    onClick={() => handleSort('status')}
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 select-none"
                  >
                    Status<SortIndicator field="status" />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    QB Sync
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {sortedInvoices.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                      No invoices found
                    </td>
                  </tr>
                ) : (
                  sortedInvoices.map((invoice) => (
                    <tr
                      key={invoice.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700"
                    >
                      <td className="px-6 py-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedInvoices.has(invoice.id)}
                          onChange={() => toggleInvoiceSelection(invoice.id)}
                          className="w-4 h-4 rounded border-gray-300 dark:border-gray-600"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap cursor-pointer" onClick={() => router.push(`/oms/invoices/${invoice.id}`)}>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {invoice.invoiceNumber || `INV-${String(invoice.id).slice(0, 8)}`}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 dark:text-white">
                          {invoice.client?.name || 'Unknown'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 dark:text-white">
                          {jobCountByInvoice[invoice.id] || invoice.jobs?.length || 0} job(s)
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          ${invoice.total.toFixed(2)}
                        </div>
                        {invoice.paidAmount > 0 && invoice.paidAmount < invoice.total && (
                          <div className="text-xs text-gray-500">
                            Paid: ${invoice.paidAmount.toFixed(2)}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 dark:text-white">
                          {new Date(invoice.dueDate).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(invoice.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {invoice.quickbooks?.syncStatus === 'synced' ? (
                          <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
                            ✓ Synced
                          </span>
                        ) : invoice.quickbooks?.syncStatus === 'error' ? (
                          <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300">
                            ✗ Error
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                            Not Synced
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            router.push(`/oms/invoices/${invoice.id}`)
                          }}
                          className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
