'use client'

import React, { useState } from 'react'

interface NotifyClientButtonProps {
  jobId: string
  clientName?: string
  clientEmail?: string
}

interface Template {
  value: string
  label: string
  type: string
  subject: string
  body: string
}

export function NotifyClientButton({ jobId, clientName, clientEmail }: NotifyClientButtonProps) {
  const [showModal, setShowModal] = useState(false)
  const [notificationType, setNotificationType] = useState<string>('')
  const [editableSubject, setEditableSubject] = useState('')
  const [editableBody, setEditableBody] = useState('')
  const [recipientEmails, setRecipientEmails] = useState<string>('')
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null)
  const [templates, setTemplates] = useState<Template[]>([])
  const [loadingTemplates, setLoadingTemplates] = useState(false)

  const fetchTemplates = async () => {
    setLoadingTemplates(true)
    try {
      const response = await fetch('/api/notification-templates')
      const data = await response.json()
      if (response.ok && data.templates) {
        setTemplates(data.templates)
        // Set first template as default if available
        if (data.templates.length > 0 && !notificationType) {
          const firstTemplate = data.templates[0]
          setNotificationType(firstTemplate.value)
          setEditableSubject(firstTemplate.subject)
          setEditableBody(firstTemplate.body)
        }
      }
    } catch (error) {
      console.error('Error fetching templates:', error)
    } finally {
      setLoadingTemplates(false)
    }
  }

  const handleTemplateChange = (templateValue: string) => {
    setNotificationType(templateValue)
    const selectedTemplate = templates.find(t => t.value === templateValue)
    if (selectedTemplate) {
      setEditableSubject(selectedTemplate.subject)
      setEditableBody(selectedTemplate.body)
    }
  }

  const handleOpenModal = () => {
    setShowModal(true)
    setRecipientEmails(clientEmail || '')
    fetchTemplates()
  }

  const handleSendNotification = async () => {
    setSending(true)
    setResult(null)

    try {
      const response = await fetch(`/api/jobs/${jobId}/notify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          notificationType, 
          customSubject: editableSubject,
          customBody: editableBody,
          recipientEmails: recipientEmails
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setResult({ success: true, message: data.message })
        setTimeout(() => {
          setShowModal(false)
          setResult(null)
          setEditableSubject('')
          setEditableBody('')
          setRecipientEmails('')
        }, 2000)
      } else {
        setResult({ success: false, message: data.error || 'Failed to send notification' })
      }
    } catch (error) {
      setResult({ success: false, message: 'Network error. Please try again.' })
    } finally {
      setSending(false)
    }
  }

  return (
    <>
      <button
        onClick={handleOpenModal}
        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
      >
        <span>📧</span>
        <span>Notify Client</span>
      </button>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Send Notification to {clientName || 'Client'}
                </h3>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Notification Type
                  </label>
                  {loadingTemplates ? (
                    <div className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400">
                      Loading templates...
                    </div>
                  ) : templates.length === 0 ? (
                    <div className="w-full px-3 py-2 border border-red-300 dark:border-red-600 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 text-sm">
                      No notification templates found. Please create templates in the admin panel first.
                    </div>
                  ) : (
                    <select
                      value={notificationType}
                      onChange={(e) => handleTemplateChange(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      {/* Group templates by type category */}
                      {(() => {
                        const lifecycleTemplates = templates.filter(t => 
                          ['scheduled', 'completed', 'delivered'].includes(t.type)
                        )
                        const workflowTemplates = templates.filter(t => 
                          !['scheduled', 'completed', 'delivered'].includes(t.type)
                        )
                        
                        return (
                          <>
                            {lifecycleTemplates.length > 0 && (
                              <optgroup label="Job Lifecycle">
                                {lifecycleTemplates.map((template) => (
                                  <option key={template.value} value={template.value}>
                                    {template.label}
                                  </option>
                                ))}
                              </optgroup>
                            )}
                            {workflowTemplates.length > 0 && (
                              <optgroup label="Workflow Steps">
                                {workflowTemplates.map((template) => (
                                  <option key={template.value} value={template.value}>
                                    {template.label}
                                  </option>
                                ))}
                              </optgroup>
                            )}
                          </>
                        )
                      })()}
                    </select>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Recipient Email(s)
                  </label>
                  <input
                    type="text"
                    value={recipientEmails}
                    onChange={(e) => setRecipientEmails(e.target.value)}
                    placeholder="email@example.com, another@example.com"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Separate multiple emails with commas
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Email Subject
                  </label>
                  <input
                    type="text"
                    value={editableSubject}
                    onChange={(e) => setEditableSubject(e.target.value)}
                    placeholder="Email subject..."
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Email Body
                  </label>
                  <textarea
                    value={editableBody}
                    onChange={(e) => setEditableBody(e.target.value)}
                    rows={12}
                    placeholder="Email body text..."
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono text-sm"
                  />
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Edit the template text before sending. You can add links, modify content, etc. This won&apos;t update the template.
                  </p>
                </div>

                {result && (
                  <div
                    className={`p-3 rounded-lg ${
                      result.success
                        ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-300'
                        : 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-300'
                    }`}
                  >
                    {result.message}
                  </div>
                )}

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => setShowModal(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSendNotification}
                    disabled={sending || !notificationType || templates.length === 0}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {sending ? 'Sending...' : 'Send Notification'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
