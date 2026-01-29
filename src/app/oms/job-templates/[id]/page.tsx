'use client'

import React, { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'

type Client = {
  id: string | number
  name?: string
  companyName?: string
}

type WorkflowTemplate = {
  id: string | number
  name: string
}

type Product = {
  id: string | number
  name: string
  basePrice?: number
}

type JobTemplate = {
  id: string | number
  name: string
  client?: any
  isActive: boolean
  defaultWorkflow?: any
  defaultProducts?: any[]
  defaultInstructions?: string
  defaultPricing?: number
  requiredFields?: string[]
}

export default function EditJobTemplatePage() {
  const params = useParams()
  const router = useRouter()
  const templateId = params?.id

  const [user, setUser] = useState<any>(null)
  const [loadingUser, setLoadingUser] = useState(true)

  const [template, setTemplate] = useState<JobTemplate | null>(null)
  const [loadingTemplate, setLoadingTemplate] = useState(true)

  const [clients, setClients] = useState<Client[]>([])
  const [workflows, setWorkflows] = useState<WorkflowTemplate[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loadingData, setLoadingData] = useState(true)

  const [submitting, setSubmitting] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string>('')
  const [success, setSuccess] = useState<string>('')

  const [form, setForm] = useState({
    name: '',
    client: '',
    isActive: true,
    defaultWorkflow: '',
    defaultProducts: [] as string[],
    defaultInstructions: '',
    defaultPricing: '',
    requiredFields: [] as string[],
  })

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
    const fetchTemplate = async () => {
      if (!templateId) return

      try {
        const response = await fetch(`/api/job-templates/${templateId}?depth=2`)
        const data = await response.json()
        setTemplate(data)

        // Populate form
        setForm({
          name: data.name || '',
          client: data.client ? String(typeof data.client === 'object' ? data.client.id : data.client) : '',
          isActive: data.isActive ?? true,
          defaultWorkflow: data.defaultWorkflow ? String(typeof data.defaultWorkflow === 'object' ? data.defaultWorkflow.id : data.defaultWorkflow) : '',
          defaultProducts: data.defaultProducts ? data.defaultProducts.map((p: any) => String(typeof p === 'object' ? p.id : p)) : [],
          defaultInstructions: data.defaultInstructions || '',
          defaultPricing: data.defaultPricing ? String(data.defaultPricing) : '',
          requiredFields: data.requiredFields || [],
        })
      } catch {
        setError('Failed to load template')
      } finally {
        setLoadingTemplate(false)
      }
    }

    if (canAccess) {
      fetchTemplate()
    }
  }, [templateId, canAccess])

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [clientsRes, workflowsRes, productsRes] = await Promise.all([
          fetch('/api/clients?limit=1000'),
          fetch('/api/workflow-templates?limit=1000'),
          fetch('/api/products?limit=1000'),
        ])

        const [clientsData, workflowsData, productsData] = await Promise.all([
          clientsRes.json(),
          workflowsRes.json(),
          productsRes.json(),
        ])

        setClients(Array.isArray(clientsData.docs) ? clientsData.docs : [])
        setWorkflows(Array.isArray(workflowsData.docs) ? workflowsData.docs : [])
        setProducts(Array.isArray(productsData.docs) ? productsData.docs : [])
      } catch {
        setClients([])
        setWorkflows([])
        setProducts([])
      } finally {
        setLoadingData(false)
      }
    }

    if (canAccess) {
      fetchData()
    }
  }, [canAccess])

  const handleProductToggle = (productId: string) => {
    setForm((prev) => ({
      ...prev,
      defaultProducts: prev.defaultProducts.includes(productId)
        ? prev.defaultProducts.filter((id) => id !== productId)
        : [...prev.defaultProducts, productId],
    }))
  }

  const handleRequiredFieldToggle = (field: string) => {
    setForm((prev) => ({
      ...prev,
      requiredFields: prev.requiredFields.includes(field)
        ? prev.requiredFields.filter((f) => f !== field)
        : [...prev.requiredFields, field],
    }))
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!canAccess || !templateId) return

    setSubmitting(true)
    setError('')
    setSuccess('')

    try {
      if (!form.name.trim()) throw new Error('Template Name is required')
      if (!form.defaultWorkflow) throw new Error('Default Workflow is required')

      const payload: any = {
        name: form.name.trim(),
        client: form.client ? parseInt(form.client) : null,
        isActive: form.isActive,
        defaultWorkflow: parseInt(form.defaultWorkflow),
        defaultProducts: form.defaultProducts.map((id) => parseInt(id)),
        defaultInstructions: form.defaultInstructions.trim() || null,
        defaultPricing: form.defaultPricing ? parseFloat(form.defaultPricing) : null,
        requiredFields: form.requiredFields,
      }

      const response = await fetch(`/api/job-templates/${templateId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(data?.error || 'Failed to update template')
      }

      setSuccess('Template updated successfully')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err: any) {
      setError(err?.message || 'Failed to update template')
    } finally {
      setSubmitting(false)
    }
  }

  const onDelete = async () => {
    if (!canAccess || !templateId) return
    if (!confirm('Are you sure you want to delete this template? This action cannot be undone.')) return

    setDeleting(true)
    setError('')

    try {
      const response = await fetch(`/api/job-templates/${templateId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete template')
      }

      router.push('/oms/job-templates')
    } catch (err: any) {
      setError(err?.message || 'Failed to delete template')
      setDeleting(false)
    }
  }

  if (loadingUser || loadingTemplate) {
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
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Edit Job Template</h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">You don&apos;t have permission to edit job templates.</p>
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

  if (!template) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-3xl mx-auto p-6">
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Template Not Found</h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">The template you&apos;re looking for doesn&apos;t exist.</p>
            <div className="mt-4">
              <Link href="/oms/job-templates" className="text-blue-600 dark:text-blue-400 hover:underline">
                Back to Templates
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
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Edit Job Template</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">{template.name}</p>
          </div>
          <Link
            href="/oms/job-templates"
            className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors"
          >
            Back
          </Link>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-8">
        <form onSubmit={onSubmit} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 space-y-6">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 text-sm text-red-700 dark:text-red-300">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3 text-sm text-green-700 dark:text-green-300">
              {success}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Template Name <span className="text-red-500">*</span>
              </label>
              <input
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="e.g. Standard 3D Scan"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Client (Optional)
              </label>
              <select
                value={form.client}
                onChange={(e) => setForm((p) => ({ ...p, client: e.target.value }))}
                disabled={loadingData}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="">General Template</option>
                {clients.map((c) => (
                  <option key={String(c.id)} value={String(c.id)}>
                    {c.companyName || c.name || c.id}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Leave empty for general template, or select client for client-specific template
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Default Workflow <span className="text-red-500">*</span>
              </label>
              <select
                value={form.defaultWorkflow}
                onChange={(e) => setForm((p) => ({ ...p, defaultWorkflow: e.target.value }))}
                disabled={loadingData}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="">Select Workflow</option>
                {workflows.map((w) => (
                  <option key={String(w.id)} value={String(w.id)}>
                    {w.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Suggested Total Price
              </label>
              <input
                type="number"
                step="0.01"
                value={form.defaultPricing}
                onChange={(e) => setForm((p) => ({ ...p, defaultPricing: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="0.00"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Default Products
            </label>
            <div className="border border-gray-300 dark:border-gray-600 rounded-lg p-4 max-h-60 overflow-y-auto">
              {loadingData ? (
                <p className="text-gray-500 dark:text-gray-400">Loading products...</p>
              ) : products.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400">No products available</p>
              ) : (
                <div className="space-y-2">
                  {products.map((product) => (
                    <label key={String(product.id)} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 p-2 rounded">
                      <input
                        type="checkbox"
                        checked={form.defaultProducts.includes(String(product.id))}
                        onChange={() => handleProductToggle(String(product.id))}
                        className="rounded border-gray-300 dark:border-gray-600"
                      />
                      <span className="text-sm text-gray-900 dark:text-white">
                        {product.name}
                        {product.basePrice && (
                          <span className="text-gray-500 dark:text-gray-400 ml-2">
                            (${product.basePrice})
                          </span>
                        )}
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Products will be automatically added to jobs created with this template
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Default Tech Instructions
            </label>
            <textarea
              value={form.defaultInstructions}
              onChange={(e) => setForm((p) => ({ ...p, defaultInstructions: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white min-h-[100px]"
              placeholder="Pre-filled instructions (will be combined with client template + product instructions)"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Required Fields (Warnings Only)
            </label>
            <div className="space-y-2">
              {[
                { value: 'captureAddress', label: 'Capture Address' },
                { value: 'city', label: 'City' },
                { value: 'state', label: 'State' },
                { value: 'zip', label: 'Zip' },
                { value: 'targetDate', label: 'Target Date' },
                { value: 'sqFt', label: 'Square Feet' },
                { value: 'propertyType', label: 'Property Type' },
              ].map((field) => (
                <label key={field.value} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.requiredFields.includes(field.value)}
                    onChange={() => handleRequiredFieldToggle(field.value)}
                    className="rounded border-gray-300 dark:border-gray-600"
                  />
                  <span className="text-sm text-gray-900 dark:text-white">{field.label}</span>
                </label>
              ))}
            </div>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Show warning if these fields are empty (non-blocking)
            </p>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isActive"
              checked={form.isActive}
              onChange={(e) => setForm((p) => ({ ...p, isActive: e.target.checked }))}
              className="rounded border-gray-300 dark:border-gray-600"
            />
            <label htmlFor="isActive" className="text-sm text-gray-900 dark:text-white cursor-pointer">
              Active (only active templates appear in job creation)
            </label>
          </div>

          <div className="pt-2 flex gap-3 justify-between">
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Saving...' : 'Save Changes'}
              </button>
              <Link
                href="/oms/job-templates"
                className="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors"
              >
                Cancel
              </Link>
            </div>
            <button
              type="button"
              onClick={onDelete}
              disabled={deleting}
              className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {deleting ? 'Deleting...' : 'Delete Template'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
