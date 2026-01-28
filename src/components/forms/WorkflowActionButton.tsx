'use client'

import React, { useState } from 'react'

interface WorkflowActionButtonProps {
  stepName: string
  onComplete: (feedback?: string) => Promise<void>
}

export default function WorkflowActionButton({ stepName, onComplete }: WorkflowActionButtonProps) {
  const [slidePosition, setSlidePosition] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [isCompleting, setIsCompleting] = useState(false)
  const [feedback, setFeedback] = useState('')
  const [showFeedback, setShowFeedback] = useState(false)
  const maxSlide = 200 // pixels to slide

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true)
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left - 30 // offset for button width
    const newPosition = Math.max(0, Math.min(x, maxSlide))
    setSlidePosition(newPosition)

    // Auto-complete if slid far enough
    if (newPosition >= maxSlide - 10) {
      handleComplete()
    }
  }

  const handleMouseUp = () => {
    if (slidePosition < maxSlide - 10) {
      setSlidePosition(0) // Reset if not completed
    }
    setIsDragging(false)
  }

  const handleComplete = async () => {
    if (isCompleting) return
    setIsDragging(false)
    setIsCompleting(true)
    try {
      await onComplete(feedback.trim() || undefined)
    } finally {
      setIsCompleting(false)
      setSlidePosition(0)
      setFeedback('')
      setShowFeedback(false)
    }
  }

  return (
    <div className="mt-3">
      {/* Optional Feedback Field */}
      <div className="mb-3">
        <button
          type="button"
          onClick={() => setShowFeedback(!showFeedback)}
          className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
          </svg>
          {showFeedback ? 'Hide' : 'Add'} optional notes
        </button>
        
        {showFeedback && (
          <textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="Any notes, issues, or feedback about this step? (optional)"
            rows={3}
            className="mt-2 w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none text-sm"
          />
        )}
      </div>

      {/* Slide to Complete */}
      <div
        className="relative h-14 bg-gray-200 rounded-full overflow-hidden cursor-pointer select-none"
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Background text */}
        <div className="absolute inset-0 flex items-center justify-center text-gray-500 font-semibold">
          {isCompleting ? 'Completing...' : 'Slide to Complete →'}
        </div>

        {/* Sliding button */}
        <div
          className={`absolute left-1 top-1 h-12 w-12 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full shadow-lg flex items-center justify-center transition-transform ${
            isDragging ? '' : 'transition-all duration-200'
          }`}
          style={{ transform: `translateX(${slidePosition}px)` }}
          onMouseDown={handleMouseDown}
        >
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
      </div>
    </div>
  )
}
