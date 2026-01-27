import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'

function coerceId(id: unknown): string | number {
  if (id === null || typeof id === 'undefined') return ''
  if (typeof id === 'number') return id
  return String(id)
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const payload = await getPayload({ config })
    const body = await request.json()
    const { id } = await params
    const techId = body.techId

    console.log(`[Tech Assignment] Updating job ${id} with tech: ${techId}`)

    const jobId = coerceId(id)
    const technicianId = techId ? coerceId(techId) : null

    // Update just the tech field
    const updatedJob = await payload.update({
      collection: 'jobs',
      id: jobId as any,
      data: {
        tech: technicianId as any,
      },
    })

    console.log(`[Tech Assignment] Successfully updated job ${id}`)
    return NextResponse.json(updatedJob)
  } catch (error: any) {
    console.error('[Tech Assignment] Error:', error)
    return NextResponse.json(
      { error: error.message, details: error },
      { status: 500 }
    )
  }
}
