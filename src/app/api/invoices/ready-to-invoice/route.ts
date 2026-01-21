import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'

export async function GET(request: NextRequest) {
  try {
    const payload = await getPayload({ config })

    // Get all jobs that are ready to invoice
    const jobs = await payload.find({
      collection: 'jobs',
      where: {
        and: [
          {
            status: {
              equals: 'done',
            },
          },
          {
            invoiceStatus: {
              equals: 'ready',
            },
          },
        ],
      },
      depth: 2,
      limit: 1000,
      overrideAccess: true,
    })

    // Group jobs by client
    const jobsByClient: Record<string, any[]> = {}
    
    for (const job of jobs.docs) {
      const jobData = job as any
      const clientId = typeof jobData.client === 'object' ? jobData.client.id : jobData.client
      
      if (!jobsByClient[clientId]) {
        jobsByClient[clientId] = []
      }
      
      jobsByClient[clientId].push(jobData)
    }

    return NextResponse.json({
      success: true,
      totalJobs: jobs.docs.length,
      jobsByClient,
      clients: Object.keys(jobsByClient).length,
    })
  } catch (error: any) {
    console.error('Error fetching ready-to-invoice jobs:', error)
    return NextResponse.json(
      { error: 'Failed to fetch jobs', details: error.message },
      { status: 500 }
    )
  }
}
