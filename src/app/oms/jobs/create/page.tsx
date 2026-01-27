'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { AddressAutocomplete } from '@/components/oms/AddressAutocomplete'

type Client = {
  id: string | number
  name?: string
  companyName?: string
}

export default function OmsCreateJobPage() {
  const router = useRouter()

  const [user, setUser] = useState<any>(null)
  const [loadingUser, setLoadingUser] = useState(true)

  const [clients, setClients] = useState<Client[]>([])
  const [loadingClients, setLoadingClients] = useState(true)

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string>('')

  const [form, setForm] = useState({
    modelName: '',
    client: '',
    captureAddress: '',
    city: '',
    state: 'TX',
    zip: '',
    targetDateLocal: '',
    status: 'scheduled',
  })

  const canAccess = user?.role && user.role !== 'tech'

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
    const fetchClients = async () => {
      try {
        const response = await fetch('/api/clients?limit=1000')
        const data = await response.json()
        setClients(Array.isArray(data.docs) ? data.docs : [])
      } catch {
        setClients([])
      } finally {
        setLoadingClients(false)
      }
    }

    fetchClients()
  }, [])

  useEffect(() => {
    if (!loadingUser && user?.role === 'tech') {
      router.replace('/oms/jobs')
    }
  }, [loadingUser, user, router])

  const clientOptions = useMemo(() => {
    return [...clients].sort((a, b) => {
      const aName = String(a.companyName || a.name || '')
      const bName = String(b.companyName || b.name || '')
      return aName.localeCompare(bName)
    })
  }, [clients])

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!canAccess) return

    setSubmitting(true)
    setError('')

    try {
      if (!form.modelName.trim()) throw new Error('Model Name is required')
      if (!form.client) throw new Error('Client is required')

      const payload: any = {
        modelName: form.modelName.trim(),
        client: parseInt(form.client),
        captureAddress: form.captureAddress.trim() || null,
        city: form.city.trim() || null,
        state: form.state.trim() || null,
        zip: form.zip.trim() || null,
        status: form.status,
      }

      if (form.targetDateLocal) {
        const d = new Date(form.targetDateLocal)
        if (!isNaN(d.getTime())) {
          payload.targetDate = d.toISOString()
        }
      }

      const response = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(data?.error || 'Failed to create job')
      }

      const newJobId = data?.doc?.id ?? data?.id
      if (!newJobId) {
        throw new Error('Job created but no id was returned')
      }

      router.push(`/oms/jobs/${newJobId}`)
    } catch (err: any) {
      setError(err?.message || 'Failed to create job')
    } finally {
      setSubmitting(false)
    }
  }

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
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Manual Create</h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">You don&apos;t have permission to create jobs.</p>
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
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Create Job</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">Manual job creation in OMS</p>
          </div>
          <Link
            href="/oms/jobs"
            className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors"
          >
            Back
          </Link>
        </div>
      </div>

      <div className="max-w-3xl mx-auto p-8">
        <form onSubmit={onSubmit} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 space-y-4">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 text-sm text-red-700 dark:text-red-300">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Model Name</label>
              <input
                value={form.modelName}
                onChange={(e) => setForm((p) => ({ ...p, modelName: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="e.g. 3D Scan"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Client</label>
              <select
                value={form.client}
                onChange={(e) => setForm((p) => ({ ...p, client: e.target.value }))}
                disabled={loadingClients}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="">{loadingClients ? 'Loading clients...' : 'Select a client'}</option>
                {clientOptions.map((c) => {
                  const label = String(c.companyName || c.name || c.id)
                  return (
                    <option key={String(c.id)} value={String(c.id)}>
                      {label}
                    </option>
                  )
                })}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Capture Address</label>
            <AddressAutocomplete
              value={form.captureAddress}
              onChange={(next) => setForm((p) => ({ ...p, captureAddress: next }))}
              onSelect={(parsed) => {
                setForm((p) => ({
                  ...p,
                  captureAddress: parsed.addressLine1 || p.captureAddress,
                  city: parsed.city || p.city,
                  state: parsed.state || p.state,
                  zip: parsed.zip || p.zip,
                }))
              }}
              placeholder="Start typing an address..."
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">City</label>
              <input
                value={form.city}
                onChange={(e) => setForm((p) => ({ ...p, city: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">State</label>
              <input
                value={form.state}
                onChange={(e) => setForm((p) => ({ ...p, state: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Zip</label>
              <input
                value={form.zip}
                onChange={(e) => setForm((p) => ({ ...p, zip: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Target Date</label>
              <input
                type="datetime-local"
                value={form.targetDateLocal}
                onChange={(e) => setForm((p) => ({ ...p, targetDateLocal: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
              <select
                value={form.status}
                onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="request">Request</option>
                <option value="scheduled">Scheduled</option>
                <option value="scanned">Scanned</option>
                <option value="qc">QC</option>
                <option value="done">Done</option>
                <option value="archived">Archived</option>
              </select>
            </div>
          </div>

          <div className="pt-2 flex gap-3">
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Creating...' : 'Create Job'}
            </button>
            <Link
              href="/oms/jobs"
              className="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors"
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}
