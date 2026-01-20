'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ThemeContext } from '@/contexts/ThemeContext'
import { NotificationBell } from './NotificationBell'

interface NavItem {
  label: string
  href: string
  icon: string
  roles?: string[] // If specified, only show for these roles
}

const navItems: NavItem[] = [
  { label: 'Dashboard', href: '/oms', icon: '📊' },
  { label: 'Calendar', href: '/oms/calendar', icon: '📅' },
  { label: 'QC Queue', href: '/oms/qc-queue', icon: '🎬', roles: ['super-admin', 'ops-manager', 'post-producer'] },
  { label: 'Quick Create', href: '/oms/quick-create', icon: '⚡', roles: ['super-admin', 'sales-admin', 'ops-manager'] },
  { label: 'Bulk Import', href: '/oms/bulk-import', icon: '📥', roles: ['super-admin', 'sales-admin', 'ops-manager'] },
  { label: 'Jobs', href: '/oms/jobs', icon: '📋' },
  { label: 'Commissions', href: '/oms/commissions', icon: '💵', roles: ['tech'] },
  { label: 'Invoicing', href: '/oms/invoicing', icon: '💰', roles: ['super-admin', 'sales-admin', 'ops-manager'] },
  { label: 'Clients', href: '/oms/clients', icon: '👥', roles: ['super-admin', 'sales-admin', 'ops-manager'] },
  { label: 'Technicians', href: '/oms/technicians', icon: '🔧', roles: ['super-admin', 'sales-admin', 'ops-manager'] },
  { label: 'Products', href: '/oms/products', icon: '📦', roles: ['super-admin', 'sales-admin', 'ops-manager'] },
  { label: 'Equipment', href: '/oms/equipment', icon: '🎥', roles: ['super-admin', 'sales-admin', 'ops-manager'] },
  { label: 'Reports', href: '/oms/reports', icon: '📈', roles: ['super-admin', 'sales-admin', 'ops-manager'] },
]

export function Navigation() {
  const pathname = usePathname()
  const themeContext = React.useContext(ThemeContext)
  const theme = themeContext?.theme || 'light'
  const toggleTheme = themeContext?.toggleTheme || (() => {})
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

  // Filter nav items based on user role
  const visibleNavItems = navItems.filter(item => {
    if (!item.roles) return true // Show to all if no role restriction
    if (!user) return false // Hide if user not loaded
    return item.roles.includes(user.role)
  })

  return (
    <nav className="flex flex-col h-full">
      {/* Logo */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center text-white text-xl font-bold shadow-lg">
            XZ
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900 dark:text-white">XZ OMS</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">Operations Management</p>
          </div>
        </div>
      </div>

      {/* Navigation Items */}
      <div className="flex-1 overflow-y-auto py-4">
        <div className="space-y-1 px-3">
          {visibleNavItems.map((item) => {
            const isActive = pathname === item.href || pathname?.startsWith(item.href + '/')
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                  isActive
                    ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-medium'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                <span className="text-xl">{item.icon}</span>
                <span className="text-sm">{item.label}</span>
              </Link>
            )
          })}
        </div>
      </div>

      {/* Bottom Section */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700 space-y-3">
        {/* Dark Mode Toggle */}
        <button
          onClick={toggleTheme}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
        >
          <span className="text-xl">{theme === 'dark' ? '☀️' : '🌙'}</span>
          <span className="text-sm">{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
        </button>

        {/* Settings */}
        <Link
          href="/oms/settings"
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
        >
          <span className="text-xl">⚙️</span>
          <span className="text-sm">Settings</span>
        </Link>

        {/* User Menu */}
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-gray-50 dark:bg-gray-800">
          <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
            U
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{user?.email || 'Loading...'}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{user?.role?.replace('-', ' ') || ''}</p>
          </div>
        </div>

        {/* Logout */}
        <button
          onClick={async () => {
            try {
              await fetch('/api/users/logout', { method: 'POST', credentials: 'include' })
            } catch (error) {
              // Ignore errors, just redirect
            }
            window.location.href = '/admin/login'
          }}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
        >
          <span className="text-xl">🚪</span>
          <span className="text-sm">Logout</span>
        </button>
      </div>
    </nav>
  )
}
