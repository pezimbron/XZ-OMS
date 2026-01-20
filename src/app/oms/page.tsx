'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'

interface DashboardStats {
  totalJobs: number
  activeJobs: number
  unassignedJobs: number
  todayJobs: number
  myJobs?: number
  upcomingJobs?: number
  completedJobs?: number
  pendingCommissions?: number
}

export default function OMSDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalJobs: 0,
    activeJobs: 0,
    unassignedJobs: 0,
    todayJobs: 0,
  })
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    fetchUser()
  }, [])

  useEffect(() => {
    if (user) {
      fetchStats()
    }
  }, [user])

  const fetchUser = async () => {
    try {
      const response = await fetch('/api/users/me')
      const data = await response.json()
      setUser(data.user)
    } catch (error) {
      console.error('Error fetching user:', error)
    }
  }

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/jobs?limit=1000&depth=2')
      const data = await response.json()
      let jobs = data.docs || []

      // Filter jobs for tech users
      if (user?.role === 'tech') {
        jobs = jobs.filter((job: any) => {
          const jobTech = job.tech
          if (!jobTech) return false
          
          const techUserId = typeof jobTech === 'object' && jobTech.user
            ? (typeof jobTech.user === 'object' ? jobTech.user.id : jobTech.user)
            : null
          
          return techUserId === user.id
        })
      }

      const today = new Date().toDateString()
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 7)
      
      if (user?.role === 'tech') {
        // Tech-specific stats
        setStats({
          totalJobs: jobs.length,
          activeJobs: jobs.filter((j: any) => j.status !== 'done' && j.status !== 'archived').length,
          myJobs: jobs.length,
          upcomingJobs: jobs.filter((j: any) => {
            if (!j.targetDate) return false
            const jobDate = new Date(j.targetDate)
            return jobDate >= new Date() && jobDate <= tomorrow
          }).length,
          completedJobs: jobs.filter((j: any) => j.status === 'done').length,
          pendingCommissions: jobs.filter((j: any) => j.status === 'done' && j.completionStatus === 'completed').reduce((sum: number, j: any) => {
            return sum + (j.vendorPrice || 0) + (j.travelPayout || 0) + (j.offHoursPayout || 0)
          }, 0),
          todayJobs: 0,
          unassignedJobs: 0,
        })
      } else {
        // Admin stats
        setStats({
          totalJobs: jobs.length,
          activeJobs: jobs.filter((j: any) => j.status !== 'done' && j.status !== 'archived').length,
          unassignedJobs: jobs.filter((j: any) => !j.tech).length,
          todayJobs: jobs.filter((j: any) => {
            if (!j.targetDate) return false
            return new Date(j.targetDate).toDateString() === today
          }).length,
        })
      }
    } catch (error) {
      console.error('Error fetching stats:', error)
    } finally {
      setLoading(false)
    }
  }

  const quickActions = user?.role === 'tech' 
    ? [
        { label: 'My Jobs', href: '/oms/jobs', icon: '📋', color: 'from-blue-500 to-indigo-600' },
        { label: 'Calendar', href: '/oms/calendar', icon: '📅', color: 'from-green-500 to-emerald-600' },
        { label: 'Commissions', href: '/oms/commissions', icon: '💵', color: 'from-purple-500 to-pink-600' },
      ]
    : [
        { label: 'Quick Create Job', href: '/oms/quick-create', icon: '⚡', color: 'from-green-500 to-emerald-600' },
        { label: 'View Calendar', href: '/oms/calendar', icon: '📅', color: 'from-blue-500 to-indigo-600' },
        { label: 'Create Job', href: '/oms/jobs/create', icon: '➕', color: 'from-purple-500 to-pink-600' },
        { label: 'All Jobs', href: '/oms/jobs', icon: '📋', color: 'from-orange-500 to-red-600' },
      ]

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 md:px-8 py-4 md:py-6">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
        <p className="text-sm md:text-base text-gray-600 dark:text-gray-400 mt-1">Welcome back! Here&apos;s your overview.</p>
      </div>

      {/* Main Content */}
      <div className="p-4 md:p-8 space-y-6 md:space-y-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
          {user?.role === 'tech' ? (
            <>
              <div className="bg-white dark:bg-gray-800 rounded-xl p-4 md:p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="flex flex-col md:flex-row items-start md:items-center gap-3 md:gap-4">
                  <div className="w-10 h-10 md:w-12 md:h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                    <span className="text-xl md:text-2xl">📋</span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400">My Jobs</p>
                    <p className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white truncate">
                      {loading ? '...' : stats.myJobs}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-xl p-4 md:p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="flex flex-col md:flex-row items-start md:items-center gap-3 md:gap-4">
                  <div className="w-10 h-10 md:w-12 md:h-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                    <span className="text-xl md:text-2xl">✅</span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400">Active</p>
                    <p className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white truncate">
                      {loading ? '...' : stats.activeJobs}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-xl p-4 md:p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="flex flex-col md:flex-row items-start md:items-center gap-3 md:gap-4">
                  <div className="w-10 h-10 md:w-12 md:h-12 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                    <span className="text-xl md:text-2xl">📅</span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400">Next 7 Days</p>
                    <p className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white truncate">
                      {loading ? '...' : stats.upcomingJobs}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-xl p-4 md:p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="flex flex-col md:flex-row items-start md:items-center gap-3 md:gap-4">
                  <div className="w-10 h-10 md:w-12 md:h-12 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                    <span className="text-xl md:text-2xl">💵</span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400">Pending Pay</p>
                    <p className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white truncate">
                      {loading ? '...' : `$${(stats.pendingCommissions || 0).toFixed(0)}`}
                    </p>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="bg-white dark:bg-gray-800 rounded-xl p-4 md:p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="flex flex-col md:flex-row items-start md:items-center gap-3 md:gap-4">
                  <div className="w-10 h-10 md:w-12 md:h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                    <span className="text-xl md:text-2xl">📊</span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400">Total Jobs</p>
                    <p className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white truncate">
                      {loading ? '...' : stats.totalJobs}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-xl p-4 md:p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="flex flex-col md:flex-row items-start md:items-center gap-3 md:gap-4">
                  <div className="w-10 h-10 md:w-12 md:h-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                    <span className="text-xl md:text-2xl">✅</span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400">Active Jobs</p>
                    <p className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white truncate">
                      {loading ? '...' : stats.activeJobs}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-xl p-4 md:p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="flex flex-col md:flex-row items-start md:items-center gap-3 md:gap-4">
                  <div className="w-10 h-10 md:w-12 md:h-12 bg-amber-100 dark:bg-amber-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                    <span className="text-xl md:text-2xl">⏳</span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400">Unassigned</p>
                    <p className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white truncate">
                      {loading ? '...' : stats.unassignedJobs}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-xl p-4 md:p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="flex flex-col md:flex-row items-start md:items-center gap-3 md:gap-4">
                  <div className="w-10 h-10 md:w-12 md:h-12 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                    <span className="text-xl md:text-2xl">📅</span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400">Today&apos;s Jobs</p>
                    <p className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white truncate">
                      {loading ? '...' : stats.todayJobs}
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Quick Actions */}
        <div>
          <h2 className="text-lg md:text-xl font-bold text-gray-900 dark:text-white mb-3 md:mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
            {quickActions.map((action) => (
              <Link
                key={action.href}
                href={action.href}
                className="group"
              >
                <div className={`bg-gradient-to-br ${action.color} rounded-xl p-4 md:p-6 shadow-lg hover:shadow-xl transition-all transform hover:scale-105`}>
                  <div className="text-white">
                    <div className="text-3xl md:text-4xl mb-2 md:mb-3">{action.icon}</div>
                    <h3 className="text-sm md:text-lg font-semibold">{action.label}</h3>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
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
