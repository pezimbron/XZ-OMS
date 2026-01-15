'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'

interface Technician {
  id: string
  name: string
  email?: string
  phone?: string
  status?: string
  specialties?: string[]
  certifications?: string[]
  createdAt: string
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
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (params.id) {
      fetchTechnician(params.id as string)
      fetchTechnicianJobs(params.id as string)
    }
  }, [params.id])

  const fetchTechnician = async (id: string) => {
    try {
      const response = await fetch(`/api/technicians/${id}`)
      const data = await response.json()
      setTechnician(data)
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
          <p className="text-gray-600 dark:text-gray-400 mb-4">The technician you're looking for doesn't exist.</p>
          <Link href="/oms/technicians" className="text-blue-600 hover:text-blue-700 dark:text-blue-400">
            ← Back to Technicians
          </Link>
        </div>
      </div>
    )
  }

  const upcomingJobs = jobs.filter(job => new Date(job.targetDate) >= new Date() && job.status !== 'completed')
  const completedJobs = jobs.filter(job => job.status === 'completed')

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="px-8 py-6">
          <div className="flex items-center justify-between mb-4">
            <Link
              href="/oms/technicians"
              className="text-blue-600 hover:text-blue-700 dark:text-blue-400 flex items-center gap-2"
            >
              ← Back to Technicians
            </Link>
            <button
              onClick={() => router.push(`/admin/collections/technicians/${technician.id}`)}
              className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors"
            >
              Edit in Admin
            </button>
          </div>
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center flex-shrink-0">
              <span className="text-3xl">🔧</span>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                  {technician.name}
                </h1>
                {technician.status && (
                  <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                    technician.status === 'active' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' :
                    technician.status === 'on-leave' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' :
                    'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300'
                  }`}>
                    {technician.status}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Profile Information */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Contact Information</h2>
              <div className="space-y-3">
                {technician.email && (
                  <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Email</label>
                    <p className="text-gray-900 dark:text-white">
                      <a href={`mailto:${technician.email}`} className="text-blue-600 hover:text-blue-700 dark:text-blue-400">
                        {technician.email}
                      </a>
                    </p>
                  </div>
                )}
                {technician.phone && (
                  <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Phone</label>
                    <p className="text-gray-900 dark:text-white">
                      <a href={`tel:${technician.phone}`} className="text-blue-600 hover:text-blue-700 dark:text-blue-400">
                        {technician.phone}
                      </a>
                    </p>
                  </div>
                )}
              </div>
            </div>

            {technician.specialties && technician.specialties.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Specialties</h2>
                <div className="flex flex-wrap gap-2">
                  {technician.specialties.map((specialty, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 text-sm rounded-full"
                    >
                      {specialty}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {technician.certifications && technician.certifications.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Certifications</h2>
                <ul className="space-y-2">
                  {technician.certifications.map((cert, idx) => (
                    <li key={idx} className="flex items-center gap-2 text-gray-900 dark:text-white">
                      <span className="text-green-500">✓</span>
                      {cert}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Jobs & Schedule */}
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
