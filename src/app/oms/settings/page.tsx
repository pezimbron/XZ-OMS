'use client'

import React, { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'

export default function SettingsPage() {
  const searchParams = useSearchParams()
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle')
  const [syncMessage, setSyncMessage] = useState('')
  const [qbConnected, setQbConnected] = useState(false)

  useEffect(() => {
    const qbStatus = searchParams.get('quickbooks')
    const message = searchParams.get('message')

    if (qbStatus === 'connected') {
      setQbConnected(true)
      setSyncMessage('Successfully connected to QuickBooks!')
    } else if (qbStatus === 'error') {
      setSyncMessage(`QuickBooks connection error: ${message || 'Unknown error'}`)
    }
  }, [searchParams])

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
        body: JSON.stringify({ syncAll: true }),
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

              <div className="flex gap-3">
                <button
                  onClick={handleConnectQuickBooks}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
                >
                  {qbConnected ? 'Reconnect' : 'Connect'} to QuickBooks
                </button>

                {qbConnected && (
                  <button
                    onClick={handleSyncAllClients}
                    disabled={syncStatus === 'syncing'}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors"
                  >
                    {syncStatus === 'syncing' ? 'Syncing...' : 'Sync All Clients'}
                  </button>
                )}
              </div>

              <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">How it works:</h3>
                <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                  <li>• Click "Connect to QuickBooks" to authorize access</li>
                  <li>• Clients are automatically synced when created or updated</li>
                  <li>• Use "Sync All Clients" to manually sync all existing clients</li>
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
