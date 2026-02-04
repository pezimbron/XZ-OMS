'use client'

import React from 'react'
import Link from 'next/link'
import { AddressAutocomplete } from '@/components/oms/AddressAutocomplete'
import SchedulingRequestPanel from '@/components/oms/SchedulingRequestPanel'
import { SaveIndicator } from '@/components/oms/SaveIndicator'
import { patchJob } from '@/lib/oms/patchJob'

interface Job {
  id: string
  jobId: string
  modelName: string
  targetDate: string
  timezone?: string
  status: string
  region?: string
  client?: any
  endClient?: any
  tech?: any
  captureAddress?: string
  city?: string
  state?: string
  zip?: string
  lineItems?: any[]
  customTodoItems?: any[]
  techInstructions?: string
  schedulingNotes?: string
  uploadLink?: string
  mediaUploadLink?: string
  sitePOCName?: string
  sitePOCPhone?: string
  sitePOCEmail?: string
  qcStatus?: string
  qcNotes?: string
  totalPayout?: number
  externalExpenses?: any[]
  discount?: {
    type?: string
    value?: number
    amount?: number
  }
  subtotal?: number
  taxAmount?: number
  totalWithTax?: number
  workflowTemplate?: any
  workflowSteps?: any[]
  invoiceStatus?: string
  invoice?: {
    id: string
    invoiceNumber?: string
    status: string
    total: number
  }
  invoicedAt?: string
  createdAt: string
  updatedAt: string
}

interface User {
  role: string
}

interface AutosaveField<T> {
  value: T
  status: 'idle' | 'saving' | 'saved' | 'error'
  error?: string | null
  setValue: (value: T) => void
  commit?: (value: T) => void
  onBlur?: () => void
}

interface JobBasicInfoTabProps {
  job: Job
  user: User
  clients: any[]
  techs: any[]
  // Autosave fields
  clientField: AutosaveField<string>
  jobIdField: AutosaveField<string>
  modelNameField: AutosaveField<string>
  targetDateField: AutosaveField<string>
  timezoneField: AutosaveField<string>
  purposeOfScanField: AutosaveField<string>
  captureAddressField: AutosaveField<string>
  cityField: AutosaveField<string>
  stateField: AutosaveField<string>
  zipField: AutosaveField<string>
  regionField: AutosaveField<string>
  propertyTypeField: AutosaveField<string>
  sqFtField: AutosaveField<string>
  estimatedDurationField: AutosaveField<string>
  techField: AutosaveField<string>
  // Callbacks
  fetchJob: (id: string) => Promise<void>
}

