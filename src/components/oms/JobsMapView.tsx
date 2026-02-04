'use client'

import React, { useState, useEffect } from 'react'
import { GoogleMap, LoadScript, Marker, InfoWindow } from '@react-google-maps/api'

interface Job {
  id: string
  jobId: string
  modelName: string
  targetDate: string
  captureAddress?: string
  city?: string
  state?: string
  zip?: string
  region?: 'austin' | 'san-antonio' | 'outsourced' | 'other'
  tech?: {
    id: string
    name: string
  }
  status: string
}

interface JobsMapViewProps {
  selectedDate: Date | null
  jobs: Job[]
}

const mapContainerStyle = {
  width: '100%',
  height: '500px',
}

const defaultCenter = {
  lat: 30.2672, // Austin, TX
  lng: -97.7431,
}

const regionColors = {
  austin: '#3b82f6',
  'san-antonio': '#10b981',
  outsourced: '#f59e0b',
  other: '#6b7280',
}

type JobWithLocation = Job & { lat: number; lng: number }

export function JobsMapView({ selectedDate, jobs }: JobsMapViewProps) {
  const [selectedJob, setSelectedJob] = useState<JobWithLocation | null>(null)
  const [jobLocations, setJobLocations] = useState<JobWithLocation[]>([])
  const [mapCenter, setMapCenter] = useState(defaultCenter)
  const [isMapLoaded, setIsMapLoaded] = useState(false)

  const geocodeJobs = async (dayJobs: Job[]) => {
    // Check if google maps is loaded
    if (typeof window === 'undefined' || !window.google || !window.google.maps) {
      console.warn('Google Maps not loaded yet')
      return
    }

    const geocoder = new window.google.maps.Geocoder()
    const locations: JobWithLocation[] = []

    for (const job of dayJobs) {
      if (!job.captureAddress) continue

      const address = `${job.captureAddress}, ${job.city || ''}, ${job.state || 'TX'} ${job.zip || ''}`
      
      try {
        const result = await new Promise<google.maps.GeocoderResult[]>((resolve, reject) => {
          geocoder.geocode({ address }, (results, status) => {
            if (status === 'OK' && results) {
              resolve(results)
            } else {
              reject(status)
            }
          })
        })

        if (result[0]) {
          locations.push({
            ...job,
            lat: result[0].geometry.location.lat(),
            lng: result[0].geometry.location.lng(),
          })
        }
      } catch (error) {
        console.error(`Failed to geocode address for job ${job.jobId}:`, error)
      }
    }

    setJobLocations(locations)

    // Center map on first job or default
    if (locations.length > 0) {
      setMapCenter({ lat: locations[0].lat, lng: locations[0].lng })
    }
  }

  useEffect(() => {
    if (!selectedDate || !isMapLoaded) return

    // Filter jobs for selected date (use local date methods — Payload dates are midnight UTC, which shifts across timezone boundaries)
    const toLocalDateStr = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    const dateStr = toLocalDateStr(selectedDate)
    const dayJobs = jobs.filter(job => {
      if (!job.targetDate) return false
      return toLocalDateStr(new Date(job.targetDate)) === dateStr
    })

    // Geocode addresses
    geocodeJobs(dayJobs)
  }, [selectedDate, jobs, isMapLoaded])

  if (!selectedDate) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl p-8 shadow-sm border border-gray-200 dark:border-gray-700">
        <p className="text-center text-gray-500 dark:text-gray-400">
          Click on a date in the calendar to view jobs on the map
        </p>
      </div>
    )
  }

  const googleMapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ''

  if (!googleMapsApiKey) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="mb-4">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Jobs on {selectedDate.toLocaleDateString()}
          </h2>
        </div>
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-6">
          <div className="flex items-start gap-3">
            <span className="text-2xl">⚠️</span>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Google Maps API Key Required</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                To view jobs on the map, please add your Google Maps API key to the <code className="bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">.env</code> file:
              </p>
              <code className="block bg-gray-100 dark:bg-gray-900 p-3 rounded text-sm">
                NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_api_key_here
              </code>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-3">
                Get your API key from <a href="https://console.cloud.google.com/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Google Cloud Console</a>
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
      <div className="mb-4">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">
          Jobs on {selectedDate.toLocaleDateString()}
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          {isMapLoaded ? `${jobLocations.length} job${jobLocations.length !== 1 ? 's' : ''} with addresses` : 'Loading...'}
        </p>
      </div>

      <LoadScript 
        googleMapsApiKey={googleMapsApiKey}
        onLoad={() => setIsMapLoaded(true)}
        loadingElement={
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-8 text-center">
            <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-2"></div>
            <p className="text-gray-500 dark:text-gray-400">Loading map...</p>
          </div>
        }
      >
        {!isMapLoaded ? (
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-8 text-center">
            <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-2"></div>
            <p className="text-gray-500 dark:text-gray-400">Initializing map...</p>
          </div>
        ) : jobLocations.length === 0 ? (
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-8 text-center">
            <p className="text-gray-500 dark:text-gray-400">
              No jobs with addresses scheduled for this date
            </p>
          </div>
        ) : (
          <GoogleMap
            mapContainerStyle={mapContainerStyle}
            center={mapCenter}
            zoom={11}
            options={{
              styles: [
                {
                  featureType: 'poi',
                  elementType: 'labels',
                  stylers: [{ visibility: 'off' }],
                },
              ],
            }}
          >
            {jobLocations.map((job) => (
              <Marker
                key={job.id}
                position={{ lat: job.lat, lng: job.lng }}
                onClick={() => setSelectedJob(job)}
                icon={{
                  path: google.maps.SymbolPath.CIRCLE,
                  scale: 10,
                  fillColor: regionColors[job.region || 'other'],
                  fillOpacity: 0.8,
                  strokeColor: '#ffffff',
                  strokeWeight: 2,
                }}
              />
            ))}

            {selectedJob && (
              <InfoWindow
                position={{ lat: selectedJob.lat, lng: selectedJob.lng }}
                onCloseClick={() => setSelectedJob(null)}
              >
                <div className="p-2">
                  <h3 className="font-bold text-gray-900">{selectedJob.modelName}</h3>
                  <p className="text-sm text-gray-600 mt-1">Job ID: {selectedJob.jobId}</p>
                  <p className="text-sm text-gray-600">{selectedJob.captureAddress}</p>
                  {selectedJob.tech && (
                    <p className="text-sm text-gray-600 mt-1">Tech: {selectedJob.tech.name}</p>
                  )}
                  <div className="mt-2">
                    <span
                      className="inline-block px-2 py-1 text-xs font-semibold rounded"
                      style={{
                        backgroundColor: regionColors[selectedJob.region || 'other'],
                        color: 'white',
                      }}
                    >
                      {selectedJob.region || 'other'}
                    </span>
                  </div>
                  <a
                    href={`/oms/jobs/${selectedJob.id}`}
                    className="inline-block mt-2 text-sm text-blue-600 hover:text-blue-800"
                  >
                    View Details →
                  </a>
                </div>
              </InfoWindow>
            )}
          </GoogleMap>
        )}
      </LoadScript>

      {/* Job List */}
      <div className="mt-6 space-y-2">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Jobs List</h3>
        {jobLocations.map((job) => (
          <div
            key={job.id}
            className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
            onClick={() => setSelectedJob(job)}
          >
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: regionColors[job.region || 'other'] }}
                />
                <span className="font-medium text-gray-900 dark:text-white">
                  {job.modelName}
                </span>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {job.captureAddress}
              </p>
            </div>
            <a
              href={`/oms/jobs/${job.id}`}
              className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400"
              onClick={(e) => e.stopPropagation()}
            >
              View →
            </a>
          </div>
        ))}
      </div>
    </div>
  )
}
