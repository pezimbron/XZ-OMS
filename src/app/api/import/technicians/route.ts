/**
 * ONE-TIME USE: Bulk technician import endpoint
 * DELETE THIS FILE after initial data migration is complete
 */

import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'

export async function POST(request: NextRequest) {
  try {
    const payload = await getPayload({ config })
    const { technicians } = await request.json()

    if (!Array.isArray(technicians) || technicians.length === 0) {
      return NextResponse.json(
        { error: 'Request body must contain a "technicians" array' },
        { status: 400 }
      )
    }

    const results = {
      total: technicians.length,
      imported: 0,
      skipped: 0,
      errors: 0,
      details: [] as any[],
    }

    for (const techData of technicians) {
      try {
        // Check if tech already exists by email
        const existing = await payload.find({
          collection: 'technicians',
          where: {
            email: { equals: techData.email },
          },
          limit: 1,
        })

        if (existing.docs.length > 0) {
          results.skipped++
          results.details.push({
            name: techData.name,
            email: techData.email,
            action: 'skipped',
            reason: 'Already exists',
          })
          continue
        }

        const created = await payload.create({
          collection: 'technicians',
          data: {
            name: techData.name,
            email: techData.email,
            type: techData.type || 'commission',
            active: true,
          },
        })

        results.imported++
        results.details.push({
          name: techData.name,
          email: techData.email,
          action: 'imported',
          id: created.id,
        })
      } catch (error: any) {
        results.errors++
        results.details.push({
          name: techData.name,
          email: techData.email,
          action: 'error',
          error: error.message,
        })
      }
    }

    return NextResponse.json({
      success: true,
      message: `Imported ${results.imported} technicians. ${results.skipped} skipped, ${results.errors} errors.`,
      results,
    })
  } catch (error: any) {
    console.error('Bulk technician import error:', error)
    return NextResponse.json(
      { error: 'Failed to import technicians', details: error.message },
      { status: 500 }
    )
  }
}
