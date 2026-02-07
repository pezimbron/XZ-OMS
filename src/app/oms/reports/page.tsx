'use client'

import React, { useState, useEffect } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts'

interface RevenueData {
  summary: {
    totalRevenue: number
    invoiceCount: number
    averageInvoice: number
    paidAmount: number
    outstandingAmount: number
  }
  byPeriod: Array<{
    period: string
    revenue: number
    invoices: number
    paid: number
    outstanding: number
  }>
  byClient: Array<{
    clientId: string
    clientName: string
    revenue: number
    invoices: number
    paid: number
  }>
}

interface TechData {
  summary: {
    totalTechs: number
    totalJobs: number
    totalEarnings: number
    averageJobsPerTech: number
  }
  techs: Array<{
    techId: string
    name: string
    email: string
    type: string
    jobsCompleted: number
    totalEarnings: number
    averageEarnings: number
    regionsServed: string[]
  }>
}

interface ClientData {
  summary: {
    totalClients: number
    totalJobs: number
    totalSpend: number
    totalOutstanding: number
    averageSpendPerClient: number
  }
  clients: Array<{
    clientId: string
    name: string
    clientType: string
    jobCount: number
    completedJobs: number
    totalSpend: number
    averageJobValue: number
    lastJobDate: string | null
    invoiceCount: number
    paidInvoices: number
    pendingInvoices: number
    outstandingAmount: number
  }>
}

interface OpsData {
  summary: {
    totalJobs: number
    assignedJobs: number
    unassignedJobs: number
    completedJobs: number
    cancelledJobs: number
    completionRate: number
    cancellationRate: number
    assignmentRate: number
  }
  jobsByStatus: Record<string, number>
  jobsByRegion: Record<string, number>
  jobsByMonth: Array<{ month: string; count: number }>
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16']

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

const formatPercent = (value: number) => {
  return `${(value * 100).toFixed(1)}%`
}

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<'revenue' | 'tech' | 'client' | 'ops'>('revenue')
  const [startDate, setStartDate] = useState(() => {
    const date = new Date()
    date.setMonth(date.getMonth() - 1)
    return date.toISOString().split('T')[0]
  })
  const [endDate, setEndDate] = useState(() => {
    return new Date().toISOString().split('T')[0]
  })
  const [groupBy, setGroupBy] = useState<'day' | 'week' | 'month'>('month')
  const [loading, setLoading] = useState(true)

  const [revenueData, setRevenueData] = useState<RevenueData | null>(null)
  const [techData, setTechData] = useState<TechData | null>(null)
  const [clientData, setClientData] = useState<ClientData | null>(null)
  const [opsData, setOpsData] = useState<OpsData | null>(null)

