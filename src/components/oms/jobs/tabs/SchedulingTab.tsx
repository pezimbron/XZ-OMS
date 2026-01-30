'use client'

import React from 'react'
import SchedulingRequestPanel from '@/components/oms/SchedulingRequestPanel'

interface Job {
  id: string
  targetDate: string
  schedulingRequest?: any
  techResponse?: any
  timezone?: string
}

interface User {
  role: string
}

interface SchedulingTabProps {
  job: Job
  user: User
  onUpdate: () => Promise<void>
}

export default function SchedulingTab({ job, user, onUpdate }: SchedulingTabProps) {
  const isTech = user?.role === 'tech'

  return (
    <div className="space-y-6">
      {/* Scheduling Request Panel (Ops/Admin only) */}
      {!isTech && (
        <SchedulingRequestPanel
          jobId={job.id}
          existingRequest={job.schedulingRequest}
          onSave={onUpdate}
        />
      )}

      {/* Tech Scheduling Response (Ops/Admin only - shows tech responses) */}
      {!isTech && job.techResponse?.respondedAt && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Tech Scheduling Response</h2>

          <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border-l-4 border-green-500 rounded">
            <p className="text-sm text-green-800 dark:text-green-300">
              <strong>Responded:</strong> {new Date(job.techResponse.respondedAt).toLocaleString()}
            </p>
          </div>

          {job.techResponse.interested ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="font-semibold">Tech Accepted</span>
              </div>

              {job.schedulingRequest?.requestType === 'time-windows' && job.techResponse.selectedOption && (
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Selected Time Window:</p>
                      <p className="font-medium text-gray-900 dark:text-white">
                        Option {job.techResponse.selectedOption}
                        {job.schedulingRequest.timeOptions?.find((opt: any) => opt.optionNumber === job.techResponse.selectedOption) && (
                          <span className="ml-2">
                            - {new Date(job.schedulingRequest.timeOptions.find((opt: any) => opt.optionNumber === job.techResponse.selectedOption).date).toLocaleDateString()}
                          </span>
                        )}
                      </p>
                      {job.techResponse.preferredStartTime && (
                        <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">
                          Preferred start time: {job.techResponse.preferredStartTime}
                        </p>
                      )}
                    </div>
                    {!job.targetDate && (
                      <button
                        onClick={async () => {
                          const selectedOption = job.schedulingRequest.timeOptions?.find((opt: any) => opt.optionNumber === job.techResponse.selectedOption)
                          if (!selectedOption) return
                          const startTime = job.techResponse.preferredStartTime || '09:00'
                          if (!confirm(`Confirm this time slot: ${new Date(selectedOption.date).toLocaleDateString()} at ${startTime}?`)) return
                          try {
                            const timezone = job.timezone || 'America/Chicago'
                            const timezoneOffsets: Record<string, string> = {
                              'America/Chicago': '-06:00',
                              'America/New_York': '-05:00',
                              'America/Denver': '-07:00',
                              'America/Los_Angeles': '-08:00',
                              'America/Phoenix': '-07:00',
                            }
                            const offset = timezoneOffsets[timezone] || '-06:00'
                            const dateOnly = selectedOption.date.split('T')[0]
                            let hours = 9, minutes = 0
                            const time24Match = startTime.match(/^(\d{1,2}):(\d{2})$/)
                            const time12Match = startTime.match(/^(\d{1,2}):(\d{2})\s?(am|pm)$/i)
                            if (time24Match) {
                              hours = parseInt(time24Match[1])
                              minutes = parseInt(time24Match[2])
                            } else if (time12Match) {
                              hours = parseInt(time12Match[1])
                              minutes = parseInt(time12Match[2])
                              const period = time12Match[3].toLowerCase()
                              if (period === 'pm' && hours !== 12) hours += 12
                              if (period === 'am' && hours === 12) hours = 0
                            }
                            const timeStr = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:00`
                            const targetDateTime = `${dateOnly}T${timeStr}${offset}`

                            const response = await fetch(`/api/jobs/${job.id}`, {
                              method: 'PATCH',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ targetDate: targetDateTime }),
                            })

                            if (response.ok) {
                              try {
                                await fetch('/api/scheduling/notify-confirmation', {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ jobId: job.id }),
                                })
                              } catch (emailError) {
                                console.error('Failed to send confirmation email:', emailError)
                              }
                              await onUpdate()
                              alert('Schedule confirmed!')
                            } else {
                              throw new Error('Failed to update job')
                            }
                          } catch (error) {
                            console.error('Error confirming schedule:', error)
                            alert('Failed to confirm schedule')
                          }
                        }}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors whitespace-nowrap"
                      >
                        Accept This Time
                      </button>
                    )}
                  </div>
                </div>
              )}

              {job.schedulingRequest?.requestType === 'specific-time' && (
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Requested Specific Time:</p>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {new Date(job.schedulingRequest.specificTime).toLocaleString()}
                  </p>
                  {job.techResponse.preferredStartTime && (
                    <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">
                      Tech preferred time: {job.techResponse.preferredStartTime}
                    </p>
                  )}
                </div>
              )}

              {job.schedulingRequest?.requestType === 'tech-proposes' && job.techResponse.proposedOptions && (
                <div className="space-y-3">
                  <p className="text-sm text-gray-600 dark:text-gray-400">Tech Proposed Times:</p>
                  {job.techResponse.proposedOptions.map((option: any, index: number) => (
                    <div key={index} className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="font-medium text-gray-900 dark:text-white">
                            Option {index + 1}: {new Date(option.date).toLocaleDateString()} at {option.startTime}
                          </p>
                          {option.notes && (
                            <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">
                              {option.notes}
                            </p>
                          )}
                        </div>
                        {!job.targetDate && (
                          <button
                            onClick={async () => {
                              if (!confirm(`Confirm this time slot: ${new Date(option.date).toLocaleDateString()} at ${option.startTime}?`)) return
                              try {
                                const timezone = job.timezone || 'America/Chicago'
                                const timezoneOffsets: Record<string, string> = {
                                  'America/Chicago': '-06:00',
                                  'America/New_York': '-05:00',
                                  'America/Denver': '-07:00',
                                  'America/Los_Angeles': '-08:00',
                                  'America/Phoenix': '-07:00',
                                }
                                const offset = timezoneOffsets[timezone] || '-06:00'
                                const dateOnly = option.date.split('T')[0]
                                const startTime = option.startTime
                                let hours = 9, minutes = 0
                                const time24Match = startTime.match(/^(\d{1,2}):(\d{2})$/)
                                const time12Match = startTime.match(/^(\d{1,2}):(\d{2})\s?(am|pm)$/i)
                                if (time24Match) {
                                  hours = parseInt(time24Match[1])
                                  minutes = parseInt(time24Match[2])
                                } else if (time12Match) {
                                  hours = parseInt(time12Match[1])
                                  minutes = parseInt(time12Match[2])
                                  const period = time12Match[3].toLowerCase()
                                  if (period === 'pm' && hours !== 12) hours += 12
                                  if (period === 'am' && hours === 12) hours = 0
                                }
                                const timeStr = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:00`
                                const targetDateTime = `${dateOnly}T${timeStr}${offset}`

                                const response = await fetch(`/api/jobs/${job.id}`, {
                                  method: 'PATCH',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ targetDate: targetDateTime }),
                                })

                                if (response.ok) {
                                  try {
                                    await fetch('/api/scheduling/notify-confirmation', {
                                      method: 'POST',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({ jobId: job.id }),
                                    })
                                  } catch (emailError) {
                                    console.error('Failed to send confirmation email:', emailError)
                                  }
                                  await onUpdate()
                                  alert('Schedule confirmed!')
                                } else {
                                  throw new Error('Failed to update job')
                                }
                              } catch (error) {
                                console.error('Error confirming schedule:', error)
                                alert('Failed to confirm schedule')
                              }
                            }}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors whitespace-nowrap"
                          >
                            Accept This Time
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
              <p className="text-red-800 dark:text-red-300 font-medium">Tech Declined</p>
              {job.techResponse.declineReason && (
                <p className="text-sm text-red-700 dark:text-red-400 mt-2">
                  Reason: {job.techResponse.declineReason}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Tech View - Show when scheduling request exists */}
      {isTech && job.schedulingRequest && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Scheduling Request</h2>
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <p className="text-sm text-blue-800 dark:text-blue-300 mb-2">
                <strong>Request Type:</strong> {job.schedulingRequest.requestType?.replace('-', ' ').toUpperCase()}
              </p>
              {job.schedulingRequest.requestMessage && (
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  <strong>Message:</strong> {job.schedulingRequest.requestMessage}
                </p>
              )}
            </div>

            {job.schedulingRequest.requestType === 'time-windows' && job.schedulingRequest.timeOptions && (
              <div className="space-y-3">
                <p className="text-sm text-gray-600 dark:text-gray-400">Available Time Windows:</p>
                {job.schedulingRequest.timeOptions.map((option: any, index: number) => (
                  <div key={index} className="bg-gray-50 dark:bg-gray-900 p-3 rounded-lg">
                    <p className="font-medium text-gray-900 dark:text-white">
                      Option {option.optionNumber}: {new Date(option.date).toLocaleDateString()}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {option.timeWindow} ({option.startTime} - {option.endTime})
                    </p>
                  </div>
                ))}
              </div>
            )}

            {job.schedulingRequest.requestType === 'specific-time' && (
              <div className="bg-gray-50 dark:bg-gray-900 p-3 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Requested Time:</p>
                <p className="font-medium text-gray-900 dark:text-white">
                  {new Date(job.schedulingRequest.specificTime).toLocaleString()}
                </p>
              </div>
            )}

            {job.schedulingRequest.requestType === 'tech-proposes' && (
              <div className="bg-gray-50 dark:bg-gray-900 p-3 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Please provide 3 available time slots for this job.
                </p>
              </div>
            )}

            {/* Tech Response Form - TODO: Implement in next step */}
            <div className="mt-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <p className="text-sm text-yellow-800 dark:text-yellow-300">
                Tech response form will be implemented in the next step
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
