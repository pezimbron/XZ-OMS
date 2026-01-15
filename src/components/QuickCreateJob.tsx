'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { useRouter } from 'next/navigation'

/**
 * Quick Create Job component
 * Allows pasting email content and using AI to auto-populate job fields
 */
export function QuickCreateJob() {
  const [emailContent, setEmailContent] = useState('')
  const [isParsing, setIsParsing] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const handleParse = async () => {
    if (!emailContent.trim()) {
      setError('Please paste email content first')
      return
    }

    setIsParsing(true)
    setError('')

    try {
      // Call the parse API
      const response = await fetch('/api/parse-job-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emailContent }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to parse email')
      }

      // Redirect to the created job
      router.push(`/admin/collections/jobs/${data.jobId}`)
    } catch (err: any) {
      setError(err.message || 'Failed to parse email')
    } finally {
      setIsParsing(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-4">
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => router.push('/admin/calendar')}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
        >
          📅 Calendar
        </button>
        <button
          onClick={() => router.push('/admin/collections/jobs')}
          className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 text-sm"
        >
          📋 All Jobs
        </button>
        <button
          onClick={() => router.push('/admin/collections/jobs/create')}
          className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 text-sm"
        >
          ➕ Create Job
        </button>
      </div>
      <div>
        <h2 className="text-2xl font-bold mb-2">Quick Create Job from Email</h2>
        <p className="text-gray-600">
          Paste the content of a job request email below and click "Parse & Create Job" to
          automatically extract all job details.
        </p>
      </div>

      <div className="space-y-2">
        <label htmlFor="email-content" className="block text-sm font-medium">
          Email Content
        </label>
        <Textarea
          id="email-content"
          value={emailContent}
          onChange={(e) => setEmailContent(e.target.value)}
          placeholder="Paste your job request email here (e.g., Matterport appointment confirmation)..."
          className="min-h-[300px] font-mono text-sm"
        />
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <div className="flex gap-3">
        <Button onClick={handleParse} disabled={isParsing || !emailContent.trim()}>
          {isParsing ? 'Parsing with AI...' : 'Parse & Create Job'}
        </Button>
        <Button
          variant="outline"
          onClick={() => {
            setEmailContent('')
            setError('')
          }}
        >
          Clear
        </Button>
      </div>

      <div className="bg-blue-50 border border-blue-200 p-4 rounded">
        <h3 className="font-semibold mb-2">How it works:</h3>
        <ol className="list-decimal list-inside space-y-1 text-sm">
          <li>Paste the email content from Matterport or other job requests</li>
          <li>Click "Parse & Create Job" - AI will extract all fields</li>
          <li>Job is created and you'll be redirected to review it</li>
          <li>Verify the data, assign a tech if needed</li>
          <li>Calendar invite is automatically sent when tech is assigned</li>
        </ol>
      </div>
    </div>
  )
}
