'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'

interface Technician {
  id: string
  name: string
  email: string
  phone?: string
  type: 'commission' | 'w2' | 'partner'
  vendor?: { id: string; companyName: string } | string | number
  baseCommissionRate?: number
  active: boolean
}

export default function TechniciansListPage() {
  const [technicians, setTechnicians] = useState<Technician[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [activeFilter, setActiveFilter] = useState<string>('active')
  const [sortBy, setSortBy] = useState<string>('name-asc')
  const [showFilters, setShowFilters] = useState(false)

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
    fetchTechnicians()
  }, [])

  const fetchTechnicians = async () => {
    try {
      const response = await fetch('/api/technicians?limit=1000&depth=1')
      const data = await response.json()
      setTechnicians(data.docs || [])
    } catch (error) {
      console.error('Error fetching technicians:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredTechnicians = technicians.filter((tech) => {
    const searchLower = searchTerm.toLowerCase()
    const matchesSearch =
      tech.name?.toLowerCase().includes(searchLower) ||
      tech.email?.toLowerCase().includes(searchLower) ||
      tech.phone?.toLowerCase().includes(searchLower)

    const matchesType = typeFilter === 'all' || tech.type === typeFilter

    const matchesActive =
      activeFilter === 'all' ||
      (activeFilter === 'active' && tech.active !== false) ||
      (activeFilter === 'inactive' && tech.active === false)

    return matchesSearch && matchesType && matchesActive
  })

  // Sort technicians
  const sortedTechnicians = [...filteredTechnicians].sort((a, b) => {
    const [field, direction] = sortBy.split('-')
    let comparison = 0

    switch (field) {
      case 'name':
        comparison = (a.name || '').localeCompare(b.name || '')
        break
      case 'email':
        comparison = (a.email || '').localeCompare(b.email || '')
        break
      case 'type':
        comparison = (a.type || '').localeCompare(b.type || '')
        break
      case 'rate':
        comparison = (a.baseCommissionRate || 0) - (b.baseCommissionRate || 0)
        break
      default:
        comparison = 0
    }

    return direction === 'desc' ? -comparison : comparison
  })

  // Stats for tabs
  const activeTechs = technicians.filter(t => t.active !== false).length
  const inactiveTechs = technicians.filter(t => t.active === false).length

  const getVendorName = (vendor: Technician['vendor']): string => {
    if (!vendor) return '—'
    if (typeof vendor === 'object' && 'companyName' in vendor) return vendor.companyName
    return String(vendor)
  }

  const typeLabels: Record<string, string> = {
    commission: 'Commission',
    w2: 'W2',
    partner: 'Partner',
  }

  const typeBadgeColors: Record<string, string> = {
    commission: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
    w2: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
    partner: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <svg className="animate-spin h-12 w-12 mx-auto mb-4 text-blue-600 dark:text-blue-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-lg font-medium text-gray-700 dark:text-gray-300">Loading technicians...</p>
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
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Technicians</h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">Manage technician profiles and assignments</p>
            </div>
            <Link
              href="/oms/technicians/create"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              <span>+</span> Add Technician
            </Link>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-8 py-4">
        {/* Compact filter row */}
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
          <div className="sm:w-64">
            <input
              type="text"
              placeholder="Search technicians..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
            />
          </div>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
          >
            <option value="all">All Types</option>
            <option value="commission">Commission</option>
            <option value="w2">W2</option>
            <option value="partner">Partner</option>
          </select>
          <button
            onClick={() => {
              setSearchTerm('')
              setTypeFilter('all')
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
            { key: 'active', label: 'Active', count: activeTechs },
            { key: 'inactive', label: 'Inactive', count: inactiveTechs },
            { key: 'all', label: 'All', count: technicians.length },
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
          Showing {sortedTechnicians.length} technicians
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
                    onClick={() => handleSort('name')}
                    className="text-left px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 select-none"
                  >
                    Name<SortIndicator field="name" />
                  </th>
                  <th
                    onClick={() => handleSort('email')}
                    className="text-left px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 select-none"
                  >
                    Email<SortIndicator field="email" />
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Phone</th>
                  <th
                    onClick={() => handleSort('type')}
                    className="text-left px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 select-none"
                  >
                    Type<SortIndicator field="type" />
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Vendor</th>
                  <th
                    onClick={() => handleSort('rate')}
                    className="text-left px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 select-none"
                  >
                    Rate<SortIndicator field="rate" />
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Active</th>
                </tr>
              </thead>
              <tbody>
                {sortedTechnicians.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                      No technicians found matching your filters
                    </td>
                  </tr>
                ) : (
                  sortedTechnicians.map((tech) => (
                    <tr
                      key={tech.id}
                      className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-900 cursor-pointer transition-colors"
                      onClick={() => window.location.href = `/oms/technicians/${tech.id}`}
                    >
                      <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">
                        {tech.name}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                        {tech.email}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                        {tech.phone || '—'}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 text-xs rounded-full font-semibold ${typeBadgeColors[tech.type] || ''}`}>
                          {typeLabels[tech.type] || tech.type}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                        {tech.type === 'partner' ? getVendorName(tech.vendor) : '—'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                        {tech.baseCommissionRate != null ? `${(tech.baseCommissionRate * 100).toFixed(0)}%` : '—'}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 text-xs rounded-full font-semibold ${
                          tech.active !== false
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                            : 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300'
                        }`}>
                          {tech.active !== false ? 'Active' : 'Inactive'}
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
