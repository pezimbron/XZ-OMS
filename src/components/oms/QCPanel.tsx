'use client'

import { useState, useEffect } from 'react'
import { CheckCircle, XCircle, AlertCircle, Clock, User, MessageSquare, Plus } from 'lucide-react'

interface QCPanelProps {
  job: any
  onUpdate: () => void
}

export default function QCPanel({ job, onUpdate }: QCPanelProps) {
  const [qcNotes, setQcNotes] = useState(job.qcNotes || '')
  const [revisionDescription, setRevisionDescription] = useState('')
  const [showRevisionForm, setShowRevisionForm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [users, setUsers] = useState<any[]>([])
  const [selectedAssignee, setSelectedAssignee] = useState(job.qcAssignedTo?.id || '')

  // Fetch users for assignment dropdown
  useEffect(() => {
    fetch('/api/users?limit=100')
      .then(res => res.json())
      .then(data => {
        const postProducers = (data.docs || []).filter((user: any) => 
          ['super-admin', 'ops-manager', 'post-producer'].includes(user.role)
        )
        console.log('Fetched users for QC assignment:', postProducers)
        setUsers(postProducers)
      })
      .catch(err => console.error('Error fetching users:', err))
  }, [])

  const handleQCAction = async (action: 'approve' | 'reject' | 'needs-revision' | 'start-review') => {
    setLoading(true)
    try {
      const updateData: any = {
        qcNotes,
      }

      if (action === 'approve') {
        updateData.qcStatus = 'passed'
        updateData.qcEndTime = new Date().toISOString()
        updateData.status = 'done'
      } else if (action === 'reject') {
        updateData.qcStatus = 'rejected'
        updateData.qcEndTime = new Date().toISOString()
      } else if (action === 'needs-revision') {
        updateData.qcStatus = 'needs-revision'
      } else if (action === 'start-review') {
        updateData.qcStatus = 'in-review'
        if (!job.qcStartTime) {
          updateData.qcStartTime = new Date().toISOString()
        }
      }

      console.log('Updating QC status with data:', updateData)

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 second timeout

      try {
        const response = await fetch(`/api/jobs/${job.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updateData),
          signal: controller.signal,
        })
        clearTimeout(timeoutId)

        console.log('Response status:', response.status, response.statusText)

        if (!response.ok) {
          const errorText = await response.text()
          console.error('QC update failed with status:', response.status)
          console.error('Error response:', errorText)
          try {
            const errorData = JSON.parse(errorText)
            console.error('Parsed error:', errorData)
          } catch (e) {
            console.error('Could not parse error as JSON')
          }
          throw new Error(`Failed to update job: ${response.status}`)
        }
        
        console.log('QC update successful!')
        onUpdate()
      } catch (error) {
        if (error.name === 'AbortError') {
          console.error('Request timed out after 30 seconds')
          alert('Request timed out. The server may be overloaded.')
        } else {
          console.error('Error updating QC status:', error)
          alert('Failed to update QC status')
        }
      }
    } catch (error) {
      console.error('Outer error:', error)
      alert('Failed to update QC status')
    } finally {
      setLoading(false)
    }
  }

  const handleSaveNotes = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/jobs/${job.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ qcNotes }),
      })

      if (!response.ok) throw new Error('Failed to save notes')
      
      alert('QC notes saved successfully')
      onUpdate()
    } catch (error) {
      console.error('Error saving notes:', error)
      alert('Failed to save QC notes')
    } finally {
      setLoading(false)
    }
  }

  const handleAssignQC = async () => {
    if (!selectedAssignee) return

    setLoading(true)
    try {
      // Convert to number if it's a string number
      const assigneeId = isNaN(Number(selectedAssignee)) ? selectedAssignee : Number(selectedAssignee)
      
      const updateData: any = {
        qcAssignedTo: assigneeId,
        qcStatus: 'in-review',
      }

      if (!job.qcStartTime) {
        updateData.qcStartTime = new Date().toISOString()
      }

      console.log('Assigning QC with data:', updateData)

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 second timeout

      try {
        const response = await fetch(`/api/jobs/${job.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updateData),
          signal: controller.signal,
        })
        clearTimeout(timeoutId)

        console.log('Response status:', response.status, response.statusText)

        if (!response.ok) {
          let errorText = ''
          try {
            errorText = await response.text()
            console.error('Assignment failed with status:', response.status)
            console.error('Error response:', errorText)
            const errorData = JSON.parse(errorText)
            console.error('Parsed error:', errorData)
          } catch (e) {
            console.error('Could not read/parse error response:', e)
            console.error('Raw error text:', errorText)
          }
          throw new Error(`Failed to assign QC: ${response.status}`)
        }
        
        console.log('Assignment successful!')
        onUpdate()
      } catch (error) {
        if (error.name === 'AbortError') {
          console.error('Request timed out after 30 seconds')
          alert('Request timed out. The server may be overloaded.')
        } else {
          console.error('Error assigning QC (full error):', error)
          if (error instanceof Error) {
            console.error('Error message:', error.message)
            console.error('Error stack:', error.stack)
          }
          alert('Failed to assign QC')
        }
      }
    } catch (error) {
      console.error('Outer error:', error)
      alert('Failed to assign QC')
    } finally {
      setLoading(false)
    }
  }

  const handleAddRevision = async () => {
    if (!revisionDescription.trim()) {
      alert('Please enter a revision description')
      return
    }

    if (!job?.id) {
      alert('Error: Job ID is missing')
      return
    }

    setLoading(true)
    try {
      const newRevision = {
        requestedBy: 'Current User', // TODO: Get from auth context
        requestedAt: new Date().toISOString(),
        description: revisionDescription,
        resolved: false,
      }

      const currentRevisions = job.revisionRequests || []
      
      console.log('Adding revision request:', newRevision)
      
      const response = await fetch(`/api/jobs/${job.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          revisionRequests: [...currentRevisions, newRevision],
          qcStatus: 'needs-revision',
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error('Revision request failed:', errorData)
        throw new Error('Failed to add revision request')
      }
      
      setRevisionDescription('')
      setShowRevisionForm(false)
      onUpdate()
    } catch (error) {
      console.error('Error adding revision:', error)
      alert('Failed to add revision request')
    } finally {
      setLoading(false)
    }
  }

  const handleResolveRevision = async (index: number) => {
    setLoading(true)
    try {
      const updatedRevisions = [...(job.revisionRequests || [])]
      updatedRevisions[index] = {
        ...updatedRevisions[index],
        resolved: true,
        resolvedAt: new Date().toISOString(),
      }

      const response = await fetch(`/api/jobs/${job.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          revisionRequests: updatedRevisions,
        }),
      })

      if (!response.ok) throw new Error('Failed to resolve revision')
      
      onUpdate()
    } catch (error) {
      console.error('Error resolving revision:', error)
      alert('Failed to resolve revision')
    } finally {
      setLoading(false)
    }
  }

  const getQCStatusBadge = (status: string) => {
    const styles = {
      pending: { bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-800 dark:text-gray-300', icon: Clock },
      'in-review': { bg: 'bg-blue-100 dark:bg-blue-900', text: 'text-blue-800 dark:text-blue-300', icon: User },
      passed: { bg: 'bg-green-100 dark:bg-green-900', text: 'text-green-800 dark:text-green-300', icon: CheckCircle },
      'needs-revision': { bg: 'bg-yellow-100 dark:bg-yellow-900', text: 'text-yellow-800 dark:text-yellow-300', icon: AlertCircle },
      rejected: { bg: 'bg-red-100 dark:bg-red-900', text: 'text-red-800 dark:text-red-300', icon: XCircle },
    }
    
    const style = styles[status as keyof typeof styles] || styles.pending
    const Icon = style.icon
    
    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-full ${style.bg} ${style.text}`}>
        <Icon className="h-4 w-4" />
        {status?.replace('-', ' ').toUpperCase() || 'PENDING'}
      </span>
    )
  }

  const calculateQCTime = () => {
    if (!job.qcStartTime) return null
    
    const start = new Date(job.qcStartTime)
    const end = job.qcEndTime ? new Date(job.qcEndTime) : new Date()
    const diffMs = end.getTime() - start.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    
    if (diffMins < 60) return `${diffMins} min`
    const hours = Math.floor(diffMins / 60)
    const mins = diffMins % 60
    return `${hours}h ${mins}m`
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          🎬 Quality Control
        </h2>
        {getQCStatusBadge(job.qcStatus)}
      </div>

      {/* QC Info Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Assigned To</p>
          <p className="text-base font-medium text-gray-900 dark:text-white">
            {job.qcAssignedTo?.name || (
              <span className="text-gray-400 italic">Unassigned</span>
            )}
          </p>
        </div>

        <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">QC Time</p>
          <p className="text-base font-medium text-gray-900 dark:text-white">
            {calculateQCTime() || (
              <span className="text-gray-400 italic">Not started</span>
            )}
          </p>
        </div>

        <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Revisions</p>
          <p className="text-base font-medium text-gray-900 dark:text-white">
            {job.revisionRequests?.filter((r: any) => !r.resolved).length || 0} pending
          </p>
        </div>
      </div>

      {/* Assign QC */}
      {!job.qcAssignedTo && (
        <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Assign Post-Producer
          </label>
          <div className="flex gap-2">
            <select
              value={selectedAssignee}
              onChange={(e) => setSelectedAssignee(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="">Select post-producer...</option>
              {users.map(user => (
                <option key={user.id} value={user.id}>{user.name || user.email}</option>
              ))}
            </select>
            <button
              onClick={handleAssignQC}
              disabled={!selectedAssignee || loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Assign
            </button>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="mb-6">
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Quick Actions</p>
        <div className="flex flex-wrap gap-2">
          {job.qcStatus === 'pending' && (
            <button
              onClick={() => handleQCAction('start-review')}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center gap-2"
            >
              <User className="h-4 w-4" />
              Start Review
            </button>
          )}
          
          <button
            onClick={() => handleQCAction('approve')}
            disabled={loading}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors flex items-center gap-2"
          >
            <CheckCircle className="h-4 w-4" />
            Approve & Complete
          </button>
          
          <button
            onClick={() => setShowRevisionForm(!showRevisionForm)}
            disabled={loading}
            className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:opacity-50 transition-colors flex items-center gap-2"
          >
            <AlertCircle className="h-4 w-4" />
            Request Revision
          </button>
          
          <button
            onClick={() => handleQCAction('reject')}
            disabled={loading}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors flex items-center gap-2"
          >
            <XCircle className="h-4 w-4" />
            Reject
          </button>
        </div>
      </div>

      {/* Revision Request Form */}
      {showRevisionForm && (
        <div className="mb-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Revision Description
          </label>
          <textarea
            value={revisionDescription}
            onChange={(e) => setRevisionDescription(e.target.value)}
            placeholder="Describe what needs to be revised..."
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white mb-2"
          />
          <div className="flex gap-2">
            <button
              onClick={handleAddRevision}
              disabled={loading || !revisionDescription.trim()}
              className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:opacity-50 transition-colors"
            >
              Add Revision Request
            </button>
            <button
              onClick={() => {
                setShowRevisionForm(false)
                setRevisionDescription('')
              }}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Revision Requests List */}
      {job.revisionRequests && job.revisionRequests.length > 0 && (
        <div className="mb-6">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Revision History</p>
          <div className="space-y-3">
            {job.revisionRequests.map((revision: any, index: number) => (
              <div
                key={index}
                className={`p-4 rounded-lg border ${
                  revision.resolved
                    ? 'bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700'
                    : 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-gray-500" />
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {revision.requestedBy}
                    </span>
                    <span className="text-xs text-gray-500">
                      {new Date(revision.requestedAt).toLocaleDateString()}
                    </span>
                  </div>
                  {!revision.resolved && (
                    <button
                      onClick={() => handleResolveRevision(index)}
                      disabled={loading}
                      className="text-xs px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 transition-colors"
                    >
                      Mark Resolved
                    </button>
                  )}
                </div>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  {revision.description}
                </p>
                {revision.resolved && (
                  <p className="text-xs text-green-600 dark:text-green-400 mt-2">
                    ✓ Resolved on {new Date(revision.resolvedAt).toLocaleDateString()}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* QC Notes */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          QC Notes
        </label>
        <textarea
          value={qcNotes}
          onChange={(e) => setQcNotes(e.target.value)}
          placeholder="Add notes about the QC review..."
          rows={4}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white mb-2"
        />
        <button
          onClick={handleSaveNotes}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          Save Notes
        </button>
      </div>
    </div>
  )
}
