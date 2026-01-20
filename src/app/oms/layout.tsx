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
              {/* Navigation - handles both mobile and desktop */}
              <Navigation />

              {/* Main Content - Full width on mobile, constrained on desktop */}
              <div className="flex-1 flex flex-col overflow-hidden w-full lg:w-auto">
                {/* Top Bar with Notifications */}
                <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 md:px-6 py-3 flex justify-end items-center">
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
