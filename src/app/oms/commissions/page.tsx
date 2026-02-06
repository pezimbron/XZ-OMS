'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'

import { SaveIndicator } from '@/components/oms/SaveIndicator'
import { useAutosaveField } from '@/lib/oms/useAutosaveField'

interface Job {
  id: string
  jobId: string
  modelName: string
  targetDate: string
  status: string
  completionStatus?: string
  scannedDate?: string
  commissionPayoutDate?: string
  commissionPaymentStatus?: 'pending' | 'paid'
  commissionPaidAt?: string
  region?: string
  client?: {
    name: string
  }
  tech?: {
    id: string
    name: string
    user?: {
      id: string
    } | string
  }
  vendorPrice?: number
  travelPayout?: number
  offHoursPayout?: number
}

const isoToDateInput = (iso?: string): string => {
  if (!iso) return ''
  return iso.slice(0, 10)
}

const dateInputToIso = (dateStr: string): string | null => {
  if (!dateStr) return null
  return new Date(`${dateStr}T00:00:00.000Z`).toISOString()
}

const getJobDateIso = (job: Job): string | undefined => {
  return job.scannedDate || job.targetDate || undefined
}

const startOfWeekMonday = (d: Date): Date => {
  const copy = new Date(d)
  copy.setHours(0, 0, 0, 0)
  const day = copy.getDay() // 0=Sun
  const diff = (day + 6) % 7
  copy.setDate(copy.getDate() - diff)
  return copy
}

