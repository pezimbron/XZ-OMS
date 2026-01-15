'use client'

import React from 'react'
import { useRouter } from 'next/navigation'

/**
 * Button to navigate to Calendar View
 */
export function CalendarViewButton() {
  const router = useRouter()

  return (
    <button
      onClick={() => router.push('/admin/calendar')}
      className="btn btn--style-secondary btn--size-medium"
      type="button"
    >
      📅 Calendar View
    </button>
  )
}
