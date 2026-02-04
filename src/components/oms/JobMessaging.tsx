'use client'

import React, { useState, useEffect, useRef } from 'react'

interface Author {
  id?: string
  relationTo?: string
  value?: { id: string; name?: string; email?: string }
  name?: string
  email?: string
}

interface Attachment {
  id?: string
  description?: string
  url?: string
}

interface Message {
  id: string
  author: Author
  message: string
  messageType: string
  attachments?: Attachment[]
  createdAt: string
  isRead: boolean
}

interface JobMessagingProps {
  jobId: string
  currentUser: { id: string; name?: string; email?: string }
}

export function JobMessaging({ jobId, currentUser }: JobMessagingProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [newMessage, setNewMessage] = useState('')
  const [messageType, setMessageType] = useState('message')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchMessages()
    // Poll for new messages every 10 seconds
    const interval = setInterval(fetchMessages, 10000)
    return () => clearInterval(interval)
  }, [jobId])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const fetchMessages = async () => {
    try {
      const response = await fetch(`/api/job-messages?where[job][equals]=${jobId}&sort=createdAt&limit=100&depth=2`)
      const data = await response.json()
      setMessages(data.docs || [])
    } catch (error) {
      console.error('Error fetching messages:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim()) return

    setSending(true)
    try {
      const response = await fetch('/api/job-messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          job: jobId,
          author: {
            relationTo: 'users',
            value: currentUser.id,
          },
          message: newMessage,
          messageType,
          sentVia: 'app',
        }),
      })

      if (!response.ok) throw new Error('Failed to send message')

      setNewMessage('')
      setMessageType('message')
      await fetchMessages()
    } catch (error) {
      console.error('Error sending message:', error)
      alert('Failed to send message. Please try again.')
    } finally {
      setSending(false)
    }
  }

  const getMessageTypeColor = (type: string) => {
    switch (type) {
      case 'question': return 'bg-blue-100 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700'
      case 'answer': return 'bg-green-100 dark:bg-green-900/30 border-green-300 dark:border-green-700'
      case 'issue': return 'bg-red-100 dark:bg-red-900/30 border-red-300 dark:border-red-700'
      case 'qc-feedback': return 'bg-purple-100 dark:bg-purple-900/30 border-purple-300 dark:border-purple-700'
      case 'update': return 'bg-yellow-100 dark:bg-yellow-900/30 border-yellow-300 dark:border-yellow-700'
      default: return 'bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-700'
    }
  }

  const getMessageTypeLabel = (type: string) => {
    switch (type) {
      case 'question': return '❓ Question'
      case 'answer': return '✅ Answer'
      case 'issue': return '⚠️ Issue'
      case 'qc-feedback': return '🔍 QC Feedback'
      case 'update': return '📢 Update'
      default: return '💬 Message'
    }
  }

  const getAuthorName = (author: Author) => {
    if (!author) return 'Unknown'
    if (author.value && typeof author.value === 'object') {
      return author.value.name || author.value.email || 'Unknown'
    }
    return author.name || author.email || 'Unknown'
  }

  const isCurrentUser = (author: Author) => {
    const authorId = author.value?.id || author.id
    return authorId === currentUser?.id
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <svg className="animate-spin h-8 w-8 mx-auto mb-2 text-blue-600 dark:text-blue-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-sm text-gray-600 dark:text-gray-400">Loading messages...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-[600px]">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-gray-900">
        {messages.length === 0 ? (
          <div className="text-center py-12">
            <svg className="w-16 h-16 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <p className="text-gray-600 dark:text-gray-400 text-lg font-medium">No messages yet</p>
            <p className="text-gray-500 dark:text-gray-500 text-sm mt-1">Start a conversation about this job</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isOwn = isCurrentUser(msg.author)
            return (
              <div key={msg.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[70%] ${isOwn ? 'items-end' : 'items-start'} flex flex-col`}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                      {getAuthorName(msg.author)}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-500">
                      {new Date(msg.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <div className={`rounded-lg p-3 border ${getMessageTypeColor(msg.messageType)}`}>
                    {msg.messageType !== 'message' && (
                      <div className="text-xs font-medium mb-1 opacity-75">
                        {getMessageTypeLabel(msg.messageType)}
                      </div>
                    )}
                    <p className="text-sm text-gray-900 dark:text-white whitespace-pre-wrap">
                      {msg.message}
                    </p>
                    {msg.attachments && msg.attachments.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-gray-300 dark:border-gray-600">
                        <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Attachments:</p>
                        {msg.attachments.map((att, idx) => (
                          <div key={idx} className="text-xs text-blue-600 dark:text-blue-400">
                            📎 {att.description || 'Attachment'}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input Area */}
      <div className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
        <form onSubmit={handleSendMessage} className="space-y-3">
          <div className="flex gap-2">
            <select
              value={messageType}
              onChange={(e) => setMessageType(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
            >
              <option value="message">💬 Message</option>
              <option value="question">❓ Question</option>
              <option value="answer">✅ Answer</option>
              <option value="update">📢 Update</option>
              <option value="issue">⚠️ Issue</option>
              <option value="qc-feedback">🔍 QC Feedback</option>
            </select>
          </div>
          <div className="flex gap-2">
            <textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type your message..."
              rows={3}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
              disabled={sending}
            />
            <button
              type="submit"
              disabled={sending || !newMessage.trim()}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors self-end"
            >
              {sending ? (
                <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                'Send'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
