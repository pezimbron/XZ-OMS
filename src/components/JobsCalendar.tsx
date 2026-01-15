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
      <div className="flex items-center justify-center h-96">
        <div className="text-lg">Loading calendar...</div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Jobs Calendar</h2>
        <div className="flex gap-4 items-center">
          <button
            onClick={() => window.location.href = '/admin/collections/jobs/create'}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            ➕ Create Job
          </button>
          <button
            onClick={() => window.location.href = '/admin/quick-create-job'}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
          >
            ⚡ Quick Create from Email
          </button>
          <div className="border-l border-gray-300 h-8 mx-2"></div>
          {Object.entries(regionLabels).map(([key, label]) => (
            <div key={key} className="flex items-center gap-2">
              <div
                className="w-4 h-4 rounded"
                style={{ backgroundColor: regionColors[key as keyof typeof regionColors] }}
              />
              <span className="text-sm">{label}</span>
            </div>
          ))}
          <div className="flex items-center gap-2 ml-4">
            <div className="w-4 h-4 rounded border-2 border-dashed border-gray-400" />
            <span className="text-sm">Unassigned</span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-4" style={{ height: '700px' }}>
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

      <div className="bg-blue-50 border border-blue-200 p-4 rounded">
        <h3 className="font-semibold mb-2">Calendar Legend:</h3>
        <ul className="list-disc list-inside space-y-1 text-sm">
          <li><strong>Solid events:</strong> Tech assigned</li>
          <li><strong>Dashed border:</strong> Unassigned (needs tech)</li>
          <li><strong>Blue:</strong> Austin area jobs</li>
          <li><strong>Green:</strong> San Antonio area jobs</li>
          <li><strong>Amber:</strong> Outsourced to other areas</li>
          <li><strong>Gray:</strong> Other/unspecified region</li>
          <li>Click any event to view/edit job details</li>
        </ul>
      </div>
    </div>
  )
}
