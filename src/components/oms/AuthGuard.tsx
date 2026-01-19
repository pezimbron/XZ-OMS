'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/users/me', {
          credentials: 'include',
        })
        
        if (response.ok) {
          const data = await response.json()
          // Check if we actually have a user object with an ID
          if (data && data.user && data.user.id) {
            setIsAuthenticated(true)
          } else {
            setIsAuthenticated(false)
            router.push('/admin/login?redirect=/oms')
          }
        } else {
          setIsAuthenticated(false)
          router.push('/admin/login?redirect=/oms')
        }
      } catch (error) {
        setIsAuthenticated(false)
        router.push('/admin/login?redirect=/oms')
      }
    }

    checkAuth()
  }, [router])

  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Checking authentication...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  return <>{children}</>
}
