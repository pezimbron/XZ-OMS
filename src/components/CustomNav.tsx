'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

/**
 * Custom navigation component for quick access links
 */
export function CustomNav() {
  const pathname = usePathname()

  const navItems = [
    {
      label: '📅 Calendar View',
      href: '/admin/calendar',
    },
    {
      label: '⚡ Quick Create',
      href: '/admin/quick-create-job',
    },
  ]

  return (
    <div className="mb-4 border-b border-gray-200 pb-4">
      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-4">
        Quick Access
      </div>
      {navItems.map((item) => {
        const isActive = pathname === item.href
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`block px-4 py-2 text-sm transition-colors ${
              isActive
                ? 'bg-blue-50 text-blue-700 font-medium'
                : 'text-gray-700 hover:bg-gray-50'
            }`}
          >
            {item.label}
          </Link>
        )
      })}
    </div>
  )
}
