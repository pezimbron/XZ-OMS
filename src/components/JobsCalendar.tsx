'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { Calendar, dateFnsLocalizer, View } from 'react-big-calendar'
import { format, parse, startOfWeek, getDay } from 'date-fns'
import 'react-big-calendar/lib/css/react-big-calendar.css'
import '../app/(payload)/admin/calendar/calendar.css'

const locales = {
  'en-US': require('date-fns/locale/en-US'),
}

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
})

interface Job {
  id: string
  jobId: string
  modelName: string
  targetDate: string
  region?: 'austin' | 'san-antonio' | 'outsourced' | 'other'
  tech?: {
    id: string
    name: string
  }
  status: string
  city?: string
  captureAddress?: string
}

interface CalendarEvent {
  id: string
  title: string
  start: Date
  end: Date
  resource: Job
}

const regionColors = {
  austin: '#3b82f6', // Blue
  'san-antonio': '#10b981', // Green
  outsourced: '#f59e0b', // Amber
  other: '#6b7280', // Gray
}

const regionLabels = {
  austin: 'Austin Area',
  'san-antonio': 'San Antonio Area',
  outsourced: 'Outsourced',
  other: 'Other',
}

export function JobsCalendar() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<View>('month')
  const [date, setDate] = useState(new Date())

  useEffect(() => {
    fetchJobs()
  }, [])

  const fetchJobs = async () => {
    try {
      const response = await fetch('/api/jobs?limit=1000&depth=1')
      const data = await response.json()
      setJobs(data.docs || [])
    } catch (error) {
      console.error('Error fetching jobs:', error)
    } finally {
      setLoading(false)
    }
  }

  const events: CalendarEvent[] = useMemo(() => {
    return jobs
      .filter((job) => job.targetDate)
      .map((job) => {
        const startDate = new Date(job.targetDate)
        const endDate = new Date(startDate.getTime() + 2 * 60 * 60 * 1000) // 2 hours default

        return {
          id: job.id,
          title: `${job.modelName}${job.tech ? ` - ${job.tech.name}` : ' (Unassigned)'}`,
          start: startDate,
          end: endDate,
          resource: job,
        }
      })
  }, [jobs])

  const eventStyleGetter = (event: CalendarEvent) => {
    const region = event.resource.region || 'other'
    const backgroundColor = regionColors[region]
    const isUnassigned = !event.resource.tech

    return {
      style: {
        backgroundColor,
        borderRadius: '5px',
        opacity: isUnassigned ? 0.6 : 1,
        color: 'white',
        border: isUnassigned ? '2px dashed white' : 'none',
        display: 'block',
        fontSize: '0.875rem',
        padding: '2px 5px',
      },
    }
  }

  const handleSelectEvent = (event: CalendarEvent) => {
    window.location.href = `/admin/collections/jobs/${event.resource.id}`
  }

  if (loading) {
    return (
      <div 
        className="min-h-screen flex items-center justify-center"
        style={{ 
          background: 'linear-gradient(to bottom right, #f8fafc, #dbeafe, #e0e7ff)',
          minHeight: '100vh'
        }}
      >
        <div className="text-center">
          <svg className="animate-spin h-12 w-12 mx-auto mb-4" style={{ color: '#3b82f6' }} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-lg font-medium" style={{ color: '#374151' }}>Loading calendar...</p>
        </div>
      </div>
    )
  }

  return (
    <div 
      className="min-h-screen" 
      style={{ 
        background: 'linear-gradient(to bottom right, #f8fafc, #dbeafe, #e0e7ff)',
        colorScheme: 'light',
        minHeight: '100vh'
      }}
    >
      {/* Navigation Bar */}
      <div className="bg-white border-b border-gray-200 shadow-sm" style={{ backgroundColor: '#ffffff' }}>
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center text-white text-xl font-bold shadow-lg">
                📅
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Jobs Calendar</h1>
                <p className="text-sm text-gray-500">Visual schedule with color-coded regions</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => window.location.href = '/admin/collections/jobs'}
                className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all text-sm font-medium flex items-center gap-2 shadow-sm"
              >
                <span>📋</span> All Jobs
              </button>
              <button
                onClick={() => window.location.href = '/admin/collections/jobs/create'}
                className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all text-sm font-medium flex items-center gap-2 shadow-sm"
              >
                <span>➕</span> Create Job
              </button>
              <button
                onClick={() => window.location.href = '/quick-create'}
                className="px-4 py-2 text-white rounded-lg transition-all text-sm font-medium flex items-center gap-2 shadow-md"
                style={{ background: 'linear-gradient(to right, #10b981, #059669)' }}
              >
                <span>⚡</span> Quick Create
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl p-4 shadow-md border border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <span className="text-2xl">📊</span>
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Jobs</p>
                <p className="text-2xl font-bold text-gray-900">{events.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-md border border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <span className="text-2xl">✅</span>
              </div>
              <div>
                <p className="text-sm text-gray-600">Assigned</p>
                <p className="text-2xl font-bold text-gray-900">{events.filter(e => e.resource.tech).length}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-md border border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                <span className="text-2xl">⏳</span>
              </div>
              <div>
                <p className="text-sm text-gray-600">Unassigned</p>
                <p className="text-2xl font-bold text-gray-900">{events.filter(e => !e.resource.tech).length}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-md border border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <span className="text-2xl">🌍</span>
              </div>
              <div>
                <p className="text-sm text-gray-600">Outsourced</p>
                <p className="text-2xl font-bold text-gray-900">{events.filter(e => e.resource.region === 'outsourced').length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Legend Bar */}
        <div className="bg-white rounded-xl shadow-md border border-gray-200 p-4 mb-6">
          <div className="flex flex-wrap items-center gap-6">
            <h3 className="font-semibold text-gray-900">Region Colors:</h3>
            {Object.entries(regionLabels).map(([key, label]) => (
              <div key={key} className="flex items-center gap-2">
                <div
                  className="w-5 h-5 rounded shadow-sm"
                  style={{ backgroundColor: regionColors[key as keyof typeof regionColors] }}
                />
                <span className="text-sm font-medium text-gray-700">{label}</span>
              </div>
            ))}
            <div className="border-l border-gray-300 h-6 mx-2"></div>
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded border-2 border-dashed border-gray-500" />
              <span className="text-sm font-medium text-gray-700">Unassigned Tech</span>
            </div>
          </div>
        </div>

        {/* Calendar Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
          <div className="p-6" style={{ height: '750px' }}>
            <Calendar
              localizer={localizer}
              events={events}
              startAccessor="start"
              endAccessor="end"
              style={{ height: '100%' }}
              eventPropGetter={eventStyleGetter}
              onSelectEvent={handleSelectEvent}
              view={view}
              onView={setView}
              date={date}
              onNavigate={setDate}
              views={['month', 'week', 'day', 'agenda']}
              popup
              tooltipAccessor={(event: CalendarEvent) => {
                const job = event.resource
                return `${job.modelName}\n${job.city || ''}\n${job.tech ? `Tech: ${job.tech.name}` : 'Unassigned'}\nStatus: ${job.status}`
              }}
            />
          </div>
        </div>

        {/* Help Section */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-6 mt-6 shadow-lg">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center text-white text-xl">
              💡
            </div>
            <h3 className="text-xl font-bold text-gray-900">Quick Tips</h3>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="flex gap-3">
              <div className="flex-shrink-0 text-2xl">🖱️</div>
              <div>
                <h4 className="font-semibold text-gray-900">Click Events</h4>
                <p className="text-sm text-gray-600">Click any job to view or edit details</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="flex-shrink-0 text-2xl">🎨</div>
              <div>
                <h4 className="font-semibold text-gray-900">Color Coded</h4>
                <p className="text-sm text-gray-600">Jobs are colored by region for easy planning</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="flex-shrink-0 text-2xl">👤</div>
              <div>
                <h4 className="font-semibold text-gray-900">Assignment Status</h4>
                <p className="text-sm text-gray-600">Dashed borders show unassigned jobs</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
