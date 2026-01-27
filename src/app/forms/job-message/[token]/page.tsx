'use client'

import React, { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'

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

interface Job {
  id: string
  jobId: string
  modelName: string
  tech?: {
    name: string
    email: string
  }
}

export default function SubcontractorMessagePage() {
  const params = useParams()
  const token = params.token as string
  
  const [job, setJob] = useState<Job | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [newMessage, setNewMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    fetchJobAndMessages()
  }, [token])

  const fetchJobAndMessages = async () => {
    try {
      setLoading(true)
      setError(null)

      // Validate token and fetch job
      const jobResponse = await fetch(`/api/forms/job-message/${token}`)
      if (!jobResponse.ok) {
        throw new Error('Invalid or expired link')
      }
      const jobData = await jobResponse.json()
      setJob(jobData.job)

      // Fetch messages for this job
      const messagesResponse = await fetch(`/api/forms/job-message/${token}/messages`)
      if (messagesResponse.ok) {
        const messagesData = await messagesResponse.json()
        setMessages(messagesData.messages || [])
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load conversation')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim()) return

    try {
      setSending(true)
      setError(null)

      const response = await fetch(`/api/forms/job-message/${token}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: newMessage }),
      })

      if (!response.ok) {
        throw new Error('Failed to send message')
      }

      setNewMessage('')
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
      
      // Refresh messages
      await fetchJobAndMessages()
    } catch (err: any) {
      setError(err.message || 'Failed to send message')
    } finally {
      setSending(false)
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-12 w-12 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Loading conversation...</p>
        </div>
      </div>
    )
  }

  if (error && !job) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <div className="text-red-600 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Invalid Link</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <p className="text-sm text-gray-500">Please contact XZ Reality Capture if you need assistance.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex items-center mb-4">
            <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-xl mr-4">
              XZ
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Job Conversation</h1>
              <p className="text-gray-600">XZ Reality Capture</p>
            </div>
          </div>
          
          {job && (
            <div className="border-t pt-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Job ID</p>
                  <p className="font-semibold text-gray-900">{job.jobId}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Property</p>
                  <p className="font-semibold text-gray-900">{job.modelName}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Messages */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Conversation</h2>
          
          {messages.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No messages yet. Start the conversation below!</p>
            </div>
          ) : (
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {messages.map((message) => (
                <div key={message.id} className="border-l-4 border-blue-600 pl-4 py-2">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-900">{getAuthorName(message)}</span>
                      <span className={`px-2 py-1 text-xs rounded ${getMessageTypeColor(message.messageType)}`}>
                        {message.messageType}
                      </span>
                    </div>
                    <span className="text-xs text-gray-500">
                      {new Date(message.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-gray-700 whitespace-pre-wrap">{message.message}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Reply Form */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Send a Message</h2>
          
          {success && (
            <div className="mb-4 p-4 bg-green-100 text-green-800 rounded-lg">
              ✓ Message sent successfully!
            </div>
          )}
          
          {error && job && (
            <div className="mb-4 p-4 bg-red-100 text-red-800 rounded-lg">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type your message here..."
              rows={6}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent resize-none"
              disabled={sending}
            />
            
            <div className="mt-4 flex justify-between items-center">
              <p className="text-sm text-gray-600">
                Your message will be sent to the XZ Reality Capture team.
              </p>
              <button
                type="submit"
                disabled={sending || !newMessage.trim()}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                {sending ? 'Sending...' : 'Send Message'}
              </button>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="text-center mt-8 text-sm text-gray-500">
          <p>© 2026 XZ Reality Capture. Questions? Contact us at support@xzrealitycapture.com</p>
        </div>
      </div>
    </div>
  )
}
