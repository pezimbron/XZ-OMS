'use client'

import React, { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'

function SettingsContent() {
  const searchParams = useSearchParams()
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle')
  const [syncMessage, setSyncMessage] = useState('')
  const [qbConnected, setQbConnected] = useState(false)
  const [importStatus, setImportStatus] = useState<'idle' | 'importing' | 'success' | 'error'>('idle')
  const [importMessage, setImportMessage] = useState('')
  const [user, setUser] = useState<any>(null)
  const [email, setEmail] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [saveMessage, setSaveMessage] = useState('')

  useEffect(() => {
    fetchUser()
    const qbStatus = searchParams.get('quickbooks')
    const message = searchParams.get('message')

    if (qbStatus === 'connected') {
      setQbConnected(true)
      setSyncMessage('Successfully connected to QuickBooks!')
    } else if (qbStatus === 'error') {
      setSyncMessage(`QuickBooks connection error: ${message || 'Unknown error'}`)
    }
  }, [searchParams])

  const fetchUser = async () => {
    try {
      const response = await fetch('/api/users/me')
      const data = await response.json()
      setUser(data.user)
      setEmail(data.user?.email || '')
    } catch (error) {
      console.error('Error fetching user:', error)
    }
  }

  const handleUpdateProfile = async () => {
    setSaveMessage('Saving...')
    try {
      const response = await fetch('/api/users/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      if (response.ok) {
        setSaveMessage('✓ Profile updated successfully!')
        setTimeout(() => setSaveMessage(''), 3000)
      } else {
        setSaveMessage('✗ Failed to update profile')
      }
    } catch (error) {
      setSaveMessage('✗ Error updating profile')
    }
  }

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      setSaveMessage('✗ Passwords do not match')
      return
    }
    if (newPassword.length < 8) {
      setSaveMessage('✗ Password must be at least 8 characters')
      return
    }
    setSaveMessage('Updating password...')
    try {
      const response = await fetch('/api/users/me/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      })
      if (response.ok) {
        setSaveMessage('✓ Password changed successfully!')
        setCurrentPassword('')
        setNewPassword('')
        setConfirmPassword('')
        setTimeout(() => setSaveMessage(''), 3000)
      } else {
        const data = await response.json()
        setSaveMessage(`✗ ${data.error || 'Failed to change password'}`)
      }
    } catch (error) {
      setSaveMessage('✗ Error changing password')
    }
  }

  const handleConnectQuickBooks = () => {
    window.location.href = '/api/quickbooks/auth'
  }

  const handleSyncAllClients = async () => {
    setSyncStatus('syncing')
    setSyncMessage('Syncing all clients to QuickBooks...')

    try {
      const response = await fetch('/api/quickbooks/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ syncAll: true, forceSync: true }),
      })

      const data = await response.json()

      if (data.success) {
        setSyncStatus('success')
        setSyncMessage(`Successfully synced ${data.results.synced} clients. ${data.results.errors} errors.`)
      } else {
        setSyncStatus('error')
        setSyncMessage(data.error || 'Failed to sync clients')
      }
    } catch (error: any) {
      setSyncStatus('error')
      setSyncMessage(`Error: ${error.message}`)
    }
  }

  const handleImportFromQuickBooks = async () => {
    setImportStatus('importing')
    setImportMessage('Importing customers from QuickBooks...')

    try {
      const response = await fetch('/api/quickbooks/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const data = await response.json()

      if (data.success) {
        setImportStatus('success')
        setImportMessage(`Successfully imported ${data.results.imported} new clients, updated ${data.results.updated} existing clients.`)
      } else {
        setImportStatus('error')
        setImportMessage(data.error || 'Failed to import customers')
      }
    } catch (error: any) {
      setImportStatus('error')
      setImportMessage(`Error: ${error.message}`)
    }
  }

  // Tech users see simplified settings
  if (user?.role === 'tech') {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <div className="px-4 md:px-8 py-4 md:py-6">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">Settings</h1>
            <p className="text-sm md:text-base text-gray-600 dark:text-gray-400 mt-1">
              Manage your account settings
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 md:p-8">
          <div className="max-w-2xl mx-auto space-y-6">
            {/* Save Message */}
            {saveMessage && (
              <div className={`p-4 rounded-lg ${
                saveMessage.includes('✓')
                  ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-300 border border-green-200 dark:border-green-800'
                  : 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-800'
              }`}>
                <p className="font-medium">{saveMessage}</p>
              </div>
            )}

            {/* Email Settings */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Email Address</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <button
                  onClick={handleUpdateProfile}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                >
                  Update Email
                </button>
              </div>
            </div>

            {/* Password Settings */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Change Password</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Current Password
                  </label>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    New Password
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <button
                  onClick={handleChangePassword}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                >
                  Change Password
                </button>
              </div>
            </div>

            {/* Calendar Settings */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Calendar Settings</h2>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Your assigned jobs will automatically appear in your Google Calendar.
              </p>
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <p className="text-sm text-blue-900 dark:text-blue-100">
                  📅 Calendar invites are sent automatically when you&apos;re assigned to a job.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Admin users see full settings
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="px-8 py-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Settings</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage integrations and system settings
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="p-8">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Status Messages */}
          {syncMessage && (
            <div className={`p-4 rounded-lg ${
              qbConnected || syncStatus === 'success' 
                ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-300 border border-green-200 dark:border-green-800'
                : 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-800'
            }`}>
              <p className="font-medium">{syncMessage}</p>
            </div>
          )}

          {importMessage && (
            <div className={`p-4 rounded-lg ${
              importStatus === 'success' 
                ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-300 border border-green-200 dark:border-green-800'
                : importStatus === 'error'
                ? 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-800'
                : 'bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
            }`}>
              <p className="font-medium">{importMessage}</p>
            </div>
          )}

          {/* QuickBooks Integration */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                  QuickBooks Integration
                </h2>
                <p className="text-gray-600 dark:text-gray-400">
                  Sync clients automatically with QuickBooks Online
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                <span className="text-2xl">💰</span>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${qbConnected ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                <span className="text-gray-900 dark:text-white font-medium">
                  {qbConnected ? 'Connected' : 'Not Connected'}
                </span>
              </div>

              <div className="flex gap-3 flex-wrap">
                <button
                  onClick={handleConnectQuickBooks}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
                >
                  {qbConnected ? 'Reconnect' : 'Connect'} to QuickBooks
                </button>

                {qbConnected && (
                  <>
                    <button
                      onClick={handleImportFromQuickBooks}
                      disabled={importStatus === 'importing'}
                      className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors"
                    >
                      {importStatus === 'importing' ? 'Importing...' : '⬇ Import from QuickBooks'}
                    </button>
                    <button
                      onClick={handleSyncAllClients}
                      disabled={syncStatus === 'syncing'}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors"
                    >
                      {syncStatus === 'syncing' ? 'Syncing...' : '⬆ Push to QuickBooks'}
                    </button>
                  </>
                )}
              </div>

              <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">How it works:</h3>
                <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                  <li>• Click &quot;Connect to QuickBooks&quot; to authorize access</li>
                  <li>• Use &quot;⬇ Import from QuickBooks&quot; to pull existing customers into Payload</li>
                  <li>• Use &quot;⬆ Push to QuickBooks&quot; to sync Payload clients to QuickBooks</li>
                  <li>• Check sync status in the client detail pages</li>
                </ul>
              </div>
            </div>
          </div>

          {/* HubSpot Integration (Coming Soon) */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 opacity-60">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                  HubSpot Integration
                  <span className="ml-2 text-sm font-normal text-gray-500 dark:text-gray-400">(Coming Soon)</span>
                </h2>
                <p className="text-gray-600 dark:text-gray-400">
                  Sync contacts with HubSpot CRM
                </p>
              </div>
              <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center">
                <span className="text-2xl">🎯</span>
              </div>
            </div>
            <button
              disabled
              className="px-4 py-2 bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 rounded-lg font-medium cursor-not-allowed"
            >
              Coming Soon
            </button>
          </div>

          {/* System Settings */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">System Information</h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <label className="text-gray-500 dark:text-gray-400">QuickBooks Status</label>
                <p className="text-gray-900 dark:text-white font-medium">
                  {qbConnected ? 'Connected & Ready' : 'Not Connected'}
                </p>
              </div>
              <div>
                <label className="text-gray-500 dark:text-gray-400">Last Action</label>
                <p className="text-gray-900 dark:text-white font-medium">
                  {syncStatus === 'success' ? 'Sync Completed' : syncStatus === 'error' ? 'Sync Failed' : 'No recent activity'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">Loading...</div>}>
      <SettingsContent />
    </Suspense>
  )
}
