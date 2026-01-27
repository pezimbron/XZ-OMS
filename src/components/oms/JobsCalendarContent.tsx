'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { Calendar, dateFnsLocalizer, View } from 'react-big-calendar'
import withDragAndDrop from 'react-big-calendar/lib/addons/dragAndDrop'
import { format, parse, startOfWeek, getDay } from 'date-fns'
import 'react-big-calendar/lib/css/react-big-calendar.css'
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css'
import '../../app/(payload)/admin/calendar/calendar.css'
import { JobsMapView } from './JobsMapView'

const DragAndDropCalendar = withDragAndDrop(Calendar)

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
    user?: {
      id: string
    } | string
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
  austin: '#3b82f6',
  'san-antonio': '#10b981',
  outsourced: '#f59e0b',
  other: '#6b7280',
}

const regionLabels = {
  austin: 'Austin Area',
  'san-antonio': 'San Antonio Area',
  outsourced: 'Outsourced',
  other: 'Other',
}

export function JobsCalendarContent() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<View>('month')
  const [date, setDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newJobDate, setNewJobDate] = useState<Date | null>(null)
  const [clients, setClients] = useState<any[]>([])
  const [newJobData, setNewJobData] = useState({
    modelName: '',
    client: '',
    captureAddress: '',
    city: '',
    state: 'TX',
    zip: '',
  })
  const [lastDragAction, setLastDragAction] = useState<{
    jobId: string
    previousDate: string
    newDate: string
  } | null>(null)
  const [showUndoNotification, setShowUndoNotification] = useState(false)
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    fetchUser()
    fetchClients()
  }, [])

  useEffect(() => {
    if (user) {
      fetchJobs()
    }
  }, [user])

  const fetchUser = async () => {
    try {
      const response = await fetch('/api/users/me')
      const data = await response.json()
      setUser(data.user)
    } catch (error) {
      console.error('Error fetching user:', error)
    }
  }

  // Auto-select date when in Day view
  useEffect(() => {
    if (view === 'day') {
      setSelectedDate(date)
    }
  }, [view, date])

  const fetchJobs = async () => {
    try {
      const response = await fetch('/api/jobs?limit=1000&depth=2')
      const data = await response.json()
      let fetchedJobs = data.docs || []

      // Filter jobs for tech users
      if (user?.role === 'tech') {
        fetchedJobs = fetchedJobs.filter((job: Job) => {
          const jobTech = job.tech
          if (!jobTech) return false

          const techUserId = typeof jobTech === 'object' && jobTech.user
            ? (typeof jobTech.user === 'object' ? jobTech.user.id : jobTech.user)
            : null

          return techUserId === user.id
        })
      }

      setJobs(fetchedJobs)
    } catch (error) {
      console.error('Error fetching jobs:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchClients = async () => {
    try {
      const response = await fetch('/api/clients?limit=1000')
      const data = await response.json()
      setClients(data.docs || [])
    } catch (error) {
      console.error('Error fetching clients:', error)
    }
  }

  const handleSlotSelect = (slotInfo: { start: Date; end: Date }) => {
    if (user?.role === 'tech') return
    setNewJobDate(slotInfo.start)
    setSelectedDate(slotInfo.start)
    setShowCreateModal(true)
  }

  const handleCreateJob = async () => {
    try {
      const response = await fetch('/api/jobs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          modelName: newJobData.modelName,
          client: parseInt(newJobData.client), // Convert to integer
          captureAddress: newJobData.captureAddress,
          city: newJobData.city,
          state: newJobData.state,
          zip: newJobData.zip,
          targetDate: newJobDate?.toISOString(),
          status: 'scheduled',
        }),
      })

      if (response.ok) {
        setShowCreateModal(false)
        setNewJobData({
          modelName: '',
          client: '',
          captureAddress: '',
          city: '',
          state: 'TX',
          zip: '',
        })
        await fetchJobs()
      } else {
        const errorData = await response.json()
        console.error('Failed to create job:', errorData)
        alert('Failed to create job. Please try again.')
      }
    } catch (error) {
      console.error('Error creating job:', error)
      alert('Error creating job. Please try again.')
    }
  }

  const events: CalendarEvent[] = useMemo(() => {
    return jobs
      .filter((job) => job.targetDate)
      .map((job) => {
        // The targetDate is stored as an ISO string in the database
        // When we create a Date object from it, JavaScript interprets it correctly
        // The issue is that the datetime-local input saves in local time but we need to preserve that
        const startDate = new Date(job.targetDate)
        const endDate = new Date(startDate.getTime() + 2 * 60 * 60 * 1000)

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
    window.location.href = `/oms/jobs/${event.resource.id}`
  }

  const handleEventDrop = async ({ event, start, end }: { event: CalendarEvent; start: Date; end: Date }) => {
    try {
      // Store the previous date for undo
      const previousDate = event.resource.targetDate

      // Update the job's target date
      const response = await fetch(`/api/jobs/${event.resource.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          targetDate: start.toISOString(),
        }),
      })

      if (response.ok) {
        // Store undo information
        setLastDragAction({
          jobId: event.resource.id,
          previousDate: previousDate,
          newDate: start.toISOString(),
        })
        
        // Show undo notification
        setShowUndoNotification(true)
        
        // Auto-hide notification after 10 seconds
        setTimeout(() => {
          setShowUndoNotification(false)
          setLastDragAction(null)
        }, 10000)

        // Refresh jobs to show updated calendar
        await fetchJobs()
      } else {
        console.error('Failed to update job date')
        alert('Failed to reschedule job. Please try again.')
      }
    } catch (error) {
      console.error('Error updating job:', error)
      alert('Error rescheduling job. Please try again.')
    }
  }

  const handleUndo = async () => {
    if (!lastDragAction) return

    try {
      const response = await fetch(`/api/jobs/${lastDragAction.jobId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          targetDate: lastDragAction.previousDate,
        }),
      })

      if (response.ok) {
        // Clear undo state
        setLastDragAction(null)
        setShowUndoNotification(false)
        
        // Refresh calendar
        await fetchJobs()
      } else {
        console.error('Failed to undo job date change')
        alert('Failed to undo. Please try again.')
      }
    } catch (error) {
      console.error('Error undoing job date change:', error)
      alert('Error undoing change. Please try again.')
    }
  }

  const handleEventResize = async ({ event, start, end }: { event: CalendarEvent; start: Date; end: Date }) => {
    // For now, just update the start time (target date)
    await handleEventDrop({ event, start, end })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <svg className="animate-spin h-12 w-12 mx-auto mb-4 text-blue-600 dark:text-blue-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-lg font-medium text-gray-700 dark:text-gray-300">Loading calendar...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 space-y-6">
      {/* Undo Notification */}
      {showUndoNotification && lastDragAction && (
        <div className="fixed top-4 right-4 z-50 bg-blue-600 text-white px-6 py-4 rounded-lg shadow-lg flex items-center gap-4 animate-slide-in">
          <div className="flex items-center gap-3">
            <span className="text-2xl">↩️</span>
            <div>
              <p className="font-semibold">Job rescheduled</p>
              <p className="text-sm text-blue-100">
                {new Date(lastDragAction.previousDate).toLocaleDateString()} → {new Date(lastDragAction.newDate).toLocaleDateString()}
              </p>
            </div>
          </div>
          <button
            onClick={handleUndo}
            className="px-4 py-2 bg-white text-blue-600 rounded-lg font-medium hover:bg-blue-50 transition-colors"
          >
            Undo
          </button>
          <button
            onClick={() => {
              setShowUndoNotification(false)
              setLastDragAction(null)
            }}
            className="text-white hover:text-blue-100 transition-colors"
          >
            ✕
          </button>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
              <span className="text-2xl">📊</span>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Jobs</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{events.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
              <span className="text-2xl">✅</span>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Assigned</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{events.filter(e => e.resource.tech).length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/30 rounded-lg flex items-center justify-center">
              <span className="text-2xl">⏳</span>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Unassigned</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{events.filter(e => !e.resource.tech).length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
              <span className="text-2xl">🌍</span>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Outsourced</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{events.filter(e => e.resource.region === 'outsourced').length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Legend Bar */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex flex-wrap items-center gap-6">
          <h3 className="font-semibold text-gray-900 dark:text-white">Region Colors:</h3>
          {Object.entries(regionLabels).map(([key, label]) => (
            <div key={key} className="flex items-center gap-2">
              <div
                className="w-5 h-5 rounded shadow-sm"
                style={{ backgroundColor: regionColors[key as keyof typeof regionColors] }}
              />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</span>
            </div>
          ))}
          <div className="border-l border-gray-300 dark:border-gray-600 h-6 mx-2"></div>
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded border-2 border-dashed border-gray-500" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Unassigned Tech</span>
          </div>
        </div>
      </div>

      {/* Calendar Card */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="p-6" style={{ height: '750px' }}>
          <DragAndDropCalendar
            localizer={localizer}
            events={events}
            startAccessor="start"
            endAccessor="end"
            style={{ height: '100%' }}
            eventPropGetter={eventStyleGetter}
            onSelectEvent={handleSelectEvent}
            onSelectSlot={user?.role === 'tech' ? undefined : handleSlotSelect}
            onEventDrop={handleEventDrop}
            onEventResize={handleEventResize}
            resizable
            selectable={user?.role !== 'tech'}
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

      {/* Map View */}
      <JobsMapView selectedDate={selectedDate} jobs={jobs} />

      {/* Help Section */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-2xl p-6 shadow-lg">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center text-white text-xl">
            💡
          </div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">Quick Tips</h3>
        </div>
        <div className="grid md:grid-cols-3 gap-4">
          <div className="flex gap-3">
            <div className="flex-shrink-0 text-2xl">🖱️</div>
            <div>
              <h4 className="font-semibold text-gray-900 dark:text-white">Click Events</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">Click any job to view or edit details</p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="flex-shrink-0 text-2xl">🎨</div>
            <div>
              <h4 className="font-semibold text-gray-900 dark:text-white">Color Coded</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">Jobs are colored by region for easy planning</p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="flex-shrink-0 text-2xl">👤</div>
            <div>
              <h4 className="font-semibold text-gray-900 dark:text-white">Assignment Status</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">Dashed borders show unassigned jobs</p>
            </div>
          </div>
        </div>
      </div>

      {/* Create Job Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-xl max-w-md w-full mx-4">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Create New Job
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Scheduled for: {newJobDate?.toLocaleString()}
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Model Name *
                </label>
                <input
                  type="text"
                  value={newJobData.modelName}
                  onChange={(e) => setNewJobData({ ...newJobData, modelName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="e.g., Office Building"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Client *
                </label>
                <select
                  value={newJobData.client}
                  onChange={(e) => setNewJobData({ ...newJobData, client: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="">Select a client...</option>
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Address
                </label>
                <input
                  type="text"
                  value={newJobData.captureAddress}
                  onChange={(e) => setNewJobData({ ...newJobData, captureAddress: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="123 Main St"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    City
                  </label>
                  <input
                    type="text"
                    value={newJobData.city}
                    onChange={(e) => setNewJobData({ ...newJobData, city: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="Austin"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    State
                  </label>
                  <input
                    type="text"
                    value={newJobData.state}
                    onChange={(e) => setNewJobData({ ...newJobData, state: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="TX"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  ZIP Code
                </label>
                <input
                  type="text"
                  value={newJobData.zip}
                  onChange={(e) => setNewJobData({ ...newJobData, zip: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="78701"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={handleCreateJob}
                disabled={!newJobData.modelName || !newJobData.client}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors"
              >
                Create Job
              </button>
              <button
                onClick={() => {
                  setShowCreateModal(false)
                  setNewJobData({
                    modelName: '',
                    client: '',
                    captureAddress: '',
                    city: '',
                    state: 'TX',
                    zip: '',
                  })
                }}
                className="flex-1 px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
