import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const payload = await getPayload({ config })
    const { token } = await params

    // Find job by message token
    const jobs = await payload.find({
      collection: 'jobs',
      where: {
        messageToken: {
          equals: token,
        },
      },
      depth: 2,
    })

    if (jobs.docs.length === 0) {
      return NextResponse.json(
        { error: 'Invalid or expired link' },
        { status: 404 }
      )
    }

    const job = jobs.docs[0]

    // Return job info (sanitized)
    return NextResponse.json({
      job: {
        id: job.id,
        jobId: job.jobId,
        modelName: job.modelName,
        tech: job.tech ? {
          name: (job.tech as any).name,
          email: (job.tech as any).email,
        } : null,
      },
    })
  } catch (error) {
    console.error('Error validating message token:', error)
    return NextResponse.json(
      { error: 'Failed to validate link' },
      { status: 500 }
    )
  }
}
