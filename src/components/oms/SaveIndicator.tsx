'use client'

import React from 'react'

import type { AutosaveStatus } from '@/lib/oms/useAutosaveField'

const parseErrorMessage = (error: string | null | undefined): string => {
  if (!error) return 'Error saving changes'
  
  try {
    // Try to parse as JSON in case it's a stringified error object
    const parsed = JSON.parse(error)
    
    // Extract message from various error formats
    if (parsed.message) return parsed.message
    if (parsed.error) return parsed.error
    if (parsed.details) return parsed.details
    
    return error
  } catch {
    // If it's not JSON, check if it contains JSON-like patterns
    const jsonMatch = error.match(/\{"error":"([^"]+)"\}/)
    if (jsonMatch) return jsonMatch[1]
    
    const messageMatch = error.match(/"message":"([^"]+)"/)
    if (messageMatch) return messageMatch[1]
    
    // Return the original error if no parsing worked
    return error
  }
}

export const SaveIndicator: React.FC<{ status: AutosaveStatus; error?: string | null }> = ({ status, error }) => {
  if (status === 'idle') return null
  if (status === 'saving') return <span className="text-xs text-gray-500">Saving…</span>
  if (status === 'saved') return <span className="text-xs text-green-600">Saved</span>
  if (status === 'error') {
    const cleanError = parseErrorMessage(error)
    return (
      <div className="text-xs text-red-600 mt-1 p-2 bg-red-50 dark:bg-red-900/20 rounded border border-red-200 dark:border-red-800">
        {cleanError}
      </div>
    )
  }
  return null
}
