'use client'

import React, { useState } from 'react'
import { SaveIndicator } from '@/components/oms/SaveIndicator'
import { patchJob } from '@/lib/oms/patchJob'

interface Job {
  id: string
  sitePOCName?: string
  sitePOCPhone?: string
  sitePOCEmail?: string
  uploadLink?: string
  mediaUploadLink?: string
  lineItems?: any[]
  customTodoItems?: any[]
  schedulingNotes?: string
  techInstructions?: string
}

interface AutosaveField<T> {
  value: T
  status: 'idle' | 'saving' | 'saved' | 'error'
  error?: string | null
  setValue: (value: T) => void
  commit?: (value: T) => void
  onBlur?: () => void
}

interface User {
  role: string
}

interface InstructionsTabProps {
  job: Job
  user: User
  sitePOCNameField: AutosaveField<string>
  sitePOCPhoneField: AutosaveField<string>
  sitePOCEmailField: AutosaveField<string>
  uploadLinkField: AutosaveField<string | null>
  mediaUploadLinkField: AutosaveField<string | null>
  schedulingNotesField: AutosaveField<string>
  techInstructionsField: AutosaveField<string>
  onUpdate: () => Promise<void>
}

export default function InstructionsTab({
  job,
  user,
  sitePOCNameField,
  sitePOCPhoneField,
  sitePOCEmailField,
  uploadLinkField,
  mediaUploadLinkField,
  schedulingNotesField,
  techInstructionsField,
  onUpdate,
}: InstructionsTabProps) {
  const isTech = user?.role === 'tech'

  // Custom todo item form state
  const [showCustomItemForm, setShowCustomItemForm] = useState(false)
  const [newCustomTask, setNewCustomTask] = useState('')
  const [newCustomNotes, setNewCustomNotes] = useState('')

  return (
    <div className="space-y-6">
      {/* Row 1: POC, Upload Links, To-Do List */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* On-Site Contact (POC) */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">On-Site Contact (POC)</h2>
          {isTech ? (
            <div className="space-y-3">
              {job.sitePOCName || job.sitePOCPhone || job.sitePOCEmail ? (
                <>
                  {job.sitePOCName && (
                    <div>
                      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Name</label>
                      <p className="text-sm text-gray-900 dark:text-white">{job.sitePOCName}</p>
                    </div>
                  )}
                  {job.sitePOCPhone && (
                    <div>
                      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Phone</label>
                      <a href={`tel:${job.sitePOCPhone}`} className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
                        {job.sitePOCPhone}
                      </a>
                    </div>
                  )}
                  {job.sitePOCEmail && (
                    <div>
                      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Email</label>
                      <a href={`mailto:${job.sitePOCEmail}`} className="text-sm text-blue-600 dark:text-blue-400 hover:underline break-all">
                        {job.sitePOCEmail}
                      </a>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-sm text-gray-400 italic">No contact info</p>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">Name</label>
                <input
                  type="text"
                  value={sitePOCNameField.value || ''}
                  onChange={(e) => sitePOCNameField.setValue(e.target.value)}
                  onBlur={() => sitePOCNameField.onBlur?.()}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="John Doe"
                />
                <SaveIndicator status={sitePOCNameField.status} error={sitePOCNameField.error} />
              </div>
              <div className="space-y-1">
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">Phone</label>
                <input
                  type="tel"
                  value={sitePOCPhoneField.value || ''}
                  onChange={(e) => sitePOCPhoneField.setValue(e.target.value)}
                  onBlur={() => sitePOCPhoneField.onBlur?.()}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="(555) 123-4567"
                />
                <SaveIndicator status={sitePOCPhoneField.status} error={sitePOCPhoneField.error} />
              </div>
              <div className="space-y-1">
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">Email</label>
                <input
                  type="email"
                  value={sitePOCEmailField.value || ''}
                  onChange={(e) => sitePOCEmailField.setValue(e.target.value)}
                  onBlur={() => sitePOCEmailField.onBlur?.()}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="contact@example.com"
                />
                <SaveIndicator status={sitePOCEmailField.status} error={sitePOCEmailField.error} />
              </div>
            </div>
          )}
        </div>

        {/* Upload Links */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Upload Locations</h2>
          {isTech ? (
            <div className="space-y-3">
              {job.uploadLink ? (
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Primary Upload</label>
                  <a href={job.uploadLink} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 dark:text-blue-400 hover:underline break-all">
                    {job.uploadLink}
                  </a>
                </div>
              ) : null}
              {job.mediaUploadLink ? (
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Media Upload</label>
                  <a href={job.mediaUploadLink} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 dark:text-blue-400 hover:underline break-all">
                    {job.mediaUploadLink}
                  </a>
                </div>
              ) : null}
              {!job.uploadLink && !job.mediaUploadLink && (
                <p className="text-sm text-gray-400 italic">No upload links</p>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">Primary Upload</label>
                <input
                  type="url"
                  value={uploadLinkField.value || ''}
                  onChange={(e) => uploadLinkField.setValue(e.target.value)}
                  onBlur={() => uploadLinkField.onBlur?.()}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="https://..."
                />
                <SaveIndicator status={uploadLinkField.status} error={uploadLinkField.error} />
              </div>
              <div className="space-y-1">
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">Media Upload</label>
                <input
                  type="url"
                  value={mediaUploadLinkField.value || ''}
                  onChange={(e) => mediaUploadLinkField.setValue(e.target.value)}
                  onBlur={() => mediaUploadLinkField.onBlur?.()}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="https://..."
                />
                <SaveIndicator status={mediaUploadLinkField.status} error={mediaUploadLinkField.error} />
              </div>
            </div>
          )}
        </div>

        {/* To-Do List / Services */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">To-Do List / Services</h2>
            {!isTech && !showCustomItemForm && (
              <button
                onClick={() => setShowCustomItemForm(true)}
                className="px-3 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
              >
                + Add Custom Item
              </button>
            )}
          </div>
          {((job.lineItems?.filter((item: any) => !item.product?.excludeFromCalendar && !item.excludeFromCalendar).length ?? 0) > 0 || (job.customTodoItems?.length ?? 0) > 0) ? (
            <ul className="space-y-2 list-disc list-inside text-gray-900 dark:text-white">
              {job.lineItems
                ?.filter((item: any) => !item.product?.excludeFromCalendar && !item.excludeFromCalendar)
                .map((item: any, index: number) => (
                <li key={`product-${index}`} className="text-sm">
                  <span className="font-medium">{item.product?.name || 'Product'}</span>
                  {item.quantity > 1 && <span className="text-gray-500 dark:text-gray-400"> (Qty: {item.quantity})</span>}
                  {item.instructions && (
                    <p className="ml-5 text-xs text-gray-600 dark:text-gray-400 mt-0.5">{item.instructions}</p>
                  )}
                </li>
              ))}
              {job.customTodoItems?.map((item: any, index: number) => (
                <li key={`custom-${index}`} className="text-sm group">
                  <span className="font-medium">{item.task}</span>
                  {!isTech && (
                    <button
                      onClick={async () => {
                        if (!confirm('Remove this item?')) return
                        const updatedItems = job.customTodoItems?.filter((_: any, i: number) => i !== index) || []
                        try {
                          await patchJob(job.id, { customTodoItems: updatedItems })
                          await onUpdate()
                        } catch (error) {
                          console.error('Error removing item:', error)
                          alert('Failed to remove item')
                        }
                      }}
                      className="ml-2 text-red-500 hover:text-red-700 opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Remove item"
                    >
                      ×
                    </button>
                  )}
                  {item.notes && (
                    <p className="ml-5 text-xs text-gray-600 dark:text-gray-400 mt-0.5">{item.notes}</p>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-400 italic">No items added</p>
          )}

          {/* Inline Add Form */}
          {!isTech && showCustomItemForm && (
            <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-300 dark:border-gray-600">
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Task Description *
                  </label>
                  <input
                    type="text"
                    value={newCustomTask}
                    onChange={(e) => setNewCustomTask(e.target.value)}
                    placeholder="e.g., Take photos of HVAC system"
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Additional Notes (optional)
                  </label>
                  <textarea
                    value={newCustomNotes}
                    onChange={(e) => setNewCustomNotes(e.target.value)}
                    placeholder="Any additional details..."
                    rows={2}
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={async () => {
                      if (!newCustomTask.trim()) {
                        alert('Please enter a task description')
                        return
                      }

                      const currentItems = job.customTodoItems || []
                      const updatedItems = [...currentItems, { task: newCustomTask, notes: newCustomNotes }]

                      try {
                        await patchJob(job.id, { customTodoItems: updatedItems })
                        await onUpdate()
                        setNewCustomTask('')
                        setNewCustomNotes('')
                        setShowCustomItemForm(false)
                      } catch (error) {
                        console.error('Error adding custom item:', error)
                        alert('Failed to add item')
                      }
                    }}
                    className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => {
                      setNewCustomTask('')
                      setNewCustomNotes('')
                      setShowCustomItemForm(false)
                    }}
                    className="px-4 py-2 text-sm bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg font-medium transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Row 2: Scheduling Notes */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Scheduling Notes / Restrictions</h2>
        {isTech ? (
          <div className="prose dark:prose-invert max-w-none">
            {job.schedulingNotes ? (
              <pre className="whitespace-pre-wrap text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">
                {job.schedulingNotes}
              </pre>
            ) : (
              <p className="text-gray-400 italic">No scheduling notes</p>
            )}
          </div>
        ) : (
          <div className="space-y-1">
            <textarea
              value={schedulingNotesField.value || ''}
              onChange={(e) => schedulingNotesField.setValue(e.target.value)}
              onBlur={() => schedulingNotesField.onBlur?.()}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white min-h-[100px]"
              placeholder="Enter scheduling notes, restrictions, or special requirements..."
            />
            <SaveIndicator status={schedulingNotesField.status} error={schedulingNotesField.error} />
          </div>
        )}
      </div>

      {/* Row 3: General Instructions */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">General Instructions for Tech</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Auto-generated from client template + product instructions. Will regenerate when products are added/changed. Add all products first, then make manual edits if needed.
        </p>
        {isTech ? (
          <div className="prose dark:prose-invert max-w-none">
            {job.techInstructions ? (
              <pre className="whitespace-pre-wrap text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">
                {job.techInstructions}
              </pre>
            ) : (
              <p className="text-gray-400 italic">No instructions provided</p>
            )}
          </div>
        ) : (
          <div className="space-y-1">
            <textarea
              value={techInstructionsField.value || ''}
              onChange={(e) => techInstructionsField.setValue(e.target.value)}
              onBlur={() => techInstructionsField.onBlur?.()}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white min-h-[150px]"
              placeholder="Enter general instructions for the tech..."
            />
            <SaveIndicator status={techInstructionsField.status} error={techInstructionsField.error} />
          </div>
        )}
      </div>
    </div>
  )
}