  const fetchData = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        startDate,
        endDate,
        groupBy,
      })

      const [revenueRes, techRes, clientRes, opsRes] = await Promise.all([
        fetch(`/api/reports/revenue?${params}`),
        fetch(`/api/reports/tech-performance?${params}`),
        fetch(`/api/reports/client-activity?${params}`),
        fetch(`/api/reports/operations?${params}`),
      ])

      const [revenue, tech, client, ops] = await Promise.all([
        revenueRes.json(),
        techRes.json(),
        clientRes.json(),
        opsRes.json(),
      ])

      setRevenueData(revenue)
      setTechData(tech)
      setClientData(client)
      setOpsData(ops)
    } catch (error) {
      console.error('Error fetching report data:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [startDate, endDate, groupBy])

  const exportToCSV = (data: any[], filename: string) => {
    if (!data || data.length === 0) return

    const headers = Object.keys(data[0])
    const csvContent = [
      headers.join(','),
      ...data.map(row =>
        headers.map(h => {
          const val = row[h]
          if (typeof val === 'string' && val.includes(',')) {
            return `"${val}"`
          }
          return val
        }).join(',')
      )
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `${filename}_${startDate}_${endDate}.csv`
    link.click()
  }

  const StatCard = ({ label, value, subValue }: { label: string; value: string; subValue?: string }) => (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">{label}</p>
      <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
      {subValue && <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{subValue}</p>}
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Reports & Analytics</h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">Business performance insights</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-8 py-4">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600 dark:text-gray-400">From:</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600 dark:text-gray-400">To:</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600 dark:text-gray-400">Group by:</label>
            <select
              value={groupBy}
              onChange={(e) => setGroupBy(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
            >
              <option value="day">Day</option>
              <option value="week">Week</option>
              <option value="month">Month</option>
            </select>
          </div>
          <button
            onClick={fetchData}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium"
          >
            Refresh
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mt-4 border-b border-gray-200 dark:border-gray-700">
          {[
            { key: 'revenue', label: 'Revenue' },
            { key: 'tech', label: 'Tech Performance' },
            { key: 'client', label: 'Client Activity' },
            { key: 'ops', label: 'Operations' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key
                  ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                  : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="p-8">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <svg className="animate-spin h-12 w-12 mx-auto mb-4 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <p className="text-gray-600 dark:text-gray-400">Loading reports...</p>
            </div>
          </div>
        ) : (
          <>
            {/* Revenue Tab */}
            {activeTab === 'revenue' && revenueData && (
              <div className="space-y-6">
                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                  <StatCard
                    label="Total Revenue"
                    value={formatCurrency(revenueData.summary.totalRevenue)}
                  />
                  <StatCard
                    label="Invoices"
                    value={String(revenueData.summary.invoiceCount)}
                  />
                  <StatCard
                    label="Avg Invoice"
                    value={formatCurrency(revenueData.summary.averageInvoice)}
                  />
                  <StatCard
                    label="Paid"
                    value={formatCurrency(revenueData.summary.paidAmount)}
                  />
                  <StatCard
                    label="Outstanding"
                    value={formatCurrency(revenueData.summary.outstandingAmount)}
                  />
                </div>

                {/* Revenue Chart */}
                <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Revenue Over Time</h3>
                    <button
                      onClick={() => exportToCSV(revenueData.byPeriod, 'revenue_by_period')}
                      className="px-3 py-1 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded"
                    >
                      Export CSV
                    </button>
                  </div>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={revenueData.byPeriod}>
                        <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                        <XAxis dataKey="period" tick={{ fontSize: 12 }} />
                        <YAxis tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 12 }} />
                        <Tooltip
                          formatter={(value: number) => formatCurrency(value)}
                          labelStyle={{ color: '#374151' }}
                        />
                        <Bar dataKey="revenue" fill="#3b82f6" name="Revenue" />
                        <Bar dataKey="paid" fill="#10b981" name="Paid" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Top Clients Table */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Revenue by Client</h3>
                    <button
                      onClick={() => exportToCSV(revenueData.byClient, 'revenue_by_client')}
                      className="px-3 py-1 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded"
                    >
                      Export CSV
                    </button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 dark:bg-gray-900">
                        <tr>
                          <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Client</th>
                          <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Revenue</th>
                          <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Invoices</th>
                          <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Paid</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {revenueData.byClient.slice(0, 10).map((client) => (
                          <tr key={client.clientId} className="hover:bg-gray-50 dark:hover:bg-gray-900">
                            <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">{client.clientName}</td>
                            <td className="px-6 py-4 text-sm text-right text-gray-900 dark:text-white font-medium">{formatCurrency(client.revenue)}</td>
                            <td className="px-6 py-4 text-sm text-right text-gray-600 dark:text-gray-400">{client.invoices}</td>
                            <td className="px-6 py-4 text-sm text-right text-green-600 dark:text-green-400">{formatCurrency(client.paid)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Tech Performance Tab */}
            {activeTab === 'tech' && techData && (
              <div className="space-y-6">
                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <StatCard
                    label="Active Techs"
                    value={String(techData.summary.totalTechs)}
                  />
                  <StatCard
                    label="Jobs Completed"
                    value={String(techData.summary.totalJobs)}
                  />
                  <StatCard
                    label="Total Payouts"
                    value={formatCurrency(techData.summary.totalEarnings)}
                  />
                  <StatCard
                    label="Avg Jobs/Tech"
                    value={techData.summary.averageJobsPerTech.toFixed(1)}
                  />
                </div>

                {/* Tech Performance Chart */}
                <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Jobs by Technician</h3>
                  </div>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={techData.techs.slice(0, 10)} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                        <XAxis type="number" tick={{ fontSize: 12 }} />
                        <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 12 }} />
                        <Tooltip />
                        <Bar dataKey="jobsCompleted" fill="#3b82f6" name="Jobs" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Tech Table */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Technician Performance</h3>
                    <button
                      onClick={() => exportToCSV(techData.techs, 'tech_performance')}
                      className="px-3 py-1 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded"
                    >
                      Export CSV
                    </button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 dark:bg-gray-900">
                        <tr>
                          <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Technician</th>
                          <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Type</th>
                          <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Jobs</th>
                          <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Total Earnings</th>
                          <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Avg/Job</th>
                          <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Regions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {techData.techs.map((tech) => (
                          <tr key={tech.techId} className="hover:bg-gray-50 dark:hover:bg-gray-900">
                            <td className="px-6 py-4">
                              <div className="text-sm font-medium text-gray-900 dark:text-white">{tech.name}</div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">{tech.email}</div>
                            </td>
                            <td className="px-6 py-4">
                              <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                                tech.type === 'commission' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300' :
                                tech.type === 'w2' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' :
                                'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300'
                              }`}>
                                {tech.type}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-sm text-right text-gray-900 dark:text-white font-medium">{tech.jobsCompleted}</td>
                            <td className="px-6 py-4 text-sm text-right text-gray-900 dark:text-white">{formatCurrency(tech.totalEarnings)}</td>
                            <td className="px-6 py-4 text-sm text-right text-gray-600 dark:text-gray-400">{formatCurrency(tech.averageEarnings)}</td>
                            <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                              {tech.regionsServed.join(', ')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Client Activity Tab */}
            {activeTab === 'client' && clientData && (
              <div className="space-y-6">
                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                  <StatCard
                    label="Active Clients"
                    value={String(clientData.summary.totalClients)}
                  />
                  <StatCard
                    label="Total Jobs"
                    value={String(clientData.summary.totalJobs)}
                  />
                  <StatCard
                    label="Total Spend"
                    value={formatCurrency(clientData.summary.totalSpend)}
                  />
                  <StatCard
                    label="Outstanding"
                    value={formatCurrency(clientData.summary.totalOutstanding)}
                  />
                  <StatCard
                    label="Avg/Client"
                    value={formatCurrency(clientData.summary.averageSpendPerClient)}
                  />
                </div>

                {/* Client Spend Chart */}
                <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Top Clients by Spend</h3>
                  </div>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={clientData.clients.slice(0, 10)} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                        <XAxis type="number" tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 12 }} />
                        <YAxis dataKey="name" type="category" width={150} tick={{ fontSize: 12 }} />
                        <Tooltip formatter={(value: number) => formatCurrency(value)} />
                        <Bar dataKey="totalSpend" fill="#10b981" name="Total Spend" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Client Table */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Client Activity</h3>
                    <button
                      onClick={() => exportToCSV(clientData.clients, 'client_activity')}
                      className="px-3 py-1 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded"
                    >
                      Export CSV
                    </button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 dark:bg-gray-900">
                        <tr>
                          <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Client</th>
                          <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Type</th>
                          <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Jobs</th>
                          <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Total Spend</th>
                          <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Avg/Job</th>
                          <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Outstanding</th>
                          <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Last Job</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {clientData.clients.map((client) => (
                          <tr key={client.clientId} className="hover:bg-gray-50 dark:hover:bg-gray-900">
                            <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">{client.name}</td>
                            <td className="px-6 py-4">
                              <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                                client.clientType === 'outsourcing-partner' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300' :
                                client.clientType === 'retail' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' :
                                'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300'
                              }`}>
                                {client.clientType || 'N/A'}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-sm text-right text-gray-900 dark:text-white">{client.jobCount}</td>
                            <td className="px-6 py-4 text-sm text-right text-gray-900 dark:text-white font-medium">{formatCurrency(client.totalSpend)}</td>
                            <td className="px-6 py-4 text-sm text-right text-gray-600 dark:text-gray-400">{formatCurrency(client.averageJobValue)}</td>
                            <td className="px-6 py-4 text-sm text-right">
                              {client.outstandingAmount > 0 ? (
                                <span className="text-red-600 dark:text-red-400">{formatCurrency(client.outstandingAmount)}</span>
                              ) : (
                                <span className="text-green-600 dark:text-green-400">$0</span>
                              )}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                              {client.lastJobDate ? new Date(client.lastJobDate).toLocaleDateString() : 'N/A'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Operations Tab */}
            {activeTab === 'ops' && opsData && (
              <div className="space-y-6">
                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <StatCard
                    label="Total Jobs"
                    value={String(opsData.summary.totalJobs)}
                    subValue={`${opsData.summary.assignedJobs} assigned, ${opsData.summary.unassignedJobs} unassigned`}
                  />
                  <StatCard
                    label="Completed"
                    value={String(opsData.summary.completedJobs)}
                    subValue={formatPercent(opsData.summary.completionRate)}
                  />
                  <StatCard
                    label="Cancelled"
                    value={String(opsData.summary.cancelledJobs)}
                    subValue={formatPercent(opsData.summary.cancellationRate)}
                  />
                  <StatCard
                    label="Assignment Rate"
                    value={formatPercent(opsData.summary.assignmentRate)}
                  />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Jobs by Status */}
                  <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Jobs by Status</h3>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={Object.entries(opsData.jobsByStatus)
                              .filter(([, count]) => count > 0)
                              .map(([status, count]) => ({ name: status, value: count }))}
                            cx="50%"
                            cy="50%"
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                            label={({ name, percent }) => `${name} (${((percent || 0) * 100).toFixed(0)}%)`}
                          >
                            {Object.entries(opsData.jobsByStatus)
                              .filter(([, count]) => count > 0)
                              .map((_, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Jobs by Region */}
                  <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Jobs by Region</h3>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={Object.entries(opsData.jobsByRegion).map(([region, count]) => ({
                            region,
                            count,
                          }))}
                        >
                          <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                          <XAxis dataKey="region" tick={{ fontSize: 11 }} />
                          <YAxis tick={{ fontSize: 12 }} />
                          <Tooltip />
                          <Bar dataKey="count" fill="#8b5cf6" name="Jobs" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>

                {/* Jobs Over Time */}
                <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Jobs Over Time</h3>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={opsData.jobsByMonth}>
                        <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                        <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                        <YAxis tick={{ fontSize: 12 }} />
                        <Tooltip />
                        <Line type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={2} dot={{ fill: '#3b82f6' }} name="Jobs" />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
