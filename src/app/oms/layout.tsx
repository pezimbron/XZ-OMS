'use client'

import './globals.css'
import { Navigation } from '@/components/oms/Navigation'
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

              {/* Main Content */}
              <main className="flex-1 overflow-auto w-full lg:w-auto">
                {children}
              </main>
            </div>
          </AuthGuard>
        </ThemeProvider>
      </body>
    </html>
  )
}
