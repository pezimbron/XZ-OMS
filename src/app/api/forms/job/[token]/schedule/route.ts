import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const payload = await getPayload({ config })
    const { token } = await params
    const body = await request.json()

    // Find job by completion token
    const jobs = await payload.find({
      collection: 'jobs',
      where: {
        completionToken: {
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

    console.log(`[Tech Portal] Scheduling response for job ${job.jobId}`)

    // Update job with tech response
    await payload.update({
      collection: 'jobs',
      id: job.id,
      data: {
        techResponse: {
          respondedAt: new Date().toISOString(),
          interested: body.interested,
          selectedOption: body.selectedOption,
          preferredStartTime: body.preferredStartTime,
          proposedOptions: body.proposedOptions?.filter((opt: any) => opt.date && opt.startTime),
          declineReason: body.declineReason,
          notes: body.notes,
        },
      },
    })

    console.log(`[Tech Portal] Scheduling response saved for job ${job.jobId}`)

    // TODO: Send notification to ops team about the response
    // This will be implemented when we add the notification system

    return NextResponse.json({
      success: true,
      message: 'Scheduling response submitted successfully',
    })
  } catch (error) {
    console.error('Error submitting scheduling response:', error)
    return NextResponse.json(
      { error: 'Failed to submit scheduling response' },
      { status: 500 }
    )
  }
}
