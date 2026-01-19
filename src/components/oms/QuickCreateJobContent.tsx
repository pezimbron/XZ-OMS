'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface ImportResult {
  success: number
  failed: number
  errors: Array<{ row: number; error: string }>
}

export function QuickCreateJobContent() {
  const [activeTab, setActiveTab] = useState<'email' | 'ai'>('email')
  const [emailContent, setEmailContent] = useState('')
  const [aiPrompt, setAiPrompt] = useState('')
  const [isParsing, setIsParsing] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<ImportResult | null>(null)
  const router = useRouter()

  const handleParse = async () => {
    if (!emailContent.trim()) {
      setError('Please paste email content first')
      return
    }

    setIsParsing(true)
    setError('')
    setResult(null)

    try {
      const response = await fetch('/api/parse-job-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emailContent }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to parse email')
      }

      router.push(`/oms/jobs/${data.jobId}`)
    } catch (err: any) {
      setError(err.message || 'Failed to parse email')
    } finally {
      setIsParsing(false)
    }
  }

  const handleAiCreate = async () => {
    if (!aiPrompt.trim()) {
      setError('Please describe the jobs you want to create')
      return
    }

    setIsParsing(true)
    setError('')
    setResult(null)

    try {
      const response = await fetch('/api/jobs/ai-create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: aiPrompt }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create jobs')
      }

      setResult(data)
      if (data.success > 0) {
        setAiPrompt('')
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create jobs')
    } finally {
      setIsParsing(false)
    }
  }

  return (
    <div className="p-8 space-y-6">
      {/* Tabs */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <div className="flex">
            <button
              onClick={() => {
                setActiveTab('email')
                setError('')
                setResult(null)
              }}
              className={`px-6 py-4 font-medium transition-colors ${
                activeTab === 'email'
                  ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              📧 Email Parser
            </button>
            <button
              onClick={() => {
                setActiveTab('ai')
                setError('')
                setResult(null)
              }}
              className={`px-6 py-4 font-medium transition-colors ${
                activeTab === 'ai'
                  ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              🤖 AI Chat
            </button>
          </div>
        </div>

        <div className="p-6">
          {/* Email Parser Tab */}
          {activeTab === 'email' && (
            <div className="space-y-6">
              {/* Hero Section */}
              <div 
                className="rounded-2xl p-8 text-white shadow-xl" 
                style={{ 
                  background: 'linear-gradient(to right, #10b981, #059669)',
                  borderRadius: '1rem'
                }}
              >
                <h2 className="text-3xl font-bold mb-3">✨ Paste. Parse. Done.</h2>
                <p className="text-lg" style={{ color: '#d1fae5' }}>
                  Simply paste your job request email below and let AI extract all the details automatically.
                  No more manual data entry!
                </p>
              </div>

              {/* Email Input Card */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="bg-gradient-to-r from-gray-50 to-slate-50 dark:from-gray-700 dark:to-gray-800 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <label htmlFor="email-content" className="block text-lg font-semibold text-gray-900 dark:text-white">
            📧 Email Content
          </label>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Paste the complete email from Matterport or other job requests
          </p>
        </div>
        <div className="p-6">
          <textarea
            id="email-content"
            value={emailContent}
            onChange={(e) => setEmailContent(e.target.value)}
            placeholder="Paste your job request email here...

Example:
Your job on 01/06/2026 1:00 PM is confirmed.
Client Company: Spencer Technologies
Project Name: Subway-21376
Capture Address: 1301 Hwy 290 W...

The AI will automatically extract all fields!"
            className="w-full min-h-[350px] font-mono text-sm border border-gray-300 dark:border-gray-600 rounded-xl p-4 focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all resize-none bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100"
          />
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 rounded-lg p-4 shadow-md">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <span className="text-2xl">⚠️</span>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800 dark:text-red-300">Error</h3>
              <p className="text-sm text-red-700 dark:text-red-400 mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-4">
        <button
          onClick={handleParse}
          disabled={isParsing || !emailContent.trim()}
          className="flex-1 text-white px-8 py-4 rounded-xl font-semibold text-lg shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-3"
          style={{
            background: isParsing ? '#9ca3af' : 'linear-gradient(to right, #10b981, #059669)',
            cursor: isParsing || !emailContent.trim() ? 'not-allowed' : 'pointer'
          }}
        >
          {isParsing ? (
            <>
              <svg className="animate-spin h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>Parsing with AI...</span>
            </>
          ) : (
            <>
              <span className="text-2xl">🤖</span>
              <span>Parse & Create Job</span>
            </>
          )}
        </button>
        <button
          onClick={() => {
            setEmailContent('')
            setError('')
          }}
          className="px-6 py-4 bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 transition-all shadow-md"
        >
          Clear
        </button>
      </div>

              {/* How it Works */}
              <div 
                className="border border-blue-200 dark:border-blue-800 rounded-2xl p-6 shadow-lg"
                style={{
                  background: 'linear-gradient(to bottom right, #dbeafe, #e0e7ff)',
                }}
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white text-xl" style={{ backgroundColor: '#3b82f6' }}>
                    💡
                  </div>
                  <h3 className="text-xl font-bold text-gray-900">How it works</h3>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center font-bold">1</div>
                    <div>
                      <h4 className="font-semibold text-gray-900">Paste Email</h4>
                      <p className="text-sm text-gray-600">Copy and paste the job request email content</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center font-bold">2</div>
                    <div>
                      <h4 className="font-semibold text-gray-900">AI Extraction</h4>
                      <p className="text-sm text-gray-600">Gemini AI extracts all job details automatically</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center font-bold">3</div>
                    <div>
                      <h4 className="font-semibold text-gray-900">Job Created</h4>
                      <p className="text-sm text-gray-600">Review the auto-populated job details</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center font-bold">4</div>
                    <div>
                      <h4 className="font-semibold text-gray-900">Assign & Go</h4>
                      <p className="text-sm text-gray-600">Assign tech and calendar invite is sent automatically</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* AI Chat Tab */}
          {activeTab === 'ai' && (
            <div className="space-y-6">
              <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-2xl p-8 text-white shadow-xl">
                <h2 className="text-3xl font-bold mb-3">🤖 AI Job Creation</h2>
                <p className="text-lg opacity-90">
                  Describe the jobs you want to create in natural language, and AI will create them for you.
                </p>
              </div>

              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <p className="text-sm text-blue-800 dark:text-blue-300 font-medium mb-2">
                  Example prompts:
                </p>
                <ul className="text-sm text-blue-700 dark:text-blue-400 space-y-1">
                  <li>• Create 3 Matterport scans for ABC Corp at 123 Main St, 456 Oak Ave, and 789 Pine Rd in Austin, all scheduled for next Monday</li>
                  <li>• Add a floor plan job for XYZ Client at 100 Commerce St, San Antonio, scheduled for Jan 25th</li>
                  <li>• Create 5 jobs for Retail Client: 2 scans and 3 floor plans, all in the Austin area next week</li>
                </ul>
              </div>

              <textarea
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                rows={8}
                placeholder="Describe the jobs you want to create...&#10;&#10;Example: Create 2 Matterport scan jobs for ABC Corp at 123 Main St and 456 Oak Ave in Austin, both scheduled for next Monday at 10am"
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />

              {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 rounded-lg p-4 shadow-md">
                  <div className="flex items-start">
                    <div className="flex-shrink-0">
                      <span className="text-2xl">⚠️</span>
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-red-800 dark:text-red-300">Error</h3>
                      <p className="text-sm text-red-700 dark:text-red-400 mt-1">{error}</p>
                    </div>
                  </div>
                </div>
              )}

              {result && (
                <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
                    Results
                  </h3>
                  <div className="space-y-2 text-sm">
                    <p className="text-green-600 dark:text-green-400">
                      ✓ Successfully created: {result.success} jobs
                    </p>
                    {result.failed > 0 && (
                      <>
                        <p className="text-red-600 dark:text-red-400">
                          ✗ Failed: {result.failed} jobs
                        </p>
                        <div className="mt-3 space-y-1">
                          {result.errors.map((error, index) => (
                            <p key={index} className="text-red-600 dark:text-red-400 text-xs">
                              Job {error.row}: {error.error}
                            </p>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                  <Link
                    href="/oms/jobs"
                    className="mt-4 inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    View Jobs
                  </Link>
                </div>
              )}

              <div className="flex gap-4">
                <button
                  onClick={handleAiCreate}
                  disabled={isParsing || !aiPrompt.trim()}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  {isParsing ? 'Creating Jobs...' : '🤖 Create Jobs with AI'}
                </button>
                <button
                  onClick={() => {
                    setAiPrompt('')
                    setError('')
                    setResult(null)
                  }}
                  className="px-6 py-3 bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 transition-all"
                >
                  Clear
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
