'use client'

import { createContext, useContext, useCallback, useRef, ReactNode } from 'react'
import { useRouter } from 'next/navigation'

interface AuthContextType {
  fetchWithAuth: (url: string, options?: RequestInit) => Promise<Response>
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter()
  const isRedirectingRef = useRef(false)

  const handleAuthError = useCallback(() => {
    // Prevent multiple redirects
    if (isRedirectingRef.current) return
    isRedirectingRef.current = true

    // Store current path for redirect after login
    const currentPath = window.location.pathname + window.location.search
    const redirectUrl = `/admin/login?redirect=${encodeURIComponent(currentPath)}`

    // Show a brief message before redirecting
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

    // Redirect after a brief delay
    setTimeout(() => {
      router.push(redirectUrl)
    }, 1000)
  }, [router])

  const fetchWithAuth = useCallback(
    async (url: string, options: RequestInit = {}): Promise<Response> => {
      try {
        const response = await fetch(url, {
          ...options,
          credentials: 'include',
        })

        // Check for auth errors
        if (response.status === 401 || response.status === 403) {
          // Check if this is actually an auth error vs a permissions error
          const contentType = response.headers.get('content-type')
          if (contentType?.includes('application/json')) {
            const clone = response.clone()
            try {
              const data = await clone.json()
              // Common auth error messages from Payload
              const authErrorMessages = [
                'You are not allowed to perform this action',
                'Not authorized',
                'Unauthorized',
                'Invalid token',
                'Token expired',
                'No user',
              ]
              const isAuthError = authErrorMessages.some(
                (msg) =>
                  data.message?.includes(msg) ||
                  data.errors?.some((e: any) => e.message?.includes(msg)),
              )
              if (isAuthError) {
                handleAuthError()
              }
            } catch {
              // If we can't parse JSON, treat 401/403 as auth error
              handleAuthError()
            }
          } else {
            handleAuthError()
          }
        }

        return response
      } catch (error) {
        throw error
      }
    },
    [handleAuthError],
  )

  return <AuthContext.Provider value={{ fetchWithAuth }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

// Hook for easy migration - wraps standard fetch with auth handling
export function useFetchWithAuth() {
  const { fetchWithAuth } = useAuth()
  return fetchWithAuth
}
