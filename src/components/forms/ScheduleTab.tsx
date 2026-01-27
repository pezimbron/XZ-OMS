'use client'

import React, { useState } from 'react'

interface TimeOption {
  optionNumber: number
  date: string
  timeWindow?: string
  startTime?: string
  endTime?: string
  specificTime?: string
}

interface SchedulingRequest {
  requestType?: 'time-windows' | 'specific-time' | 'tech-proposes'
  sentAt?: string
  deadline?: string
  timeOptions?: TimeOption[]
  requestMessage?: string
  specialInstructions?: string
}

interface TechResponse {
  respondedAt?: string
  interested?: boolean
  selectedOption?: number
  preferredStartTime?: string
  proposedOptions?: Array<{
    date: string
    startTime: string
    notes?: string
  }>
  declineReason?: string
  notes?: string
}

interface ScheduleTabProps {
  schedulingRequest?: SchedulingRequest
  techResponse?: TechResponse
  onSubmit: (response: any) => Promise<void>
  submitting: boolean
}

export default function ScheduleTab({ schedulingRequest, techResponse, onSubmit, submitting }: ScheduleTabProps) {
  const [response, setResponse] = useState({
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await onSubmit(response)
  }

  const handleDecline = async () => {
    if (!response.declineReason.trim()) {
      alert('Please provide a reason for declining')
      return
    }
    await onSubmit({ ...response, interested: false })
  }

  const updateProposedOption = (index: number, field: string, value: string) => {
    const newOptions = [...response.proposedOptions]
    newOptions[index] = { ...newOptions[index], [field]: value }
    setResponse({ ...response, proposedOptions: newOptions })
  }

  if (!schedulingRequest?.requestType) {
    return (
      <div className="text-center py-12 bg-gray-50 rounded-lg">
        <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <p className="text-gray-500 text-lg">No scheduling request for this job yet.</p>
      </div>
    )
  }

  // If tech has already responded, show the submitted response
  if (techResponse?.respondedAt) {
    return (
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Your Scheduling Response</h2>
        
        <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded-lg mb-6">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="text-green-800 font-semibold">
              Response submitted on {new Date(techResponse.respondedAt).toLocaleString()}
            </span>
          </div>
        </div>

        {techResponse.interested ? (
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-md font-semibold text-gray-900 mb-4">You accepted this job</h3>
            
            {schedulingRequest.requestType === 'time-windows' && techResponse.selectedOption && (
              <div className="space-y-2">
                <p className="text-sm text-gray-600">Selected Time Window:</p>
                <div className="bg-blue-50 p-4 rounded-lg">
                  {schedulingRequest.timeOptions?.find(opt => opt.optionNumber === techResponse.selectedOption) && (
                    <>
                      <p className="font-medium text-gray-900">
                        Option {techResponse.selectedOption}: {new Date(schedulingRequest.timeOptions.find(opt => opt.optionNumber === techResponse.selectedOption)!.date).toLocaleDateString()}
                      </p>
                      {techResponse.preferredStartTime && (
                        <p className="text-sm text-gray-700 mt-1">Preferred start time: {techResponse.preferredStartTime}</p>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}

            {schedulingRequest.requestType === 'specific-time' && (
              <p className="text-gray-700">You accepted the proposed time.</p>
            )}

            {schedulingRequest.requestType === 'tech-proposes' && techResponse.proposedOptions && (
              <div className="space-y-2">
                <p className="text-sm text-gray-600">Your Proposed Time Options:</p>
                {techResponse.proposedOptions.map((option, index) => (
                  <div key={index} className="bg-blue-50 p-4 rounded-lg">
                    <p className="font-medium text-gray-900">
                      Option {index + 1}: {new Date(option.date).toLocaleDateString()} at {option.startTime}
                    </p>
                    {option.notes && <p className="text-sm text-gray-700 mt-1">{option.notes}</p>}
                  </div>
                ))}
              </div>
            )}

            {techResponse.notes && (
              <div className="mt-4">
                <p className="text-sm text-gray-600 mb-1">Additional Notes:</p>
                <p className="text-gray-900 bg-gray-50 p-3 rounded-lg">{techResponse.notes}</p>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <h3 className="text-md font-semibold text-red-900 mb-2">You declined this job</h3>
            {techResponse.declineReason && (
              <div>
                <p className="text-sm text-red-700 mb-1">Reason:</p>
                <p className="text-red-900 bg-white p-3 rounded-lg border border-red-200">{techResponse.declineReason}</p>
              </div>
            )}
          </div>
        )}

        <div className="mt-6 p-4 bg-gray-50 rounded-lg text-sm text-gray-600">
          <p>Your response has been sent to the operations team. They will confirm the final schedule and notify you.</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Scheduling Request</h2>

      {schedulingRequest.deadline && (
        <div className="mb-6 p-4 bg-yellow-50 border-l-4 border-yellow-500 rounded-lg">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-yellow-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-yellow-800 font-semibold">
              Please respond by: {new Date(schedulingRequest.deadline).toLocaleString()}
            </span>
          </div>
        </div>
      )}

      {schedulingRequest.specialInstructions && (
        <div className="mb-6 p-4 bg-blue-50 border-l-4 border-blue-500 rounded-lg">
          <p className="text-sm font-semibold text-blue-800 mb-1">Special Instructions:</p>
          <p className="text-blue-900 whitespace-pre-wrap">{schedulingRequest.specialInstructions}</p>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* Time Windows Request Type */}
        {schedulingRequest.requestType === 'time-windows' && (
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Select your preferred time window:
            </label>
            <div className="space-y-3">
              {schedulingRequest.timeOptions?.map((option) => (
                <label
                  key={option.optionNumber}
                  className="flex items-center p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 cursor-pointer transition-colors"
                >
                  <input
                    type="radio"
                    name="selectedOption"
                    value={option.optionNumber}
                    checked={response.selectedOption === option.optionNumber}
                    onChange={(e) => setResponse({ ...response, selectedOption: parseInt(e.target.value) })}
                    className="w-4 h-4 text-blue-600 mr-3"
                  />
                  <div className="flex-1">
                    <div className="font-semibold text-gray-900">
                      Option {option.optionNumber}: {new Date(option.date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                    </div>
                    <div className="text-gray-600">
                      {option.timeWindow && <span className="capitalize">{option.timeWindow}</span>}
                      {option.startTime && option.endTime && (
                        <span> ({option.startTime} - {option.endTime})</span>
                      )}
                    </div>
                  </div>
                </label>
              ))}
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Preferred start time within the selected window:
              </label>
              <input
                type="time"
                value={response.preferredStartTime}
                onChange={(e) => setResponse({ ...response, preferredStartTime: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
          </div>
        )}

        {/* Specific Time Request Type */}
        {schedulingRequest.requestType === 'specific-time' && (
          <div className="mb-6">
            <div className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border-2 border-blue-200">
              <p className="text-sm font-semibold text-blue-800 mb-2">Proposed Date & Time:</p>
              {schedulingRequest.timeOptions?.[0] && (
                <div className="text-lg font-bold text-gray-900">
                  {new Date(schedulingRequest.timeOptions[0].date).toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    month: 'long', 
                    day: 'numeric', 
                    year: 'numeric' 
                  })}
                  {schedulingRequest.timeOptions[0].specificTime && (
                    <span className="ml-2">at {schedulingRequest.timeOptions[0].specificTime}</span>
                  )}
                </div>
              )}
            </div>
            <p className="text-sm text-gray-600 mt-3">
              Can you complete this job at the proposed time? If not, please decline and provide a reason.
            </p>
          </div>
        )}

        {/* Tech Proposes Request Type */}
        {schedulingRequest.requestType === 'tech-proposes' && (
          <div className="mb-6">
            {schedulingRequest.requestMessage && (
              <div className="mb-4 p-4 bg-blue-50 rounded-lg">
                <p className="text-blue-900">{schedulingRequest.requestMessage}</p>
              </div>
            )}

            <p className="text-sm font-medium text-gray-700 mb-4">
              Please provide 3 date/time options when you can complete this job:
            </p>

            {[0, 1, 2].map((index) => (
              <div key={index} className="mb-4 p-4 border-2 border-gray-200 rounded-lg">
                <h3 className="font-semibold text-gray-900 mb-3">Option {index + 1}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Date {index === 0 && <span className="text-red-600">*</span>}
                    </label>
                    <input
                      type="date"
                      value={response.proposedOptions[index].date}
                      onChange={(e) => updateProposedOption(index, 'date', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required={index === 0}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Start Time {index === 0 && <span className="text-red-600">*</span>}
                    </label>
                    <input
                      type="time"
                      value={response.proposedOptions[index].startTime}
                      onChange={(e) => updateProposedOption(index, 'startTime', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required={index === 0}
                    />
                  </div>
                </div>
                <div className="mt-3">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes (optional)
                  </label>
                  <input
                    type="text"
                    value={response.proposedOptions[index].notes}
                    onChange={(e) => updateProposedOption(index, 'notes', e.target.value)}
                    placeholder={index === 0 ? "e.g., Preferred time" : ""}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Additional Notes */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Additional Notes (optional)
          </label>
          <textarea
            value={response.notes}
            onChange={(e) => setResponse({ ...response, notes: e.target.value })}
            rows={3}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Any additional information or questions..."
          />
        </div>

        {/* Decline Reason (shown when declining) */}
        {!response.interested && (
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Reason for Declining <span className="text-red-600">*</span>
            </label>
            <textarea
              value={response.declineReason}
              onChange={(e) => setResponse({ ...response, declineReason: e.target.value })}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Please let us know why you cannot take this job..."
              required
            />
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-4">
          {response.interested ? (
            <>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold py-3 px-6 rounded-lg hover:from-blue-700 hover:to-indigo-700 disabled:from-gray-300 disabled:to-gray-300 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl"
              >
                {submitting ? 'Submitting...' : 'Accept & Submit'}
              </button>
              <button
                type="button"
                onClick={() => setResponse({ ...response, interested: false })}
                className="px-6 py-3 border-2 border-gray-300 text-gray-700 font-semibold rounded-lg hover:border-red-500 hover:text-red-600 transition-colors"
              >
                Decline
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={handleDecline}
                disabled={submitting}
                className="flex-1 bg-red-600 text-white font-semibold py-3 px-6 rounded-lg hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                {submitting ? 'Submitting...' : 'Submit Decline'}
              </button>
              <button
                type="button"
                onClick={() => setResponse({ ...response, interested: true, declineReason: '' })}
                className="px-6 py-3 border-2 border-gray-300 text-gray-700 font-semibold rounded-lg hover:border-blue-500 hover:text-blue-600 transition-colors"
              >
                Cancel
              </button>
            </>
          )}
        </div>
      </form>
    </div>
  )
}
