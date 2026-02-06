'use client'

import React, { useState, useRef } from 'react'

interface MatterportRow {
  recordNumber: string
  jobId: string
  captureAddress: string
  floorUnit: string
  ctRate: number
  ctTravelPayout: number
  ctOffHoursPayout: number
  projectName: string
  mpClient: string
}

interface MatchedJob {
  matterportRow: MatterportRow
  omsJob: {
    id: string
    jobId: string
    captureAddress: string
    modelName: string
    status: string
  } | null
  matchConfidence: 'high' | 'medium' | 'low' | 'none'
  matchReason: string
}

interface Props {
  isOpen: boolean
  onClose: () => void
  onImportComplete: () => void
}

export default function MatterportImportModal({ isOpen, onClose, onImportComplete }: Props) {
  const [step, setStep] = useState<'upload' | 'preview' | 'result'>('upload')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [matches, setMatches] = useState<MatchedJob[]>([])
  const [summary, setSummary] = useState<{ high: number; medium: number; low: number; none: number } | null>(null)
  const [selectedMatches, setSelectedMatches] = useState<Set<string>>(new Set())
  const [importResult, setImportResult] = useState<{ updated: number; failed: number } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)
      setError(null)
    }
  }

  const handlePreview = async () => {
    if (!file) {
      setError('Please select a CSV file')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('action', 'preview')

      const response = await fetch('/api/matterport/import', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Preview failed')
      }

      setMatches(data.matches)
      setSummary(data.summary)

      // Auto-select high and medium confidence matches
      const autoSelected = new Set<string>()
      data.matches.forEach((m: MatchedJob) => {
        if (m.omsJob && (m.matchConfidence === 'high' || m.matchConfidence === 'medium')) {
          autoSelected.add(m.omsJob.id)
        }
      })
      setSelectedMatches(autoSelected)

      setStep('preview')
    } catch (err: any) {
      setError(err.message || 'Failed to preview import')
    } finally {
      setLoading(false)
    }
  }

  const handleApply = async () => {
    if (selectedMatches.size === 0) {
      setError('Please select at least one match to import')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('file', file!)
      formData.append('action', 'apply')
      formData.append('selectedMatches', JSON.stringify(Array.from(selectedMatches)))

      const response = await fetch('/api/matterport/import', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Import failed')
      }

      setImportResult({ updated: data.updated, failed: data.failed })
      setStep('result')
      onImportComplete()
    } catch (err: any) {
      setError(err.message || 'Failed to apply import')
    } finally {
      setLoading(false)
    }
  }

  const toggleMatch = (jobId: string) => {
    const newSelected = new Set(selectedMatches)
    if (newSelected.has(jobId)) {
      newSelected.delete(jobId)
    } else {
      newSelected.add(jobId)
    }
    setSelectedMatches(newSelected)
  }

  const selectAllMatched = () => {
    const allMatched = new Set<string>()
    matches.forEach(m => {
      if (m.omsJob) allMatched.add(m.omsJob.id)
    })
    setSelectedMatches(allMatched)
  }

  const deselectAll = () => {
    setSelectedMatches(new Set())
  }

  const resetModal = () => {
    setStep('upload')
    setFile(null)
    setMatches([])
    setSummary(null)
    setSelectedMatches(new Set())
    setImportResult(null)
    setError(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const getConfidenceBadge = (confidence: string) => {
    const styles: Record<string, string> = {
      high: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
      low: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
      none: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
    }
    return (
      <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${styles[confidence]}`}>
        {confidence.toUpperCase()}
      </span>
    )
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Import Matterport Payment CSV
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-800 dark:text-red-200">
              {error}
            </div>
          )}

          {step === 'upload' && (
            <div className="space-y-6">
              <div className="text-center py-8">
                <div className="mb-4">
                  <svg className="w-16 h-16 mx-auto text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  Upload Matterport CSV
                </h3>
                <p className="text-gray-500 dark:text-gray-400 mb-4">
                  Select the payment CSV file exported from Matterport
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                >
                  Choose File
                </button>
                {file && (
                  <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">
                    Selected: <span className="font-medium">{file.name}</span>
                  </p>
                )}
              </div>

              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 dark:text-white mb-2">What this will do:</h4>
                <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                  <li>• Parse the Matterport CSV file</li>
                  <li>• Match rows to existing OMS jobs by address</li>
                  <li>• Update job amounts with CT Rate from CSV</li>
                  <li>• Update travel and off-hours payouts</li>
                </ul>
              </div>
            </div>
          )}

          {step === 'preview' && (
            <div className="space-y-4">
              {/* Summary */}
              {summary && (
                <div className="grid grid-cols-4 gap-4 mb-6">
                  <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-green-600 dark:text-green-400">{summary.high}</div>
                    <div className="text-sm text-green-700 dark:text-green-300">High Match</div>
                  </div>
                  <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{summary.medium}</div>
                    <div className="text-sm text-yellow-700 dark:text-yellow-300">Medium Match</div>
                  </div>
                  <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">{summary.low}</div>
                    <div className="text-sm text-orange-700 dark:text-orange-300">Low Match</div>
                  </div>
                  <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-red-600 dark:text-red-400">{summary.none}</div>
                    <div className="text-sm text-red-700 dark:text-red-300">No Match</div>
                  </div>
                </div>
              )}

              {/* Selection controls */}
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {selectedMatches.size} of {matches.filter(m => m.omsJob).length} matched rows selected
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={selectAllMatched}
                    className="px-3 py-1 text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400"
                  >
                    Select All Matched
                  </button>
                  <button
                    onClick={deselectAll}
                    className="px-3 py-1 text-sm text-gray-600 hover:text-gray-700 dark:text-gray-400"
                  >
                    Deselect All
                  </button>
                </div>
              </div>

              {/* Matches table */}
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                <div className="overflow-x-auto max-h-96">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 dark:bg-gray-700 sticky top-0">
                      <tr>
                        <th className="px-4 py-2 text-left w-12"></th>
                        <th className="px-4 py-2 text-left">Matterport Address</th>
                        <th className="px-4 py-2 text-left">OMS Job</th>
                        <th className="px-4 py-2 text-left">Confidence</th>
                        <th className="px-4 py-2 text-right">CT Rate</th>
                        <th className="px-4 py-2 text-right">Travel</th>
                        <th className="px-4 py-2 text-right">Off-Hours</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {matches.map((match, index) => (
                        <tr
                          key={index}
                          className={`${match.omsJob ? 'hover:bg-gray-50 dark:hover:bg-gray-700' : 'bg-gray-50 dark:bg-gray-800 opacity-60'}`}
                        >
                          <td className="px-4 py-2">
                            {match.omsJob && (
                              <input
                                type="checkbox"
                                checked={selectedMatches.has(match.omsJob.id)}
                                onChange={() => toggleMatch(match.omsJob!.id)}
                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              />
                            )}
                          </td>
                          <td className="px-4 py-2">
                            <div className="max-w-xs truncate text-gray-900 dark:text-white" title={match.matterportRow.captureAddress}>
                              {match.matterportRow.captureAddress}
                            </div>
                            {match.matterportRow.floorUnit && (
                              <div className="text-xs text-gray-500">{match.matterportRow.floorUnit}</div>
                            )}
                          </td>
                          <td className="px-4 py-2">
                            {match.omsJob ? (
                              <div>
                                <div className="font-medium text-gray-900 dark:text-white">
                                  {match.omsJob.jobId || match.omsJob.id}
                                </div>
                                <div className="text-xs text-gray-500 max-w-xs truncate" title={match.omsJob.captureAddress}>
                                  {match.omsJob.captureAddress}
                                </div>
                              </div>
                            ) : (
                              <span className="text-gray-400 italic">No match</span>
                            )}
                          </td>
                          <td className="px-4 py-2">
                            {getConfidenceBadge(match.matchConfidence)}
                          </td>
                          <td className="px-4 py-2 text-right font-medium text-gray-900 dark:text-white">
                            ${match.matterportRow.ctRate.toFixed(2)}
                          </td>
                          <td className="px-4 py-2 text-right text-gray-600 dark:text-gray-400">
                            ${match.matterportRow.ctTravelPayout.toFixed(2)}
                          </td>
                          <td className="px-4 py-2 text-right text-gray-600 dark:text-gray-400">
                            ${match.matterportRow.ctOffHoursPayout.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {step === 'result' && importResult && (
            <div className="text-center py-8">
              <div className="mb-4">
                <svg className="w-16 h-16 mx-auto text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Import Complete</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Successfully updated <span className="font-bold text-green-600">{importResult.updated}</span> jobs
                {importResult.failed > 0 && (
                  <>, <span className="font-bold text-red-600">{importResult.failed}</span> failed</>
                )}
              </p>
              <button
                onClick={() => {
                  resetModal()
                  onClose()
                }}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
              >
                Done
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        {step !== 'result' && (
          <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <button
              onClick={step === 'upload' ? onClose : () => setStep('upload')}
              className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
            >
              {step === 'upload' ? 'Cancel' : 'Back'}
            </button>
            <button
              onClick={step === 'upload' ? handlePreview : handleApply}
              disabled={loading || (step === 'upload' && !file) || (step === 'preview' && selectedMatches.size === 0)}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              {loading && (
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              )}
              {step === 'upload' ? 'Preview Import' : `Apply to ${selectedMatches.size} Jobs`}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
