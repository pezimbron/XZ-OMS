'use client'

import './globals.css'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Navigation } from '@/components/oms/Navigation'
import { ThemeProvider } from '@/contexts/ThemeContext'
import { AuthGuard } from '@/components/oms/AuthGuard'

// Global fetch interceptor for session expiry
function useGlobalAuthInterceptor() {
  const router = useRouter()

  useEffect(() => {
    let isRedirecting = false

    const handleAuthError = () => {
      if (isRedirecting) return
      isRedirecting = true

      const currentPath = window.location.pathname + window.location.search
      const redirectUrl = `/admin/login?redirect=${encodeURIComponent(currentPath)}`

      // Check if overlay already exists
      if (document.getElementById('session-expired-overlay')) return

      const overlay = document.createElement('div')
      overlay.id = 'session-expired-overlay'
      overlay.innerHTML = `
        <div style="
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.7);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 99999;
        ">
          <div style="
            background: white;
            padding: 24px 32px;
            border-radius: 8px;
            text-align: center;
            box-shadow: 0 4px 20px rgba(0,0,0,0.3);
          ">
            <p style="margin: 0 0 8px 0; font-size: 18px; font-weight: 600; color: #1f2937;">Session Expired</p>
            <p style="margin: 0; color: #6b7280;">Redirecting to login...</p>
          </div>
        </div>
      `
      document.body.appendChild(overlay)

      setTimeout(() => {
        router.push(redirectUrl)
      }, 1500)
    }

    // Store original fetch
    const originalFetch = window.fetch

    // Override global fetch
    window.fetch = async function (...args) {
      try {
        const response = await originalFetch.apply(this, args)

        // Check for auth errors on API routes
        if ((response.status === 401 || response.status === 403) && !isRedirecting) {
          let url = ''
          const input = args[0]
          if (typeof input === 'string') {
            url = input
          } else if (input instanceof URL) {
            url = input.pathname
          } else if (input instanceof Request) {
            url = input.url
          }

          // Only intercept API calls, not external resources
          if (url.startsWith('/api') || url.includes('/api/')) {
            const contentType = response.headers.get('content-type')
            if (contentType?.includes('application/json')) {
              const clone = response.clone()
              try {
                const data = await clone.json()
                const authErrorMessages = [
                  'You are not allowed to perform this action',
                  'Not authorized',
                  'Unauthorized',
                  'Invalid token',
                  'Token expired',
                  'No user',
                ]
                const message = data.message || data.error || ''
                const isAuthError = authErrorMessages.some((msg) => message.includes(msg))
                if (isAuthError) {
                  handleAuthError()
                }
              } catch {
                // JSON parse failed, might still be auth error
                handleAuthError()
              }
            }
          }
        }

        return response
      } catch (error) {
        throw error
      }
    }

    // Cleanup on unmount
    return () => {
      window.fetch = originalFetch
    }
  }, [router])
}

function OMSContent({ children }: { children: React.ReactNode }) {
  useGlobalAuthInterceptor()

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      {/* Navigation - handles both mobile and desktop */}
      <Navigation />

      {/* Main Content */}
      <main className="flex-1 overflow-auto w-full lg:w-auto">{children}</main>
    </div>
  )
}

export default function OMSLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <ThemeProvider>
          <AuthGuard>
            <OMSContent>{children}</OMSContent>
          </AuthGuard>
        </ThemeProvider>
      </body>
    </html>
  )
}
