'use client'

import './globals.css'
import { Navigation } from '@/components/oms/Navigation'
import { NotificationBell } from '@/components/oms/NotificationBell'
import { ThemeProvider } from '@/contexts/ThemeContext'
import { AuthGuard } from '@/components/oms/AuthGuard'

export default function OMSLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <ThemeProvider>
          <AuthGuard>
            <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
              {/* Sidebar */}
              <aside className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex-shrink-0">
                <Navigation />
              </aside>

              {/* Main Content */}
              <div className="flex-1 flex flex-col overflow-hidden">
                {/* Top Bar with Notifications */}
                <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-3 flex justify-end items-center">
                  <NotificationBell />
                </div>
                
                {/* Page Content */}
                <main className="flex-1 overflow-auto">
                  {children}
                </main>
              </div>
            </div>
          </AuthGuard>
        </ThemeProvider>
      </body>
    </html>
  )
}
