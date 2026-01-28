'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'

interface Job {
  id: string
  jobId: string
  modelName: string
  status: string
  invoiceStatus?: string
  client: {
    id: string
    name: string
    billingPreference: string
    invoicingPreferences?: {
      terms?: string
      autoApprove?: boolean
      taxExempt?: boolean
      taxRate?: number
    }
  }
  totalPrice?: number
  targetDate?: string
  scannedDate?: string
  completedDate?: string
  sqFt?: number
  lineItems?: any[]
  discount?: {
    type?: string
    value?: number
  }
  workflowSteps?: any[]
}

export default function InvoicingPage() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'immediate' | 'weekly-batch' | 'monthly-batch' | 'payment-first'>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [clientFilter, setClientFilter] = useState('all')
  const [selectedJobs, setSelectedJobs] = useState<Set<string>>(new Set())

  useEffect(() => {
    fetchJobsReadyToInvoice()
  }, [])

  const fetchJobsReadyToInvoice = async () => {
    try {
      // Fetch completed jobs that are ready to invoice with products
      const response = await fetch('/api/jobs?limit=1000&depth=2')
      const data = await response.json()
      
      // Fetch products for price calculation
      const productsResponse = await fetch('/api/products?limit=1000')
      const productsData = await productsResponse.json()
      const products = productsData.docs || []
      
      // Filter for jobs with status 'done' and invoice status 'not-invoiced' or 'ready'
      const readyJobs = data.docs.filter((job: any) => 
        job.status === 'done' && 
        (job.invoiceStatus === 'not-invoiced' || job.invoiceStatus === 'ready')
      ).map((job: any) => {
        // Calculate total price from line items
        let subtotal = 0
        const jobSqFt = parseInt(job.sqFt) || 0
        
        if (job.lineItems && job.lineItems.length > 0) {
          job.lineItems.forEach((item: any) => {
            const productId = typeof item.product === 'object' ? item.product?.id : item.product
            const product = products.find((p: any) => p.id === productId)
            if (product?.basePrice) {
              const price = product.basePrice
              const multiplier = product.unitType === 'per-sq-ft' ? jobSqFt : (item.quantity || 1)
              subtotal += price * multiplier
            }
          })
        }
        
        // Calculate tax if applicable
        let taxAmount = 0
        const client = job.client
        if (client && !client.invoicingPreferences?.taxExempt && client.invoicingPreferences?.taxRate) {
          let taxableAmount = 0
          job.lineItems?.forEach((item: any) => {
            const productId = typeof item.product === 'object' ? item.product?.id : item.product
            const product = products.find((p: any) => p.id === productId)
            if (product?.taxable) {
              const price = product.basePrice || 0
              const multiplier = product.unitType === 'per-sq-ft' ? jobSqFt : (item.quantity || 1)
              taxableAmount += price * multiplier
            }
          })
          taxAmount = taxableAmount * ((client.invoicingPreferences.taxRate || 0) / 100)
        }
        
        // Apply discount
        const discountType = job.discount?.type || 'none'
        const discountValue = job.discount?.value || 0
        const discountAmount = discountType === 'fixed' 
          ? discountValue
          : discountType === 'percentage'
          ? subtotal * (discountValue / 100)
          : 0
        
        const totalPrice = subtotal + taxAmount - discountAmount
        
        // Get the completion date from the last completed workflow step
        let completedDate = null
        if (job.workflowSteps && job.workflowSteps.length > 0) {
          const completedSteps = job.workflowSteps
            .filter((step: any) => step.completed && step.completedAt)
            .sort((a: any, b: any) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime())
          
          if (completedSteps.length > 0) {
            completedDate = completedSteps[0].completedAt
          }
        }
        
        // Fall back to scannedDate or targetDate if no workflow completion date
        if (!completedDate) {
          completedDate = job.scannedDate || job.targetDate
        }
        
        return {
          ...job,
          totalPrice,
          completedDate
        }
      })
      
      setJobs(readyJobs)
      setLoading(false)
    } catch (error) {
      console.error('Error fetching jobs:', error)
      setLoading(false)
    }
  }

  const filteredJobs = jobs.filter(job => {
    // Billing preference filter
    if (filter !== 'all' && job.client?.billingPreference !== filter) return false
    
    // Client filter
    if (clientFilter !== 'all' && job.client?.id !== clientFilter) return false
    
    // Search term (job ID, model name, or client name)
    if (searchTerm) {
      const search = searchTerm.toLowerCase()
      const matchesJobId = job.jobId?.toLowerCase().includes(search)
      const matchesModelName = job.modelName?.toLowerCase().includes(search)
      const matchesClientName = job.client?.name?.toLowerCase().includes(search)
      if (!matchesJobId && !matchesModelName && !matchesClientName) return false
    }
    
    return true
  })

  const groupedJobs = {
    immediate: filteredJobs.filter(j => j.client?.billingPreference === 'immediate'),
    weeklyBatch: filteredJobs.filter(j => j.client?.billingPreference === 'weekly-batch'),
    monthlyBatch: filteredJobs.filter(j => j.client?.billingPreference === 'monthly-batch'),
    paymentFirst: filteredJobs.filter(j => j.client?.billingPreference === 'payment-first'),
  }

  const toggleJobSelection = (jobId: string) => {
    const newSelection = new Set(selectedJobs)
    if (newSelection.has(jobId)) {
      newSelection.delete(jobId)
    } else {
      newSelection.add(jobId)
    }
    setSelectedJobs(newSelection)
  }

  const selectAllInGroup = (jobs: Job[]) => {
    const newSelection = new Set(selectedJobs)
    jobs.forEach(job => newSelection.add(job.id))
    setSelectedJobs(newSelection)
  }

  const handleCreateInvoices = async () => {
    if (selectedJobs.size === 0) {
      alert('Please select at least one job to invoice')
      return
    }

    try {
      // Get current user
      const userResponse = await fetch('/api/users/me')
      const userData = await userResponse.json()
      const userId = userData.user?.id

      if (!userId) {
        alert('Unable to identify current user')
        return
      }

      // Group selected jobs by client
      const selectedJobsArray = jobs.filter(job => selectedJobs.has(job.id))
      const jobsByClient: Record<string, string[]> = {}

      selectedJobsArray.forEach(job => {
        const clientId = typeof job.client === 'object' ? job.client.id : job.client
        if (!jobsByClient[clientId]) {
          jobsByClient[clientId] = []
        }
        jobsByClient[clientId].push(job.id)
      })

      // Create invoices for each client
      const results: Array<{
        clientId: string
        jobCount: number
        success: boolean
        result: any
      }> = []
      for (const [clientId, jobIds] of Object.entries(jobsByClient)) {
        const response = await fetch('/api/invoices/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ jobIds, userId }),
        })

        const result = await response.json()
        results.push({
          clientId,
          jobCount: jobIds.length,
          success: response.ok,
          result,
        })
      }

      // Show results
      const successCount = results.filter(r => r.success).length
      const failCount = results.filter(r => !r.success).length

      if (failCount === 0) {
        alert(`Successfully created ${successCount} invoice(s)!`)
        setSelectedJobs(new Set())
        fetchJobsReadyToInvoice()
      } else {
        const failedResults = results.filter(r => !r.success)
        const errorMessages = failedResults.map(r => r.result.error).join('\n')
        alert(`Created ${successCount} invoice(s), but ${failCount} failed:\n${errorMessages}`)
        fetchJobsReadyToInvoice()
      }
    } catch (error: any) {
      console.error('Error creating invoices:', error)
      alert('Failed to create invoices: ' + error.message)
    }
  }

  const getBillingBadge = (preference: string) => {
    const styles = {
      'immediate': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      'weekly-batch': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
      'monthly-batch': 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
      'payment-first': 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
    }
    
    const labels = {
      'immediate': 'Immediate',
      'weekly-batch': 'Weekly Batch',
      'monthly-batch': 'Monthly Batch',
      'payment-first': 'Payment First',
    }
    
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${styles[preference as keyof typeof styles] || 'bg-gray-100 text-gray-800'}`}>
        {labels[preference as keyof typeof labels] || preference}
      </span>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-gray-600 dark:text-gray-400">Loading jobs...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Invoicing Queue</h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Review and approve jobs ready to be invoiced
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {selectedJobs.size} selected
              </span>
              <button
                onClick={handleCreateInvoices}
                disabled={selectedJobs.size === 0}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
              >
                Create Invoices ({selectedJobs.size})
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="px-8 py-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        {/* Billing Preference Filters */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Billing Preference</label>
          <div className="flex gap-2 flex-wrap">
            {[
              { value: 'all', label: 'All Jobs', count: filteredJobs.length },
              { value: 'immediate', label: 'Immediate', count: groupedJobs.immediate.length },
              { value: 'weekly-batch', label: 'Weekly Batch', count: groupedJobs.weeklyBatch.length },
              { value: 'monthly-batch', label: 'Monthly Batch', count: groupedJobs.monthlyBatch.length },
              { value: 'payment-first', label: 'Payment First', count: groupedJobs.paymentFirst.length },
            ].map(({ value, label, count }) => (
              <button
                key={value}
                onClick={() => setFilter(value as any)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  filter === value
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {label} ({count})
              </button>
            ))}
          </div>
        </div>

        {/* Search and Client Filter */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Search</label>
            <input
              type="text"
              placeholder="Job ID, Model Name, or Client"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Client</label>
            <select
              value={clientFilter}
              onChange={(e) => setClientFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="all">All Clients</option>
              {Array.from(new Set(jobs.map(job => job.client?.id))).filter(Boolean).map(clientId => {
                const client = jobs.find(job => job.client?.id === clientId)?.client
                return client ? <option key={clientId} value={clientId}>{client.name}</option> : null
              })}
            </select>
          </div>
        </div>

        {/* Clear Filters */}
        {(filter !== 'all' || searchTerm || clientFilter !== 'all') && (
          <div className="mt-4">
            <button
              onClick={() => {
                setFilter('all')
                setSearchTerm('')
                setClientFilter('all')
              }}
              className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
            >
              Clear all filters
            </button>
          </div>
        )}
      </div>

      {/* Content - Table */}
      <div className="p-8">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                <tr>
                  <th className="px-6 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selectedJobs.size === filteredJobs.length && filteredJobs.length > 0}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedJobs(new Set(filteredJobs.map(j => j.id)))
                        } else {
                          setSelectedJobs(new Set())
                        }
                      }}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Job ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Model / Client
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Billing Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Completed Date
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredJobs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                      <p className="text-lg">No jobs ready to invoice</p>
                      <p className="text-sm mt-2">Completed jobs will appear here when they&apos;re ready to be invoiced</p>
                    </td>
                  </tr>
                ) : (
                  filteredJobs.map((job) => (
                    <tr
                      key={job.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedJobs.has(job.id)}
                          onChange={() => toggleJobSelection(job.id)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Link
                          href={`/oms/jobs/${job.id}`}
                          className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          {job.jobId || job.id}
                        </Link>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {job.modelName}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {job.client?.name || 'Unknown'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getBillingBadge(job.client?.billingPreference || 'immediate')}
                        {job.client?.invoicingPreferences?.autoApprove && (
                          <span className="ml-2 inline-block px-2 py-1 text-xs bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 rounded">
                            Auto
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {job.completedDate ? new Date(job.completedDate).toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="text-sm font-semibold text-gray-900 dark:text-white">
                          {job.totalPrice ? `$${job.totalPrice.toFixed(2)}` : '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <Link
                          href={`/oms/jobs/${job.id}`}
                          className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-sm font-medium"
                        >
                          View →
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Results Count */}
        {filteredJobs.length > 0 && (
          <div className="mt-4 text-sm text-gray-600 dark:text-gray-400 text-center">
            Showing {filteredJobs.length} of {jobs.length} jobs ready to invoice
          </div>
        )}
      </div>
    </div>
  )
}
