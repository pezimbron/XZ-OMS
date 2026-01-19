'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { workflowTemplates, getWorkflowSteps } from '@/lib/workflows/templates'
import { NotifyClientButton } from '@/components/oms/NotifyClientButton'

interface Job {
  id: string
  jobId: string
  modelName: string
  targetDate: string
  status: string
  region?: string
  client?: any
  endClient?: any
  tech?: any
  captureAddress?: string
  city?: string
  state?: string
  zipCode?: string
  lineItems?: any[]
  techInstructions?: string
  schedulingNotes?: string
  qcStatus?: string
  qcNotes?: string
  totalPayout?: number
  createdAt: string
  updatedAt: string
}

export default function JobDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [job, setJob] = useState<Job | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'details' | 'instructions' | 'tech-feedback' | 'qc' | 'financials' | 'workflow' | 'deliverables'>('details')
  const [editingStatus, setEditingStatus] = useState(false)
  const [newStatus, setNewStatus] = useState('')
  const [saving, setSaving] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [editedJob, setEditedJob] = useState<any>(null)
  const [clients, setClients] = useState<any[]>([])
  const [techs, setTechs] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [user, setUser] = useState<any>(null)
  
  // Generate random job ID for direct customers
  const generateJobId = () => {
    const prefix = 'XZOMS'
    const now = new Date()
    const year = now.getFullYear().toString().slice(-2)
    const month = (now.getMonth() + 1).toString().padStart(2, '0')
    const day = now.getDate().toString().padStart(2, '0')
    
    const chars = '0123456789'
    let randomPart = ''
    
    for (let i = 0; i < 3; i++) {
      randomPart += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    
    const newJobId = `${prefix}-${year}${month}${day}-${randomPart}`
    setEditedJob({ ...editedJob, jobId: newJobId })
  }
  
  useEffect(() => {
    fetchClients()
    fetchTechs()
    fetchProducts()
    fetchUser()
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

  const fetchProducts = async () => {
    try {
      const response = await fetch('/api/products?limit=1000')
      const data = await response.json()
      setProducts(data.docs || [])
    } catch (error) {
      console.error('Error fetching products:', error)
    }
  }

  useEffect(() => {
    if (params.id) {
      fetchJob(params.id as string)
    }
  }, [params.id])

  const fetchJob = async (id: string) => {
    try {
      const response = await fetch(`/api/jobs/${id}?depth=2`)
      const data = await response.json()
      setJob(data)
      setNewStatus(data.status)
      setEditedJob(data)
    } catch (error) {
      console.error('Error fetching job:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleEditToggle = () => {
    if (editMode) {
      setEditedJob(job)
    }
    setEditMode(!editMode)
  }

  const handleSaveJob = async () => {
    if (!editedJob) return
    
    setSaving(true)
    try {
      const clientValue = typeof editedJob.client === 'object' ? editedJob.client.id : editedJob.client
      
      // Get the tech value for separate update
      let techValue = null
      if (editedJob.tech) {
        if (typeof editedJob.tech === 'object' && editedJob.tech !== null) {
          techValue = editedJob.tech.id
        } else if (editedJob.tech !== '') {
          techValue = editedJob.tech
        }
      }
      
      // Format line items - convert product IDs to integers
      const formattedLineItems = (editedJob.lineItems || []).map((item: any) => ({
        product: typeof item.product === 'object' ? parseInt(item.product.id) : parseInt(item.product),
        quantity: parseInt(item.quantity) || 1,
        instructions: item.instructions || '',
      })).filter((item: any) => item.product && !isNaN(item.product))

      // Calculate total price from products
      let calculatedTotal = 0
      const jobSqFt = parseInt(editedJob.sqFt) || 0
      formattedLineItems.forEach((item: any) => {
        const product = products.find(p => p.id === item.product)
        if (product) {
          const price = product.basePrice || 0
          const multiplier = product.unitType === 'per-sq-ft' ? jobSqFt : item.quantity
          calculatedTotal += price * multiplier
        }
      })

      // Update main job fields (without tech)
      const updateData: any = {
        jobId: editedJob.jobId,
        modelName: editedJob.modelName,
        client: clientValue,
        captureAddress: editedJob.captureAddress,
        city: editedJob.city,
        state: editedJob.state,
        zip: editedJob.zip,
        region: editedJob.region,
        status: editedJob.status,
        targetDate: editedJob.targetDate,
        sqFt: parseInt(editedJob.sqFt) || 0,
        schedulingNotes: editedJob.schedulingNotes,
        techInstructions: editedJob.techInstructions,
        lineItems: formattedLineItems,
        vendorPrice: parseFloat(editedJob.vendorPrice) || 0,
        travelPayout: parseFloat(editedJob.travelPayout) || 0,
        offHoursPayout: parseFloat(editedJob.offHoursPayout) || 0,
        totalPrice: calculatedTotal > 0 ? calculatedTotal : (parseFloat(editedJob.totalPrice) || 0),
        workflowType: editedJob.workflowType || null,
        workflowSteps: editedJob.workflowSteps || [],
      }
      
      console.log('Sending update:', updateData)
      
      const response = await fetch(`/api/jobs/${job?.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error('Update failed:', errorData)
        alert(`Failed to update job: ${errorData.errors?.[0]?.message || 'Unknown error'}`)
        setSaving(false)
        return
      }

      // If tech assignment changed, update it separately
      const originalTechId = typeof job?.tech === 'object' ? job?.tech?.id : job?.tech
      if (techValue !== originalTechId) {
        const techResponse = await fetch(`/api/jobs/${job?.id}/assign-tech`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ techId: techValue }),
        })

        if (!techResponse.ok) {
          console.error('Tech assignment failed')
          alert('Job updated but tech assignment failed. Please assign tech in admin panel.')
        }
      }

      // Refresh job data
      const updatedJob = await response.json()
      setJob(updatedJob)
      setEditedJob(updatedJob)
      setEditMode(false)
      alert('Job updated successfully!')
      fetchJob(job?.id as string)
    } catch (error) {
      console.error('Error updating job:', error)
      alert(`Error updating job: ${error}`)
    } finally {
      setSaving(false)
    }
  }

  const handleStatusUpdate = async () => {
    if (!job || !newStatus) return
    
    setSaving(true)
    try {
      const response = await fetch(`/api/jobs/${job.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: newStatus,
        }),
      })

      if (response.ok) {
        const updatedJob = await response.json()
        setJob(updatedJob)
        setEditingStatus(false)
        alert('Status updated successfully!')
      } else {
        alert('Failed to update status')
      }
    } catch (error) {
      console.error('Error updating status:', error)
      alert('Error updating status')
    } finally {
      setSaving(false)
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
          <p className="text-lg font-medium text-gray-700 dark:text-gray-300">Loading job...</p>
        </div>
      </div>
    )
  }

  if (!job) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Job Not Found</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">The job you&apos;re looking for doesn&apos;t exist.</p>
          <Link href="/oms/jobs" className="text-blue-600 hover:text-blue-700 dark:text-blue-400">
            ← Back to Jobs
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="px-8 py-6">
          <div className="flex items-center justify-between mb-4">
            <Link
              href="/oms/jobs"
              className="text-blue-600 hover:text-blue-700 dark:text-blue-400 flex items-center gap-2"
            >
              ← Back to Jobs
            </Link>
            <div className="flex gap-2">
              <NotifyClientButton 
                jobId={job.id} 
                clientName={job.client?.name}
                clientEmail={job.client?.email}
              />
              {(job as any).completionToken && (
                <button
                  onClick={() => {
                    const url = `${window.location.origin}/forms/job/${(job as any).completionToken}`
                    navigator.clipboard.writeText(url)
                    alert('Completion form link copied to clipboard!')
                  }}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                  title="Copy completion form link for subcontractor"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Copy Form Link
                </button>
              )}
              {editMode ? (
                <>
                  <button
                    onClick={handleSaveJob}
                    disabled={saving}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors"
                  >
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                  <button
                    onClick={handleEditToggle}
                    className="px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg font-medium transition-colors"
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <button
                  onClick={handleEditToggle}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                >
                  Edit Job
                </button>
              )}
            </div>
          </div>
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                {job.jobId || 'Job Details'}
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                {job.modelName}
              </p>
            </div>
            <div className="flex flex-col items-end gap-2">
              {editingStatus ? (
                <div className="flex items-center gap-2">
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                    className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="request">Request</option>
                    <option value="scheduled">Scheduled</option>
                    <option value="scanned">Scanned</option>
                    <option value="qc">QC</option>
                    <option value="done">Done</option>
                    <option value="archived">Archived</option>
                  </select>
                  <button
                    onClick={handleStatusUpdate}
                    disabled={saving}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors"
                  >
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    onClick={() => {
                      setEditingStatus(false)
                      setNewStatus(job.status)
                    }}
                    className="px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg font-medium transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setEditingStatus(true)}
                  className={`px-3 py-1 rounded-full text-sm font-semibold cursor-pointer transition-all hover:ring-2 hover:ring-blue-500 ${
                    job.status === 'request' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' :
                    job.status === 'scheduled' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' :
                    job.status === 'scanned' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300' :
                    job.status === 'qc' ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300' :
                    job.status === 'done' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' :
                    job.status === 'archived' ? 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300' :
                    'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300'
                  }`}
                >
                  {job.status || 'request'} ✏️
                </button>
              )}
              {job.region && (
                <span className="px-3 py-1 rounded-full text-sm font-semibold bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300 capitalize">
                  {job.region.replace('-', ' ')}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="px-8">
          <div className="flex gap-6 border-b border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setActiveTab('details')}
              className={`pb-3 px-1 font-medium transition-colors ${
                activeTab === 'details'
                  ? 'border-b-2 border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              Details
            </button>
            <button
              onClick={() => setActiveTab('instructions')}
              className={`pb-3 px-1 font-medium transition-colors ${
                activeTab === 'instructions'
                  ? 'border-b-2 border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              Instructions
            </button>
            <button
              onClick={() => setActiveTab('tech-feedback')}
              className={`pb-3 px-1 font-medium transition-colors ${
                activeTab === 'tech-feedback'
                  ? 'border-b-2 border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              Tech Feedback
            </button>
            <button
              onClick={() => setActiveTab('qc')}
              className={`pb-3 px-1 font-medium transition-colors ${
                activeTab === 'qc'
                  ? 'border-b-2 border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              QC
            </button>
            {user?.role !== 'tech' && (
              <button
                onClick={() => setActiveTab('financials')}
                className={`pb-3 px-1 font-medium transition-colors ${
                  activeTab === 'financials'
                    ? 'border-b-2 border-blue-600 text-blue-600 dark:text-blue-400'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                Financials
              </button>
            )}
            <button
              onClick={() => setActiveTab('workflow')}
              className={`pb-3 px-1 font-medium transition-colors ${
                activeTab === 'workflow'
                  ? 'border-b-2 border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              Workflow
            </button>
            <button
              onClick={() => setActiveTab('deliverables')}
              className={`pb-3 px-1 font-medium transition-colors ${
                activeTab === 'deliverables'
                  ? 'border-b-2 border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              Deliverables
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-8">
        {activeTab === 'details' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Basic Info */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Basic Information</h2>
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Job ID</label>
                  {editMode ? (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={editedJob?.jobId || ''}
                        onChange={(e) => setEditedJob({...editedJob, jobId: e.target.value})}
                        className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        placeholder="Enter Job ID"
                      />
                      <button
                        type="button"
                        onClick={generateJobId}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors whitespace-nowrap"
                        title="Generate random Job ID"
                      >
                        🎲 Generate
                      </button>
                    </div>
                  ) : (
                    <p className="text-gray-900 dark:text-white">{job.jobId || 'N/A'}</p>
                  )}
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Model Name</label>
                  {editMode ? (
                    <input
                      type="text"
                      value={editedJob?.modelName || ''}
                      onChange={(e) => setEditedJob({...editedJob, modelName: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  ) : (
                    <p className="text-gray-900 dark:text-white">{job.modelName || 'N/A'}</p>
                  )}
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Target Date</label>
                  {editMode ? (
                    <input
                      type="datetime-local"
                      value={editedJob?.targetDate ? new Date(editedJob.targetDate).toISOString().slice(0, 16) : ''}
                      onChange={(e) => setEditedJob({...editedJob, targetDate: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  ) : (
                    <p className="text-gray-900 dark:text-white">
                      {job.targetDate ? new Date(job.targetDate).toLocaleString() : 'N/A'}
                    </p>
                  )}
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Status</label>
                  {editMode ? (
                    <select
                      value={editedJob?.status || ''}
                      onChange={(e) => setEditedJob({...editedJob, status: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      <option value="request">Request</option>
                      <option value="scheduled">Scheduled</option>
                      <option value="scanned">Scanned</option>
                      <option value="qc">QC</option>
                      <option value="done">Done</option>
                      <option value="archived">Archived</option>
                    </select>
                  ) : (
                    <p className="text-gray-900 dark:text-white capitalize">{job.status || 'request'}</p>
                  )}
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Region</label>
                  {editMode ? (
                    <select
                      value={editedJob?.region || ''}
                      onChange={(e) => setEditedJob({...editedJob, region: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      <option value="">Select Region</option>
                      <option value="austin">Austin Area</option>
                      <option value="san-antonio">San Antonio Area</option>
                      <option value="outsourced">Outsourced</option>
                      <option value="other">Other</option>
                    </select>
                  ) : (
                    <p className="text-gray-900 dark:text-white capitalize">{job.region?.replace('-', ' ') || 'N/A'}</p>
                  )}
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Square Feet</label>
                  {editMode ? (
                    <input
                      type="number"
                      value={editedJob?.sqFt || ''}
                      onChange={(e) => setEditedJob({...editedJob, sqFt: parseInt(e.target.value) || 0})}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="Enter square feet"
                    />
                  ) : (
                    <p className="text-gray-900 dark:text-white">{(job as any).sqFt?.toLocaleString() || 'N/A'} sq ft</p>
                  )}
                </div>
              </div>
            </div>

            {/* Client Info */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Client Information</h2>
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Client</label>
                  {editMode ? (
                    <select
                      value={typeof editedJob?.client === 'object' ? editedJob.client?.id : editedJob?.client || ''}
                      onChange={(e) => setEditedJob({...editedJob, client: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      <option value="">Select Client</option>
                      {clients.map(client => (
                        <option key={client.id} value={client.id}>{client.name}</option>
                      ))}
                    </select>
                  ) : (
                    <p className="text-gray-900 dark:text-white">{job.client?.name || 'N/A'}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Tech Assignment */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Tech Assignment</h2>
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Assigned Tech</label>
                  {editMode ? (
                    <select
                      value={typeof editedJob?.tech === 'object' ? editedJob.tech?.id : editedJob?.tech || ''}
                      onChange={(e) => setEditedJob({...editedJob, tech: e.target.value || null})}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      <option value="">Unassigned</option>
                      {techs.map(tech => (
                        <option key={tech.id} value={tech.id}>{tech.name}</option>
                      ))}
                    </select>
                  ) : (
                    <p className="text-gray-900 dark:text-white">
                      {job.tech?.name || <span className="text-gray-400 italic">Unassigned</span>}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Location */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Location</h2>
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Address</label>
                  {editMode ? (
                    <input
                      type="text"
                      value={editedJob?.captureAddress || ''}
                      onChange={(e) => setEditedJob({...editedJob, captureAddress: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="Enter address"
                    />
                  ) : (
                    <p className="text-gray-900 dark:text-white">{job.captureAddress || 'N/A'}</p>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">City</label>
                    {editMode ? (
                      <input
                        type="text"
                        value={editedJob?.city || ''}
                        onChange={(e) => setEditedJob({...editedJob, city: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        placeholder="City"
                      />
                    ) : (
                      <p className="text-gray-900 dark:text-white">{job.city || 'N/A'}</p>
                    )}
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">State</label>
                    {editMode ? (
                      <input
                        type="text"
                        value={editedJob?.state || ''}
                        onChange={(e) => setEditedJob({...editedJob, state: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        placeholder="State"
                      />
                    ) : (
                      <p className="text-gray-900 dark:text-white">{job.state || 'N/A'}</p>
                    )}
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">ZIP</label>
                    {editMode ? (
                      <input
                        type="text"
                        value={editedJob?.zip || ''}
                        onChange={(e) => setEditedJob({...editedJob, zip: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        placeholder="ZIP"
                      />
                    ) : (
                      <p className="text-gray-900 dark:text-white">{job.zipCode || 'N/A'}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'instructions' && (
          <div className="space-y-6">
            {/* Scheduling Notes */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Scheduling Notes / Restrictions</h2>
              {editMode ? (
                <textarea
                  value={editedJob?.schedulingNotes || ''}
                  onChange={(e) => setEditedJob({...editedJob, schedulingNotes: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white min-h-[100px]"
                  placeholder="Enter scheduling notes, restrictions, or special requirements..."
                />
              ) : (
                <div className="prose dark:prose-invert max-w-none">
                  {job.schedulingNotes ? (
                    <pre className="whitespace-pre-wrap text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">
                      {job.schedulingNotes}
                    </pre>
                  ) : (
                    <p className="text-gray-400 italic">No scheduling notes</p>
                  )}
                </div>
              )}
            </div>

            {/* Tech Instructions */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">General Instructions for Tech</h2>
              {editMode ? (
                <textarea
                  value={editedJob?.techInstructions || ''}
                  onChange={(e) => setEditedJob({...editedJob, techInstructions: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white min-h-[150px]"
                  placeholder="Enter general instructions for the tech..."
                />
              ) : (
                <div className="prose dark:prose-invert max-w-none">
                  {job.techInstructions ? (
                    <pre className="whitespace-pre-wrap text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">
                      {job.techInstructions}
                    </pre>
                  ) : (
                    <p className="text-gray-400 italic">No instructions provided</p>
                  )}
                </div>
              )}
            </div>

            {/* Line Items */}
            {job.lineItems && job.lineItems.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">To-Do List / Services</h3>
                <div className="space-y-2">
                  {job.lineItems.map((item: any, index: number) => (
                    <div key={index} className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {item.product?.name || 'Product'}
                          </p>
                          {item.instructions && (
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{item.instructions}</p>
                          )}
                        </div>
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          Qty: {item.quantity || 1}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'tech-feedback' && (
          <div className="space-y-6">
            {/* Completion Info */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Completion Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Assigned Tech</label>
                  <p className="text-gray-900 dark:text-white font-medium">
                    {job.tech?.name || <span className="text-gray-400 italic">Unassigned</span>}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Completion Status</label>
                  <p className="text-gray-900 dark:text-white font-medium">
                    {(job as any).completionStatus ? (
                      <span className={`px-2 py-1 rounded text-sm ${
                        (job as any).completionStatus === 'completed' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' :
                        (job as any).completionStatus === 'partially-completed' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' :
                        'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                      }`}>
                        {(job as any).completionStatus === 'completed' ? 'Completed' :
                         (job as any).completionStatus === 'partially-completed' ? 'Partially Completed' :
                         'Not Able to Complete'}
                      </span>
                    ) : (
                      <span className="text-gray-400 italic">Not reported</span>
                    )}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Completion Date</label>
                  <p className="text-gray-900 dark:text-white">
                    {(job as any).scannedDate ? new Date((job as any).scannedDate).toLocaleString() : (
                      <span className="text-gray-400 italic">Not completed yet</span>
                    )}
                  </p>
                </div>
              </div>

              {/* Incompletion Reason */}
              {((job as any).completionStatus === 'not-completed' || (job as any).completionStatus === 'partially-completed') && (job as any).incompletionReason && (
                <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                  <label className="text-sm font-medium text-yellow-800 dark:text-yellow-300 block mb-1">
                    Reason for Incompletion
                  </label>
                  <p className="text-yellow-900 dark:text-yellow-200">
                    {(job as any).incompletionReason === 'no-access' ? 'Not able to access' :
                     (job as any).incompletionReason === 'poc-no-show' ? 'POC didn\'t show up' :
                     (job as any).incompletionReason === 'poc-reschedule' ? 'POC asked to reschedule' :
                     'Other'}
                  </p>
                  {(job as any).incompletionNotes && (
                    <p className="text-sm text-yellow-800 dark:text-yellow-300 mt-2">
                      {(job as any).incompletionNotes}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Tech Feedback */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Tech Feedback</h2>
              {(job as any).techFeedback ? (
                <pre className="whitespace-pre-wrap text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">
                  {(job as any).techFeedback}
                </pre>
              ) : (
                <p className="text-gray-400 italic">No feedback provided yet</p>
              )}
            </div>

            {/* Upload Links */}
            {((job as any).uploadLink || (job as any).mediaUploadLink) && (
              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Upload Links</h3>
                <div className="space-y-2">
                  {(job as any).uploadLink && (
                    <div className="bg-gray-50 dark:bg-gray-900 p-3 rounded-lg">
                      <label className="text-sm font-medium text-gray-500 dark:text-gray-400 block mb-1">
                        Primary Upload Link
                      </label>
                      <a
                        href={(job as any).uploadLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-700 dark:text-blue-400 break-all"
                      >
                        {(job as any).uploadLink}
                      </a>
                    </div>
                  )}
                  {(job as any).mediaUploadLink && (
                    <div className="bg-gray-50 dark:bg-gray-900 p-3 rounded-lg">
                      <label className="text-sm font-medium text-gray-500 dark:text-gray-400 block mb-1">
                        Media Upload Link
                      </label>
                      <a
                        href={(job as any).mediaUploadLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-700 dark:text-blue-400 break-all"
                      >
                        {(job as any).mediaUploadLink}
                      </a>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'qc' && (
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Quality Control</h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">QC Status</label>
                <p className="text-gray-900 dark:text-white capitalize">{job.qcStatus || 'Not Started'}</p>
              </div>
              {job.qcNotes && (
                <div>
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-400">QC Notes</label>
                  <pre className="whitespace-pre-wrap text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-900 p-4 rounded-lg mt-2">
                    {job.qcNotes}
                  </pre>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'financials' && (
          <div className="space-y-6">
            {/* Line Items / Products */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Products / Services</h2>
                {editMode && (
                  <button
                    onClick={() => {
                      const newLineItems = [...(editedJob?.lineItems || []), { product: '', quantity: 1, instructions: '' }]
                      setEditedJob({...editedJob, lineItems: newLineItems})
                    }}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                  >
                    + Add Product
                  </button>
                )}
              </div>
              
              {editMode ? (
                <div className="space-y-3">
                  {(editedJob?.lineItems || []).map((item: any, index: number) => (
                    <div key={index} className="flex gap-3 items-start p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                      <div className="flex-1">
                        <label className="text-sm font-medium text-gray-500 dark:text-gray-400 block mb-1">Product</label>
                        <select
                          value={typeof item.product === 'object' ? item.product?.id : item.product}
                          onChange={(e) => {
                            const newLineItems = [...editedJob.lineItems]
                            newLineItems[index] = {...newLineItems[index], product: e.target.value}
                            setEditedJob({...editedJob, lineItems: newLineItems})
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
                      </div>
                      <div className="w-24">
                        <label className="text-sm font-medium text-gray-500 dark:text-gray-400 block mb-1">Qty</label>
                        <input
                          type="number"
                          min="1"
                          value={item.quantity || 1}
                          onChange={(e) => {
                            const newLineItems = [...editedJob.lineItems]
                            newLineItems[index] = {...newLineItems[index], quantity: parseInt(e.target.value)}
                            setEditedJob({...editedJob, lineItems: newLineItems})
                          }}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        />
                      </div>
                      <button
                        onClick={() => {
                          const newLineItems = editedJob.lineItems.filter((_: any, i: number) => i !== index)
                          setEditedJob({...editedJob, lineItems: newLineItems})
                        }}
                        className="mt-7 p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  ))}
                  {(!editedJob?.lineItems || editedJob.lineItems.length === 0) && (
                    <p className="text-gray-400 italic text-center py-4">No products added yet. Click &quot;Add Product&quot; to get started.</p>
                  )}
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
                                const jobSqFt = parseInt((job as any).sqFt) || 0
                                const multiplier = item.product.unitType === 'per-sq-ft' ? jobSqFt : (item.quantity || 1)
                                return (price * multiplier).toFixed(2)
                              })()}
                              {item.product.unitType === 'per-sq-ft' && ` (${(job as any).sqFt || 0} sq ft)`}
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

            {/* Pricing & Payouts */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Pricing & Payouts</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Price (Client)</label>
                  {editMode ? (
                    <div>
                      <p className="text-2xl font-bold text-green-600 dark:text-green-400 mb-2">
                        ${(() => {
                          let total = 0
                          const jobSqFt = parseInt(editedJob?.sqFt) || 0
                          ;(editedJob?.lineItems || []).forEach((item: any) => {
                            const productId = typeof item.product === 'object' ? item.product?.id : item.product
                            const product = products.find(p => p.id === parseInt(productId))
                            if (product) {
                              const price = product.basePrice || 0
                              const multiplier = product.unitType === 'per-sq-ft' ? jobSqFt : item.quantity
                              total += price * multiplier
                            }
                          })
                          return total.toFixed(2)
                        })()}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Auto-calculated from products</p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">
                        ${(() => {
                          // Calculate from line items using the products list
                          let total = 0
                          const jobSqFt = parseInt((job as any).sqFt) || 0
                          console.log('Calculating total price...')
                          console.log('Job sqft:', jobSqFt)
                          console.log('Line items:', job.lineItems)
                          console.log('Products loaded:', products.length)
                          
                          if (job.lineItems && job.lineItems.length > 0) {
                            job.lineItems.forEach((item: any) => {
                              const productId = typeof item.product === 'object' ? item.product?.id : item.product
                              console.log('Looking for product ID:', productId)
                              const product = products.find(p => p.id === productId)
                              console.log('Found product:', product)
                              if (product?.basePrice) {
                                const price = product.basePrice
                                const multiplier = product.unitType === 'per-sq-ft' ? jobSqFt : (item.quantity || 1)
                                const itemTotal = price * multiplier
                                console.log(`${product.name}: ${price} x ${multiplier} (${product.unitType === 'per-sq-ft' ? 'sqft' : 'qty'}) = ${itemTotal}`)
                                total += itemTotal
                              }
                            })
                          }
                          console.log('Final total:', total)
                          // Fall back to stored totalPrice if calculation fails
                          return total > 0 ? total.toFixed(2) : ((job as any).totalPrice?.toFixed(2) || '0.00')
                        })()}
                      </p>
                      {job.lineItems && job.lineItems.length > 0 && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Calculated from products</p>
                      )}
                    </div>
                  )}
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Capture Payout</label>
                  {editMode ? (
                    <input
                      type="number"
                      step="0.01"
                      value={editedJob?.vendorPrice || ''}
                      onChange={(e) => setEditedJob({...editedJob, vendorPrice: parseFloat(e.target.value) || 0})}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="0.00"
                    />
                  ) : (
                    <p className="text-xl font-bold text-gray-900 dark:text-white">
                      ${((job as any).vendorPrice?.toFixed(2) || '0.00')}
                    </p>
                  )}
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Travel Payout</label>
                  {editMode ? (
                    <input
                      type="number"
                      step="0.01"
                      value={editedJob?.travelPayout || ''}
                      onChange={(e) => setEditedJob({...editedJob, travelPayout: parseFloat(e.target.value) || 0})}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="0.00"
                    />
                  ) : (
                    <p className="text-xl font-bold text-gray-900 dark:text-white">
                      ${((job as any).travelPayout?.toFixed(2) || '0.00')}
                    </p>
                  )}
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Off-Hours Payout</label>
                  {editMode ? (
                    <input
                      type="number"
                      step="0.01"
                      value={editedJob?.offHoursPayout || ''}
                      onChange={(e) => setEditedJob({...editedJob, offHoursPayout: parseFloat(e.target.value) || 0})}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="0.00"
                    />
                  ) : (
                    <p className="text-xl font-bold text-gray-900 dark:text-white">
                      ${((job as any).offHoursPayout?.toFixed(2) || '0.00')}
                    </p>
                  )}
                </div>
              </div>
              
              <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold text-gray-900 dark:text-white">Total Tech Payout</span>
                  <span className="text-2xl font-bold text-green-600 dark:text-green-400">
                    ${(
                      ((editMode ? editedJob?.vendorPrice : (job as any).vendorPrice) || 0) +
                      ((editMode ? editedJob?.travelPayout : (job as any).travelPayout) || 0) +
                      ((editMode ? editedJob?.offHoursPayout : (job as any).offHoursPayout) || 0)
                    ).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'workflow' && (
          <div className="space-y-6">
            {/* Workflow Type Selection */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Workflow Type</h2>
              {editMode ? (
                <div className="space-y-4">
                  <select
                    value={(editedJob as any)?.workflowType || ''}
                    onChange={(e) => {
                      const workflowType = e.target.value
                      const steps = getWorkflowSteps(workflowType).map(step => ({
                        stepName: step.name,
                        completed: false,
                        completedAt: null,
                        completedBy: null,
                        notes: ''
                      }))
                      setEditedJob({
                        ...editedJob,
                        workflowType,
                        workflowSteps: steps
                      })
                    }}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="">Select Workflow...</option>
                    {Object.values(workflowTemplates).map((template) => (
                      <option key={template.id} value={template.id}>
                        {template.name}
                      </option>
                    ))}
                  </select>
                  {(editedJob as any)?.workflowType && (
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {workflowTemplates[(editedJob as any).workflowType]?.description}
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  {(job as any).workflowType ? (
                    <div>
                      <p className="text-lg font-medium text-gray-900 dark:text-white">
                        {workflowTemplates[(job as any).workflowType]?.name || (job as any).workflowType}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {workflowTemplates[(job as any).workflowType]?.description}
                      </p>
                    </div>
                  ) : (
                    <p className="text-gray-400 italic">No workflow assigned</p>
                  )}
                </div>
              )}
            </div>

            {/* Workflow Progress */}
            {((job as any).workflowType || (editedJob as any)?.workflowType) && (() => {
              // Get current workflow type
              const currentWorkflowType = editMode ? (editedJob as any)?.workflowType : (job as any).workflowType
              
              // Get or generate workflow steps
              let workflowSteps = editMode ? (editedJob as any)?.workflowSteps : (job as any).workflowSteps
              
              // If no steps exist but we have a workflow type, generate them from template
              if ((!workflowSteps || workflowSteps.length === 0) && currentWorkflowType) {
                workflowSteps = getWorkflowSteps(currentWorkflowType).map(step => ({
                  stepName: step.name,
                  completed: false,
                  completedAt: null,
                  completedBy: null,
                  notes: ''
                }))
              }
              
              return workflowSteps && workflowSteps.length > 0 ? (
                <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Workflow Progress</h2>
                  <div className="space-y-3">
                    {workflowSteps.map((step: any, index: number) => {
                      const templateStep = currentWorkflowType ? getWorkflowSteps(currentWorkflowType)[index] : null

                    return (
                      <div
                        key={index}
                        className={`flex items-start gap-4 p-4 rounded-lg border-2 transition-all ${
                          step.completed
                            ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                            : 'bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700'
                        }`}
                      >
                        {editMode ? (
                          <input
                            type="checkbox"
                            checked={step.completed || false}
                            onChange={(e) => {
                              const newSteps = [...(editedJob as any).workflowSteps]
                              newSteps[index] = {
                                ...newSteps[index],
                                completed: e.target.checked,
                                completedAt: e.target.checked ? new Date().toISOString() : null,
                                completedBy: e.target.checked ? user?.email : null
                              }
                              setEditedJob({...editedJob, workflowSteps: newSteps})
                            }}
                            className="mt-1 w-5 h-5 text-green-600 rounded focus:ring-2 focus:ring-green-500"
                          />
                        ) : (
                          <div className={`mt-1 w-5 h-5 rounded border-2 flex items-center justify-center ${
                            step.completed
                              ? 'bg-green-600 border-green-600'
                              : 'border-gray-300 dark:border-gray-600'
                          }`}>
                            {step.completed && (
                              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </div>
                        )}
                        <div className="flex-1">
                          <div className="flex items-start justify-between">
                            <div>
                              <h3 className={`font-semibold ${
                                step.completed
                                  ? 'text-green-900 dark:text-green-100'
                                  : 'text-gray-900 dark:text-white'
                              }`}>
                                {step.stepName}
                              </h3>
                              {templateStep?.description && (
                                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                  {templateStep.description}
                                </p>
                              )}
                              {templateStep?.assignedRole && (
                                <span className="inline-block mt-2 px-2 py-1 text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded">
                                  {templateStep.assignedRole.replace('-', ' ')}
                                </span>
                              )}
                            </div>
                            {step.completed && step.completedAt && (
                              <div className="text-right text-sm">
                                <p className="text-gray-600 dark:text-gray-400">
                                  {new Date(step.completedAt).toLocaleDateString()}
                                </p>
                                {step.completedBy && (
                                  <p className="text-gray-500 dark:text-gray-500 text-xs">
                                    by {step.completedBy}
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                          {step.notes && (
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 italic">
                              Note: {step.notes}
                            </p>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
                
                {/* Progress Summary */}
                <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-semibold text-gray-900 dark:text-white">Progress</span>
                    <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                      {(() => {
                        const steps = editMode ? (editedJob as any)?.workflowSteps : (job as any).workflowSteps
                        const completed = steps?.filter((s: any) => s.completed).length || 0
                        const total = steps?.length || 0
                        const percentage = total > 0 ? Math.round((completed / total) * 100) : 0
                        return `${completed}/${total} (${percentage}%)`
                      })()}
                    </span>
                  </div>
                  <div className="mt-3 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                    <div
                      className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                      style={{
                        width: `${(() => {
                          const steps = editMode ? (editedJob as any)?.workflowSteps : (job as any).workflowSteps
                          const completed = steps?.filter((s: any) => s.completed).length || 0
                          const total = steps?.length || 0
                          return total > 0 ? (completed / total) * 100 : 0
                        })()}%`
                      }}
                    />
                  </div>
                </div>
              </div>
              ) : null
            })()}
          </div>
        )}

        {activeTab === 'deliverables' && (
          <div className="space-y-6">
            {/* Deliverables Section */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Client Deliverables & Assets</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                Links to final deliverables. These will be accessible to clients in their portal.
              </p>
              
              <div className="space-y-4">
                {/* 3D Model Link */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    🏢 3D Model Link
                  </label>
                  {editMode ? (
                    <input
                      type="text"
                      value={(editedJob as any)?.deliverables?.model3dLink || ''}
                      onChange={(e) => setEditedJob({
                        ...editedJob,
                        deliverables: { ...(editedJob as any)?.deliverables, model3dLink: e.target.value }
                      })}
                      placeholder="https://my.matterport.com/show/?m=..."
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  ) : (
                    <div>
                      {(job as any)?.deliverables?.model3dLink ? (
                        <a
                          href={(job as any).deliverables.model3dLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 dark:text-blue-400 hover:underline break-all"
                        >
                          {(job as any).deliverables.model3dLink}
                        </a>
                      ) : (
                        <p className="text-gray-400 italic">No link provided</p>
                      )}
                    </div>
                  )}
                </div>

                {/* Floor Plans Link */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    📐 Floor Plans Link
                  </label>
                  {editMode ? (
                    <input
                      type="text"
                      value={(editedJob as any)?.deliverables?.floorPlansLink || ''}
                      onChange={(e) => setEditedJob({
                        ...editedJob,
                        deliverables: { ...(editedJob as any)?.deliverables, floorPlansLink: e.target.value }
                      })}
                      placeholder="https://drive.google.com/... or https://dropbox.com/..."
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  ) : (
                    <div>
                      {(job as any)?.deliverables?.floorPlansLink ? (
                        <a
                          href={(job as any).deliverables.floorPlansLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 dark:text-blue-400 hover:underline break-all"
                        >
                          {(job as any).deliverables.floorPlansLink}
                        </a>
                      ) : (
                        <p className="text-gray-400 italic">No link provided</p>
                      )}
                    </div>
                  )}
                </div>

                {/* Photos/Videos Link */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    📸 Photos/Videos Link
                  </label>
                  {editMode ? (
                    <input
                      type="text"
                      value={(editedJob as any)?.deliverables?.photosVideosLink || ''}
                      onChange={(e) => setEditedJob({
                        ...editedJob,
                        deliverables: { ...(editedJob as any)?.deliverables, photosVideosLink: e.target.value }
                      })}
                      placeholder="https://drive.google.com/... or https://dropbox.com/..."
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  ) : (
                    <div>
                      {(job as any)?.deliverables?.photosVideosLink ? (
                        <a
                          href={(job as any).deliverables.photosVideosLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 dark:text-blue-400 hover:underline break-all"
                        >
                          {(job as any).deliverables.photosVideosLink}
                        </a>
                      ) : (
                        <p className="text-gray-400 italic">No link provided</p>
                      )}
                    </div>
                  )}
                </div>

                {/* As-Builts Link */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    📋 As-Built Files Link
                  </label>
                  {editMode ? (
                    <input
                      type="text"
                      value={(editedJob as any)?.deliverables?.asBuiltsLink || ''}
                      onChange={(e) => setEditedJob({
                        ...editedJob,
                        deliverables: { ...(editedJob as any)?.deliverables, asBuiltsLink: e.target.value }
                      })}
                      placeholder="https://drive.google.com/... or https://dropbox.com/..."
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  ) : (
                    <div>
                      {(job as any)?.deliverables?.asBuiltsLink ? (
                        <a
                          href={(job as any).deliverables.asBuiltsLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 dark:text-blue-400 hover:underline break-all"
                        >
                          {(job as any).deliverables.asBuiltsLink}
                        </a>
                      ) : (
                        <p className="text-gray-400 italic">No link provided</p>
                      )}
                    </div>
                  )}
                </div>

                {/* Other Assets Link */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    📦 Other Assets Link
                  </label>
                  {editMode ? (
                    <input
                      type="text"
                      value={(editedJob as any)?.deliverables?.otherAssetsLink || ''}
                      onChange={(e) => setEditedJob({
                        ...editedJob,
                        deliverables: { ...(editedJob as any)?.deliverables, otherAssetsLink: e.target.value }
                      })}
                      placeholder="https://..."
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  ) : (
                    <div>
                      {(job as any)?.deliverables?.otherAssetsLink ? (
                        <a
                          href={(job as any).deliverables.otherAssetsLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 dark:text-blue-400 hover:underline break-all"
                        >
                          {(job as any).deliverables.otherAssetsLink}
                        </a>
                      ) : (
                        <p className="text-gray-400 italic">No link provided</p>
                      )}
                    </div>
                  )}
                </div>

                {/* Delivery Notes */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    📝 Delivery Notes
                  </label>
                  {editMode ? (
                    <textarea
                      value={(editedJob as any)?.deliverables?.deliveryNotes || ''}
                      onChange={(e) => setEditedJob({
                        ...editedJob,
                        deliverables: { ...(editedJob as any)?.deliverables, deliveryNotes: e.target.value }
                      })}
                      rows={3}
                      placeholder="Internal notes about the deliverables..."
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  ) : (
                    <div>
                      {(job as any)?.deliverables?.deliveryNotes ? (
                        <p className="text-gray-900 dark:text-white whitespace-pre-wrap">
                          {(job as any).deliverables.deliveryNotes}
                        </p>
                      ) : (
                        <p className="text-gray-400 italic">No notes</p>
                      )}
                    </div>
                  )}
                </div>

                {/* Delivered Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    📅 Date Delivered
                  </label>
                  {editMode ? (
                    <input
                      type="date"
                      value={(editedJob as any)?.deliverables?.deliveredDate?.split('T')[0] || ''}
                      onChange={(e) => setEditedJob({
                        ...editedJob,
                        deliverables: { ...(editedJob as any)?.deliverables, deliveredDate: e.target.value }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  ) : (
                    <div>
                      {(job as any)?.deliverables?.deliveredDate ? (
                        <p className="text-gray-900 dark:text-white">
                          {new Date((job as any).deliverables.deliveredDate).toLocaleDateString()}
                        </p>
                      ) : (
                        <p className="text-gray-400 italic">Not delivered yet</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
