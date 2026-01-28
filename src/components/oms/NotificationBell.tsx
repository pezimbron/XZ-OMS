'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'

interface Notification {
  id: string
  title: string
  message: string
  type: 'info' | 'success' | 'warning' | 'error'
  read: boolean
  actionUrl?: string
  relatedJob?: string | { id: string; jobId: string }
  createdAt: string
}

export function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [showDropdown, setShowDropdown] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchNotifications()
    // Poll for new notifications every 30 seconds
    const interval = setInterval(fetchNotifications, 30000)
    return () => clearInterval(interval)
  }, [])

  const fetchNotifications = async () => {
    try {
      const response = await fetch('/api/notifications?limit=10&sort=-createdAt&where[read][equals]=false&depth=1')
      const data = await response.json()
      setNotifications(data.docs || [])
    } catch (error) {
      console.error('Error fetching notifications:', error)
    } finally {
      setLoading(false)
    }
  }

  const getNotificationUrl = (notification: Notification): string | null => {
    if (notification.actionUrl) {
      return notification.actionUrl
    }
    if (notification.relatedJob) {
      const jobId = typeof notification.relatedJob === 'object' ? notification.relatedJob.id : notification.relatedJob
      return `/oms/jobs/${jobId}?tab=messages`
    }
    return null
  }

  const markAsRead = async (id: string) => {
    try {
      await fetch(`/api/notifications/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ read: true }),
      })
      setNotifications(notifications.filter(n => n.id !== id))
    } catch (error) {
      console.error('Error marking notification as read:', error)
    }
  }

  const markAllAsRead = async () => {
    try {
      await Promise.all(
        notifications.map(n => 
          fetch(`/api/notifications/${n.id}`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ read: true }),
          })
        )
      )
      setNotifications([])
    } catch (error) {
      console.error('Error marking all as read:', error)
    }
  }

  const unreadCount = notifications.length

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'success':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
      case 'warning':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
      case 'error':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
      default:
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
    }
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="relative p-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {showDropdown && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setShowDropdown(false)}
          />
          <div className="absolute right-0 mt-2 w-96 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-20 max-h-[500px] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Notifications
              </h3>
              <div className="flex items-center gap-3">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400"
                  >
                    Mark all as read
                  </button>
                )}
                <Link
                  href="/oms/notifications"
                  onClick={() => setShowDropdown(false)}
                  className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 font-medium"
                >
                  View All
                </Link>
              </div>
            </div>

            <div className="overflow-y-auto flex-1">
              {loading ? (
                <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                  Loading...
                </div>
              ) : notifications.length === 0 ? (
                <div className="p-8 text-center">
                  <svg className="w-12 h-12 mx-auto mb-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                  </svg>
                  <p className="text-gray-500 dark:text-gray-400">No new notifications</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                  {notifications.map((notification) => {
                    const notificationUrl = getNotificationUrl(notification)
                    const content = (
                      <>
                        <div className="flex items-start justify-between mb-2">
                          <span className={`px-2 py-1 text-xs font-semibold rounded ${getTypeColor(notification.type)}`}>
                            {notification.type}
                          </span>
                          <button
                            onClick={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              markAsRead(notification.id)
                            }}
                            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                            title="Mark as read"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                        <h4 className="font-semibold text-gray-900 dark:text-white mb-1">
                          {notification.title}
                        </h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                          {notification.message}
                        </p>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-500 dark:text-gray-500">
                            {new Date(notification.createdAt).toLocaleString()}
                          </span>
                          {notificationUrl && (
                            <span className="text-sm text-blue-600 dark:text-blue-400">
                              View →
                            </span>
                          )}
                        </div>
                      </>
                    )
                    
                    return notificationUrl ? (
                      <Link
                        key={notification.id}
                        href={notificationUrl}
                        onClick={() => {
                          markAsRead(notification.id)
                          setShowDropdown(false)
                        }}
                        className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors block cursor-pointer"
                      >
                        {content}
                      </Link>
                    ) : (
                      <div
                        key={notification.id}
                        className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                      >
                        {content}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
