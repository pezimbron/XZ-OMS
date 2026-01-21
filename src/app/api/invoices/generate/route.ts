import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { generateInvoiceFromJobs } from '@/lib/invoices/generate'

export async function POST(request: NextRequest) {
  try {
    const payload = await getPayload({ config })
    const body = await request.json()
    const { jobIds, userId } = body

    // Validate input
    if (!jobIds || !Array.isArray(jobIds) || jobIds.length === 0) {
      return NextResponse.json(
        { error: 'jobIds array is required and must not be empty' },
        { status: 400 }
      )
    }

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      )
    }

    // Generate invoice
    const result = await generateInvoiceFromJobs({
      jobIds,
      userId,
      payload,
    })

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      invoice: result.invoice,
      message: result.message,
    })
  } catch (error: any) {
    console.error('Invoice generation error:', error)
    return NextResponse.json(
      { error: 'Failed to generate invoice', details: error.message },
      { status: 500 }
    )
  }
}