export default function JobBasicInfoTab({
  job,
  user,
  clients,
  techs,
  clientField,
  jobIdField,
  modelNameField,
  targetDateField,
  timezoneField,
  purposeOfScanField,
  captureAddressField,
  cityField,
  stateField,
  zipField,
  regionField,
  propertyTypeField,
  sqFtField,
  estimatedDurationField,
  techField,
  fetchJob,
}: JobBasicInfoTabProps) {
  const isTech = user?.role === 'tech'

  const autosaveJobId = async () => {
    const newJobId = (() => {
      const prefix = 'XZOMS'
      const now = new Date()
      const year = now.getFullYear().toString().slice(-2)
      const month = (now.getMonth() + 1).toString().padStart(2, '0')
      const day = now.getDate().toString().padStart(2, '0')
      const chars = '0123456789'
      let randomPart = ''
      for (let i = 0; i < 3; i++) randomPart += chars.charAt(Math.floor(Math.random() * chars.length))
      return `${prefix}-${year}${month}${day}-${randomPart}`
    })()

    try {
      await patchJob(job.id, { jobId: newJobId })
      await fetchJob(job.id)
    } catch (e) {
      console.error('Failed to generate Job ID:', e)
      alert('Failed to generate Job ID')
    }
  }

  // Compute selected option for specific-time display
  const selectedSpecificTimeOption = (() => {
    if ((job as any).schedulingRequest?.requestType !== 'specific-time') return null
    const opts = (job as any).schedulingRequest.timeOptions
    if (!opts?.length) return null
    if (opts.length === 1) return opts[0]
    const selNum = (job as any).techResponse?.selectedOption
    return selNum ? opts.find((o: any) => Number(o.optionNumber) === Number(selNum)) || opts[0] : opts[0]
  })()

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Basic Info */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Basic Information</h2>
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Client</label>
            {isTech ? (
              <div className="flex items-center gap-2">
                <p className="text-gray-900 dark:text-white flex-1">{job.client?.name || 'N/A'}</p>
                {job.client?.id && (
                  <Link
                    href={`/oms/clients/${job.client.id}`}
                    className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors whitespace-nowrap"
                  >
                    View Client
                  </Link>
                )}
              </div>
            ) : (
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <select
                    value={clientField.value}
                    onChange={(e) => clientField.commit?.(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="">Select Client</option>
                    {clients.map(client => (
                      <option key={client.id} value={client.id}>{client.name}</option>
                    ))}
                  </select>
                  {job.client?.id && (
                    <Link
                      href={`/oms/clients/${job.client.id}`}
                      className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors whitespace-nowrap"
                    >
                      View Client
                    </Link>
                  )}
                </div>
                <SaveIndicator status={clientField.status} error={clientField.error} />
              </div>
            )}
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Job ID</label>
            {isTech ? (
              <p className="text-gray-900 dark:text-white">{job.jobId || 'N/A'}</p>
            ) : (
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={jobIdField.value || ''}
                    onChange={(e) => jobIdField.setValue(e.target.value)}
                    onBlur={() => jobIdField.onBlur?.()}
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="Enter custom Job ID (optional)"
                  />
                  {!job.jobId && (
                    <button
                      type="button"
                      onClick={async () => {
                        const newJobId = (() => {
                          const prefix = 'XZOMS'
                          const now = new Date()
                          const year = now.getFullYear().toString().slice(-2)
                          const month = (now.getMonth() + 1).toString().padStart(2, '0')
                          const day = now.getDate().toString().padStart(2, '0')
                          const chars = '0123456789'
                          let randomPart = ''
                          for (let i = 0; i < 3; i++) randomPart += chars.charAt(Math.floor(Math.random() * chars.length))
                          return `${prefix}-${year}${month}${day}-${randomPart}`
                        })()

                        try {
                          await patchJob(job.id, { jobId: newJobId })
                          await fetchJob(job.id)
                        } catch (e) {
                          console.error('Failed to generate Job ID:', e)
                          alert('Failed to generate Job ID')
                        }
                      }}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors whitespace-nowrap"
                      title="Generate random Job ID"
                    >
                      🎲 Generate
                    </button>
                  )}
                </div>
                <SaveIndicator status={jobIdField.status} error={jobIdField.error} />
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  For outsourcing partners who use their own IDs
                </p>
              </div>
            )}
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Model Name</label>
            {isTech ? (
              <p className="text-gray-900 dark:text-white">{job.modelName || 'N/A'}</p>
            ) : (
              <div className="space-y-1">
                <input
                  type="text"
                  value={modelNameField.value}
                  onChange={(e) => modelNameField.setValue(e.target.value)}
                  onBlur={() => modelNameField.onBlur?.()}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
                <SaveIndicator status={modelNameField.status} error={modelNameField.error} />
              </div>
            )}
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Target Date</label>
            {isTech ? (
              <p className="text-gray-900 dark:text-white">
                {job.targetDate ? new Date(job.targetDate).toLocaleString() : 'N/A'}
              </p>
            ) : (
              <div className="space-y-1">
                <input
                  type="datetime-local"
                  value={targetDateField.value ? (() => {
                    const date = new Date(targetDateField.value)
                    const year = date.getFullYear()
                    const month = String(date.getMonth() + 1).padStart(2, '0')
                    const day = String(date.getDate()).padStart(2, '0')
                    const hours = String(date.getHours()).padStart(2, '0')
                    const minutes = String(date.getMinutes()).padStart(2, '0')
                    return `${year}-${month}-${day}T${hours}:${minutes}`
                  })() : ''}
                  onChange={(e) => targetDateField.commit?.(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
                <SaveIndicator status={targetDateField.status} error={targetDateField.error} />
              </div>
            )}
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Timezone</label>
            {isTech ? (
              <p className="text-gray-900 dark:text-white">
                {job.timezone === 'America/Chicago' ? 'Central Time' :
                 job.timezone === 'America/New_York' ? 'Eastern Time' :
                 job.timezone === 'America/Denver' ? 'Mountain Time' :
                 job.timezone === 'America/Los_Angeles' ? 'Pacific Time' :
                 job.timezone === 'America/Phoenix' ? 'Arizona' :
                 'Central Time'}
              </p>
            ) : (
              <div className="space-y-1">
                <select
                  value={timezoneField.value || 'America/Chicago'}
                  onChange={(e) => timezoneField.commit?.(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="America/Chicago">Central Time (Austin/San Antonio)</option>
                  <option value="America/New_York">Eastern Time</option>
                  <option value="America/Denver">Mountain Time</option>
                  <option value="America/Los_Angeles">Pacific Time</option>
                  <option value="America/Phoenix">Arizona (No DST)</option>
                </select>
                <SaveIndicator status={timezoneField.status} error={timezoneField.error} />
              </div>
            )}
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Purpose of Scan</label>
            {isTech ? (
              <p className="text-gray-900 dark:text-white capitalize">{(job as any).purposeOfScan?.replace(/-/g, ' ') || 'N/A'}</p>
            ) : (
              <div className="space-y-1">
                <select
                  value={purposeOfScanField.value || ''}
                  onChange={(e) => {
                    const next = e.target.value
                    const commit = (purposeOfScanField as any).commit
                    if (typeof commit === 'function') {
                      commit(next)
                      return
                    }
                    purposeOfScanField.setValue(next)
                  }}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="">Select Purpose</option>
                  <option value="construction-documentation">Construction Documentation</option>
                  <option value="property-marketing">Property Marketing</option>
                  <option value="facility-management">Facility Management</option>
                  <option value="insurance-claims">Insurance/Claims</option>
                  <option value="historical-preservation">Historical Preservation</option>
                  <option value="renovation-planning">Renovation Planning</option>
                  <option value="as-built-documentation">As-Built Documentation</option>
                  <option value="virtual-tours">Virtual Tours</option>
                  <option value="other">Other</option>
                </select>
                <SaveIndicator status={purposeOfScanField.status} error={purposeOfScanField.error} />
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {/* Location */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-3">Location</h2>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Address</label>
              {isTech ? (
                <p className="text-gray-900 dark:text-white">{job.captureAddress || 'N/A'}</p>
              ) : (
                <div className="space-y-1">
                  <AddressAutocomplete
                    value={captureAddressField.value || ''}
                    onChange={(next) => (captureAddressField as any).setLocal?.(next)}
                    onSelect={async (parsed) => {
                      if (!job?.id) return
                      try {
                        await patchJob(job.id, {
                          captureAddress: parsed.addressLine1 || null,
                          city: parsed.city || null,
                          state: parsed.state || null,
                          zip: parsed.zip || null,
                        })

                        ;(captureAddressField as any).setLocal?.(parsed.addressLine1 || '')
                        ;(cityField as any).setLocal?.(parsed.city || '')
                        ;(stateField as any).setLocal?.(parsed.state || '')
                        ;(zipField as any).setLocal?.(parsed.zip || '')

                        await fetchJob(job.id)
                      } catch (e) {
                        console.error('Failed to save address:', e)
                      }
                    }}
                    placeholder="Start typing an address..."
                  />
                  <SaveIndicator status={captureAddressField.status} error={captureAddressField.error} />
                </div>
              )}
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">City</label>
                {isTech ? (
                  <p className="text-gray-900 dark:text-white">{job.city || 'N/A'}</p>
                ) : (
                  <div className="space-y-1">
                    <input
                      type="text"
                      value={cityField.value || ''}
                      onChange={(e) => cityField.setValue(e.target.value)}
                      onBlur={() => cityField.onBlur?.()}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="City"
                    />
                    <SaveIndicator status={cityField.status} error={cityField.error} />
                  </div>
                )}
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">State</label>
                {isTech ? (
                  <p className="text-gray-900 dark:text-white">{job.state || 'N/A'}</p>
                ) : (
                  <div className="space-y-1">
                    <input
                      type="text"
                      value={stateField.value || ''}
                      onChange={(e) => stateField.setValue(e.target.value)}
                      onBlur={() => stateField.onBlur?.()}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="State"
                    />
                    <SaveIndicator status={stateField.status} error={stateField.error} />
                  </div>
                )}
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">ZIP</label>
                {isTech ? (
                  <p className="text-gray-900 dark:text-white">{job.zip || 'N/A'}</p>
                ) : (
                  <div className="space-y-1">
                    <input
                      type="text"
                      value={zipField.value || ''}
                      onChange={(e) => zipField.setValue(e.target.value)}
                      onBlur={() => zipField.onBlur?.()}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="ZIP"
                    />
                    <SaveIndicator status={zipField.status} error={zipField.error} />
                  </div>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Region</label>
                {isTech ? (
                  <p className="text-gray-900 dark:text-white capitalize">{job.region?.replace('-', ' ') || 'N/A'}</p>
                ) : (
                  <div className="space-y-1">
                    <select
                      value={regionField.value || ''}
                      onChange={(e) => {
                        const next = e.target.value
                        const commit = (regionField as any).commit
                        if (typeof commit === 'function') {
                          commit(next)
                          return
                        }
                        regionField.setValue(next)
                      }}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      <option value="">Select Region</option>
                      <option value="austin">Austin Area</option>
                      <option value="san-antonio">San Antonio Area</option>
                      <option value="outsourced">Outsourced</option>
                      <option value="other">Other</option>
                    </select>
                    <SaveIndicator status={regionField.status} error={regionField.error} />
                  </div>
                )}
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Property Type</label>
                {isTech ? (
                  <p className="text-gray-900 dark:text-white capitalize">{(job as any).propertyType?.replace('-', ' ') || 'N/A'}</p>
                ) : (
                  <div className="space-y-1">
                    <select
                      value={propertyTypeField.value || ''}
                      onChange={(e) => {
                        const next = e.target.value
                        const commit = (propertyTypeField as any).commit
                        if (typeof commit === 'function') {
                          commit(next)
                          return
                        }
                        propertyTypeField.setValue(next)
                      }}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      <option value="">Select Property Type</option>
                      <option value="commercial">Commercial</option>
                      <option value="residential">Residential</option>
                      <option value="industrial">Industrial</option>
                      <option value="other">Other</option>
                    </select>
                    <SaveIndicator status={propertyTypeField.status} error={propertyTypeField.error} />
                  </div>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Square Feet</label>
                {isTech ? (
                  <p className="text-gray-900 dark:text-white">{(job as any).sqFt?.toLocaleString() || 'N/A'} sq ft</p>
                ) : (
                  <div className="space-y-1">
                    <input
                      type="number"
                      value={sqFtField.value || ''}
                      onChange={(e) => sqFtField.setValue(e.target.value)}
                      onBlur={() => sqFtField.onBlur?.()}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="Enter square feet"
                    />
                    <SaveIndicator status={sqFtField.status} error={sqFtField.error} />
                  </div>
                )}
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Estimated Duration (hours)</label>
                {isTech ? (
                  <p className="text-gray-900 dark:text-white">{(job as any).estimatedDuration ? `${(job as any).estimatedDuration} hours` : 'N/A'}</p>
                ) : (
                  <div className="space-y-1">
                    <input
                      type="number"
                      step="0.5"
                      value={estimatedDurationField.value || ''}
                      onChange={(e) => estimatedDurationField.setValue(e.target.value)}
                      onBlur={() => estimatedDurationField.onBlur?.()}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="Auto-calculated from sqft"
                    />
                    <SaveIndicator status={estimatedDurationField.status} error={estimatedDurationField.error} />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Tech Assignment */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Tech Assignment</h2>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Assigned Tech</label>
              {isTech ? (
                <p className="text-gray-900 dark:text-white">
                  {job.tech?.name || <span className="text-gray-400 italic">Unassigned</span>}
                </p>
              ) : (
                <div className="space-y-1">
                  <select
                    value={techField.value || ''}
                    onChange={(e) => {
                      const next = e.target.value
                      const commit = (techField as any).commit
                      if (typeof commit === 'function') {
                        commit(next)
                        return
                      }
                      techField.setValue(next)
                    }}
                    onBlur={() => techField.onBlur?.()}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="">Unassigned</option>
                    {techs.map((tech) => (
                      <option key={tech.id} value={String(tech.id)}>{tech.name}</option>
                    ))}
                  </select>
                  <SaveIndicator status={techField.status} error={techField.error} />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Scheduling Request */}
      {!isTech && (
        <SchedulingRequestPanel
          jobId={job.id}
          existingRequest={(job as any).schedulingRequest}
          onSave={() => fetchJob(job.id)}
        />
      )}

      {/* Tech Scheduling Response */}
      {!isTech && (job as any).techResponse?.respondedAt && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Tech Scheduling Response</h2>

          <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border-l-4 border-green-500 rounded">
            <p className="text-sm text-green-800 dark:text-green-300">
              <strong>Responded:</strong> {new Date((job as any).techResponse.respondedAt).toLocaleString()}
            </p>
          </div>

          {(job as any).techResponse.interested ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="font-semibold">Tech Accepted</span>
              </div>

              {(job as any).schedulingRequest?.requestType === 'time-windows' && (job as any).techResponse.selectedOption != null && (
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Selected Time Window:</p>
                      <p className="font-medium text-gray-900 dark:text-white">
                        Option {(job as any).techResponse.selectedOption}
                        {(job as any).schedulingRequest.timeOptions?.find((opt: any) => Number(opt.optionNumber) === Number((job as any).techResponse.selectedOption)) && (
                          <span className="ml-2">
                            - {new Date((job as any).schedulingRequest.timeOptions.find((opt: any) => Number(opt.optionNumber) === Number((job as any).techResponse.selectedOption)).date).toLocaleDateString()}
                          </span>
                        )}
                      </p>
                      {(job as any).techResponse.preferredStartTime && (
                        <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">
                          Preferred start time: {(job as any).techResponse.preferredStartTime}
                        </p>
                      )}
                    </div>
                    {!job.targetDate && (
                      <button
                        onClick={async () => {
                          const selectedOption = (job as any).schedulingRequest.timeOptions?.find((opt: any) => Number(opt.optionNumber) === Number((job as any).techResponse.selectedOption))
                          if (!selectedOption) return
                          const startTime = (job as any).techResponse.preferredStartTime || '09:00'
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
                            const dateObj = new Date(selectedOption.date)
                            const dateOnly = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`
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
                            await patchJob(job.id, { targetDate: targetDateTime })
                            try {
                              await fetch('/api/scheduling/notify-confirmation', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ jobId: job.id }),
                              })
                            } catch (emailError) {
                              console.error('Failed to send confirmation email:', emailError)
                            }
                            await fetchJob(job.id)
                            alert('Schedule confirmed!')
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

              {/* specific-time: show the time the tech agreed to */}
              {(job as any).schedulingRequest?.requestType === 'specific-time' && selectedSpecificTimeOption && (
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                        {(job as any).schedulingRequest.timeOptions?.length > 1 ? 'Selected Time:' : 'Proposed Time:'}
                      </p>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {new Date(selectedSpecificTimeOption.date).toLocaleDateString()}
                        {selectedSpecificTimeOption.specificTime && <span className="ml-2">at {selectedSpecificTimeOption.specificTime}</span>}
                      </p>
                      {(job as any).techResponse.preferredStartTime && (
                        <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">
                          Tech preferred start time: {(job as any).techResponse.preferredStartTime}
                        </p>
                      )}
                    </div>
                    {!job.targetDate && (
                      <button
                        onClick={async () => {
                          const confirmMsg = `Confirm this time: ${new Date(selectedSpecificTimeOption.date).toLocaleDateString()}${selectedSpecificTimeOption.specificTime ? ` at ${selectedSpecificTimeOption.specificTime}` : ''}?`
                          if (!confirm(confirmMsg)) return
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
                            const dateObj = new Date(selectedSpecificTimeOption.date)
                            const dateOnly = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`
                            let hours = 9, minutes = 0
                            if (selectedSpecificTimeOption.specificTime) {
                              const time24Match = selectedSpecificTimeOption.specificTime.match(/^(\d{1,2}):(\d{2})$/)
                              const time12Match = selectedSpecificTimeOption.specificTime.match(/^(\d{1,2}):(\d{2})\s?(am|pm)$/i)
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
                            }
                            const timeStr = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:00`
                            const targetDateTime = `${dateOnly}T${timeStr}${offset}`
                            await patchJob(job.id, { targetDate: targetDateTime })
                            try {
                              await fetch('/api/scheduling/notify-confirmation', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ jobId: job.id }),
                              })
                            } catch (emailError) {
                              console.error('Failed to send confirmation email:', emailError)
                            }
                            await fetchJob(job.id)
                            alert('Schedule confirmed!')
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

              {/* tech-proposes: show which of the tech's proposed options was accepted */}
              {(job as any).schedulingRequest?.requestType === 'tech-proposes' && (job as any).techResponse.proposedOptions?.length > 0 && (
                <div className="space-y-3">
                  <p className="text-sm text-gray-600 dark:text-gray-400">Tech Proposed Times:</p>
                  {(job as any).techResponse.proposedOptions.map((option: any, index: number) => {
                    const isConfirmed = job.targetDate && new Date(option.date).toLocaleDateString() === new Date(job.targetDate).toLocaleDateString()
                    return (
                      <div key={index} className={`p-3 rounded-lg ${isConfirmed ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800' : 'bg-blue-50 dark:bg-blue-900/20'}`}>
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-gray-900 dark:text-white">
                                Option {index + 1}: {new Date(option.date).toLocaleDateString()} at {option.startTime}
                              </p>
                              {isConfirmed && (
                                <span className="text-xs bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 px-2 py-0.5 rounded-full font-medium">Confirmed</span>
                              )}
                            </div>
                            {option.notes && (
                              <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">{option.notes}</p>
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
                                  const dateObj = new Date(option.date)
                                  const dateOnly = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`
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
                                  await patchJob(job.id, { targetDate: targetDateTime })
                                  try {
                                    await fetch('/api/scheduling/notify-confirmation', {
                                      method: 'POST',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({ jobId: job.id }),
                                    })
                                  } catch (emailError) {
                                    console.error('Failed to send confirmation email:', emailError)
                                  }
                                  await fetchJob(job.id)
                                  alert('Schedule confirmed!')
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
                    )
                  })}
                </div>
              )}

              {/* tech-proposes fallback: tech responded but no valid options provided */}
              {(job as any).schedulingRequest?.requestType === 'tech-proposes' && !((job as any).techResponse.proposedOptions?.length > 0) && (
                <p className="text-sm text-gray-500 dark:text-gray-400 italic">No valid time options were provided by the tech.</p>
              )}

              {/* Reschedule button — visible once a date has been confirmed */}
              {job.targetDate && (
                <div className="pt-2 border-t border-gray-200 dark:border-gray-700 mt-2">
                  <button
                    onClick={async () => {
                      if (!confirm('Reschedule this job? This will clear the confirmed date and tech response so you can send a new scheduling request.')) return
                      try {
                        await patchJob(job.id, { targetDate: null, techResponse: {} })
                        await fetchJob(job.id)
                      } catch (error) {
                        console.error('Error rescheduling:', error)
                        alert('Failed to reschedule')
                      }
                    }}
                    className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg font-medium transition-colors"
                  >
                    Reschedule
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
              <p className="text-red-800 dark:text-red-300 font-medium">Tech Declined</p>
              {(job as any).techResponse.declineReason && (
                <p className="text-sm text-red-700 dark:text-red-400 mt-2">
                  Reason: {(job as any).techResponse.declineReason}
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
