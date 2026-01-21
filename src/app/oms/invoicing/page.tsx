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
    }
  }
  totalPrice?: number
  targetDate?: string
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
      // Fetch completed jobs that are ready to invoice
      const response = await fetch('/api/jobs?limit=1000&depth=1')
      const data = await response.json()
      
      // Filter for jobs with status 'done' and invoice status 'not-invoiced' or 'ready'
      const readyJobs = data.docs.filter((job: any) => 
        job.status === 'done' && 
        (job.invoiceStatus === 'not-invoiced' || job.invoiceStatus === 'ready')
      )
      
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

  const JobCard = ({ job }: { job: Job }) => {
    const isSelected = selectedJobs.has(job.id)
    
    return (
      <div
        className={`p-4 rounded-lg border-2 transition-all cursor-pointer ${
          isSelected
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
            : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600'
        }`}
        onClick={() => toggleJobSelection(job.id)}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => toggleJobSelection(job.id)}
                className="w-4 h-4"
                onClick={(e) => e.stopPropagation()}
              />
              <Link
                href={`/oms/jobs/${job.id}`}
                className="font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                {job.jobId}
              </Link>
            </div>
            <p className="text-gray-900 dark:text-white mt-1">{job.modelName}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Client: {job.client?.name || 'Unknown'}
            </p>
            {job.targetDate && (
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                Completed: {new Date(job.targetDate).toLocaleDateString()}
              </p>
            )}
          </div>
          <div className="text-right">
            {job.totalPrice && (
              <p className="text-lg font-bold text-gray-900 dark:text-white">
                ${job.totalPrice.toFixed(2)}
              </p>
            )}
            {job.client?.invoicingPreferences?.autoApprove && (
              <span className="inline-block mt-1 px-2 py-1 text-xs bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 rounded">
                Auto-Approve
              </span>
            )}
          </div>
        </div>
      </div>
    )
  }

  const JobGroup = ({ title, jobs, color }: { title: string; jobs: Job[]; color: string }) => {
    if (jobs.length === 0) return null

    const totalAmount = jobs.reduce((sum, job) => sum + (job.totalPrice || 0), 0)

    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${color}`}></div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              {title}
            </h2>
            <span className="px-2 py-1 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded">
              {jobs.length} {jobs.length === 1 ? 'job' : 'jobs'}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-lg font-semibold text-gray-900 dark:text-white">
              ${totalAmount.toFixed(2)}
            </span>
            <button
              onClick={() => selectAllInGroup(jobs)}
              className="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded transition-colors"
            >
              Select All
            </button>
          </div>
        </div>
        <div className="space-y-3">
          {jobs.map(job => (
            <JobCard key={job.id} job={job} />
          ))}
        </div>
      </div>
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

      {/* Content */}
      <div className="p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          {filteredJobs.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-xl p-12 text-center border border-gray-200 dark:border-gray-700">
              <p className="text-gray-600 dark:text-gray-400 text-lg">
                No jobs ready to invoice
              </p>
              <p className="text-gray-500 dark:text-gray-500 text-sm mt-2">
                Completed jobs will appear here when they&apos;re ready to be invoiced
              </p>
            </div>
          ) : filter === 'all' ? (
            <>
              <JobGroup
                title="Immediate Billing"
                jobs={groupedJobs.immediate}
                color="bg-green-500"
              />
              <JobGroup
                title="Weekly Batch"
                jobs={groupedJobs.weeklyBatch}
                color="bg-blue-500"
              />
              <JobGroup
                title="Monthly Batch"
                jobs={groupedJobs.monthlyBatch}
                color="bg-purple-500"
              />
              <JobGroup
                title="Payment First"
                jobs={groupedJobs.paymentFirst}
                color="bg-orange-500"
              />
            </>
          ) : (
            <JobGroup
              title={filter === 'immediate' ? 'Immediate Billing' : 
                     filter === 'weekly-batch' ? 'Weekly Batch' :
                     filter === 'monthly-batch' ? 'Monthly Batch' : 'Payment First'}
              jobs={filteredJobs}
              color={filter === 'immediate' ? 'bg-green-500' :
                     filter === 'weekly-batch' ? 'bg-blue-500' :
                     filter === 'monthly-batch' ? 'bg-purple-500' : 'bg-orange-500'}
            />
          )}
        </div>
      </div>
    </div>
  )
}
