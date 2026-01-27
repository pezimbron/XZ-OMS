'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter, useSearchParams } from 'next/navigation'

interface Client {
  id: string
  name: string
  primaryContact?: string
  clientType?: string
  billingPreference?: string
  email?: string
  phone?: string
  companyName?: string
  billingAddress?: string
  notes?: string
  instructionTemplate?: string
  defaultWorkflow?: string | any
  accountManager?: any
  invoicingPreferences?: {
    terms?: string
    batchDay?: number
    invoiceNotes?: string
    autoApprove?: boolean
    taxExempt?: boolean
    taxRate?: number
    taxJurisdiction?: string
  }
  notificationPreferences?: {
    enableNotifications?: boolean
    notificationEmail?: string
    notificationPhone?: string
    notifyOnScheduled?: boolean
    notifyOnCompleted?: boolean
    notifyOnDelivered?: boolean
    notifyOnScanCompleted?: boolean
    notifyOnUploadCompleted?: boolean
    notifyOnQcCompleted?: boolean
    notifyOnTransferCompleted?: boolean
    notifyOnFloorplanCompleted?: boolean
    notifyOnPhotosCompleted?: boolean
    notifyOnAsbuiltsCompleted?: boolean
    customMessage?: string
  }
  integrations?: {
    quickbooks?: {
      customerId?: string
      syncStatus?: string
      lastSyncedAt?: string
      syncError?: string
    }
    hubspot?: {
      contactId?: string
      syncStatus?: string
      lastSyncedAt?: string
      syncError?: string
    }
  }
  createdAt: string
  updatedAt: string
}

