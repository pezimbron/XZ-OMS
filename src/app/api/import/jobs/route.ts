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

    // Cache for client and tech lookups
    const clientCache: Record<string, number | null> = {}
    const techCache: Record<string, number | null> = {}

    // Helper to find client by name
    async function findClientId(clientName: string): Promise<number | null> {
      if (!clientName) return null
      const normalized = clientName.trim().toLowerCase()
      if (normalized in clientCache) return clientCache[normalized]

      const result = await payload.find({
        collection: 'clients',
        where: {
          name: { contains: clientName.trim() },
        },
        limit: 1,
      })
      const id = result.docs[0]?.id ?? null
      clientCache[normalized] = id
      return id
    }

    // Helper to find tech by name
    async function findTechId(techName: string): Promise<number | null> {
      if (!techName) return null
      const normalized = techName.trim().toLowerCase()
      if (normalized in techCache) return techCache[normalized]

      const result = await payload.find({
        collection: 'technicians',
        where: {
          name: { contains: techName.trim() },
        },
        limit: 1,
      })
      const id = result.docs[0]?.id ?? null
      techCache[normalized] = id
      return id
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
          clientId = await findClientId(job.clientName)
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
          techId = await findTechId(job.techName)
          // Tech is optional, don't fail if not found
        }

        const jobData: any = {
          jobId: job.jobId,
          modelName: job.modelName,
          captureAddress: job.address,
          state: job.state,
          city: job.city,
          sqFt: job.sqFt ? Number(job.sqFt) : undefined,
          notes: job.comments,
          status: mapStatus(job.status),
          invoiceStatus: job.invoiced ? 'invoiced' : 'not-ready',
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
