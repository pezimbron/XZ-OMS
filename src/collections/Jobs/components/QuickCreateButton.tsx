'use client'

import React from 'react'
import { useRouter } from 'next/navigation'

/**
 * Button to navigate to Quick Create Job page
 * This will be added to the Jobs collection list view
 */
export function QuickCreateButton() {
  const router = useRouter()

  return (
    <button
      onClick={() => router.push('/admin/quick-create-job')}
      className="btn btn--style-primary btn--size-medium"
      type="button"
    >
      Quick Create from Email
    </button>
  )
}