export default function ClientDetailPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [client, setClient] = useState<Client | null>(null)
  const [editedClient, setEditedClient] = useState<Client | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  
  // Initialize activeTab from URL query parameter or default to 'details'
  const initialTab = searchParams.get('tab') as 'details' | 'billing' | 'notifications' | 'integrations' | 'notes' | null
  const [activeTab, setActiveTab] = useState<'details' | 'billing' | 'notifications' | 'integrations' | 'notes'>(initialTab || 'details')
  const [users, setUsers] = useState<any[]>([])
  const [workflowTemplates, setWorkflowTemplates] = useState<any[]>([])

  useEffect(() => {
    if (params.id) {
      fetchClient(params.id as string)
      fetchWorkflowTemplates()
    }
  }, [params.id])

  const fetchClient = async (id: string) => {
    try {
      const response = await fetch(`/api/clients/${id}`)
      const data = await response.json()
      setClient(data)
      setEditedClient(data)
    } catch (error) {
      console.error('Error fetching client:', error)
    } finally {
      setLoading(false)
    }
  }

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

  const handleEdit = () => {
    setIsEditing(true)
    fetchUsers()
  }

  const handleCancel = () => {
    setIsEditing(false)
    setEditedClient(client)
  }

  const handleSave = async () => {
    if (!editedClient || !client) return
    
    setIsSaving(true)
    try {
      // Prepare payload - only include editable fields, exclude metadata
      const { id, createdAt, updatedAt, ...editableFields } = editedClient
      
      // Convert relationship fields to numbers (Payload expects numeric IDs for relationships)
      let accountManagerValue: number | null = null
      if (typeof editedClient.accountManager === 'string' && editedClient.accountManager) {
        accountManagerValue = parseInt(editedClient.accountManager, 10)
      } else if (typeof editedClient.accountManager === 'object' && editedClient.accountManager?.id) {
        accountManagerValue = typeof editedClient.accountManager.id === 'string' 
          ? parseInt(editedClient.accountManager.id, 10)
          : editedClient.accountManager.id
      }
      
      let defaultWorkflowValue: number | null = null
      if (typeof editedClient.defaultWorkflow === 'string' && editedClient.defaultWorkflow) {
        defaultWorkflowValue = parseInt(editedClient.defaultWorkflow, 10)
      } else if (typeof editedClient.defaultWorkflow === 'object' && editedClient.defaultWorkflow?.id) {
        defaultWorkflowValue = typeof editedClient.defaultWorkflow.id === 'string' 
          ? parseInt(editedClient.defaultWorkflow.id, 10)
          : editedClient.defaultWorkflow.id
      }
      
      const payload = {
        ...editableFields,
        accountManager: accountManagerValue,
        defaultWorkflow: defaultWorkflowValue,
      }
      
      const response = await fetch(`/api/clients/${client.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error('API Error:', errorData)
        throw new Error(`Failed to update client: ${errorData.errors?.[0]?.message || response.statusText}`)
      }
      
      const data = await response.json()
      const updated = data.doc || data
      
      setClient(updated)
      setEditedClient(updated)
      setIsEditing(false)
    } catch (error) {
      console.error('Error saving client:', error)
      alert('Failed to save changes. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  const updateField = (field: string, value: any) => {
    if (!editedClient) return
    setEditedClient({ ...editedClient, [field]: value })
  }

  const updateNestedField = (parent: string, field: string, value: any) => {
    if (!editedClient) return
    setEditedClient({
      ...editedClient,
      [parent]: {
        ...(editedClient[parent as keyof Client] as any),
        [field]: value,
      },
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <svg className="animate-spin h-12 w-12 mx-auto mb-4 text-blue-600 dark:text-blue-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-lg font-medium text-gray-700 dark:text-gray-300">Loading client...</p>
        </div>
      </div>
    )
  }

  if (!client) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Client Not Found</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">The client you&apos;re looking for doesn&apos;t exist.</p>
          <Link href="/oms/clients" className="text-blue-600 hover:text-blue-700 dark:text-blue-400">
            ← Back to Clients
          </Link>
        </div>
      </div>
    )
  }

  const displayClient = isEditing ? editedClient : client

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="px-8 py-6">
          <div className="flex items-center justify-between mb-4">
            <Link
              href="/oms/clients"
              className="text-blue-600 hover:text-blue-700 dark:text-blue-400 flex items-center gap-2"
            >
              ← Back to Clients
            </Link>
            <div className="flex items-center gap-3">
              {isEditing ? (
                <>
                  <button
                    onClick={handleCancel}
                    disabled={isSaving}
                    className="px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    {isSaving ? (
                      <>
                        <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Saving...
                      </>
                    ) : (
                      'Save Changes'
                    )}
                  </button>
                </>
              ) : (
                <button
                  onClick={handleEdit}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                >
                  Edit Client
                </button>
              )}
            </div>
          </div>
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center flex-shrink-0">
              <span className="text-3xl">👤</span>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                {displayClient?.name}
              </h1>
              {displayClient?.companyName && (
                <p className="text-gray-600 dark:text-gray-400 mt-1 text-lg">
                  {displayClient.companyName}
                </p>
              )}
              {displayClient?.clientType && (
                <span className="inline-block mt-2 px-3 py-1 text-sm font-medium rounded-full bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300">
                  {displayClient.clientType === 'retail' ? 'Retail Client' : 'Outsourcing Partner'}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="px-8">
          <div className="flex gap-4 border-b border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setActiveTab('details')}
              className={`px-4 py-3 font-medium transition-colors ${
                activeTab === 'details'
                  ? 'border-b-2 border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              Details
            </button>
            <button
              onClick={() => setActiveTab('billing')}
              className={`px-4 py-3 font-medium transition-colors ${
                activeTab === 'billing'
                  ? 'border-b-2 border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              Billing & Invoicing
            </button>
            <button
              onClick={() => setActiveTab('notifications')}
              className={`px-4 py-3 font-medium transition-colors ${
                activeTab === 'notifications'
                  ? 'border-b-2 border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              Notifications
            </button>
            <button
              onClick={() => setActiveTab('integrations')}
              className={`px-4 py-3 font-medium transition-colors ${
                activeTab === 'integrations'
                  ? 'border-b-2 border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              Integrations
            </button>
            <button
              onClick={() => setActiveTab('notes')}
              className={`px-4 py-3 font-medium transition-colors ${
                activeTab === 'notes'
                  ? 'border-b-2 border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              Notes
            </button>
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="p-8">
        <div className="max-w-5xl mx-auto space-y-6">
          {/* Details Tab */}
          {activeTab === 'details' && (
            <>
              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Basic Information</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Client Name *
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={editedClient?.name || ''}
                        onChange={(e) => updateField('name', e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                    ) : (
                      <p className="text-gray-900 dark:text-white py-2">{displayClient?.name}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Primary Contact Person
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={editedClient?.primaryContact || ''}
                        onChange={(e) => updateField('primaryContact', e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        placeholder="Name of person who receives communications"
                      />
                    ) : (
                      <p className="text-gray-900 dark:text-white py-2">{displayClient?.primaryContact || '-'}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Client Type *
                    </label>
                    {isEditing ? (
                      <select
                        value={editedClient?.clientType || 'retail'}
                        onChange={(e) => updateField('clientType', e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      >
                        <option value="retail">Retail</option>
                        <option value="outsourcing-partner">Outsourcing Partner</option>
                      </select>
                    ) : (
                      <p className="text-gray-900 dark:text-white py-2">
                        {displayClient?.clientType === 'retail' ? 'Retail' : 'Outsourcing Partner'}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Company Name
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={editedClient?.companyName || ''}
                        onChange={(e) => updateField('companyName', e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                    ) : (
                      <p className="text-gray-900 dark:text-white py-2">{displayClient?.companyName || '-'}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Account Manager
                    </label>
                    {isEditing ? (
                      <select
                        value={typeof editedClient?.accountManager === 'string' ? editedClient.accountManager : editedClient?.accountManager?.id || ''}
                        onChange={(e) => updateField('accountManager', e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      >
                        <option value="">No Account Manager</option>
                        {users.map((user) => (
                          <option key={user.id} value={user.id}>
                            {user.name || user.email}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <p className="text-gray-900 dark:text-white py-2">
                        {typeof displayClient?.accountManager === 'object' && displayClient?.accountManager?.name
                          ? displayClient.accountManager.name
                          : '-'}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Email
                    </label>
                    {isEditing ? (
                      <input
                        type="email"
                        value={editedClient?.email || ''}
                        onChange={(e) => updateField('email', e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                    ) : (
                      <p className="text-gray-900 dark:text-white py-2">
                        {displayClient?.email ? (
                          <a href={`mailto:${displayClient.email}`} className="text-blue-600 hover:text-blue-700 dark:text-blue-400">
                            {displayClient.email}
                          </a>
                        ) : '-'}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Phone
                    </label>
                    {isEditing ? (
                      <input
                        type="tel"
                        value={editedClient?.phone || ''}
                        onChange={(e) => updateField('phone', e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                    ) : (
                      <p className="text-gray-900 dark:text-white py-2">
                        {displayClient?.phone ? (
                          <a href={`tel:${displayClient.phone}`} className="text-blue-600 hover:text-blue-700 dark:text-blue-400">
                            {displayClient.phone}
                          </a>
                        ) : '-'}
                      </p>
                    )}
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Billing Address
                    </label>
                    {isEditing ? (
                      <textarea
                        value={editedClient?.billingAddress || ''}
                        onChange={(e) => updateField('billingAddress', e.target.value)}
                        rows={3}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                    ) : (
                      <p className="text-gray-900 dark:text-white py-2 whitespace-pre-wrap">{displayClient?.billingAddress || '-'}</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Workflow & Instructions</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Default Workflow Template
                    </label>
                    {isEditing ? (
                      <select
                        value={typeof editedClient?.defaultWorkflow === 'string' ? editedClient.defaultWorkflow : editedClient?.defaultWorkflow?.id || ''}
                        onChange={(e) => updateField('defaultWorkflow', e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      >
                        <option value="">No Default Workflow</option>
                        {workflowTemplates.map((template) => (
                          <option key={template.id} value={template.id}>
                            {template.name}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <p className="text-gray-900 dark:text-white py-2">
                        {typeof displayClient?.defaultWorkflow === 'object' && displayClient?.defaultWorkflow?.name
                          ? displayClient.defaultWorkflow.name
                          : '-'}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Client-Specific Instruction Template
                    </label>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                      These instructions will auto-populate in jobs for this client
                    </p>
                    {isEditing ? (
                      <textarea
                        value={editedClient?.instructionTemplate || ''}
                        onChange={(e) => updateField('instructionTemplate', e.target.value)}
                        rows={6}
                        placeholder="e.g., Always call POC 30 min before arrival"
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono text-sm"
                      />
                    ) : (
                      <pre className="text-sm text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-900 p-4 rounded-lg whitespace-pre-wrap">
                        {displayClient?.instructionTemplate || 'No default instructions'}
                      </pre>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Billing & Invoicing Tab */}
          {activeTab === 'billing' && (
            <>
              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Billing Preferences</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Billing Preference *
                    </label>
                    {isEditing ? (
                      <select
                        value={editedClient?.billingPreference || 'immediate'}
                        onChange={(e) => updateField('billingPreference', e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      >
                        <option value="immediate">Immediate</option>
                        <option value="weekly-batch">Weekly Batch</option>
                        <option value="monthly-batch">Monthly Batch</option>
                        <option value="payment-first">Payment First</option>
                      </select>
                    ) : (
                      <p className="text-gray-900 dark:text-white py-2">
                        {displayClient?.billingPreference?.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Immediate'}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Payment Terms
                    </label>
                    {isEditing ? (
                      <select
                        value={editedClient?.invoicingPreferences?.terms || 'net-30'}
                        onChange={(e) => updateNestedField('invoicingPreferences', 'terms', e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      >
                        <option value="due-on-receipt">Due on Receipt</option>
                        <option value="net-15">Net 15</option>
                        <option value="net-30">Net 30</option>
                        <option value="net-45">Net 45</option>
                        <option value="net-60">Net 60</option>
                      </select>
                    ) : (
                      <p className="text-gray-900 dark:text-white py-2">
                        {displayClient?.invoicingPreferences?.terms?.replace('-', ' ').toUpperCase() || 'Net 30'}
                      </p>
                    )}
                  </div>

                  {(displayClient?.billingPreference === 'weekly-batch' || displayClient?.billingPreference === 'monthly-batch') && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Batch Invoice Day
                      </label>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                        {displayClient?.billingPreference === 'weekly-batch' 
                          ? '1=Monday, 7=Sunday' 
                          : 'Day of month (1-31)'}
                      </p>
                      {isEditing ? (
                        <input
                          type="number"
                          min="1"
                          max={displayClient?.billingPreference === 'weekly-batch' ? 7 : 31}
                          value={editedClient?.invoicingPreferences?.batchDay || ''}
                          onChange={(e) => updateNestedField('invoicingPreferences', 'batchDay', parseInt(e.target.value))}
                          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        />
                      ) : (
                        <p className="text-gray-900 dark:text-white py-2">{displayClient?.invoicingPreferences?.batchDay || '-'}</p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Tax & Invoice Settings</h2>
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                    {isEditing ? (
                      <input
                        type="checkbox"
                        checked={editedClient?.invoicingPreferences?.autoApprove || false}
                        onChange={(e) => updateNestedField('invoicingPreferences', 'autoApprove', e.target.checked)}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded"
                      />
                    ) : (
                      <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${displayClient?.invoicingPreferences?.autoApprove ? 'bg-blue-600 border-blue-600' : 'border-gray-300'}`}>
                        {displayClient?.invoicingPreferences?.autoApprove && <span className="text-white text-xs">✓</span>}
                      </div>
                    )}
                    <div>
                      <label className="text-sm font-medium text-gray-900 dark:text-white">Auto-Approve Invoices</label>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Skip manual approval and automatically create draft invoices</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                    {isEditing ? (
                      <input
                        type="checkbox"
                        checked={editedClient?.invoicingPreferences?.taxExempt || false}
                        onChange={(e) => updateNestedField('invoicingPreferences', 'taxExempt', e.target.checked)}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded"
                      />
                    ) : (
                      <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${displayClient?.invoicingPreferences?.taxExempt ? 'bg-blue-600 border-blue-600' : 'border-gray-300'}`}>
                        {displayClient?.invoicingPreferences?.taxExempt && <span className="text-white text-xs">✓</span>}
                      </div>
                    )}
                    <div>
                      <label className="text-sm font-medium text-gray-900 dark:text-white">Tax Exempt</label>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Client is exempt from sales tax</p>
                    </div>
                  </div>

                  {!displayClient?.invoicingPreferences?.taxExempt && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Tax Rate (%)
                        </label>
                        {isEditing ? (
                          <input
                            type="number"
                            step="0.01"
                            value={editedClient?.invoicingPreferences?.taxRate || 0}
                            onChange={(e) => updateNestedField('invoicingPreferences', 'taxRate', parseFloat(e.target.value))}
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          />
                        ) : (
                          <p className="text-gray-900 dark:text-white py-2">{displayClient?.invoicingPreferences?.taxRate || 0}%</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Tax Jurisdiction
                        </label>
                        {isEditing ? (
                          <input
                            type="text"
                            placeholder="e.g., Austin, TX"
                            value={editedClient?.invoicingPreferences?.taxJurisdiction || ''}
                            onChange={(e) => updateNestedField('invoicingPreferences', 'taxJurisdiction', e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          />
                        ) : (
                          <p className="text-gray-900 dark:text-white py-2">{displayClient?.invoicingPreferences?.taxJurisdiction || '-'}</p>
                        )}
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Default Invoice Notes
                    </label>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                      Notes that will appear on all invoices for this client
                    </p>
                    {isEditing ? (
                      <textarea
                        value={editedClient?.invoicingPreferences?.invoiceNotes || ''}
                        onChange={(e) => updateNestedField('invoicingPreferences', 'invoiceNotes', e.target.value)}
                        rows={4}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                    ) : (
                      <p className="text-gray-900 dark:text-white py-2 whitespace-pre-wrap">{displayClient?.invoicingPreferences?.invoiceNotes || '-'}</p>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Notifications Tab */}
          {activeTab === 'notifications' && (
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Job Update Notifications</h2>
              
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  {isEditing ? (
                    <input
                      type="checkbox"
                      checked={editedClient?.notificationPreferences?.enableNotifications ?? true}
                      onChange={(e) => updateNestedField('notificationPreferences', 'enableNotifications', e.target.checked)}
                      className="w-5 h-5 text-blue-600 border-gray-300 rounded"
                    />
                  ) : (
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${displayClient?.notificationPreferences?.enableNotifications !== false ? 'bg-blue-600 border-blue-600' : 'border-gray-300'}`}>
                      {displayClient?.notificationPreferences?.enableNotifications !== false && <span className="text-white text-sm">✓</span>}
                    </div>
                  )}
                  <div>
                    <label className="text-sm font-semibold text-gray-900 dark:text-white">Enable Job Update Notifications</label>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Send automatic notifications when job status changes</p>
                  </div>
                </div>

                {displayClient?.notificationPreferences?.enableNotifications !== false && (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Notification Email
                        </label>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Defaults to main email if empty</p>
                        {isEditing ? (
                          <input
                            type="email"
                            value={editedClient?.notificationPreferences?.notificationEmail || ''}
                            onChange={(e) => updateNestedField('notificationPreferences', 'notificationEmail', e.target.value)}
                            placeholder={displayClient?.email || ''}
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          />
                        ) : (
                          <p className="text-gray-900 dark:text-white py-2">
                            {displayClient?.notificationPreferences?.notificationEmail || displayClient?.email || '-'}
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Notification Phone (SMS)
                        </label>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Optional</p>
                        {isEditing ? (
                          <input
                            type="tel"
                            value={editedClient?.notificationPreferences?.notificationPhone || ''}
                            onChange={(e) => updateNestedField('notificationPreferences', 'notificationPhone', e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          />
                        ) : (
                          <p className="text-gray-900 dark:text-white py-2">{displayClient?.notificationPreferences?.notificationPhone || '-'}</p>
                        )}
                      </div>
                    </div>

                    <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Notification Triggers</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Choose which workflow events trigger notifications</p>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {[
                          { key: 'notifyOnScheduled', label: 'Job Scheduled', default: true },
                          { key: 'notifyOnScanCompleted', label: 'Scan Completed', default: false },
                          { key: 'notifyOnUploadCompleted', label: 'Upload Completed', default: false },
                          { key: 'notifyOnQcCompleted', label: 'QC/Post-Production Completed', default: true },
                          { key: 'notifyOnTransferCompleted', label: 'Transfer Completed', default: false },
                          { key: 'notifyOnFloorplanCompleted', label: 'Floor Plan Completed', default: false },
                          { key: 'notifyOnPhotosCompleted', label: 'Photos Completed', default: false },
                          { key: 'notifyOnAsbuiltsCompleted', label: 'As-Builts Completed', default: false },
                          { key: 'notifyOnCompleted', label: 'Job Completed', default: true },
                          { key: 'notifyOnDelivered', label: 'Deliverables Ready', default: true },
                        ].map(({ key, label, default: defaultValue }) => {
                          const value = editedClient?.notificationPreferences?.[key as keyof typeof editedClient.notificationPreferences]
                          const checkedValue = typeof value === 'boolean' ? value : defaultValue
                          const displayValue = displayClient?.notificationPreferences?.[key as keyof typeof displayClient.notificationPreferences]
                          const displayChecked = typeof displayValue === 'boolean' ? displayValue : defaultValue
                          
                          return (
                            <div key={key} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                              {isEditing ? (
                                <input
                                  type="checkbox"
                                  checked={checkedValue}
                                  onChange={(e) => updateNestedField('notificationPreferences', key, e.target.checked)}
                                  className="w-4 h-4 text-blue-600 border-gray-300 rounded"
                                />
                              ) : (
                                <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${displayChecked ? 'bg-blue-600 border-blue-600' : 'border-gray-300'}`}>
                                  {displayChecked && <span className="text-white text-xs">✓</span>}
                                </div>
                              )}
                              <label className="text-sm text-gray-900 dark:text-white">{label}</label>
                            </div>
                          )
                        })}
                      </div>
                    </div>

                    <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Custom Notification Message
                      </label>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                        Optional custom message to include in all notifications to this client
                      </p>
                      {isEditing ? (
                        <textarea
                          value={editedClient?.notificationPreferences?.customMessage || ''}
                          onChange={(e) => updateNestedField('notificationPreferences', 'customMessage', e.target.value)}
                          rows={3}
                          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        />
                      ) : (
                        <p className="text-gray-900 dark:text-white py-2 whitespace-pre-wrap">{displayClient?.notificationPreferences?.customMessage || '-'}</p>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Integrations Tab */}
          {activeTab === 'integrations' && (
            <div className="space-y-6">
              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                    <span className="text-2xl">💚</span>
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">QuickBooks</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Accounting & Invoicing Integration</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Customer ID</label>
                    <p className="text-gray-900 dark:text-white font-mono text-sm">
                      {displayClient?.integrations?.quickbooks?.customerId || 'Not synced'}
                    </p>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Sync Status</label>
                    <div className="mt-1">
                      {displayClient?.integrations?.quickbooks?.syncStatus === 'synced' && (
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
                          Synced
                        </span>
                      )}
                      {displayClient?.integrations?.quickbooks?.syncStatus === 'error' && (
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300">
                          Error
                        </span>
                      )}
                      {displayClient?.integrations?.quickbooks?.syncStatus === 'pending' && (
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300">
                          Pending
                        </span>
                      )}
                      {(!displayClient?.integrations?.quickbooks?.syncStatus || displayClient?.integrations?.quickbooks?.syncStatus === 'not-synced') && (
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300">
                          Not Synced
                        </span>
                      )}
                    </div>
                  </div>

                  {displayClient?.integrations?.quickbooks?.lastSyncedAt && (
                    <div>
                      <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Last Synced</label>
                      <p className="text-gray-900 dark:text-white text-sm">
                        {new Date(displayClient.integrations.quickbooks.lastSyncedAt).toLocaleString()}
                      </p>
                    </div>
                  )}

                  {displayClient?.integrations?.quickbooks?.syncError && (
                    <div className="md:col-span-2">
                      <label className="text-sm font-medium text-red-600 dark:text-red-400">Sync Error</label>
                      <p className="text-sm text-gray-900 dark:text-white bg-red-50 dark:bg-red-900/20 p-3 rounded-lg mt-1">
                        {displayClient.integrations.quickbooks.syncError}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center">
                    <span className="text-2xl">🧡</span>
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">HubSpot</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">CRM & Sales Integration</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Contact ID</label>
                    <p className="text-gray-900 dark:text-white font-mono text-sm">
                      {displayClient?.integrations?.hubspot?.contactId || 'Not synced'}
                    </p>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Sync Status</label>
                    <div className="mt-1">
                      {displayClient?.integrations?.hubspot?.syncStatus === 'synced' && (
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
                          Synced
                        </span>
                      )}
                      {displayClient?.integrations?.hubspot?.syncStatus === 'error' && (
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300">
                          Error
                        </span>
                      )}
                      {displayClient?.integrations?.hubspot?.syncStatus === 'pending' && (
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300">
                          Pending
                        </span>
                      )}
                      {(!displayClient?.integrations?.hubspot?.syncStatus || displayClient?.integrations?.hubspot?.syncStatus === 'not-synced') && (
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300">
                          Not Synced
                        </span>
                      )}
                    </div>
                  </div>

                  {displayClient?.integrations?.hubspot?.lastSyncedAt && (
                    <div>
                      <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Last Synced</label>
                      <p className="text-gray-900 dark:text-white text-sm">
                        {new Date(displayClient.integrations.hubspot.lastSyncedAt).toLocaleString()}
                      </p>
                    </div>
                  )}

                  {displayClient?.integrations?.hubspot?.syncError && (
                    <div className="md:col-span-2">
                      <label className="text-sm font-medium text-red-600 dark:text-red-400">Sync Error</label>
                      <p className="text-sm text-gray-900 dark:text-white bg-red-50 dark:bg-red-900/20 p-3 rounded-lg mt-1">
                        {displayClient.integrations.hubspot.syncError}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Notes Tab */}
          {activeTab === 'notes' && (
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Internal Notes</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                Private notes about this client (not visible to the client)
              </p>
              {isEditing ? (
                <textarea
                  value={editedClient?.notes || ''}
                  onChange={(e) => updateField('notes', e.target.value)}
                  rows={12}
                  placeholder="Add internal notes about this client..."
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              ) : (
                <div className="min-h-[200px] p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                  <p className="text-gray-900 dark:text-white whitespace-pre-wrap">
                    {displayClient?.notes || 'No notes added yet'}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
