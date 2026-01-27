'use client'

import React from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import UnifiedPortal from './UnifiedPortal'

export default function JobPortalPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const token = params.token as string
  const initialTab = searchParams.get('tab') || 'info'

  return <UnifiedPortal token={token} initialTab={initialTab} />
}
