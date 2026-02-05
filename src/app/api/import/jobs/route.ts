/**
 * ONE-TIME USE: Bulk job import endpoint
 * Imports historical jobs without triggering notifications or calendar invites
 * Supports lookup by client name and tech name (not just IDs)
 *
 * DELETE THIS FILE after initial data migration is complete
 */

import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'

export async function POST(request: NextRequest) {
  try {
    const payload = await getPayload({ config })
    const { jobs } = await request.json()

    if (!Array.isArray(jobs) || jobs.length === 0) {
      return NextResponse.json(
        { error: 'Request body must contain a "jobs" array' },
        { status: 400 }
      )
    }

    // Pre-fetch all clients and techs for faster, case-insensitive matching
    const allClients = await payload.find({ collection: 'clients', limit: 500 })
    const allTechs = await payload.find({ collection: 'technicians', limit: 100 })

    // Build lookup maps (lowercase name -> id)
    const clientMap = new Map<string, number>()
    for (const c of allClients.docs) {
      clientMap.set(c.name.toLowerCase(), c.id)
      // Also add partial matches for common abbreviations
      if (c.name.toLowerCase().includes(',')) {
        clientMap.set(c.name.split(',')[0].toLowerCase().trim(), c.id)
      }
    }

    const techMap = new Map<string, number>()
    for (const t of allTechs.docs) {
      techMap.set(t.name.toLowerCase(), t.id)
      // Also match first name only
      const firstName = t.name.split(' ')[0].toLowerCase()
      if (!techMap.has(firstName)) {
        techMap.set(firstName, t.id)
      }
    }

    // Helper to find client by name (case-insensitive, partial match)
    function findClientId(clientName: string): number | null {
      if (!clientName) return null
      const normalized = clientName.trim().toLowerCase()

      // Exact match
      if (clientMap.has(normalized)) return clientMap.get(normalized)!

      // Partial match - find any client name containing search term
      for (const [name, id] of clientMap) {
        if (name.includes(normalized) || normalized.includes(name)) {
          return id
        }
      }
      return null
    }

    // Helper to find tech by name (case-insensitive, partial match)
    function findTechId(techName: string): number | null {
      if (!techName) return null
      const normalized = techName.trim().toLowerCase()

      // Exact match
      if (techMap.has(normalized)) return techMap.get(normalized)!

      // Partial match
      for (const [name, id] of techMap) {
        if (name.includes(normalized) || normalized.includes(name)) {
          return id
        }
      }
      return null
    }

    // Map status values
    function mapStatus(status: string): string {
      const s = (status || '').toLowerCase().trim()
      if (s === 'done' || s === 'completed') return 'done'
      if (s === 'scheduled' || s === 'confirmed') return 'scheduled'
      if (s === 'cancelled' || s === 'canceled') return 'cancelled'
      return 'pending'
    }

    const results = {
      total: jobs.length,
      imported: 0,
      errors: 0,
      details: [] as any[],
    }

    for (const job of jobs) {
      try {
        // Look up client and tech by name if provided as strings
        let clientId = job.client
        let techId = job.tech

        if (typeof job.clientName === 'string') {
          clientId = findClientId(job.clientName)
          if (!clientId) {
            results.errors++
            results.details.push({
              jobId: job.jobId || 'unknown',
              action: 'error',
              error: `Client not found: ${job.clientName}`,
            })
            continue
          }
        }

        if (typeof job.techName === 'string') {
          techId = findTechId(job.techName)
          // Tech is optional, don't fail if not found
        }

        const jobData: any = {
          modelName: job.modelName,
          captureAddress: job.address,
          state: job.state,
          city: job.city,
          sqFt: job.sqFt ? Number(job.sqFt) : undefined,
          notes: job.comments,
          status: mapStatus(job.status),
          invoiceStatus: job.invoiced ? 'invoiced' : 'not-invoiced',
        }

        // Only set jobId if not empty (it's unique so empty strings cause conflicts)
        if (job.jobId && job.jobId.trim()) {
          jobData.jobId = job.jobId.trim()
        }

        if (clientId) jobData.client = clientId
        if (techId) jobData.tech = techId

        // Parse target date
        if (job.targetDate) {
          const d = new Date(job.targetDate)
          if (!isNaN(d.getTime())) {
            jobData.targetDate = d.toISOString()
          }
        }

        // If status is done, set completedAt
        if (jobData.status === 'done' && job.targetDate) {
          jobData.completedAt = jobData.targetDate
          jobData.completionStatus = 'completed'
        }

        // Create job with context flags to skip notifications and calendar invites
        const created = await payload.create({
          collection: 'jobs',
          data: jobData,
          context: {
            skipCalendarHook: true,
            skipNotifications: true,
            bulkImport: true,
          },
        })

        results.imported++
        results.details.push({
          jobId: job.jobId || created.id,
          action: 'imported',
          id: created.id,
        })
      } catch (error: any) {
        results.errors++
        results.details.push({
          jobId: job.jobId || 'unknown',
          action: 'error',
          error: error.message,
        })
      }
    }

    return NextResponse.json({
      success: true,
      message: `Imported ${results.imported} jobs. ${results.errors} errors.`,
      results,
    })
  } catch (error: any) {
    console.error('Bulk job import error:', error)
    return NextResponse.json(
      { error: 'Failed to import jobs', details: error.message },
      { status: 500 }
    )
  }
}