const PayoutDateCell: React.FC<{ jobId: string; initialValue?: string; canEdit: boolean }> = ({
  jobId,
  initialValue,
  canEdit,
}) => {
  const payoutDateField = useAutosaveField<string>({
    value: isoToDateInput(initialValue),
    debounceMs: 500,
    onSave: async (next) => {
      const response = await fetch(`/api/jobs/${jobId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          commissionPayoutDate: dateInputToIso(next),
        }),
      })

      if (!response.ok) {
        const text = await response.text().catch(() => '')
        throw new Error(text || 'Failed to save payout date')
      }
    },
  })

  return (
    <div className="flex items-center justify-end gap-2">
      {canEdit ? (
        <input
          type="date"
          value={payoutDateField.value || ''}
          onChange={(e) => payoutDateField.setValue(e.target.value)}
          onBlur={payoutDateField.onBlur}
          className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
        />
      ) : (
        <span className="text-sm text-gray-900 dark:text-white">
          {payoutDateField.value ? new Date(`${payoutDateField.value}T00:00:00.000Z`).toLocaleDateString() : '—'}
        </span>
      )}

      <SaveIndicator status={payoutDateField.status} error={payoutDateField.error} />
    </div>
  )
}

export default function CommissionsPage() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [filter, setFilter] = useState<'all' | 'pending' | 'paid'>('all')

  const [search, setSearch] = useState('')
  const [techFilter, setTechFilter] = useState('')
  const [payoutDateFrom, setPayoutDateFrom] = useState('')
  const [payoutDateTo, setPayoutDateTo] = useState('')
  const [payRunDate, setPayRunDate] = useState('')
  const [moreFiltersOpen, setMoreFiltersOpen] = useState(false)

  const [selectedJobIds, setSelectedJobIds] = useState<Record<string, boolean>>({})
  const [bulkStatus, setBulkStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [bulkError, setBulkError] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<string>('date-desc')

  // Sort helper
  const handleSort = (field: string) => {
    const [currentField, currentDirection] = sortBy.split('-')
    if (currentField === field) {
      setSortBy(`${field}-${currentDirection === 'asc' ? 'desc' : 'asc'}`)
    } else {
      const defaultDir = field === 'date' || field === 'payout' || field === 'payoutDate' ? 'desc' : 'asc'
      setSortBy(`${field}-${defaultDir}`)
    }
  }

  const SortIndicator = ({ field }: { field: string }) => {
    const [currentField, direction] = sortBy.split('-')
    if (currentField !== field) return null
    return <span className="ml-1 text-blue-500">{direction === 'asc' ? '↑' : '↓'}</span>
  }

  const isTech = user?.role === 'tech'
  const isAdminView = !!user && !isTech
  const emptyColSpan = isAdminView ? 9 : 7

  useEffect(() => {
    if (!isAdminView) return
    if (payRunDate) return
    setPayRunDate(isoToDateInput(new Date().toISOString()))
  }, [isAdminView, payRunDate])

  useEffect(() => {
    fetchUser()
  }, [])

  useEffect(() => {
    if (user) {
      fetchJobs()
    }
  }, [user])

  const fetchUser = async () => {
    try {
      const response = await fetch('/api/users/me')
      const data = await response.json()
      setUser(data.user)
    } catch (error) {
      console.error('Error fetching user:', error)
    }
  }

  const fetchJobs = async () => {
    try {
      const response = await fetch('/api/jobs?limit=1000&depth=2')
      const data = await response.json()
      let fetchedJobs = data.docs || []
      
      // Filter jobs for tech users - only show jobs assigned to them
      if (user?.role === 'tech') {
        fetchedJobs = fetchedJobs.filter((job: Job) => {
          const jobTech = job.tech
          if (!jobTech) return false
          
          const techUserId = typeof jobTech === 'object' && jobTech.user
            ? (typeof jobTech.user === 'object' ? jobTech.user.id : jobTech.user)
            : null
          
          return techUserId === user.id
        })
      }
      
      setJobs(fetchedJobs)
      setSelectedJobIds({})
    } catch (error) {
      console.error('Error fetching jobs:', error)
    } finally {
      setLoading(false)
    }
  }

  const myJobs = isTech
    ? jobs.filter((j) => {
        const isScannedStage = !!j.scannedDate || ['scanned', 'qc', 'done'].includes(j.status)
        return isScannedStage && j.completionStatus !== 'incomplete'
      })
    : jobs.filter((j: any) => j.status === 'done' && j.completionStatus !== 'incomplete')

  // Calculate totals
  const calculatePayout = (job: Job) => {
    const capture = job.vendorPrice || 0
    const travel = job.travelPayout || 0
    const offHours = job.offHoursPayout || 0
    return capture + travel + offHours
  }

  const isPaid = (job: Job) => job.commissionPaymentStatus === 'paid'
  const pendingJobs = myJobs.filter((j) => !isPaid(j))
  const totalPending = pendingJobs.reduce((sum, job) => sum + calculatePayout(job), 0)

  const paidJobs = myJobs.filter((j) => isPaid(j))
  const totalPaid = paidJobs.reduce((sum, job) => sum + calculatePayout(job), 0)

  const techOptions: Array<{ id: string; name: string }> = isAdminView
    ? (() => {
        const map = new Map<string, string>()
        for (const job of myJobs as any[]) {
          const id = job?.tech?.id
          if (!id) continue
          map.set(String(id), String(job?.tech?.name || id))
        }
        return Array.from(map.entries()).map(([id, name]) => ({ id, name }))
      })()
    : []

  const baseList = filter === 'pending' ? pendingJobs : filter === 'paid' ? paidJobs : myJobs

  const filteredJobs = baseList.filter((job: any) => {
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      const hay = `${job.jobId || ''} ${job.modelName || ''} ${job.client?.name || ''} ${(job.tech?.name || '')}`.toLowerCase()
      if (!hay.includes(q)) return false
    }

    if (isAdminView && techFilter) {
      const techId = job.tech?.id
      if (!techId || techId !== techFilter) return false
    }

    if (payoutDateFrom) {
      const jobPayout = isoToDateInput(job.commissionPayoutDate)
      if (!jobPayout || jobPayout < payoutDateFrom) return false
    }

    if (payoutDateTo) {
      const jobPayout = isoToDateInput(job.commissionPayoutDate)
      if (!jobPayout || jobPayout > payoutDateTo) return false
    }

    if (payRunDate) {
      const weekStart = startOfWeekMonday(new Date(`${payRunDate}T00:00:00`))
      const periodStart = new Date(weekStart)
      periodStart.setDate(periodStart.getDate() - 14)

      const jobDateIso = getJobDateIso(job)
      if (!jobDateIso) return false
      const jobDate = new Date(jobDateIso)
      if (jobDate < periodStart || jobDate >= weekStart) return false
    }

    return true
  })

  // Sort jobs
  const sortedJobs = [...filteredJobs].sort((a, b) => {
    const [field, direction] = sortBy.split('-')
    let comparison = 0

    switch (field) {
      case 'jobId':
        comparison = (a.jobId || '').localeCompare(b.jobId || '')
        break
      case 'client':
        comparison = (a.client?.name || '').localeCompare(b.client?.name || '')
        break
      case 'tech':
        comparison = ((a as any).tech?.name || '').localeCompare((b as any).tech?.name || '')
        break
      case 'date':
        const dateA = a.scannedDate || a.targetDate
        const dateB = b.scannedDate || b.targetDate
        comparison = (dateA ? new Date(dateA).getTime() : 0) - (dateB ? new Date(dateB).getTime() : 0)
        break
      case 'payoutDate':
        const payoutA = a.commissionPayoutDate ? new Date(a.commissionPayoutDate).getTime() : 0
        const payoutB = b.commissionPayoutDate ? new Date(b.commissionPayoutDate).getTime() : 0
        comparison = payoutA - payoutB
        break
      case 'status':
        comparison = (a.commissionPaymentStatus || '').localeCompare(b.commissionPaymentStatus || '')
        break
      case 'payout':
        comparison = calculatePayout(a) - calculatePayout(b)
        break
      default:
        comparison = 0
    }

    return direction === 'desc' ? -comparison : comparison
  })

  const selectedIds = Object.keys(selectedJobIds).filter((id) => selectedJobIds[id])

  const allVisibleSelected = isAdminView && sortedJobs.length > 0 && sortedJobs.every((j: any) => !!selectedJobIds[j.id])

  const patchJob = async (jobId: string, update: any) => {
    const response = await fetch(`/api/jobs/${jobId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(update),
    })

    if (!response.ok) {
      const text = await response.text().catch(() => '')
      throw new Error(text || 'Failed to update job')
    }
  }

  const bulkUpdate = async (updater: (job: Job) => any) => {
    if (!isAdminView) return
    if (selectedIds.length === 0) return

    setBulkStatus('saving')
    setBulkError(null)
    try {
      for (const id of selectedIds) {
        const job = myJobs.find((j) => j.id === id)
        if (!job) continue
        const update = updater(job)
        await patchJob(id, update)
      }

      setJobs((prev) =>
        prev.map((j) => {
          if (!selectedJobIds[j.id]) return j
          const update = updater(j)
          return { ...j, ...update }
        }),
      )

      setBulkStatus('saved')
      setTimeout(() => setBulkStatus('idle'), 1200)
    } catch (e: any) {
      setBulkStatus('error')
      setBulkError(e?.message || 'Bulk update failed')
      setTimeout(() => setBulkStatus('idle'), 2500)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <svg className="animate-spin h-12 w-12 mx-auto mb-4 text-blue-600 dark:text-blue-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-lg font-medium text-gray-700 dark:text-gray-300">Loading commissions...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="px-8 py-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{isAdminView ? 'Commissions' : 'My Commissions'}</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            {isAdminView ? 'Manage payouts and commission periods' : 'Track your earnings and scanned jobs'}
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="p-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Pending Payment</p>
                <p className="text-3xl font-bold text-yellow-600 dark:text-yellow-400 mt-2">
                  ${totalPending.toFixed(2)}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {pendingJobs.length} jobs
                </p>
              </div>
              <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Paid</p>
                <p className="text-3xl font-bold text-green-600 dark:text-green-400 mt-2">
                  ${totalPaid.toFixed(2)}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {paidJobs.length} jobs
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Jobs</p>
                <p className="text-3xl font-bold text-blue-600 dark:text-blue-400 mt-2">
                  {myJobs.length}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  All time
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {isAdminView ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700 mb-6">
            <div className="flex flex-col md:flex-row md:items-end gap-3">
              <div className="flex-1">
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Pay Run Date</div>
                <input
                  type="date"
                  value={payRunDate}
                  onChange={(e) => setPayRunDate(e.target.value)}
                  className="w-full md:w-56 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                />
                {payRunDate ? (
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Window: {(() => {
                      const weekStart = startOfWeekMonday(new Date(`${payRunDate}T00:00:00`))
                      const periodStart = new Date(weekStart)
                      periodStart.setDate(periodStart.getDate() - 14)
                      const end = new Date(weekStart)
                      end.setDate(end.getDate() - 1)
                      return `${periodStart.toLocaleDateString()} - ${end.toLocaleDateString()}`
                    })()}
                  </div>
                ) : null}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="text-sm text-gray-700 dark:text-gray-300">Selected: {selectedIds.length}</div>

                <button
                  onClick={() => {
                    const next: Record<string, boolean> = {}
                    for (const j of sortedJobs) next[j.id] = true
                    setSelectedJobIds(next)
                  }}
                  className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded text-gray-900 dark:text-white"
                >
                  Select Visible
                </button>

                <button
                  onClick={() => setSelectedJobIds({})}
                  className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded text-gray-900 dark:text-white"
                >
                  Clear
                </button>

                <button
                  onClick={() =>
                    bulkUpdate(() => ({
                      commissionPayoutDate: dateInputToIso(payRunDate),
                    }))
                  }
                  className="px-3 py-2 text-sm bg-blue-600 text-white rounded disabled:opacity-50"
                  disabled={!payRunDate || selectedIds.length === 0}
                >
                  Set Payout Date
                </button>

                <button
                  onClick={() =>
                    bulkUpdate(() => ({
                      commissionPaymentStatus: 'paid',
                      commissionPaidAt: dateInputToIso(payRunDate) || new Date().toISOString(),
                    }))
                  }
                  className="px-3 py-2 text-sm bg-green-600 text-white rounded disabled:opacity-50"
                  disabled={!payRunDate || selectedIds.length === 0}
                >
                  Mark Paid
                </button>

                <button
                  onClick={() => setMoreFiltersOpen((v) => !v)}
                  className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded text-gray-900 dark:text-white"
                >
                  {moreFiltersOpen ? 'Hide Filters' : 'More Filters'}
                </button>

                <SaveIndicator status={bulkStatus as any} error={bulkError} />
              </div>
            </div>

            {moreFiltersOpen ? (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mt-4">
                <div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Search</div>
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Job / client / tech"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                  />
                </div>

                <div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Tech</div>
                  <select
                    value={techFilter}
                    onChange={(e) => setTechFilter(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                  >
                    <option value="">All Techs</option>
                    {techOptions.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex gap-2">
                  <div className="w-full">
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Payout Date From</div>
                    <input
                      type="date"
                      value={payoutDateFrom}
                      onChange={(e) => setPayoutDateFrom(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                    />
                  </div>
                  <div className="w-full">
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">To</div>
                    <input
                      type="date"
                      value={payoutDateTo}
                      onChange={(e) => setPayoutDateTo(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                    />
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        {/* Filter Tabs */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 mb-6">
          <div className="flex border-b border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setFilter('all')}
              className={`px-6 py-3 font-medium transition-colors ${
                filter === 'all'
                  ? 'border-b-2 border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              All Jobs ({myJobs.length})
            </button>
            <button
              onClick={() => setFilter('pending')}
              className={`px-6 py-3 font-medium transition-colors ${
                filter === 'pending'
                  ? 'border-b-2 border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              Pending Payment ({pendingJobs.length})
            </button>
            <button
              onClick={() => setFilter('paid')}
              className={`px-6 py-3 font-medium transition-colors ${
                filter === 'paid'
                  ? 'border-b-2 border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              Paid ({paidJobs.length})
            </button>
          </div>
        </div>

        {/* Jobs Table */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                <tr>
                  {isAdminView ? (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      <input
                        type="checkbox"
                        checked={!!allVisibleSelected}
                        onChange={(e) => {
                          const checked = e.target.checked
                          const next: Record<string, boolean> = { ...selectedJobIds }
                          for (const j of sortedJobs) {
                            next[j.id] = checked
                          }
                          setSelectedJobIds(next)
                        }}
                      />
                    </th>
                  ) : null}
                  <th
                    onClick={() => handleSort('jobId')}
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 select-none"
                  >
                    Job ID<SortIndicator field="jobId" />
                  </th>
                  <th
                    onClick={() => handleSort('client')}
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 select-none"
                  >
                    Client<SortIndicator field="client" />
                  </th>
                  {isAdminView ? (
                    <th
                      onClick={() => handleSort('tech')}
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 select-none"
                    >
                      Tech<SortIndicator field="tech" />
                    </th>
                  ) : null}
                  <th
                    onClick={() => handleSort('date')}
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 select-none"
                  >
                    Date<SortIndicator field="date" />
                  </th>
                  <th
                    onClick={() => handleSort('payoutDate')}
                    className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 select-none"
                  >
                    Payout Date<SortIndicator field="payoutDate" />
                  </th>
                  <th
                    onClick={() => handleSort('status')}
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 select-none"
                  >
                    Status<SortIndicator field="status" />
                  </th>
                  <th
                    onClick={() => handleSort('payout')}
                    className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 select-none"
                  >
                    Payout<SortIndicator field="payout" />
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {sortedJobs.length === 0 ? (
                  <tr>
                    <td colSpan={emptyColSpan} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                      No jobs found
                    </td>
                  </tr>
                ) : (
                  sortedJobs.map((job) => (
                    <tr
                      key={job.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                    >
                      {isAdminView ? (
                        <td className="px-6 py-4 whitespace-nowrap">
                          <input
                            type="checkbox"
                            checked={!!selectedJobIds[job.id]}
                            onChange={(e) => {
                              const checked = e.target.checked
                              setSelectedJobIds((prev) => ({ ...prev, [job.id]: checked }))
                            }}
                          />
                        </td>
                      ) : null}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {job.jobId || 'N/A'}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {job.modelName}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900 dark:text-white">
                          {job.client?.name || 'N/A'}
                        </div>
                      </td>
                      {isAdminView ? (
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900 dark:text-white">
                            {(job as any).tech?.name || '—'}
                          </div>
                        </td>
                      ) : null}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 dark:text-white">
                          {job.scannedDate ? new Date(job.scannedDate).toLocaleDateString() : 
                           job.targetDate ? new Date(job.targetDate).toLocaleDateString() : 'N/A'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <PayoutDateCell
                          jobId={job.id}
                          initialValue={job.commissionPayoutDate}
                          canEdit={user?.role !== 'tech'}
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            job.commissionPaymentStatus === 'paid'
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                              : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
                          }`}
                        >
                          {job.commissionPaymentStatus === 'paid' ? 'paid' : 'pending'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          ${calculatePayout(job).toFixed(2)}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {job.vendorPrice ? `$${job.vendorPrice} base` : ''}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <Link
                          href={`/oms/jobs/${job.id}`}
                          className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                        >
                          View
                        </Link>
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
