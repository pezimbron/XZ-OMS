'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'

type JobTemplate = {
  id: string | number
  name: string
  client?: {
    id: string | number
    companyName?: string
    name?: string
  }
  isActive: boolean
  defaultWorkflow?: {
    id: string | number
    name: string
  }
  defaultProducts?: any[]
  defaultPricing?: number
}

export default function JobTemplatesPage() {
  const [user, setUser] = useState<any>(null)
  const [loadingUser, setLoadingUser] = useState(true)
  const [templates, setTemplates] = useState<JobTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'general' | 'client-specific'>('all')

  const canAccess = user?.role && ['super-admin', 'sales-admin', 'ops-manager'].includes(user.role)

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await fetch('/api/users/me')
        const data = await response.json()
        setUser(data.user)
      } catch (e) {
        setUser(null)
      } finally {
        setLoadingUser(false)
      }
    }

    fetchUser()
  }, [])

  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const response = await fetch('/api/job-templates?limit=1000&depth=2')
        const data = await response.json()
        setTemplates(Array.isArray(data.docs) ? data.docs : [])
      } catch {
        setTemplates([])
      } finally {
        setLoading(false)
      }
    }

    if (canAccess) {
      fetchTemplates()
    }
  }, [canAccess])

  const filteredTemplates = templates.filter((t) => {
    if (filter === 'general') return !t.client
    if (filter === 'client-specific') return !!t.client
    return true
  })

  if (loadingUser) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-gray-700 dark:text-gray-300">Loading...</div>
      </div>
    )
  }

  if (!canAccess) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-3xl mx-auto p-6">
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Job Templates</h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">You don&apos;t have permission to manage job templates.</p>
            <div className="mt-4">
              <Link href="/oms/jobs" className="text-blue-600 dark:text-blue-400 hover:underline">
                Back to Jobs
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="px-8 py-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Job Templates</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">Manage job creation templates</p>
          </div>
          <div className="flex gap-3">
            <Link
              href="/oms/job-templates/create"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              Create Template
            </Link>
            <Link
              href="/oms/jobs"
              className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors"
            >
              Back to Jobs
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-8">
        <div className="mb-6 flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            All ({templates.length})
          </button>
          <button
            onClick={() => setFilter('general')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'general'
                ? 'bg-blue-600 text-white'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            General ({templates.filter((t) => !t.client).length})
          </button>
          <button
            onClick={() => setFilter('client-specific')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'client-specific'
                ? 'bg-blue-600 text-white'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            Client-Specific ({templates.filter((t) => t.client).length})
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-600 dark:text-gray-400">Loading templates...</div>
        ) : filteredTemplates.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-12 text-center">
            <p className="text-gray-600 dark:text-gray-400 mb-4">No templates found</p>
            <Link
              href="/oms/job-templates/create"
              className="inline-block px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              Create Your First Template
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTemplates.map((template) => (
              <Link
                key={String(template.id)}
                href={`/oms/job-templates/${template.id}`}
                className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 hover:border-blue-500 dark:hover:border-blue-400 transition-colors"
              >
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{template.name}</h3>
                  {template.isActive ? (
                    <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 text-xs font-medium rounded">
                      Active
                    </span>
                  ) : (
                    <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300 text-xs font-medium rounded">
                      Inactive
                    </span>
                  )}
                </div>

                {template.client && (
                  <p className="text-sm text-blue-600 dark:text-blue-400 mb-2">
                    {template.client.companyName || template.client.name || 'Client-Specific'}
                  </p>
                )}

                <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                  {template.defaultWorkflow && (
                    <p>📋 Workflow: {template.defaultWorkflow.name}</p>
                  )}
                  {template.defaultProducts && template.defaultProducts.length > 0 && (
                    <p>📦 {template.defaultProducts.length} product(s)</p>
                  )}
                  {template.defaultPricing && (
                    <p>💰 ${template.defaultPricing}</p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
