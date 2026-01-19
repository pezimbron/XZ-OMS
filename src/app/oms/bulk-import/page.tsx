'use client'

import React, { useState } from 'react'
import Link from 'next/link'

interface ImportResult {
  success: number
  failed: number
  errors: Array<{ row: number; error: string }>
}

export default function BulkImportPage() {
  const [activeTab, setActiveTab] = useState<'upload' | 'paste'>('upload')
  const [file, setFile] = useState<File | null>(null)
  const [pastedData, setPastedData] = useState('')
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
    }
  }

  const handleFileImport = async () => {
    if (!file) return

    setImporting(true)
    setResult(null)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/jobs/bulk-import', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (response.ok) {
        setResult(data)
      } else {
        alert(data.error || 'Import failed')
      }
    } catch (error) {
      alert('Network error. Please try again.')
    } finally {
      setImporting(false)
    }
  }

  const handlePasteImport = async () => {
    if (!pastedData.trim()) return

    setImporting(true)
    setResult(null)

    try {
      const response = await fetch('/api/jobs/bulk-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csvData: pastedData }),
      })

      const data = await response.json()

      if (response.ok) {
        setResult(data)
      } else {
        alert(data.error || 'Import failed')
      }
    } catch (error) {
      alert('Network error. Please try again.')
    } finally {
      setImporting(false)
    }
  }

  const downloadTemplate = () => {
    const template = `Client Name,Job ID,Model Name,Capture Address,City,State,Zip Code,Target Date,Status,Region,Capture Type,Tech Instructions,Product 1,Product 1 Qty,Product 2,Product 2 Qty
Example Client,JOB-001,Property Tour,123 Main St,Austin,TX,78701,2024-01-20 10:00,scheduled,austin,matterport,Call POC 30 min before arrival,Matterport Scan,1,Floor Plan,1`

    const blob = new Blob([template], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'job-import-template.csv'
    a.click()
    window.URL.revokeObjectURL(url)
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/oms/jobs"
            className="text-blue-600 hover:text-blue-700 dark:text-blue-400 flex items-center gap-2 mb-4"
          >
            ← Back to Jobs
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Bulk Job Import
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Import multiple jobs at once via CSV file or paste data. For AI-powered job creation, use <Link href="/oms/quick-create" className="text-blue-600 hover:underline">Quick Create</Link>.
          </p>
        </div>

        {/* Tabs */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="border-b border-gray-200 dark:border-gray-700">
            <div className="flex">
              <button
                onClick={() => setActiveTab('upload')}
                className={`px-6 py-4 font-medium transition-colors ${
                  activeTab === 'upload'
                    ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                📁 Upload CSV
              </button>
              <button
                onClick={() => setActiveTab('paste')}
                className={`px-6 py-4 font-medium transition-colors ${
                  activeTab === 'paste'
                    ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                📋 Paste Data
              </button>
            </div>
          </div>

          <div className="p-6">
            {/* Upload Tab */}
            {activeTab === 'upload' && (
              <div className="space-y-6">
                <div>
                  <button
                    onClick={downloadTemplate}
                    className="mb-4 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  >
                    📥 Download CSV Template
                  </button>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    Download the template, fill it with your job data, and upload it below.
                  </p>
                </div>

                <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center">
                  <input
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    onChange={handleFileChange}
                    className="hidden"
                    id="file-upload"
                  />
                  <label
                    htmlFor="file-upload"
                    className="cursor-pointer flex flex-col items-center"
                  >
                    <svg
                      className="w-16 h-16 text-gray-400 mb-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                      />
                    </svg>
                    <span className="text-lg font-medium text-gray-700 dark:text-gray-300">
                      {file ? file.name : 'Click to upload or drag and drop'}
                    </span>
                    <span className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                      CSV, XLSX, or XLS files
                    </span>
                  </label>
                </div>

                {file && (
                  <button
                    onClick={handleFileImport}
                    disabled={importing}
                    className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                  >
                    {importing ? 'Importing...' : 'Import Jobs'}
                  </button>
                )}
              </div>
            )}

            {/* Paste Tab */}
            {activeTab === 'paste' && (
              <div className="space-y-6">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    Paste CSV data directly from Excel or Google Sheets. Make sure the first row contains headers.
                  </p>
                </div>

                <textarea
                  value={pastedData}
                  onChange={(e) => setPastedData(e.target.value)}
                  rows={15}
                  placeholder="Paste your CSV data here...&#10;&#10;Client Name,Job ID,Model Name,Capture Address,City,State,Zip Code,Target Date...&#10;Example Client,JOB-001,Property Tour,123 Main St,Austin,TX,78701,2024-01-20 10:00..."
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono text-sm"
                />

                {pastedData.trim() && (
                  <button
                    onClick={handlePasteImport}
                    disabled={importing}
                    className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                  >
                    {importing ? 'Importing...' : 'Import Jobs'}
                  </button>
                )}
              </div>
            )}

            {/* Results */}
            {result && (
              <div className="mt-6 p-4 rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
                  Import Results
                </h3>
                <div className="space-y-2 text-sm">
                  <p className="text-green-600 dark:text-green-400">
                    ✓ Successfully imported: {result.success} jobs
                  </p>
                  {result.failed > 0 && (
                    <>
                      <p className="text-red-600 dark:text-red-400">
                        ✗ Failed: {result.failed} jobs
                      </p>
                      <div className="mt-3 space-y-1">
                        {result.errors.map((error, index) => (
                          <p key={index} className="text-red-600 dark:text-red-400 text-xs">
                            Row {error.row}: {error.error}
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
          </div>
        </div>
      </div>
    </div>
  )
}
