'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'

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
  const [activeTab, setActiveTab] = useState<'details' | 'instructions' | 'tech-feedback' | 'qc' | 'financials'>('details')

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
    } catch (error) {
      console.error('Error fetching job:', error)
    } finally {
      setLoading(false)
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
          <p className="text-gray-600 dark:text-gray-400 mb-4">The job you're looking for doesn't exist.</p>
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
              <button
                onClick={() => router.push(`/admin/collections/jobs/${job.id}`)}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors"
              >
                Edit in Admin
              </button>
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
              <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                job.status === 'completed' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' :
                job.status === 'in-progress' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300' :
                job.status === 'scheduled' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' :
                'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
              }`}>
                {job.status || 'pending'}
              </span>
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
                  <p className="text-gray-900 dark:text-white">{job.jobId || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Model Name</label>
                  <p className="text-gray-900 dark:text-white">{job.modelName || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Target Date</label>
                  <p className="text-gray-900 dark:text-white">
                    {job.targetDate ? new Date(job.targetDate).toLocaleString() : 'N/A'}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Status</label>
                  <p className="text-gray-900 dark:text-white capitalize">{job.status || 'pending'}</p>
                </div>
              </div>
            </div>

            {/* Client Info */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Client Information</h2>
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Client</label>
                  <p className="text-gray-900 dark:text-white">{job.client?.name || 'N/A'}</p>
                </div>
                {job.endClient && (
                  <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">End Client</label>
                    <p className="text-gray-900 dark:text-white">{job.endClient?.name || 'N/A'}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Location */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Location</h2>
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Address</label>
                  <p className="text-gray-900 dark:text-white">{job.captureAddress || 'N/A'}</p>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">City</label>
                    <p className="text-gray-900 dark:text-white">{job.city || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">State</label>
                    <p className="text-gray-900 dark:text-white">{job.state || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">ZIP</label>
                    <p className="text-gray-900 dark:text-white">{job.zipCode || 'N/A'}</p>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Region</label>
                  <p className="text-gray-900 dark:text-white capitalize">{job.region?.replace('-', ' ') || 'N/A'}</p>
                </div>
              </div>
            </div>

            {/* Tech Assignment */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Tech Assignment</h2>
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Assigned Tech</label>
                  <p className="text-gray-900 dark:text-white">
                    {job.tech?.name || <span className="text-gray-400 italic">Unassigned</span>}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'instructions' && (
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Tech Instructions</h2>
            <div className="prose dark:prose-invert max-w-none">
              {job.techInstructions ? (
                <pre className="whitespace-pre-wrap text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">
                  {job.techInstructions}
                </pre>
              ) : (
                <p className="text-gray-400 italic">No instructions provided</p>
              )}
            </div>

            {job.lineItems && job.lineItems.length > 0 && (
              <div className="mt-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Line Items</h3>
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
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Tech Feedback & Completion</h2>
            <div className="space-y-6">
              {/* Completion Status */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Assigned Tech</label>
                  <p className="text-gray-900 dark:text-white font-medium">
                    {job.tech?.name || <span className="text-gray-400 italic">Unassigned</span>}
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

              {/* Upload Links */}
              {((job as any).uploadLink || (job as any).mediaUploadLink) && (
                <div>
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

              {/* Scheduling Notes (can include tech feedback) */}
              {(job as any).schedulingNotes && (
                <div>
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-400 block mb-2">
                    Scheduling Notes / Tech Feedback
                  </label>
                  <pre className="whitespace-pre-wrap text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">
                    {(job as any).schedulingNotes}
                  </pre>
                </div>
              )}

              {/* Placeholder for future tech feedback fields */}
              {!job.tech && !(job as any).scannedDate && !(job as any).schedulingNotes && (
                <div className="text-center py-8">
                  <div className="text-gray-400 dark:text-gray-500 mb-2">
                    <svg className="w-16 h-16 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <p className="text-gray-500 dark:text-gray-400">
                    No tech feedback available yet
                  </p>
                  <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                    Tech feedback will appear here once the job is assigned and completed
                  </p>
                </div>
              )}
            </div>
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
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Financial Information</h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Payout</label>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  ${job.totalPayout?.toFixed(2) || '0.00'}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
