'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function CreateClientPage() {
  const router = useRouter()
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [users, setUsers] = useState<any[]>([])
  const [workflowTemplates, setWorkflowTemplates] = useState<any[]>([])
  
  const [formData, setFormData] = useState({
    name: '',
    primaryContact: '',
    companyName: '',
    clientType: 'retail',
    email: '',
    phone: '',
    billingAddress: '',
    accountManager: '',
    defaultWorkflow: '',
    instructionTemplate: '',
    notes: '',
    invoicingPreferences: {
      terms: 'net-30',
      batchDay: 1,
      invoiceNotes: '',
      autoApprove: false,
      taxExempt: false,
      taxRate: 0,
      taxJurisdiction: '',
    },
    notificationPreferences: {
      enableNotifications: true,
      notificationEmail: '',
      notificationPhone: '',
      notifyOnScheduled: true,
      notifyOnCompleted: true,
      notifyOnDelivered: true,
      notifyOnScanCompleted: false,
      notifyOnUploadCompleted: false,
      notifyOnQcCompleted: false,
      notifyOnTransferCompleted: false,
      notifyOnFloorplanCompleted: false,
      notifyOnPhotosCompleted: false,
      customMessage: '',
    },
  })

  useEffect(() => {
    fetchUsers()
    fetchWorkflowTemplates()
  }, [])

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/users?limit=100')
      const data = await response.json()
      setUsers(data.docs || [])
    } catch (error) {
      console.error('Error fetching users:', error)
    }
  }

  const fetchWorkflowTemplates = async () => {
    try {
      const response = await fetch('/api/workflow-templates?where[isActive][equals]=true&limit=100')
      const data = await response.json()
      setWorkflowTemplates(data.docs || [])
    } catch (error) {
      console.error('Error fetching workflow templates:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    setError(null)

    try {
      // Sanitize payload - convert relationship fields to numeric IDs
      const payload: any = {
        ...formData,
        accountManager: formData.accountManager ? parseInt(formData.accountManager) : null,
        defaultWorkflow: formData.defaultWorkflow ? parseInt(formData.defaultWorkflow) : null,
      }

      const response = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.errors?.[0]?.message || 'Failed to create client')
      }

      const data = await response.json()
      const newClient = data.doc || data
      
      // Redirect to the new client's edit page
      router.push(`/oms/clients/${newClient.id}`)
    } catch (err: any) {
      setError(err.message)
      setIsSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <Link
            href="/oms/clients"
            className="inline-flex items-center text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Clients
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Create New Client</h1>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Basic Information</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Client Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="e.g., ABC Real Estate"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Primary Contact Person
                </label>
                <input
                  type="text"
                  value={formData.primaryContact}
                  onChange={(e) => setFormData({ ...formData, primaryContact: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="e.g., John Smith"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Name of the person who receives communications at this company
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Company Name
                </label>
                <input
                  type="text"
                  value={formData.companyName}
                  onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="e.g., ABC Real Estate"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Client Type *
                </label>
                <select
                  required
                  value={formData.clientType}
                  onChange={(e) => setFormData({ ...formData, clientType: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="retail">Retail</option>
                  <option value="outsourcing-partner">Outsourcing Partner</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="client@example.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="(555) 123-4567"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Billing Address
                </label>
                <textarea
                  value={formData.billingAddress}
                  onChange={(e) => setFormData({ ...formData, billingAddress: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="123 Main St, City, State ZIP"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Account Manager
                </label>
                <select
                  value={formData.accountManager}
                  onChange={(e) => setFormData({ ...formData, accountManager: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="">Select Account Manager...</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name || user.email}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Default Workflow Template
                </label>
                <select
                  value={formData.defaultWorkflow}
                  onChange={(e) => setFormData({ ...formData, defaultWorkflow: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="">Select Workflow Template...</option>
                  {workflowTemplates.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Invoicing Preferences */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Invoicing Preferences</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Payment Terms
                </label>
                <select
                  value={formData.invoicingPreferences.terms}
                  onChange={(e) => setFormData({
                    ...formData,
                    invoicingPreferences: { ...formData.invoicingPreferences, terms: e.target.value }
                  })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="due-on-receipt">Due on Receipt</option>
                  <option value="net-15">Net 15</option>
                  <option value="net-30">Net 30</option>
                  <option value="net-60">Net 60</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Batch Invoicing Day (1-31)
                </label>
                <input
                  type="number"
                  min="1"
                  max="31"
                  value={formData.invoicingPreferences.batchDay}
                  onChange={(e) => setFormData({
                    ...formData,
                    invoicingPreferences: { ...formData.invoicingPreferences, batchDay: parseInt(e.target.value) || 1 }
                  })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Invoice Notes
                </label>
                <textarea
                  value={formData.invoicingPreferences.invoiceNotes}
                  onChange={(e) => setFormData({
                    ...formData,
                    invoicingPreferences: { ...formData.invoicingPreferences, invoiceNotes: e.target.value }
                  })}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Special notes to include on invoices..."
                />
              </div>

              <div className="space-y-3">
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={formData.invoicingPreferences.autoApprove}
                    onChange={(e) => setFormData({
                      ...formData,
                      invoicingPreferences: { ...formData.invoicingPreferences, autoApprove: e.target.checked }
                    })}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Auto-approve jobs for invoicing</span>
                </label>

                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={formData.invoicingPreferences.taxExempt}
                    onChange={(e) => setFormData({
                      ...formData,
                      invoicingPreferences: { ...formData.invoicingPreferences, taxExempt: e.target.checked }
                    })}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Tax Exempt</span>
                </label>
              </div>

              {!formData.invoicingPreferences.taxExempt && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Tax Rate (%)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={formData.invoicingPreferences.taxRate}
                      onChange={(e) => setFormData({
                        ...formData,
                        invoicingPreferences: { ...formData.invoicingPreferences, taxRate: parseFloat(e.target.value) || 0 }
                      })}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Tax Jurisdiction
                    </label>
                    <input
                      type="text"
                      value={formData.invoicingPreferences.taxJurisdiction}
                      onChange={(e) => setFormData({
                        ...formData,
                        invoicingPreferences: { ...formData.invoicingPreferences, taxJurisdiction: e.target.value }
                      })}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="e.g., TX, Austin"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Notification Preferences */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Notification Preferences</h2>
            <div className="space-y-4">
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={formData.notificationPreferences.enableNotifications}
                  onChange={(e) => setFormData({
                    ...formData,
                    notificationPreferences: { ...formData.notificationPreferences, enableNotifications: e.target.checked }
                  })}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded"
                />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Enable Job Update Notifications</span>
              </label>

              {formData.notificationPreferences.enableNotifications && (
                <div className="ml-7 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Notification Email
                      </label>
                      <input
                        type="email"
                        value={formData.notificationPreferences.notificationEmail}
                        onChange={(e) => setFormData({
                          ...formData,
                          notificationPreferences: { ...formData.notificationPreferences, notificationEmail: e.target.value }
                        })}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        placeholder="notifications@example.com"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Notification Phone
                      </label>
                      <input
                        type="tel"
                        value={formData.notificationPreferences.notificationPhone}
                        onChange={(e) => setFormData({
                          ...formData,
                          notificationPreferences: { ...formData.notificationPreferences, notificationPhone: e.target.value }
                        })}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        placeholder="(555) 123-4567"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Notify when:</p>
                    <div className="grid grid-cols-2 gap-2">
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={formData.notificationPreferences.notifyOnScheduled}
                          onChange={(e) => setFormData({
                            ...formData,
                            notificationPreferences: { ...formData.notificationPreferences, notifyOnScheduled: e.target.checked }
                          })}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded"
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-300">Job Scheduled</span>
                      </label>

                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={formData.notificationPreferences.notifyOnCompleted}
                          onChange={(e) => setFormData({
                            ...formData,
                            notificationPreferences: { ...formData.notificationPreferences, notifyOnCompleted: e.target.checked }
                          })}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded"
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-300">Job Completed</span>
                      </label>

                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={formData.notificationPreferences.notifyOnDelivered}
                          onChange={(e) => setFormData({
                            ...formData,
                            notificationPreferences: { ...formData.notificationPreferences, notifyOnDelivered: e.target.checked }
                          })}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded"
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-300">Deliverables Ready</span>
                      </label>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Notes & Instructions */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Notes & Instructions</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Instruction Template
                </label>
                <textarea
                  value={formData.instructionTemplate}
                  onChange={(e) => setFormData({ ...formData, instructionTemplate: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono text-sm"
                  placeholder="Default instructions for jobs with this client..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Internal Notes
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Internal notes about this client..."
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 justify-end">
            <Link
              href="/oms/clients"
              className="px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 font-medium transition-colors"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={isSaving}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg font-medium transition-colors"
            >
              {isSaving ? 'Creating...' : 'Create Client'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
