import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { generateInvoiceFromJobs } from '@/lib/invoices/generate'

export async function POST(request: NextRequest) {
  try {
    const payload = await getPayload({ config })
    const body = await request.json()
    const { paymentId, jobId, userId } = body

    if (!paymentId || !jobId || !userId) {
      return NextResponse.json(
        { error: 'paymentId, jobId, and userId are required' },
        { status: 400 }
      )
    }

    // Fetch and validate payment
    const payment = await payload.findByID({
      collection: 'payments',
      id: paymentId,
      depth: 1,
      overrideAccess: true,
    }) as any

    if (!payment || payment.status !== 'unmatched') {
      return NextResponse.json({ error: 'Payment not found or already matched' }, { status: 400 })
    }

    // Fetch and validate job
    const job = await payload.findByID({
      collection: 'jobs',
      id: jobId,
      depth: 1,
      overrideAccess: true,
    }) as any

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    // Validate same client
    const paymentClientId = String(typeof payment.client === 'object' ? payment.client.id : payment.client)
    const jobClientId = String(typeof job.client === 'object' ? job.client.id : job.client)

    if (paymentClientId !== jobClientId) {
      return NextResponse.json({ error: 'Payment and job belong to different clients' }, { status: 400 })
    }

    if (job.status !== 'done' || job.invoiceStatus !== 'ready') {
      return NextResponse.json(
        { error: 'Job must have status=done and invoiceStatus=ready' },
        { status: 400 }
      )
    }

    // Generate invoice (handles line items, tax, job linkage)
    const result = await generateInvoiceFromJobs({
      jobIds: [jobId],
      userId,
      payload,
    })

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    const invoice = result.invoice as any

    // Mark invoice as paid with actual payment amount
    await payload.update({
      collection: 'invoices',
      id: invoice.id,
      data: {
        status: 'paid',
        paidAmount: payment.amount,
        paidDate: payment.paymentDate,
      },
      overrideAccess: true,
    })

    // Link payment → job + invoice, mark as matched
    await payload.update({
      collection: 'payments',
      id: paymentId,
      data: {
        status: 'matched',
        matchedJob: jobId,
        matchedInvoice: invoice.id,
      },
      overrideAccess: true,
    })

    // Advance job to paid
    await payload.update({
      collection: 'jobs',
      id: jobId,
      data: {
        invoiceStatus: 'paid',
      },
      overrideAccess: true,
    })

    return NextResponse.json({
      success: true,
      invoice: { id: invoice.id, total: invoice.total },
      payment: { id: payment.id, amount: payment.amount },
      message: 'Payment matched and invoice generated successfully',
    })
  } catch (error: any) {
    console.error('[Payments] Error confirming match:', error)
    return NextResponse.json(
      { error: 'Failed to confirm match', details: error.message },
      { status: 500 }
    )
  }
}
