'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle, XCircle, Clock, AlertCircle, Filter, Search, User } from 'lucide-react'

interface Job {
  id: string
  jobId: string
  modelName: string
  client: {
    id: string
    name: string
  }
  status: string
  priority: string
  qcStatus: string
  qcAssignedTo?: {
    id: string
    name: string
  }
  sqFt?: number
  targetDate?: string
  scannedDate?: string
  qcStartTime?: string
  deliverables?: {
    model3dLink?: string
    floorPlansLink?: string
    photosVideosLink?: string
  }
}

export default function QCQueuePage() {
  const router = useRouter()
  const [jobs, setJobs] = useState<Job[]>([])
  const [filteredJobs, setFilteredJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [qcStatusFilter, setQcStatusFilter] = useState('all')
  const [priorityFilter, setPriorityFilter] = useState('all')
  const [assigneeFilter, setAssigneeFilter] = useState('all')
  const [selectedJobs, setSelectedJobs] = useState<Set<string>>(new Set())
  const [users, setUsers] = useState<any[]>([])

  useEffect(() => {
    fetchJobs()
    fetchUsers()
  }, [])

  useEffect(() => {
    filterJobs()
  }, [jobs, searchTerm, qcStatusFilter, priorityFilter, assigneeFilter])

  const fetchJobs = async () => {
    try {
      const response = await fetch('/api/jobs?limit=1000&depth=1&where[status][equals]=qc')
      const data = await response.json()
      setJobs(data.docs || [])
    } catch (error) {
      console.error('Error fetching jobs:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/users?limit=100')
      const data = await response.json()
      const postProducers = (data.docs || []).filter((user: any) => 
        ['super-admin', 'ops-manager', 'post-producer'].includes(user.role)
      )
      setUsers(postProducers)
    } catch (error) {
      console.error('Error fetching users:', error)
    }
  }

  const filterJobs = () => {
    let filtered = [...jobs]

    if (searchTerm) {
      filtered = filtered.filter(job =>
        job.jobId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        job.modelName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        job.client?.name?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    if (qcStatusFilter !== 'all') {
      filtered = filtered.filter(job => job.qcStatus === qcStatusFilter)
    }

    if (priorityFilter !== 'all') {
      filtered = filtered.filter(job => job.priority === priorityFilter)
    }

    if (assigneeFilter !== 'all') {
      if (assigneeFilter === 'unassigned') {
        filtered = filtered.filter(job => !job.qcAssignedTo)
      } else {
        filtered = filtered.filter(job => job.qcAssignedTo?.id === assigneeFilter)
      }
    }

    // Sort by priority and date
    filtered.sort((a, b) => {
      const priorityOrder = { rush: 0, high: 1, normal: 2, low: 3 }
      const aPriority = priorityOrder[a.priority as keyof typeof priorityOrder] ?? 2
      const bPriority = priorityOrder[b.priority as keyof typeof priorityOrder] ?? 2
      
      if (aPriority !== bPriority) return aPriority - bPriority
      
      const aDate = new Date(a.scannedDate || a.targetDate || 0)
      const bDate = new Date(b.scannedDate || b.targetDate || 0)
      return aDate.getTime() - bDate.getTime()
    })

    setFilteredJobs(filtered)
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

  const toggleSelectAll = () => {
    if (selectedJobs.size === filteredJobs.length) {
      setSelectedJobs(new Set())
    } else {
      setSelectedJobs(new Set(filteredJobs.map(job => job.id)))
    }
  }

  const handleBatchAction = async (action: 'approve' | 'reject' | 'assign', assigneeId?: string) => {
    if (selectedJobs.size === 0) return

    try {
      const updates = Array.from(selectedJobs).map(async (jobId) => {
        const updateData: any = {}
        
        if (action === 'approve') {
          updateData.qcStatus = 'passed'
          updateData.qcEndTime = new Date().toISOString()
          updateData.status = 'done'
        } else if (action === 'reject') {
          updateData.qcStatus = 'rejected'
        } else if (action === 'assign' && assigneeId) {
          updateData.qcAssignedTo = assigneeId
          updateData.qcStatus = 'in-review'
          if (!jobs.find(j => j.id === jobId)?.qcStartTime) {
            updateData.qcStartTime = new Date().toISOString()
          }
        }

        const response = await fetch(`/api/jobs/${jobId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updateData),
        })

        if (!response.ok) throw new Error('Failed to update job')
        return response.json()
      })

      await Promise.all(updates)
      setSelectedJobs(new Set())
      fetchJobs()
    } catch (error) {
      console.error('Error performing batch action:', error)
      alert('Failed to perform batch action')
    }
  }

  const getQCStatusBadge = (status: string) => {
    const styles = {
      pending: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
      'in-review': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
      passed: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
      'needs-revision': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
      rejected: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
    }
    
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${styles[status as keyof typeof styles] || styles.pending}`}>
        {status?.replace('-', ' ').toUpperCase() || 'PENDING'}
      </span>
    )
  }

  const getPriorityBadge = (priority: string) => {
    const styles = {
      rush: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
      high: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
      normal: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
      low: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
    }
    
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${styles[priority as keyof typeof styles] || styles.normal}`}>
        {priority?.toUpperCase() || 'NORMAL'}
      </span>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading QC queue...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Post-Producer QC Queue
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Review and approve completed jobs
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Pending Review</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {jobs.filter(j => j.qcStatus === 'pending').length}
                </p>
              </div>
              <Clock className="h-8 w-8 text-gray-400" />
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">In Review</p>
                <p className="text-2xl font-bold text-blue-600">
                  {jobs.filter(j => j.qcStatus === 'in-review').length}
                </p>
              </div>
              <User className="h-8 w-8 text-blue-400" />
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Needs Revision</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {jobs.filter(j => j.qcStatus === 'needs-revision').length}
                </p>
              </div>
              <AlertCircle className="h-8 w-8 text-yellow-400" />
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Passed Today</p>
                <p className="text-2xl font-bold text-green-600">
                  {jobs.filter(j => {
                    if (j.qcStatus !== 'passed') return false
                    const today = new Date().toDateString()
                    return j.qcStartTime && new Date(j.qcStartTime).toDateString() === today
                  }).length}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-400" />
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <Search className="inline h-4 w-4 mr-1" />
                Search
              </label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Job ID, model, client..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <Filter className="inline h-4 w-4 mr-1" />
                QC Status
              </label>
              <select
                value={qcStatusFilter}
                onChange={(e) => setQcStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="all">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="in-review">In Review</option>
                <option value="needs-revision">Needs Revision</option>
                <option value="passed">Passed</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Priority
              </label>
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="all">All Priorities</option>
                <option value="rush">Rush</option>
                <option value="high">High</option>
                <option value="normal">Normal</option>
                <option value="low">Low</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Assigned To
              </label>
              <select
                value={assigneeFilter}
                onChange={(e) => setAssigneeFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="all">All Assignees</option>
                <option value="unassigned">Unassigned</option>
                {users.map(user => (
                  <option key={user.id} value={user.id}>{user.name || user.email}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Batch Actions */}
        {selectedJobs.size > 0 && (
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 mb-6 border border-blue-200 dark:border-blue-800">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-blue-900 dark:text-blue-300">
                {selectedJobs.size} job{selectedJobs.size > 1 ? 's' : ''} selected
              </p>
              <div className="flex gap-2">
                <select
                  onChange={(e) => {
                    if (e.target.value) {
                      handleBatchAction('assign', e.target.value)
                      e.target.value = ''
                    }
                  }}
                  className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="">Assign to...</option>
                  {users.map(user => (
                    <option key={user.id} value={user.id}>{user.name || user.email}</option>
                  ))}
                </select>
                <button
                  onClick={() => handleBatchAction('approve')}
                  className="px-4 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-1"
                >
                  <CheckCircle className="h-4 w-4" />
                  Approve
                </button>
                <button
                  onClick={() => handleBatchAction('reject')}
                  className="px-4 py-1.5 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-1"
                >
                  <XCircle className="h-4 w-4" />
                  Reject
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Jobs Table */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                <tr>
                  <th className="px-4 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selectedJobs.size === filteredJobs.length && filteredJobs.length > 0}
                      onChange={toggleSelectAll}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Job ID
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Model / Client
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Priority
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    QC Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Assigned To
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Sq Ft
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredJobs.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                      No jobs in QC queue
                    </td>
                  </tr>
                ) : (
                  filteredJobs.map((job) => (
                    <tr
                      key={job.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                      onClick={() => router.push(`/oms/jobs/${job.id}`)}
                    >
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedJobs.has(job.id)}
                          onChange={() => toggleJobSelection(job.id)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
                        {job.jobId || job.id}
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {job.modelName}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {job.client?.name}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {getPriorityBadge(job.priority)}
                      </td>
                      <td className="px-4 py-3">
                        {getQCStatusBadge(job.qcStatus)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                        {job.qcAssignedTo?.name || (
                          <span className="text-gray-400 italic">Unassigned</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                        {job.sqFt ? `${job.sqFt.toLocaleString()} sq ft` : '-'}
                      </td>
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => router.push(`/oms/jobs/${job.id}`)}
                          className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-sm font-medium"
                        >
                          Review →
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Results Count */}
        <div className="mt-4 text-sm text-gray-600 dark:text-gray-400 text-center">
          Showing {filteredJobs.length} of {jobs.length} jobs in QC queue
        </div>
      </div>
    </div>
  )
}
