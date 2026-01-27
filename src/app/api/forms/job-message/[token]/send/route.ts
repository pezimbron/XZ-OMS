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
    const { message } = body

    if (!message || !message.trim()) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      )
    }

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

    // Get the tech ID for this job
    const techId = typeof job.tech === 'object' ? (job.tech as any).id : job.tech

    if (!techId) {
      return NextResponse.json(
        { error: 'No technician assigned to this job' },
        { status: 400 }
      )
    }

    // Create message as the technician
    console.log(`[Subcontractor Form] Creating message for job ${job.jobId} from tech ${techId}`)
    
    const newMessage = await payload.create({
      collection: 'job-messages',
      data: {
        job: job.id,
        author: {
          relationTo: 'technicians',
          value: techId,
        },
        message: message.trim(),
        messageType: 'message',
      },
    })

    console.log(`[Subcontractor Form] Message created successfully: ${newMessage.id}`)

    return NextResponse.json({
      success: true,
      message: newMessage,
    })
  } catch (error) {
    console.error('Error sending message:', error)
    return NextResponse.json(
      { error: 'Failed to send message' },
      { status: 500 }
    )
  }
}
