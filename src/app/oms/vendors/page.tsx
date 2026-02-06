'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'

interface Vendor {
  id: string
  companyName: string
  contactPerson?: string
  billingEmail: string
  billingPhone?: string
  active?: boolean
  integrations?: {
    quickbooks?: {
      vendorId?: string
      syncStatus?: string
      lastSyncedAt?: string
    }
  }
}

export default function VendorsListPage() {
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [activeFilter, setActiveFilter] = useState<string>('active')
  const [importStatus, setImportStatus] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [isImporting, setIsImporting] = useState(false)
  const [sortBy, setSortBy] = useState<string>('companyName-asc')

  // Sort helper
  const handleSort = (field: string) => {
    const [currentField, currentDirection] = sortBy.split('-')
    if (currentField === field) {
      setSortBy(`${field}-${currentDirection === 'asc' ? 'desc' : 'asc'}`)
    } else {
      setSortBy(`${field}-asc`)
    }
  }

  const SortIndicator = ({ field }: { field: string }) => {
    const [currentField, direction] = sortBy.split('-')
    if (currentField !== field) return null
    return <span className="ml-1 text-blue-500">{direction === 'asc' ? '↑' : '↓'}</span>
  }

  useEffect(() => {
    fetchVendors()
  }, [])

  const fetchVendors = async () => {
    try {
      const response = await fetch('/api/vendors?limit=1000&depth=1')
      const data = await response.json()
      setVendors(data.docs || [])
    } catch (error) {
      console.error('Error fetching vendors:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleImportFromQB = async () => {
    setIsImporting(true)
    setImportStatus(null)
    try {
      const response = await fetch('/api/quickbooks/import-vendors', { method: 'POST' })
      const data = await response.json()
      if (response.ok) {
        setImportStatus({
          message: `Imported ${data.results.imported} / Updated ${data.results.updated} / Skipped ${data.results.skipped} / Errors ${data.results.errors}`,
          type: 'success',
        })
        // Refresh the list
        await fetchVendors()
      } else {
        setImportStatus({ message: data.error || 'Import failed', type: 'error' })
      }
    } catch (error) {
      setImportStatus({ message: 'Failed to connect to QuickBooks import', type: 'error' })
    } finally {
      setIsImporting(false)
    }
  }

  const filteredVendors = vendors.filter((vendor) => {
    const searchLower = searchTerm.toLowerCase()
    const matchesSearch =
      vendor.companyName?.toLowerCase().includes(searchLower) ||
      vendor.contactPerson?.toLowerCase().includes(searchLower) ||
      vendor.billingEmail?.toLowerCase().includes(searchLower)

    const matchesActive =
      activeFilter === 'all' ||
      (activeFilter === 'active' && vendor.active !== false) ||
      (activeFilter === 'inactive' && vendor.active === false)

    return matchesSearch && matchesActive
  })

  // Sort vendors
  const sortedVendors = [...filteredVendors].sort((a, b) => {
    const [field, direction] = sortBy.split('-')
    let comparison = 0

    switch (field) {
      case 'companyName':
        comparison = (a.companyName || '').localeCompare(b.companyName || '')
        break
      case 'contact':
        comparison = (a.contactPerson || '').localeCompare(b.contactPerson || '')
        break
      case 'email':
        comparison = (a.billingEmail || '').localeCompare(b.billingEmail || '')
        break
      default:
        comparison = 0
    }

    return direction === 'desc' ? -comparison : comparison
  })

  // Stats for tabs
  const activeVendors = vendors.filter(v => v.active !== false).length
  const inactiveVendors = vendors.filter(v => v.active === false).length

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <svg className="animate-spin h-12 w-12 mx-auto mb-4 text-blue-600 dark:text-blue-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-lg font-medium text-gray-700 dark:text-gray-300">Loading vendors...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Vendors</h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">Manage subcontractor vendor companies</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleImportFromQB}
                disabled={isImporting}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
              >
                {isImporting ? 'Importing...' : 'Import from QuickBooks'}
              </button>
              <Link
                href="/oms/vendors/create"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
              >
                <span>+</span> Add Vendor
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Import Status */}
      {importStatus && (
        <div className={`mx-8 mt-4 p-4 rounded-lg border ${
          importStatus.type === 'success'
            ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
            : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
        }`}>
          <p className={`text-sm ${
            importStatus.type === 'success'
              ? 'text-green-800 dark:text-green-200'
              : 'text-red-800 dark:text-red-200'
          }`}>
            {importStatus.message}
          </p>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-8 py-4">
        {/* Compact filter row */}
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
          <div className="sm:w-64">
            <input
              type="text"
              placeholder="Search vendors..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
            />
          </div>
          <button
            onClick={() => {
              setSearchTerm('')
              setActiveFilter('active')
            }}
            className="px-3 py-2 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-sm font-medium whitespace-nowrap"
          >
            Clear All
          </button>
        </div>

        {/* Tabs for Active/Inactive/All */}
        <div className="flex gap-1 mt-4 border-b border-gray-200 dark:border-gray-700">
          {[
            { key: 'active', label: 'Active', count: activeVendors },
            { key: 'inactive', label: 'Inactive', count: inactiveVendors },
            { key: 'all', label: 'All', count: vendors.length },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveFilter(tab.key)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeFilter === tab.key
                  ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                  : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </div>

        <div className="mt-3 text-sm text-gray-600 dark:text-gray-400">
          Showing {sortedVendors.length} vendors
        </div>
      </div>

      {/* Table */}
      <div className="p-8">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                  <th
                    onClick={() => handleSort('companyName')}
                    className="text-left px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 select-none"
                  >
                    Company<SortIndicator field="companyName" />
                  </th>
                  <th
                    onClick={() => handleSort('contact')}
                    className="text-left px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 select-none"
                  >
                    Contact<SortIndicator field="contact" />
                  </th>
                  <th
                    onClick={() => handleSort('email')}
                    className="text-left px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 select-none"
                  >
                    Billing Email<SortIndicator field="email" />
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Phone</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Active</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">QB Sync</th>
                </tr>
              </thead>
              <tbody>
                {sortedVendors.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                      No vendors found matching your filters
                    </td>
                  </tr>
                ) : (
                  sortedVendors.map((vendor) => (
                    <tr
                      key={vendor.id}
                      className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-900 cursor-pointer transition-colors"
                      onClick={() => window.location.href = `/oms/vendors/${vendor.id}`}
                    >
                      <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">
                        {vendor.companyName}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                        {vendor.contactPerson || '—'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                        {vendor.billingEmail}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                        {vendor.billingPhone || '—'}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 text-xs rounded-full font-semibold ${
                          vendor.active !== false
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                            : 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300'
                        }`}>
                          {vendor.active !== false ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 text-xs rounded-full font-semibold ${
                          vendor.integrations?.quickbooks?.syncStatus === 'synced'
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                            : vendor.integrations?.quickbooks?.syncStatus === 'error'
                            ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                            : 'bg-gray-100 text-gray-600 dark:bg-gray-900/30 dark:text-gray-400'
                        }`}>
                          {vendor.integrations?.quickbooks?.syncStatus === 'synced' ? 'Synced' :
                           vendor.integrations?.quickbooks?.syncStatus === 'error' ? 'Error' : 'Not Synced'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
