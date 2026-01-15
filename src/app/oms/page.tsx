'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'

interface DashboardStats {
  totalJobs: number
  activeJobs: number
  unassignedJobs: number
  todayJobs: number
}

export default function OMSDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalJobs: 0,
    activeJobs: 0,
    unassignedJobs: 0,
    todayJobs: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/jobs?limit=1000')
      const data = await response.json()
      const jobs = data.docs || []

      const today = new Date().toDateString()
      setStats({
        totalJobs: jobs.length,
        activeJobs: jobs.filter((j: any) => j.status !== 'done' && j.status !== 'archived').length,
        unassignedJobs: jobs.filter((j: any) => !j.tech).length,
        todayJobs: jobs.filter((j: any) => {
          if (!j.targetDate) return false
          return new Date(j.targetDate).toDateString() === today
        }).length,
      })
    } catch (error) {
      console.error('Error fetching stats:', error)
    } finally {
      setLoading(false)
    }
  }

  const quickActions = [
    { label: 'Quick Create Job', href: '/oms/quick-create', icon: '⚡', color: 'from-green-500 to-emerald-600' },
    { label: 'View Calendar', href: '/oms/calendar', icon: '📅', color: 'from-blue-500 to-indigo-600' },
    { label: 'Create Job', href: '/oms/jobs/create', icon: '➕', color: 'from-purple-500 to-pink-600' },
    { label: 'All Jobs', href: '/oms/jobs', icon: '📋', color: 'from-orange-500 to-red-600' },
  ]

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900" style={{ minHeight: '100vh', backgroundColor: '#f9fafb' }}>
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700" style={{ backgroundColor: '#ffffff', borderBottom: '1px solid #e5e7eb', padding: '24px 32px' }}>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white" style={{ fontSize: '30px', fontWeight: 'bold', color: '#111827', marginBottom: '4px' }}>Dashboard</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1" style={{ color: '#6b7280', fontSize: '14px' }}>Welcome back! Here's your overview.</p>
      </div>

      {/* Main Content */}
      <div className="p-8 space-y-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                <span className="text-2xl">📊</span>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Jobs</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  {loading ? '...' : stats.totalJobs}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                <span className="text-2xl">✅</span>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Active Jobs</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  {loading ? '...' : stats.activeJobs}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/30 rounded-lg flex items-center justify-center">
                <span className="text-2xl">⏳</span>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Unassigned</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  {loading ? '...' : stats.unassignedJobs}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                <span className="text-2xl">📅</span>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Today's Jobs</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  {loading ? '...' : stats.todayJobs}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {quickActions.map((action) => (
              <Link
                key={action.href}
                href={action.href}
                className="group"
              >
                <div className={`bg-gradient-to-br ${action.color} rounded-xl p-6 shadow-lg hover:shadow-xl transition-all transform hover:scale-105`}>
                  <div className="text-white">
                    <div className="text-4xl mb-3">{action.icon}</div>
                    <h3 className="text-lg font-semibold">{action.label}</h3>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Jobs */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Recent Jobs</h2>
              <Link href="/oms/jobs" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
                View All
              </Link>
            </div>
            <div className="space-y-3">
              <p className="text-sm text-gray-600 dark:text-gray-400">Loading recent jobs...</p>
            </div>
          </div>

          {/* Upcoming Schedule */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Upcoming Schedule</h2>
              <Link href="/oms/calendar" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
                View Calendar
              </Link>
            </div>
            <div className="space-y-3">
              <p className="text-sm text-gray-600 dark:text-gray-400">Loading schedule...</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
