'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'

interface Job {
  id: string
  jobId: string
  modelName: string
  targetDate: string
  status: string
  region?: 'austin' | 'san-antonio' | 'outsourced' | 'other'
  client?: {
    id: string
    name: string
  }
  tech?: {
    id: string
    name: string
    user?: {
      id: string
    } | string
  }
  city?: string
  captureAddress?: string
}

const statusColors = {
  request: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  scheduled: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  scanned: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  qc: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300',
  done: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  archived: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300',
}

const regionColors = {
  austin: 'bg-blue-500',
  'san-antonio': 'bg-green-500',
  outsourced: 'bg-orange-500',
  other: 'bg-gray-500',
}

export default function JobsListPage() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [regionFilter, setRegionFilter] = useState<string>('all')
  const [clientFilter, setClientFilter] = useState<string>('all')
  const [techFilter, setTechFilter] = useState<string>('all')
  const [dateFrom, setDateFrom] = useState<string>('')
  const [dateTo, setDateTo] = useState<string>('')
  const [sortBy, setSortBy] = useState<string>('targetDate-desc')
  const [showFilters, setShowFilters] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [clients, setClients] = useState<any[]>([])
  const [techs, setTechs] = useState<any[]>([])

  useEffect(() => {
    fetchUser()
    fetchJobs()
    fetchClients()
    fetchTechs()
  }, [])

  const fetchUser = async () => {
    try {
      const response = await fetch('/api/users/me')
      const data = await response.json()
      setUser(data.user)
    } catch (error) {
      console.error('Error fetching user:', error)
    }
  }

  const fetchClients = async () => {
    try {
      const response = await fetch('/api/clients?limit=1000')
      const data = await response.json()
      setClients(data.docs || [])
    } catch (error) {
      console.error('Error fetching clients:', error)
    }
  }

  const fetchTechs = async () => {
    try {
      const response = await fetch('/api/technicians?limit=1000')
      const data = await response.json()
      setTechs(data.docs || [])
    } catch (error) {
      console.error('Error fetching techs:', error)
    }
  }

  const fetchJobs = async () => {
    try {
      const response = await fetch('/api/jobs?limit=1000&depth=2')
      const data = await response.json()
      setJobs(data.docs || [])
    } catch (error) {
      console.error('Error fetching jobs:', error)
    } finally {
      setLoading(false)
    }
  }

  // Clear all filters
  const clearFilters = () => {
    setSearchTerm('')
    setStatusFilter('all')
    setRegionFilter('all')
    setClientFilter('all')
    setTechFilter('all')
    setDateFrom('')
    setDateTo('')
    setSortBy('targetDate-desc')
  }

  // Filter jobs based on user role
  const roleFilteredJobs = user?.role === 'tech' 
    ? jobs.filter((job) => {
        // For tech users, find their technician record and match jobs assigned to them
        const jobTech = job.tech
        if (!jobTech) return false
        
        // Check if the technician's user matches the current user
        const techUserId = typeof jobTech === 'object' && jobTech.user 
          ? (typeof jobTech.user === 'object' ? jobTech.user.id : jobTech.user)
          : null
        
        return techUserId === user.id
      })
    : jobs

  const filteredJobs = roleFilteredJobs.filter((job) => {
    const matchesSearch = 
      job.jobId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.modelName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.client?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.city?.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesStatus = statusFilter === 'all' || job.status === statusFilter
    const matchesRegion = regionFilter === 'all' || job.region === regionFilter
    
    const clientId = typeof job.client === 'object' ? job.client?.id : job.client
    const matchesClient = clientFilter === 'all' || clientId === clientFilter
    
    const techId = typeof job.tech === 'object' ? job.tech?.id : job.tech
    const matchesTech = techFilter === 'all' || (techFilter === 'unassigned' ? !techId : techId === techFilter)

    const jobDate = job.targetDate ? new Date(job.targetDate) : null
    const matchesDateFrom = !dateFrom || !jobDate || jobDate >= new Date(dateFrom)
    const matchesDateTo = !dateTo || !jobDate || jobDate <= new Date(dateTo)

    return matchesSearch && matchesStatus && matchesRegion && matchesClient && matchesTech && matchesDateFrom && matchesDateTo
  })

  // Sort jobs
  const sortedJobs = [...filteredJobs].sort((a, b) => {
    const [field, direction] = sortBy.split('-')
    let comparison = 0

    switch (field) {
      case 'targetDate':
        const dateA = a.targetDate ? new Date(a.targetDate).getTime() : 0
        const dateB = b.targetDate ? new Date(b.targetDate).getTime() : 0
        comparison = dateA - dateB
        break
      case 'client':
        const clientA = a.client?.name || ''
        const clientB = b.client?.name || ''
        comparison = clientA.localeCompare(clientB)
        break
      case 'status':
        comparison = (a.status || '').localeCompare(b.status || '')
        break
      case 'jobId':
        comparison = (a.jobId || '').localeCompare(b.jobId || '')
        break
      default:
        comparison = 0
    }

    return direction === 'desc' ? -comparison : comparison
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <svg className="animate-spin h-12 w-12 mx-auto mb-4 text-blue-600 dark:text-blue-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-lg font-medium text-gray-700 dark:text-gray-300">Loading jobs...</p>
        </div>
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
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Jobs</h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Manage and track all your jobs
              </p>
            </div>
            {user?.role !== 'tech' && (
              <div className="relative">
                <div className="flex gap-2">
                  <Link
                    href="/oms/quick-create"
                    className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                  >
                    <span className="text-xl">+</span>
                    Quick Create
                  </Link>
                  <Link
                    href="/admin/collections/jobs/create"
                    className="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                  >
                    <span className="text-xl">+</span>
                    Manual Create
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-8 py-4">
        {/* Primary Filters Row */}
        <div className="flex flex-wrap gap-4 items-center">
          {/* Search */}
          <div className="flex-1 min-w-[300px]">
            <input
              type="text"
              placeholder="Search by Job ID, Model, Client, or City..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="all">All Statuses</option>
            <option value="request">Request</option>
            <option value="scheduled">Scheduled</option>
            <option value="scanned">Scanned</option>
            <option value="qc">QC</option>
            <option value="done">Done</option>
            <option value="archived">Archived</option>
          </select>

          {/* Region Filter */}
          <select
            value={regionFilter}
            onChange={(e) => setRegionFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="all">All Regions</option>
            <option value="austin">Austin</option>
            <option value="san-antonio">San Antonio</option>
            <option value="outsourced">Outsourced</option>
            <option value="other">Other</option>
          </select>

          {/* Sort By */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="targetDate-desc">Date (Newest)</option>
            <option value="targetDate-asc">Date (Oldest)</option>
            <option value="client-asc">Client (A-Z)</option>
            <option value="client-desc">Client (Z-A)</option>
            <option value="status-asc">Status (A-Z)</option>
            <option value="jobId-asc">Job ID (A-Z)</option>
          </select>

          {/* Advanced Filters Toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-medium"
          >
            {showFilters ? '− Less Filters' : '+ More Filters'}
          </button>

          {/* Clear Filters */}
          <button
            onClick={clearFilters}
            className="px-4 py-2 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium"
          >
            Clear All
          </button>
        </div>

        {/* Advanced Filters Row */}
        {showFilters && (
          <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            {/* Client Filter */}
            <select
              value={clientFilter}
              onChange={(e) => setClientFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="all">All Clients</option>
              {clients.map(client => (
                <option key={client.id} value={client.id}>{client.name}</option>
              ))}
            </select>

            {/* Tech Filter */}
            <select
              value={techFilter}
              onChange={(e) => setTechFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="all">All Techs</option>
              <option value="unassigned">Unassigned</option>
              {techs.map(tech => (
                <option key={tech.id} value={tech.id}>{tech.name}</option>
              ))}
            </select>

            {/* Date From */}
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">From:</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>

            {/* Date To */}
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">To:</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
          </div>
        )}

        {/* Results count */}
        <div className="mt-3 text-sm text-gray-600 dark:text-gray-400">
          Showing {sortedJobs.length} of {jobs.length} jobs
        </div>
      </div>

      {/* Jobs Table */}
      <div className="p-8">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Client
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Model
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Location
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Tech
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Workflow
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Region
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {sortedJobs.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                      No jobs found matching your filters
                    </td>
                  </tr>
                ) : (
                  sortedJobs.map((job) => {
                    const workflowType = (job as any).workflowType
                    const workflowSteps = (job as any).workflowSteps || []
                    const completedSteps = workflowSteps.filter((step: any) => step.completed).length
                    const totalSteps = workflowSteps.length
                    const workflowPercentage = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0
                    const hasWorkflow = workflowType || totalSteps > 0

                    return (
                      <tr
                        key={job.id}
                        className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer"
                        onClick={() => window.location.href = `/oms/jobs/${job.id}`}
                      >
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900 dark:text-white font-medium">
                            {job.client?.name || 'N/A'}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900 dark:text-white">
                            {job.modelName || 'N/A'}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900 dark:text-white">
                            {job.city || 'N/A'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900 dark:text-white">
                            {job.targetDate ? new Date(job.targetDate).toLocaleDateString() : 'N/A'}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900 dark:text-white">
                            {job.tech?.name || (
                              <span className="text-gray-400 dark:text-gray-500 italic">Unassigned</span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${statusColors[job.status as keyof typeof statusColors] || 'bg-gray-100 text-gray-800'}`}>
                            {job.status || 'pending'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {hasWorkflow ? (
                            <div className="flex items-center gap-2">
                              <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2 min-w-[80px]">
                                <div
                                  className={`h-2 rounded-full transition-all ${
                                    workflowPercentage === 100
                                      ? 'bg-green-500'
                                      : workflowPercentage >= 50
                                      ? 'bg-blue-500'
                                      : 'bg-yellow-500'
                                  }`}
                                  style={{ width: `${workflowPercentage}%` }}
                                />
                              </div>
                              <span className="text-sm font-medium text-gray-900 dark:text-white whitespace-nowrap">
                                {workflowPercentage}%
                              </span>
                            </div>
                          ) : (
                            <span className="text-sm text-gray-400 dark:text-gray-500 italic">No workflow</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <div className={`w-3 h-3 rounded-full ${regionColors[job.region as keyof typeof regionColors] || 'bg-gray-500'}`}></div>
                            <span className="text-sm text-gray-900 dark:text-white capitalize">
                              {job.region?.replace('-', ' ') || 'other'}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <Link
                            href={`/oms/jobs/${job.id}`}
                            className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                            onClick={(e) => e.stopPropagation()}
                          >
                            View
                          </Link>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
