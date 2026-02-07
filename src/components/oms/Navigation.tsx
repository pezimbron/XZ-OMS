'use client'

import React, { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ThemeContext } from '@/contexts/ThemeContext'
import { NotificationBell } from '@/components/oms/NotificationBell'

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

interface NavItem {
  label: string
  href: string
  icon: string
  roles?: string[]
}

interface NavGroup {
  id: string
  label: string
  items: NavItem[]
}

/** Always visible at the top — no section header, no toggle. */
const pinnedItems: NavItem[] = [
  { label: 'Dashboard', href: '/oms', icon: '📊' },
  { label: 'Calendar', href: '/oms/calendar', icon: '📅' },
  { label: 'Jobs', href: '/oms/jobs', icon: '📋' },
]

/** Collapsible sections (expanded mode) / flat with separators (collapsed mode). */
const navGroups: NavGroup[] = [
  {
    id: 'operations',
    label: 'Operations',
    items: [
      { label: 'Quick Create', href: '/oms/quick-create', icon: '⚡', roles: ['super-admin', 'sales-admin', 'ops-manager'] },
      { label: 'Bulk Import', href: '/oms/bulk-import', icon: '📥', roles: ['super-admin', 'sales-admin', 'ops-manager'] },
      { label: 'QC Queue', href: '/oms/qc-queue', icon: '🎬', roles: ['super-admin', 'ops-manager', 'post-producer'] },
    ],
  },
  {
    id: 'finance',
    label: 'Finance',
    items: [
      { label: 'Invoicing', href: '/oms/invoicing', icon: '💰', roles: ['super-admin', 'sales-admin', 'ops-manager'] },
      { label: 'Invoices', href: '/oms/invoices', icon: '🧾', roles: ['super-admin', 'sales-admin', 'ops-manager'] },
      { label: 'Vendor Invoices', href: '/oms/vendor-invoices', icon: '📑', roles: ['super-admin', 'sales-admin', 'ops-manager'] },
      { label: 'Commissions', href: '/oms/commissions', icon: '💵', roles: ['super-admin', 'ops-manager', 'tech'] },
      { label: 'Reports', href: '/oms/reports', icon: '📈', roles: ['super-admin', 'sales-admin', 'ops-manager'] },
    ],
  },
  {
    id: 'setup',
    label: 'Setup',
    items: [
      { label: 'Clients', href: '/oms/clients', icon: '👥', roles: ['super-admin', 'sales-admin', 'ops-manager'] },
      { label: 'Products', href: '/oms/products', icon: '📦', roles: ['super-admin', 'sales-admin', 'ops-manager'] },
      { label: 'Vendors', href: '/oms/vendors', icon: '🏢', roles: ['super-admin', 'sales-admin', 'ops-manager'] },
      { label: 'Technicians', href: '/oms/technicians', icon: '🔧', roles: ['super-admin', 'sales-admin', 'ops-manager'] },
      { label: 'Job Templates', href: '/oms/job-templates', icon: '📝', roles: ['super-admin', 'sales-admin', 'ops-manager'] },
      { label: 'Equipment', href: '/oms/equipment', icon: '🎥', roles: ['super-admin', 'sales-admin', 'ops-manager'] },
    ],
  },
]

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function Navigation() {
  const pathname = usePathname()
  const themeContext = React.useContext(ThemeContext)
  const theme = themeContext?.theme || 'light'
  const toggleTheme = themeContext?.toggleTheme || (() => {})

  // --- state ----------------------------------------------------------------
  const [user, setUser] = useState<any>(null)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    operations: true,
    finance: true,
    setup: true,
  })
  /** Fixed-position tooltip shown in collapsed mode. */
  const [tooltip, setTooltip] = useState<{ label: string; x: number; y: number } | null>(null)
  /** User-menu popover open/closed. */
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)
  const userMenuRef = useRef<HTMLDivElement>(null)

  // --- effects --------------------------------------------------------------
  useEffect(() => {
    fetchUser()
    // Restore persisted sidebar state from localStorage
    try {
      const savedCollapsed = localStorage.getItem('oms-sidebar-collapsed')
      if (savedCollapsed !== null) setIsCollapsed(savedCollapsed === 'true')

      const savedGroups = localStorage.getItem('oms-nav-sections')
      if (savedGroups) {
        const parsed = JSON.parse(savedGroups)
        setOpenGroups(prev => ({ ...prev, ...parsed }))
      }
    } catch {
      // ignore – first visit or corrupted value
    }
  }, [])

  // Auto-expand the section that contains the current page (ephemeral, not persisted)
  useEffect(() => {
    if (!pathname) return
    for (const group of navGroups) {
      if (group.items.some(item => pathname === item.href || pathname.startsWith(item.href + '/'))) {
        setOpenGroups(prev => (prev[group.id] ? prev : { ...prev, [group.id]: true }))
        break
      }
    }
  }, [pathname])

  // Close user-menu when clicking outside it
  useEffect(() => {
    if (!isUserMenuOpen) return
    const handler = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setIsUserMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [isUserMenuOpen])

  // --- helpers --------------------------------------------------------------
  const fetchUser = async () => {
    try {
      const response = await fetch('/api/users/me')
      const data = await response.json()
      setUser(data.user)
    } catch (error) {
      console.error('Error fetching user:', error)
    }
  }

  /** Whether a nav item should render given the current user's role. */
  const isItemVisible = (item: NavItem): boolean => {
    if (!item.roles) return true
    if (!user) return false
    return item.roles.includes(user.role)
  }

  /** Toggle a section open/closed and persist. */
  const toggleGroup = (groupId: string) => {
    setOpenGroups(prev => {
      const next = { ...prev, [groupId]: !prev[groupId] }
      try { localStorage.setItem('oms-nav-sections', JSON.stringify(next)) } catch {}
      return next
    })
  }

  /** Toggle sidebar collapsed/expanded and persist. */
  const toggleCollapse = () => {
    setIsCollapsed(prev => {
      const next = !prev
      try { localStorage.setItem('oms-sidebar-collapsed', String(next)) } catch {}
      return next
    })
    setTooltip(null)
  }

  // --- tooltip (collapsed mode only) ----------------------------------------
  const handleTooltipEnter = (e: React.MouseEvent, label: string) => {
    if (!effectivelyCollapsed) return
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    setTooltip({ label, x: rect.right + 8, y: rect.top + rect.height / 2 })
  }
  const handleTooltipLeave = () => setTooltip(null)

  // --- derived ---------------------------------------------------------------
  /**
   * On mobile the overlay is always fully expanded regardless of isCollapsed.
   * This flag is the single source of truth for "should we render the narrow strip?"
   */
  const effectivelyCollapsed = isCollapsed && !isMobileMenuOpen

  /** Filter a group's items to only those the current user can see. */
  const visibleItemsOf = (group: NavGroup) => group.items.filter(isItemVisible)

  // --- shared nav-item renderer ----------------------------------------------
  const renderNavItem = (item: NavItem) => {
    if (!isItemVisible(item)) return null
    const active = pathname === item.href || pathname?.startsWith(item.href + '/')
    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={() => setIsMobileMenuOpen(false)}
        onMouseEnter={(e) => handleTooltipEnter(e, item.label)}
        onMouseLeave={handleTooltipLeave}
        className={`flex items-center rounded-lg transition-all ${
          effectivelyCollapsed ? 'justify-center py-2' : 'gap-3 px-3 py-2.5'
        } ${
          active
            ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-medium'
            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
        }`}
      >
        <span className="text-xl">{item.icon}</span>
        {!effectivelyCollapsed && <span className="text-sm">{item.label}</span>}
      </Link>
    )
  }

  // --- render ----------------------------------------------------------------
  return (
    <>
      {/* ---------------------------------------------------------- tooltip */}
      {tooltip && effectivelyCollapsed && (
        <div
          className="fixed z-50 px-2.5 py-1 bg-gray-800 dark:bg-gray-700 text-white text-xs rounded shadow-lg pointer-events-none"
          style={{ left: tooltip.x, top: tooltip.y, transform: 'translateY(-50%)' }}
        >
          {tooltip.label}
        </div>
      )}

      {/* ----------------------------------------------------- mobile hamburger */}
      <button
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700"
        aria-label="Toggle menu"
      >
        <svg className="w-6 h-6 text-gray-900 dark:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          {isMobileMenuOpen ? (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          )}
        </svg>
      </button>

      {/* -------------------------------------------------- mobile backdrop */}
      {isMobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-30"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* ---------------------------------------------------------- sidebar */}
      <nav className={[
        'flex flex-col h-full bg-white dark:bg-gray-800',
        'transition-all duration-300 ease-in-out',
        // desktop: in-flow; mobile: fixed overlay with slide animation
        'lg:relative fixed inset-y-0 left-0 z-40',
        isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
        // width: mobile always w-72; desktop switches between w-64 and w-16
        'w-72',
        effectivelyCollapsed ? 'lg:w-16' : 'lg:w-64',
      ].join(' ')}>

        {/* -------------------------------------------------------------- logo */}
        <div className={`border-b border-gray-200 dark:border-gray-700 ${effectivelyCollapsed ? 'p-3 flex justify-center' : 'p-6'}`}>
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center text-white text-xl font-bold shadow-lg flex-shrink-0 ${effectivelyCollapsed ? 'cursor-pointer' : ''}`}
              onMouseEnter={effectivelyCollapsed ? (e) => handleTooltipEnter(e, 'XZ OMS') : undefined}
              onMouseLeave={effectivelyCollapsed ? handleTooltipLeave : undefined}
            >
              XZ
            </div>
            {!effectivelyCollapsed && (
              <div>
                <h1 className="text-lg font-bold text-gray-900 dark:text-white">XZ OMS</h1>
                <p className="text-xs text-gray-500 dark:text-gray-400">Operations Management</p>
              </div>
            )}
          </div>
        </div>

        {/* --------------------------------------------------------- nav items */}
        <div className="flex-1 overflow-y-auto py-4">
          <div className={`space-y-1 ${effectivelyCollapsed ? 'px-1.5' : 'px-3'}`}>
            {/* pinned (always visible, no header) */}
            {pinnedItems.map(renderNavItem)}

            {effectivelyCollapsed ? (
              /* === COLLAPSED: flat icon strip, thin separators between groups === */
              navGroups.map((group) => {
                const visible = visibleItemsOf(group)
                if (visible.length === 0) return null
                return (
                  <React.Fragment key={group.id}>
                    <div className="border-t border-gray-200 dark:border-gray-700 my-2" />
                    {visible.map(renderNavItem)}
                  </React.Fragment>
                )
              })
            ) : (
              /* === EXPANDED: collapsible section headers === */
              navGroups.map((group) => {
                const visible = visibleItemsOf(group)
                if (visible.length === 0) return null
                const isOpen = openGroups[group.id] !== false
                return (
                  <div key={group.id} className="mt-4">
                    {/* section header */}
                    <button
                      onClick={() => toggleGroup(group.id)}
                      className="w-full flex items-center justify-between px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                    >
                      <span>{group.label}</span>
                      <svg
                        className={`w-3 h-3 transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`}
                        fill="none" stroke="currentColor" viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                    {/* section items */}
                    {isOpen && <div className="space-y-1">{visible.map(renderNavItem)}</div>}
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* ------------------------------------------------------- bottom bar */}
        <div className={`border-t border-gray-200 dark:border-gray-700 ${effectivelyCollapsed ? 'p-2' : 'p-3'}`}>

          {/* notifications */}
          <div
            className={effectivelyCollapsed ? 'flex justify-center' : ''}
            onMouseEnter={effectivelyCollapsed ? (e) => handleTooltipEnter(e, 'Notifications') : undefined}
            onMouseLeave={effectivelyCollapsed ? handleTooltipLeave : undefined}
          >
            <NotificationBell expanded={!effectivelyCollapsed} />
          </div>

          {/* user trigger + popover wrapper */}
          <div ref={userMenuRef} className="relative">

            {/* --- popover (rendered above trigger in expanded; to the right in collapsed) --- */}
            {isUserMenuOpen && (
              <div className={`absolute z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-1 ${
                effectivelyCollapsed
                  ? 'left-full bottom-0 ml-2 w-48'   // collapsed: float right
                  : 'bottom-full left-0 mb-2 w-full'  // expanded: float above
              }`}>
                {/* theme toggle */}
                <button
                  onClick={toggleTheme}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  <span className="text-lg">{theme === 'dark' ? '☀️' : '🌙'}</span>
                  <span className="text-sm">{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
                </button>
                {/* settings */}
                <Link
                  href="/oms/settings"
                  onClick={() => setIsUserMenuOpen(false)}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  <span className="text-lg">⚙️</span>
                  <span className="text-sm">Settings</span>
                </Link>
                {/* logout */}
                <button
                  onClick={async () => {
                    try { await fetch('/api/users/logout', { method: 'POST', credentials: 'include' }) } catch {}
                    window.location.href = '/admin/login'
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                >
                  <span className="text-lg">🚪</span>
                  <span className="text-sm">Logout</span>
                </button>
              </div>
            )}

            {/* --- trigger row --- */}
            <button
              onClick={() => setIsUserMenuOpen(prev => !prev)}
              onMouseEnter={effectivelyCollapsed ? (e) => handleTooltipEnter(e, user?.email || 'User') : undefined}
              onMouseLeave={effectivelyCollapsed ? handleTooltipLeave : undefined}
              className={`w-full flex items-center rounded-lg transition-colors hover:bg-gray-100 dark:hover:bg-gray-800 ${
                effectivelyCollapsed ? 'justify-center py-2' : 'gap-3 px-3 py-2.5'
              }`}
            >
              {/* avatar */}
              <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                U
              </div>
              {/* email + role (expanded only) */}
              {!effectivelyCollapsed && (
                <div className="flex-1 min-w-0 text-left">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{user?.email || 'Loading...'}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{user?.role?.replace('-', ' ') || ''}</p>
                </div>
              )}
              {/* chevron (expanded only) */}
              {!effectivelyCollapsed && (
                <svg className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform duration-200 ${isUserMenuOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              )}
            </button>
          </div>

          {/* collapse toggle — desktop only */}
          <div className="hidden lg:flex justify-center pt-2">
            <button
              onClick={toggleCollapse}
              className="w-8 h-8 flex items-center justify-center rounded-full border border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:border-gray-300 dark:hover:border-gray-500 transition-all"
              aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={isCollapsed ? 'M9 5l7 7-7 7' : 'M15 19l-7-7 7-7'} />
              </svg>
            </button>
          </div>
        </div>
      </nav>
    </>
  )
}
