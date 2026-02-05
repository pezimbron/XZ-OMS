/**
 * ONE-TIME USE: Bulk job import endpoint
 * Imports historical jobs without triggering notifications or calendar invites
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

    const results = {
      total: jobs.length,
      imported: 0,
      errors: 0,
      details: [] as any[],
    }

    for (const jobData of jobs) {
      try {
        // Create job with context flags to skip notifications and calendar invites
        const created = await payload.create({
          collection: 'jobs',
          data: jobData,
          context: {
            skipCalendarHook: true,      // Skip Google Calendar invites
            skipNotifications: true,      // Flag for any notification hooks
            bulkImport: true,             // General flag for import mode
          },
        })

        results.imported++
        results.details.push({
          jobId: jobData.jobId || created.id,
          action: 'imported',
          id: created.id,
        })
      } catch (error: any) {
        results.errors++
        results.details.push({
          jobId: jobData.jobId || 'unknown',
          action: 'error',
          error: error.message,
        })
        console.error(`Error importing job ${jobData.jobId}:`, error.message)
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
