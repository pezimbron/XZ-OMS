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
    })

    if (jobs.docs.length === 0) {
      return NextResponse.json(
        { error: 'Invalid or expired link' },
        { status: 404 }
      )
    }

    const job = jobs.docs[0]

    // Fetch messages for this job
    const messages = await payload.find({
      collection: 'job-messages',
      where: {
        job: {
          equals: job.id,
        },
      },
      sort: 'createdAt',
      depth: 2,
    })

    return NextResponse.json({
      messages: messages.docs,
    })
  } catch (error) {
    console.error('Error fetching messages:', error)
    return NextResponse.json(
      { error: 'Failed to fetch messages' },
      { status: 500 }
    )
  }
}
