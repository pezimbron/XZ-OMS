'use client'

import { JobsCalendarContent } from '@/components/oms/JobsCalendarContent'
import Link from 'next/link'
import { useEffect, useState } from 'react'

export default function CalendarPage() {
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    fetchUser()
  }, [])

  const fetchUser = async () => {
    try {
      const response = await fetch('/api/users/me')
      const data = await response.json()
      setUser(data.user)
    } catch (error) {
      console.error('Error fetching user:', error)
    }
  }
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Jobs Calendar</h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">Visual schedule with color-coded regions</p>
            </div>
            {user?.role !== 'tech' && (
              <div className="flex gap-2">
                <Link
                  href="/oms/quick-create"
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                >
                  <span className="text-xl">+</span>
                  Quick Create
                </Link>
                <Link
                  href="/admin/collections/jobs/create"
                  className="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                >
                  <span className="text-xl">+</span>
                  Manual Create
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
      
      <JobsCalendarContent />
    </div>
  )
}
