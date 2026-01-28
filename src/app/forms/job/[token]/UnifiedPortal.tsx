'use client'

import React, { useEffect, useState } from 'react'
import JobPortalTabs from '@/components/forms/JobPortalTabs'
import ScheduleTab from '@/components/forms/ScheduleTab'
import WorkflowActionButton from '@/components/forms/WorkflowActionButton'

interface Job {
  id: string
  jobId: string
  modelName: string
  targetDate: string
  captureAddress?: string
  city?: string
  state?: string
  schedulingNotes?: string
  techInstructions?: string
  lineItems?: any[]
  workflowSteps?: Array<{
    stepName: string
    description?: string
    requiredRole: string
    completed: boolean
    completedAt?: string
    completedBy?: any
  }>
  tech?: {
    id: string
    name: string
    email: string
  }
  schedulingRequest?: {
    requestType?: 'time-windows' | 'specific-time' | 'tech-proposes'
    sentAt?: string
    deadline?: string
    timeOptions?: Array<{
      optionNumber: number
      date: string
      timeWindow?: string
      startTime?: string
      endTime?: string
      specificTime?: string
    }>
    requestMessage?: string
    specialInstructions?: string
  }
  techResponse?: {
    respondedAt?: string
    interested?: boolean
    selectedOption?: number
    preferredStartTime?: string
  }
}

interface Message {
  id: string
  author: {
    relationTo: string
    value: {
      name?: string
      email?: string
    }
  }
  message: string
  messageType: string
  createdAt: string
}

interface UnifiedPortalProps {
  token: string
  initialTab?: string
}

