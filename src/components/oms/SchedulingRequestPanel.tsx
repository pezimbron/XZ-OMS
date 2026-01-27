'use client'

import React, { useState } from 'react'

interface SchedulingRequestPanelProps {
  jobId: string
  existingRequest?: any
  onSave: () => void
}

export default function SchedulingRequestPanel({ jobId, existingRequest, onSave }: SchedulingRequestPanelProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [requestType, setRequestType] = useState<'time-windows' | 'specific-time' | 'tech-proposes'>(
    existingRequest?.requestType || 'time-windows'
  )
  const [timeOptions, setTimeOptions] = useState(
    existingRequest?.timeOptions || [
      { optionNumber: 1, date: '', timeWindow: 'morning', startTime: '', endTime: '' },
      { optionNumber: 2, date: '', timeWindow: 'afternoon', startTime: '', endTime: '' },
    ]
  )
  const [requestMessage, setRequestMessage] = useState(existingRequest?.requestMessage || '')
  const [specialInstructions, setSpecialInstructions] = useState(existingRequest?.specialInstructions || '')
  const [deadlineHours, setDeadlineHours] = useState(24)

  const addTimeOption = () => {
    setTimeOptions([
      ...timeOptions,
      { optionNumber: timeOptions.length + 1, date: '', timeWindow: 'morning', startTime: '', endTime: '' },
    ])
  }

  const removeTimeOption = (index: number) => {
    setTimeOptions(timeOptions.filter((_, i) => i !== index))
  }

  const updateTimeOption = (index: number, field: string, value: string) => {
    const newOptions = [...timeOptions]
    newOptions[index] = { ...newOptions[index], [field]: value }
    setTimeOptions(newOptions)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      const sentAt = new Date()
      const deadline = new Date(sentAt.getTime() + deadlineHours * 60 * 60 * 1000)

      const schedulingRequest: any = {
        requestType,
        sentAt: sentAt.toISOString(),
        deadline: deadline.toISOString(),
        reminderSent: false,
        specialInstructions,
      }

      if (requestType === 'time-windows' || requestType === 'specific-time') {
        schedulingRequest.timeOptions = timeOptions.filter(opt => opt.date)
      }

      if (requestType === 'tech-proposes') {
        schedulingRequest.requestMessage = requestMessage
      }

      const response = await fetch(`/api/jobs/${jobId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          schedulingRequest,
          targetDate: null // Clear target date when sending scheduling request
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to save scheduling request')
      }

      alert('Scheduling request saved successfully!')
      setIsOpen(false)
      onSave()
    } catch (error) {
      console.error('Error saving scheduling request:', error)
      alert('Failed to save scheduling request')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Scheduling Request</h3>
        {!isOpen && (
          <button
            onClick={() => setIsOpen(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
          >
            {existingRequest ? 'Edit Request' : 'Create Request'}
          </button>
        )}
      </div>

      {existingRequest && !isOpen && (
        <div className="space-y-3 text-sm">
          <div>
            <span className="font-medium text-gray-700 dark:text-gray-300">Type: </span>
            <span className="text-gray-900 dark:text-white capitalize">{existingRequest.requestType?.replace('-', ' ')}</span>
          </div>
          <div>
            <span className="font-medium text-gray-700 dark:text-gray-300">Sent: </span>
            <span className="text-gray-900 dark:text-white">{new Date(existingRequest.sentAt).toLocaleString()}</span>
          </div>
          <div>
            <span className="font-medium text-gray-700 dark:text-gray-300">Deadline: </span>
            <span className="text-gray-900 dark:text-white">{new Date(existingRequest.deadline).toLocaleString()}</span>
          </div>
          {existingRequest.reminderSent && (
            <div>
              <span className="font-medium text-gray-700 dark:text-gray-300">Reminder Sent: </span>
              <span className="text-green-600 dark:text-green-400">Yes</span>
            </div>
          )}
        </div>
      )}

      {isOpen && (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Request Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Request Type
            </label>
            <select
              value={requestType}
              onChange={(e) => setRequestType(e.target.value as any)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
            >
              <option value="time-windows">Time Windows (You provide options)</option>
              <option value="specific-time">Specific Time (You propose exact time)</option>
              <option value="tech-proposes">Tech Proposes (Tech provides options)</option>
            </select>
          </div>

          {/* Time Windows / Specific Time */}
          {(requestType === 'time-windows' || requestType === 'specific-time') && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Time Options
              </label>
              <div className="space-y-3">
                {timeOptions.map((option, index) => (
                  <div key={index} className="p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-medium text-gray-900 dark:text-white">Option {option.optionNumber}</span>
                      {timeOptions.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeTimeOption(index)}
                          className="text-red-600 hover:text-red-700 text-sm"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Date</label>
                        <div className="flex gap-2">
                          <input
                            type="date"
                            value={option.date}
                            onChange={(e) => updateTimeOption(index, 'date', e.target.value)}
                            className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                            required
                          />
                          {option.date && (
                            <button
                              type="button"
                              onClick={() => updateTimeOption(index, 'date', '')}
                              className="px-2 py-1 text-gray-500 hover:text-red-600 text-xs"
                              title="Clear date"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      </div>
                      {requestType === 'time-windows' && (
                        <>
                          <div>
                            <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Time Window</label>
                            <select
                              value={option.timeWindow}
                              onChange={(e) => updateTimeOption(index, 'timeWindow', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                            >
                              <option value="morning">Morning</option>
                              <option value="afternoon">Afternoon</option>
                              <option value="evening">Evening</option>
                              <option value="custom">Custom</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Start Time</label>
                            <input
                              type="text"
                              value={option.startTime}
                              onChange={(e) => updateTimeOption(index, 'startTime', e.target.value)}
                              placeholder="e.g., 9:00am"
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">End Time</label>
                            <input
                              type="text"
                              value={option.endTime}
                              onChange={(e) => updateTimeOption(index, 'endTime', e.target.value)}
                              placeholder="e.g., 12:00pm"
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                            />
                          </div>
                        </>
                      )}
                      {requestType === 'specific-time' && (
                        <div>
                          <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Specific Time</label>
                          <input
                            type="text"
                            value={option.specificTime}
                            onChange={(e) => updateTimeOption(index, 'specificTime', e.target.value)}
                            placeholder="e.g., 2:00pm"
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              {requestType === 'time-windows' && timeOptions.length < 5 && (
                <button
                  type="button"
                  onClick={addTimeOption}
                  className="mt-3 px-4 py-2 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-gray-600 dark:text-gray-400 hover:border-blue-500 hover:text-blue-600 transition-colors"
                >
                  + Add Time Option
                </button>
              )}
            </div>
          )}

          {/* Tech Proposes */}
          {requestType === 'tech-proposes' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Request Message
              </label>
              <textarea
                value={requestMessage}
                onChange={(e) => setRequestMessage(e.target.value)}
                rows={3}
                placeholder="e.g., Please provide 3 date/time options when you can complete this job"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
          )}

          {/* Special Instructions */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Special Instructions (optional)
            </label>
            <textarea
              value={specialInstructions}
              onChange={(e) => setSpecialInstructions(e.target.value)}
              rows={3}
              placeholder="Any special requirements or notes for the tech..."
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          {/* Deadline */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Response Deadline
            </label>
            <select
              value={deadlineHours}
              onChange={(e) => setDeadlineHours(parseInt(e.target.value))}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value={12}>12 hours</option>
              <option value={24}>24 hours</option>
              <option value={48}>48 hours</option>
              <option value={72}>72 hours</option>
            </select>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Tech will receive a reminder after 6 hours if no response
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors"
            >
              {saving ? 'Saving...' : 'Save Request'}
            </button>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
