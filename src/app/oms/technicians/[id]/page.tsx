'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { normalizeRelationId } from '@/lib/oms/normalizeRelationId'

interface Technician {
  id: string
  name: string
  email: string
  phone?: string
  type: 'commission' | 'w2' | 'partner'
  vendor?: { id: string; companyName: string } | string | number
  baseCommissionRate?: number
  active: boolean
}

interface Vendor {
  id: string
  companyName: string
}

interface Job {
  id: string
  jobId: string
  modelName: string
  targetDate: string
  status: string
  city?: string
}

export default function TechnicianDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [technician, setTechnician] = useState<Technician | null>(null)
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    type: 'commission' as string,
    vendor: '',
    baseCommissionRate: '' as string | number,
    active: true,
  })

  useEffect(() => {
    if (params.id) {
      fetchTechnician(params.id as string)
      fetchTechnicianJobs(params.id as string)
    }
    fetchVendors()
  }, [params.id])

  const fetchVendors = async () => {
    try {
      const response = await fetch('/api/vendors?limit=1000')
      const data = await response.json()
      setVendors(data.docs || [])
    } catch (error) {
      console.error('Error fetching vendors:', error)
    }
  }

  const fetchTechnician = async (id: string) => {
    try {
      const response = await fetch(`/api/technicians/${id}`)
      const data = await response.json()
      setTechnician(data)
      setFormData({
        name: data.name || '',
        email: data.email || '',
        phone: data.phone || '',
        type: data.type || 'commission',
        vendor: String(normalizeRelationId(data.vendor) ?? ''),
        baseCommissionRate: data.baseCommissionRate != null ? data.baseCommissionRate : '',
        active: data.active !== false,
      })
    } catch (error) {
      console.error('Error fetching technician:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchTechnicianJobs = async (techId: string) => {
    try {
      const response = await fetch(`/api/jobs?where[tech][equals]=${techId}&limit=100&depth=1`)
      const data = await response.json()
      setJobs(data.docs || [])
    } catch (error) {
      console.error('Error fetching technician jobs:', error)
    }
  }

  const handleSave = async () => {
    setIsSaving(true)
    setError(null)
    try {
      const payload: any = {
        name: formData.name,
        email: formData.email,
        type: formData.type,
        active: formData.active,
      }

      if (formData.phone) {
        payload.phone = formData.phone
      } else {
        payload.phone = null
      }

      if (formData.type === 'partner' && formData.vendor) {
        payload.vendor = normalizeRelationId(formData.vendor)
      } else {
        payload.vendor = null
      }

      if (formData.baseCommissionRate !== '') {
        payload.baseCommissionRate = parseFloat(String(formData.baseCommissionRate))
      } else {
        payload.baseCommissionRate = null
      }

      const response = await fetch(`/api/technicians/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.errors?.[0]?.message || 'Failed to save technician')
      }

      const data = await response.json()
      setTechnician(data.doc || data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    try {
      const response = await fetch(`/api/technicians/${params.id}`, { method: 'DELETE' })
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.errors?.[0]?.message || 'Failed to delete technician')
      }
      router.push('/oms/technicians')
    } catch (err: any) {
      setError(err.message)
      setShowDeleteConfirm(false)
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
          <p className="text-lg font-medium text-gray-700 dark:text-gray-300">Loading technician...</p>
        </div>
      </div>
    )
  }

  if (!technician) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Technician Not Found</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">The technician you&apos;re looking for doesn&apos;t exist.</p>
          <Link href="/oms/technicians" className="text-blue-600 hover:text-blue-700 dark:text-blue-400">
            Back to Technicians
          </Link>
        </div>
      </div>
    )
  }

  const upcomingJobs = jobs.filter(job => new Date(job.targetDate) >= new Date() && job.status !== 'completed')
  const completedJobs = jobs.filter(job => job.status === 'completed')

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-md w-full mx-4 shadow-xl border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Delete Technician</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Are you sure you want to delete <strong className="text-gray-900 dark:text-white">{technician.name}</strong>? This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="px-8 py-6">
          <div className="flex items-center justify-between mb-4">
            <Link
              href="/oms/technicians"
              className="text-blue-600 hover:text-blue-700 dark:text-blue-400 flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Technicians
            </Link>
            <div className="flex gap-3">
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg font-medium transition-colors"
              >
                {isSaving ? 'Saving...' : 'Save'}
              </button>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center flex-shrink-0">
              <span className="text-3xl">🔧</span>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{technician.name}</h1>
              <span className={`inline-block mt-1 px-3 py-1 rounded-full text-sm font-semibold ${
                technician.active !== false
                  ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                  : 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300'
              }`}>
                {technician.active !== false ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mx-8 mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}

      {/* Content */}
      <div className="p-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Form — left column */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Contact Information</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Email *</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Phone</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Type & Assignment</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Type *</label>
                  <select
                    required
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value, vendor: '' })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="commission">Commission-Based</option>
                    <option value="w2">W2 Employee</option>
                    <option value="partner">Outsourced Partner</option>
                  </select>
                </div>

                {formData.type === 'partner' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Vendor Company</label>
                    <select
                      value={formData.vendor}
                      onChange={(e) => setFormData({ ...formData, vendor: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      <option value="">Select Vendor...</option>
                      {vendors.map((v) => (
                        <option key={v.id} value={v.id}>{v.companyName}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Commission Rate (decimal, e.g. 0.5)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="1"
                    value={formData.baseCommissionRate}
                    onChange={(e) => setFormData({ ...formData, baseCommissionRate: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>

                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={formData.active}
                    onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Active</span>
                </label>
              </div>
            </div>
          </div>

          {/* Jobs — right column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Jobs</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{jobs.length}</p>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
                <p className="text-sm text-gray-600 dark:text-gray-400">Upcoming</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{upcomingJobs.length}</p>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
                <p className="text-sm text-gray-600 dark:text-gray-400">Completed</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{completedJobs.length}</p>
              </div>
            </div>

            {/* Upcoming Jobs */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Upcoming Jobs</h2>
              {upcomingJobs.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400 text-center py-4">No upcoming jobs</p>
              ) : (
                <div className="space-y-3">
                  {upcomingJobs.map((job) => (
                    <Link
                      key={job.id}
                      href={`/oms/jobs/${job.id}`}
                      className="block p-4 bg-gray-50 dark:bg-gray-900 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {job.jobId || job.modelName}
                          </p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {job.city || 'No location'}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {new Date(job.targetDate).toLocaleDateString()}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-500">
                            {new Date(job.targetDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Recent Completed Jobs */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Recent Completed Jobs</h2>
              {completedJobs.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400 text-center py-4">No completed jobs yet</p>
              ) : (
                <div className="space-y-3">
                  {completedJobs.slice(0, 5).map((job) => (
                    <Link
                      key={job.id}
                      href={`/oms/jobs/${job.id}`}
                      className="block p-4 bg-gray-50 dark:bg-gray-900 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {job.jobId || job.modelName}
                          </p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {job.city || 'No location'}
                          </p>
                        </div>
                        <span className="px-2 py-1 bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 text-xs rounded-full">
                          Completed
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
