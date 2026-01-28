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

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all')

  useEffect(() => {
    fetchNotifications()
  }, [filter])

  const fetchNotifications = async () => {
    setLoading(true)
    try {
      let url = '/api/notifications?limit=100&sort=-createdAt&depth=1'
      if (filter === 'unread') {
        url += '&where[read][equals]=false'
      } else if (filter === 'read') {
        url += '&where[read][equals]=true'
      }
      const response = await fetch(url)
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
      fetchNotifications()
    } catch (error) {
      console.error('Error marking notification as read:', error)
    }
  }

  const markAsUnread = async (id: string) => {
    try {
      await fetch(`/api/notifications/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ read: false }),
      })
      fetchNotifications()
    } catch (error) {
      console.error('Error marking notification as unread:', error)
    }
  }

  const markAllAsRead = async () => {
    try {
      const unreadNotifications = notifications.filter(n => !n.read)
      await Promise.all(
        unreadNotifications.map(n => 
          fetch(`/api/notifications/${n.id}`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ read: true }),
          })
        )
      )
      fetchNotifications()
    } catch (error) {
      console.error('Error marking all as read:', error)
    }
  }

  const deleteNotification = async (id: string) => {
    if (!confirm('Are you sure you want to delete this notification?')) return
    
    try {
      await fetch(`/api/notifications/${id}`, {
        method: 'DELETE',
      })
      fetchNotifications()
    } catch (error) {
      console.error('Error deleting notification:', error)
    }
  }

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

  const unreadCount = notifications.filter(n => !n.read).length

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Notifications</h1>
        <p className="text-gray-600 dark:text-gray-400">
          {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount !== 1 ? 's' : ''}` : 'All caught up!'}
        </p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between flex-wrap gap-4">
          <div className="flex gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilter('unread')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === 'unread'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              Unread {unreadCount > 0 && `(${unreadCount})`}
            </button>
            <button
              onClick={() => setFilter('read')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === 'read'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              Read
            </button>
          </div>

          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
            >
              Mark all as read
            </button>
          )}
        </div>

        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {loading ? (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">
              Loading notifications...
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-8 text-center">
              <svg className="w-16 h-16 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
              <p className="text-gray-500 dark:text-gray-400 text-lg">
                {filter === 'unread' ? 'No unread notifications' : filter === 'read' ? 'No read notifications' : 'No notifications'}
              </p>
            </div>
          ) : (
            notifications.map((notification) => {
              const notificationUrl = getNotificationUrl(notification)
              
              return (
                <div
                  key={notification.id}
                  className={`p-4 transition-colors ${
                    !notification.read ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-1 text-xs font-semibold rounded ${getTypeColor(notification.type)}`}>
                            {notification.type}
                          </span>
                          {!notification.read && (
                            <span className="w-2 h-2 bg-blue-600 rounded-full" title="Unread"></span>
                          )}
                        </div>
                        <span className="text-xs text-gray-500 dark:text-gray-500">
                          {new Date(notification.createdAt).toLocaleString()}
                        </span>
                      </div>
                      
                      <h4 className="font-semibold text-gray-900 dark:text-white mb-1">
                        {notification.title}
                      </h4>
                      
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                        {notification.message}
                      </p>
                      
                      <div className="flex items-center gap-3">
                        {notificationUrl && (
                          <Link
                            href={notificationUrl}
                            onClick={() => !notification.read && markAsRead(notification.id)}
                            className="text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                          >
                            View Details →
                          </Link>
                        )}
                        
                        {notification.read ? (
                          <button
                            onClick={() => markAsUnread(notification.id)}
                            className="text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200"
                          >
                            Mark as unread
                          </button>
                        ) : (
                          <button
                            onClick={() => markAsRead(notification.id)}
                            className="text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200"
                          >
                            Mark as read
                          </button>
                        )}
                        
                        <button
                          onClick={() => deleteNotification(notification.id)}
                          className="text-sm text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
