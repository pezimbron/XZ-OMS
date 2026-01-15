'use client'

import React from 'react'
import { useRouter } from 'next/navigation'

/**
 * Quick access dashboard component with links to key features
 */
export default function QuickAccessDashboard() {
  const router = useRouter()

  const quickLinks = [
    {
      title: '📅 Calendar View',
      description: 'View all jobs in a visual calendar with color-coded regions',
      href: '/admin/calendar',
      color: 'bg-blue-600 hover:bg-blue-700',
    },
    {
      title: '⚡ Quick Create Job',
      description: 'Paste email content and AI will auto-populate job fields',
      href: '/admin/quick-create-job',
      color: 'bg-green-600 hover:bg-green-700',
    },
    {
      title: '📋 All Jobs',
      description: 'View and manage all jobs in the system',
      href: '/admin/collections/jobs',
      color: 'bg-purple-600 hover:bg-purple-700',
    },
    {
      title: '➕ Create Job',
      description: 'Create a new job manually with full form',
      href: '/admin/collections/jobs/create',
      color: 'bg-indigo-600 hover:bg-indigo-700',
    },
  ]

  return (
    <div className="mb-8">
      <h2 className="text-xl font-bold mb-4">Quick Access</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {quickLinks.map((link) => (
          <button
            key={link.href}
            onClick={() => router.push(link.href)}
            className={`${link.color} text-white p-6 rounded-lg shadow-lg transition-all transform hover:scale-105 text-left`}
          >
            <div className="text-2xl mb-2">{link.title}</div>
            <div className="text-sm opacity-90">{link.description}</div>
          </button>
        ))}
      </div>
    </div>
  )
}