export default function UnifiedPortal({ token, initialTab = 'info' }: UnifiedPortalProps) {
  const [job, setJob] = useState<Job | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState(initialTab)

  // Messaging state
  const [newMessage, setNewMessage] = useState('')
  const [sendingMessage, setSendingMessage] = useState(false)
  const [messageSuccess, setMessageSuccess] = useState(false)

  // Scheduling state
  const [schedulingResponse, setSchedulingResponse] = useState({
    interested: true,
    selectedOption: 1,
    preferredStartTime: '',
    proposedOptions: [
      { date: '', startTime: '', notes: '' },
      { date: '', startTime: '', notes: '' },
      { date: '', startTime: '', notes: '' },
    ],
    declineReason: '',
    notes: '',
  })
  const [submittingSchedule, setSubmittingSchedule] = useState(false)

  // Workflow completion modal state
  const [showCompletionModal, setShowCompletionModal] = useState(false)
  const [selectedStep, setSelectedStep] = useState<string | null>(null)
  const [completionNotes, setCompletionNotes] = useState('')
  const [completingStep, setCompletingStep] = useState(false)

  useEffect(() => {
    fetchJob()
  }, [token])

  useEffect(() => {
    if (activeTab === 'messages') {
      fetchMessages()
      const interval = setInterval(fetchMessages, 10000)
      return () => clearInterval(interval)
    }
  }, [activeTab])

  const fetchJob = async () => {
    try {
      const response = await fetch(`/api/forms/job/${token}`)
      if (!response.ok) {
        throw new Error('Invalid or expired link')
      }
      const data = await response.json()
      setJob(data)
    } catch (error: any) {
      setError(error.message || 'Failed to load job')
    } finally {
      setLoading(false)
    }
  }

  const fetchMessages = async () => {
    if (!job) return
    try {
      const response = await fetch(`/api/forms/job/${token}/messages`)
      if (response.ok) {
        const data = await response.json()
        setMessages(data.messages || [])
      }
    } catch (error) {
      console.error('Failed to fetch messages:', error)
    }
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim()) return

    try {
      setSendingMessage(true)
      const response = await fetch(`/api/forms/job/${token}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: newMessage }),
      })

      if (!response.ok) {
        throw new Error('Failed to send message')
      }

      setNewMessage('')
      setMessageSuccess(true)
      setTimeout(() => setMessageSuccess(false), 3000)
      await fetchMessages()
    } catch (error: any) {
      alert(error.message || 'Failed to send message')
    } finally {
      setSendingMessage(false)
    }
  }

  const handleSchedulingSubmit = async (responseData: any) => {
    setSubmittingSchedule(true)

    try {
      const response = await fetch(`/api/forms/job/${token}/schedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(responseData),
      })

      if (!response.ok) {
        throw new Error('Failed to submit scheduling response')
      }

      // Send email notification to ops team
      if (job) {
        try {
          const emailResponse = await fetch('/api/scheduling/notify-response', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ jobId: job.id }),
          })
          
          if (!emailResponse.ok) {
            console.warn('Failed to send tech response email')
          }
        } catch (emailError) {
          // Don't fail the whole operation if email fails
        }
      }

      alert('Thank you! Your scheduling response has been submitted.')
      await fetchJob()
    } catch (error: any) {
      alert(error.message || 'Failed to submit scheduling response')
    } finally {
      setSubmittingSchedule(false)
    }
  }

  const handleCompleteStep = async () => {
    if (!selectedStep) return
    
    setCompletingStep(true)
    try {
      const response = await fetch(`/api/forms/job/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'complete-step',
          stepName: selectedStep,
          feedback: completionNotes.trim() || undefined,
        }),
      })
      
      if (response.ok) {
        await fetchJob()
        setShowCompletionModal(false)
        setSelectedStep(null)
        setCompletionNotes('')
      } else {
        alert('Failed to mark step as complete')
      }
    } catch (error) {
      console.error('Error completing step:', error)
      alert('Failed to mark step as complete')
    } finally {
      setCompletingStep(false)
    }
  }

  const getAuthorName = (message: Message): string => {
    if (message.author?.value?.name) return message.author.value.name
    if (message.author?.value?.email) return message.author.value.email
    return 'Unknown'
  }

  const getMessageTypeColor = (type: string): string => {
    switch (type) {
      case 'question': return 'bg-purple-100 text-purple-800'
      case 'answer': return 'bg-green-100 text-green-800'
      case 'issue': return 'bg-red-100 text-red-800'
      case 'qc-feedback': return 'bg-blue-100 text-blue-800'
      case 'update': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <svg className="animate-spin h-12 w-12 mx-auto mb-4 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-lg font-medium text-gray-700">Loading job details...</p>
        </div>
      </div>
    )
  }

  if (error || !job) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-xl p-8 text-center border-t-4 border-red-600">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Invalid Link</h2>
          <p className="text-gray-600 mb-4">{error || 'This link is invalid or has expired.'}</p>
          <p className="text-sm text-gray-500">Please contact XZ Reality Capture if you need assistance.</p>
        </div>
      </div>
    )
  }

  // Only show Schedule tab if there's a scheduling request and no confirmed target date
  const showScheduleTab = job.schedulingRequest && !job.targetDate

  const tabs = [
    {
      id: 'info',
      label: 'Job Info',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    ...(showScheduleTab ? [{
      id: 'schedule',
      label: 'Schedule',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
    }] : []),
    {
      id: 'messages',
      label: 'Messages',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      ),
    },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 py-4 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-xl p-4 mb-4 border-t-4 border-blue-600">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center text-white font-bold text-xl mr-3 shadow-lg">
                XZ
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Tech Portal</h1>
                <p className="text-gray-600 text-sm">XZ Reality Capture</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide">Job ID</p>
                <p className="text-sm font-bold text-gray-900">{job.jobId}</p>
              </div>
              <div className="text-right">
                <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wide">Property</p>
                <p className="text-sm font-bold text-gray-900">{job.modelName}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Workflow Action Buttons - Above Tabs */}
        {job.workflowSteps && job.workflowSteps.length > 0 && (() => {
          const techSteps = job.workflowSteps.filter(step => 
            step.requiredRole === 'tech' || 
            step.stepName === 'Scanned' || 
            step.stepName === 'Scan Uploaded'
          )
          
          if (techSteps.length === 0) return null
          
          return (
            <div className="bg-white rounded-xl shadow-md p-4 mb-4 flex gap-3">
              {techSteps.map((step, index) => {
                const isPreviousComplete = index === 0 || techSteps[index - 1]?.completed
                const isDisabled = !isPreviousComplete || step.completed
                
                return (
                  <button
                    key={index}
                    onClick={() => {
                      if (!isDisabled) {
                        setSelectedStep(step.stepName)
                        setShowCompletionModal(true)
                      }
                    }}
                    disabled={isDisabled}
                    className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all flex items-center gap-2 ${
                      step.completed
                        ? 'bg-green-100 text-green-700 border-2 border-green-300 cursor-default'
                        : isPreviousComplete
                        ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-md hover:shadow-lg'
                        : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    {step.completed ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    )}
                    {step.stepName}
                  </button>
                )
              })}
            </div>
          )
        })()}

        {/* Main Content Card */}
        <div className="bg-white rounded-xl shadow-xl p-6">
          {/* Tabs */}
          <JobPortalTabs activeTab={activeTab} onTabChange={setActiveTab} tabs={tabs} />

          {/* Job Info Tab */}
          {activeTab === 'info' && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Job Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Job ID</label>
                  <p className="text-gray-900 font-medium">{job.jobId}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Model/Project</label>
                  <p className="text-gray-900 font-medium">{job.modelName}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Scheduled Date</label>
                  {job.schedulingRequest && !job.targetDate ? (
                    <p className="text-amber-600 italic">To be determined - please check Schedule tab</p>
                  ) : job.targetDate ? (
                    <p className="text-gray-900">{new Date(job.targetDate).toLocaleString()}</p>
                  ) : (
                    <p className="text-gray-500 italic">Not scheduled yet</p>
                  )}
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Location</label>
                  <p className="text-gray-900">
                    {job.captureAddress || 'N/A'}
                    {job.city && `, ${job.city}`}
                    {job.state && `, ${job.state}`}
                  </p>
                </div>
              </div>

              {job.schedulingNotes && (
                <div className="mt-4">
                  <label className="text-sm font-medium text-gray-500">Scheduling Notes</label>
                  <p className="text-gray-900 bg-gray-50 p-3 rounded-lg mt-1">{job.schedulingNotes}</p>
                </div>
              )}

              {job.techInstructions && (
                <div className="mt-4">
                  <label className="text-sm font-medium text-gray-500">Instructions</label>
                  <p className="text-gray-900 bg-gray-50 p-3 rounded-lg mt-1 whitespace-pre-wrap">{job.techInstructions}</p>
                </div>
              )}

              {job.lineItems && job.lineItems.length > 0 && (
                <div className="mt-4">
                  <label className="text-sm font-medium text-gray-500">Services / To-Do List</label>
                  <div className="mt-2 space-y-2">
                    {job.lineItems.map((item: any, index: number) => (
                      <div key={index} className="bg-gray-50 p-3 rounded-lg">
                        <p className="font-medium text-gray-900">{item.product?.name || 'Service'} (Qty: {item.quantity || 1})</p>
                        {item.instructions && (
                          <p className="text-sm text-gray-600 mt-1">{item.instructions}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Schedule Tab */}
          {activeTab === 'schedule' && (
            <ScheduleTab
              schedulingRequest={job.schedulingRequest}
              techResponse={job.techResponse}
              onSubmit={handleSchedulingSubmit}
              submitting={submittingSchedule}
            />
          )}

          {/* Messages Tab */}
          {activeTab === 'messages' && (
            <div>
              {messages.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-lg">
                  <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  <p className="text-gray-500 text-lg">No messages yet. Start the conversation below!</p>
                </div>
              ) : (
                <div className="space-y-4 max-h-[500px] overflow-y-auto mb-6">
                  {messages.map((message) => (
                    <div key={message.id} className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border-l-4 border-blue-600 shadow-sm">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                            {getAuthorName(message).charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <span className="font-bold text-gray-900 block">{getAuthorName(message)}</span>
                            <span className="text-xs text-gray-500">
                              {new Date(message.createdAt).toLocaleString()}
                            </span>
                          </div>
                        </div>
                        <span className={`px-3 py-1 text-xs font-semibold rounded-full ${getMessageTypeColor(message.messageType)}`}>
                          {message.messageType}
                        </span>
                      </div>
                      <p className="text-gray-800 whitespace-pre-wrap leading-relaxed ml-13">{message.message}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Send Message Form */}
              <form onSubmit={handleSendMessage} className="mt-6">
                {messageSuccess && (
                  <div className="mb-4 p-4 bg-green-50 border-l-4 border-green-500 rounded-lg flex items-center">
                    <svg className="w-6 h-6 text-green-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-green-800 font-semibold">Message sent successfully!</span>
                  </div>
                )}

                <div className="relative">
                  <textarea
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type your message here..."
                    rows={4}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-600 focus:border-blue-600 resize-none text-gray-900 placeholder-gray-400"
                    disabled={sendingMessage}
                  />
                </div>

                <div className="mt-4 flex justify-end">
                  <button
                    type="submit"
                    disabled={sendingMessage || !newMessage.trim()}
                    className="px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-indigo-700 disabled:from-gray-300 disabled:to-gray-300 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl flex items-center gap-2"
                  >
                    {sendingMessage ? (
                      <>
                        <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Sending...
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                        </svg>
                        Send Message
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}

        </div>
      </div>

      {/* Confirmation Modal */}
      {showCompletionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Complete Task</h3>
            <p className="text-gray-600 mb-4">
              Are you sure you want to mark <span className="font-semibold">{selectedStep}</span> as complete?
            </p>

            {/* Optional Notes */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Optional Notes
              </label>
              <textarea
                value={completionNotes}
                onChange={(e) => setCompletionNotes(e.target.value)}
                placeholder="Any notes, issues, or feedback about this step..."
                rows={4}
                className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowCompletionModal(false)
                  setSelectedStep(null)
                  setCompletionNotes('')
                }}
                disabled={completingStep}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCompleteStep}
                disabled={completingStep}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {completingStep ? (
                  <>
                    <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Completing...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Confirm
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
