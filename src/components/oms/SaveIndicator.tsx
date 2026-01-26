'use client'

import React from 'react'

import type { AutosaveStatus } from '@/lib/oms/useAutosaveField'

export const SaveIndicator: React.FC<{ status: AutosaveStatus; error?: string | null }> = ({ status, error }) => {
  if (status === 'idle') return null
  if (status === 'saving') return <span className="text-xs text-gray-500">Saving…</span>
  if (status === 'saved') return <span className="text-xs text-green-600">Saved</span>
  if (status === 'error') return <span className="text-xs text-red-600">{error || 'Error'}</span>
  return null
}
