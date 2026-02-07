'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'

interface DashboardStats {
  // Schedule
  todayJobs: number
  thisWeekJobs: number
  unassignedJobs: number
  // Finance
  readyToInvoice: number
  readyToInvoiceAmount: number
  outstandingAmount: number
  // Operations
  pendingQC: number
  activeJobs: number
}

interface Job {
  id: string
  jobId: string
  modelName: string
  status: string
  targetDate?: string
  client?: { id: string; name: string } | string
  technician?: { id: string; name: string } | string
  region?: string
  invoiceStatus?: string
  totalPrice?: number
}

export default function OMSDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    todayJobs: 0,
    thisWeekJobs: 0,
    unassignedJobs: 0,
    readyToInvoice: 0,
    readyToInvoiceAmount: 0,
    outstandingAmount: 0,
    pendingQC: 0,
    activeJobs: 0,
  })
  const [recentJobs, setRecentJobs] = useState<Job[]>([])
  const [upcomingJobs, setUpcomingJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    fetchUser()
  }, [])

  useEffect(() => {
    if (user) {
      fetchDashboardData()
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

  const fetchDashboardData = async () => {
    try {
      // Fetch jobs and invoices in parallel
      const [jobsRes, invoicesRes] = await Promise.all([
        fetch('/api/jobs?limit=1000&depth=1'),
        fetch('/api/invoices?limit=1000&depth=1'),
      ])

      const [jobsData, invoicesData] = await Promise.all([
        jobsRes.json(),
        invoicesRes.json(),
      ])

      const jobs = jobsData.docs || []
      const invoices = invoicesData.docs || []

      // Date calculations
      const now = new Date()
      const today = now.toDateString()
      const weekFromNow = new Date(now)
      weekFromNow.setDate(weekFromNow.getDate() + 7)

      // Calculate stats
      const todayJobs = jobs.filter((j: any) => {
        if (!j.targetDate) return false
        return new Date(j.targetDate).toDateString() === today
      }).length

      const thisWeekJobs = jobs.filter((j: any) => {
        if (!j.targetDate) return false
        const jobDate = new Date(j.targetDate)
        return jobDate >= now && jobDate <= weekFromNow
      }).length

      const unassignedJobs = jobs.filter((j: any) =>
        !j.technician && j.status !== 'done' && j.status !== 'cancelled'
      ).length

      const readyToInvoiceJobs = jobs.filter((j: any) =>
        j.status === 'done' && (j.invoiceStatus === 'not-invoiced' || j.invoiceStatus === 'ready')
      )
      const readyToInvoice = readyToInvoiceJobs.length

      const pendingQC = jobs.filter((j: any) =>
        j.status === 'pending-qc' || j.status === 'qc-failed'
      ).length

      const activeJobs = jobs.filter((j: any) =>
        j.status !== 'done' && j.status !== 'cancelled' && j.status !== 'archived'
      ).length

      // Calculate outstanding from unpaid invoices
      const outstandingAmount = invoices
        .filter((inv: any) => inv.status !== 'paid')
        .reduce((sum: number, inv: any) => {
          const total = inv.total || 0
          const paid = inv.paidAmount || 0
          return sum + (total - paid)
        }, 0)

      setStats({
        todayJobs,
        thisWeekJobs,
        unassignedJobs,
        readyToInvoice,
        readyToInvoiceAmount: 0, // Would need line item calculation
        outstandingAmount,
        pendingQC,
        activeJobs,
      })

      // Get upcoming jobs (next 7 days, sorted by date)
      const upcoming = jobs
        .filter((j: any) => {
          if (!j.targetDate || j.status === 'done' || j.status === 'cancelled') return false
          const jobDate = new Date(j.targetDate)
          return jobDate >= now && jobDate <= weekFromNow
        })
        .sort((a: any, b: any) => new Date(a.targetDate).getTime() - new Date(b.targetDate).getTime())
        .slice(0, 5)

      setUpcomingJobs(upcoming)

      // Get recent jobs (last 5 created/updated)
      const recent = [...jobs]
        .sort((a: any, b: any) => {
          const dateA = new Date(a.updatedAt || a.createdAt).getTime()
          const dateB = new Date(b.updatedAt || b.createdAt).getTime()
          return dateB - dateA
        })
        .slice(0, 5)

      setRecentJobs(recent)

    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const today = new Date()
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    if (date.toDateString() === today.toDateString()) {
      return 'Today'
    }
    if (date.toDateString() === tomorrow.toDateString()) {
      return 'Tomorrow'
    }
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  }

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      'scheduled': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
      'in-progress': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
      'done': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      'pending-qc': 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
      'cancelled': 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
    }
    return styles[status] || 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300'
  }

  const getClientName = (client: any) => {
    if (!client) return 'No client'
    if (typeof client === 'object') return client.name || 'Unknown'
    return 'Unknown'
  }

  const getTechName = (tech: any) => {
    if (!tech) return 'Unassigned'
    if (typeof tech === 'object') return tech.name || 'Unknown'
    return 'Unknown'
  }

  const quickActions = [
    { label: 'Quick Create', href: '/oms/quick-create', icon: '⚡', color: 'from-green-500 to-emerald-600' },
    { label: 'Calendar', href: '/oms/calendar', icon: '📅', color: 'from-blue-500 to-indigo-600' },
    { label: 'Invoicing', href: '/oms/invoicing', icon: '💰', color: 'from-purple-500 to-pink-600' },
    { label: 'Reports', href: '/oms/reports', icon: '📈', color: 'from-orange-500 to-red-600' },
  ]

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 md:px-8 py-4 md:py-6">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
        <p className="text-sm md:text-base text-gray-600 dark:text-gray-400 mt-1">
          {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
        </p>
      </div>

      {/* Main Content */}
      <div className="p-4 md:p-8 space-y-6 md:space-y-8">
        {/* Stats Cards - Row 1: Schedule */}
        <div>
          <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Schedule</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
            <Link href="/oms/calendar" className="bg-white dark:bg-gray-800 rounded-xl p-4 md:p-5 shadow-sm border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                  <span className="text-xl">📅</span>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Today</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {loading ? '...' : stats.todayJobs}
                  </p>
                </div>
              </div>
            </Link>

            <Link href="/oms/calendar" className="bg-white dark:bg-gray-800 rounded-xl p-4 md:p-5 shadow-sm border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg flex items-center justify-center">
                  <span className="text-xl">📆</span>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">This Week</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {loading ? '...' : stats.thisWeekJobs}
                  </p>
                </div>
              </div>
            </Link>

            <Link href="/oms/jobs?tab=active" className="bg-white dark:bg-gray-800 rounded-xl p-4 md:p-5 shadow-sm border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                  <span className="text-xl">✅</span>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Active Jobs</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {loading ? '...' : stats.activeJobs}
                  </p>
                </div>
              </div>
            </Link>

            <Link href="/oms/jobs?status=unassigned" className="bg-white dark:bg-gray-800 rounded-xl p-4 md:p-5 shadow-sm border border-gray-200 dark:border-gray-700 hover:border-amber-300 dark:hover:border-amber-700 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/30 rounded-lg flex items-center justify-center">
                  <span className="text-xl">⚠️</span>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Unassigned</p>
                  <p className={`text-2xl font-bold ${stats.unassignedJobs > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-gray-900 dark:text-white'}`}>
                    {loading ? '...' : stats.unassignedJobs}
                  </p>
                </div>
              </div>
            </Link>
          </div>
        </div>

        {/* Stats Cards - Row 2: Finance & Operations */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Finance</h2>
            <div className="grid grid-cols-2 gap-3 md:gap-4">
              <Link href="/oms/invoicing" className="bg-white dark:bg-gray-800 rounded-xl p-4 md:p-5 shadow-sm border border-gray-200 dark:border-gray-700 hover:border-green-300 dark:hover:border-green-700 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                    <span className="text-xl">💰</span>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Ready to Invoice</p>
                    <p className={`text-2xl font-bold ${stats.readyToInvoice > 0 ? 'text-green-600 dark:text-green-400' : 'text-gray-900 dark:text-white'}`}>
                      {loading ? '...' : stats.readyToInvoice}
                    </p>
                  </div>
                </div>
              </Link>

              <Link href="/oms/invoices?status=unpaid" className="bg-white dark:bg-gray-800 rounded-xl p-4 md:p-5 shadow-sm border border-gray-200 dark:border-gray-700 hover:border-red-300 dark:hover:border-red-700 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center">
                    <span className="text-xl">📊</span>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Outstanding</p>
                    <p className={`text-xl font-bold ${stats.outstandingAmount > 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white'}`}>
                      {loading ? '...' : formatCurrency(stats.outstandingAmount)}
                    </p>
                  </div>
                </div>
              </Link>
            </div>
          </div>

          <div>
            <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Operations</h2>
            <div className="grid grid-cols-2 gap-3 md:gap-4">
              <Link href="/oms/qc-queue" className="bg-white dark:bg-gray-800 rounded-xl p-4 md:p-5 shadow-sm border border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-700 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                    <span className="text-xl">🎬</span>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Pending QC</p>
                    <p className={`text-2xl font-bold ${stats.pendingQC > 0 ? 'text-purple-600 dark:text-purple-400' : 'text-gray-900 dark:text-white'}`}>
                      {loading ? '...' : stats.pendingQC}
                    </p>
                  </div>
                </div>
              </Link>

              <Link href="/oms/reports" className="bg-white dark:bg-gray-800 rounded-xl p-4 md:p-5 shadow-sm border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                    <span className="text-xl">📈</span>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">View Reports</p>
                    <p className="text-sm font-medium text-blue-600 dark:text-blue-400">Analytics →</p>
                  </div>
                </div>
              </Link>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div>
          <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Quick Actions</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
            {quickActions.map((action) => (
              <Link key={action.href} href={action.href} className="group">
                <div className={`bg-gradient-to-br ${action.color} rounded-xl p-4 md:p-5 shadow-lg hover:shadow-xl transition-all transform hover:scale-105`}>
                  <div className="text-white">
                    <div className="text-2xl md:text-3xl mb-2">{action.icon}</div>
                    <h3 className="text-sm md:text-base font-semibold">{action.label}</h3>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Activity Lists */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
          {/* Upcoming Schedule */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Upcoming Schedule</h2>
              <Link href="/oms/calendar" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
                View All →
              </Link>
            </div>
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {loading ? (
                <div className="p-5 text-center text-gray-500 dark:text-gray-400">Loading...</div>
              ) : upcomingJobs.length === 0 ? (
                <div className="p-5 text-center text-gray-500 dark:text-gray-400">No upcoming jobs this week</div>
              ) : (
                upcomingJobs.map((job) => (
                  <Link
                    key={job.id}
                    href={`/oms/jobs/${job.id}`}
                    className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {job.modelName || job.jobId}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {getClientName(job.client)} • {getTechName(job.technician)}
                      </p>
                    </div>
                    <div className="ml-4 text-right">
                      <p className="text-sm font-medium text-blue-600 dark:text-blue-400">
                        {job.targetDate ? formatDate(job.targetDate) : 'No date'}
                      </p>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>

          {/* Recent Jobs */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Recent Activity</h2>
              <Link href="/oms/jobs" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
                View All →
              </Link>
            </div>
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {loading ? (
                <div className="p-5 text-center text-gray-500 dark:text-gray-400">Loading...</div>
              ) : recentJobs.length === 0 ? (
                <div className="p-5 text-center text-gray-500 dark:text-gray-400">No recent jobs</div>
              ) : (
                recentJobs.map((job) => (
                  <Link
                    key={job.id}
                    href={`/oms/jobs/${job.id}`}
                    className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {job.modelName || job.jobId}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {getClientName(job.client)}
                      </p>
                    </div>
                    <div className="ml-4">
                      <span className={`px-2 py-1 text-xs rounded-full font-medium ${getStatusBadge(job.status)}`}>
                        {job.status}
                      </span>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
