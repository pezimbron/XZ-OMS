import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'

export async function GET(request: NextRequest) {
  try {
    const payload = await getPayload({ config })
    const { searchParams } = new URL(request.url)
    const paymentId = searchParams.get('paymentId')

    if (!paymentId) {
      return NextResponse.json({ error: 'paymentId is required' }, { status: 400 })
    }

    const payment = await payload.findByID({
      collection: 'payments',
      id: paymentId,
      depth: 1,
      overrideAccess: true,
    }) as any

    if (!payment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
    }

    if (payment.status !== 'unmatched') {
      return NextResponse.json({ error: 'Payment is already matched' }, { status: 400 })
    }

    const clientId = typeof payment.client === 'object' ? payment.client.id : payment.client

    // Find jobs for same client that are done and ready to invoice
    const jobs = await payload.find({
      collection: 'jobs',
      where: {
        and: [
          { client: { equals: clientId } },
          { status: { equals: 'done' } },
          { invoiceStatus: { equals: 'ready' } },
        ],
      },
      depth: 2,
      limit: 50,
      overrideAccess: true,
    }) as any

    const paymentDate = new Date(payment.paymentDate).getTime()

    // Score candidates: calculate quoted total + sort by date proximity
    const candidates = jobs.docs.map((job: any) => {
      let quotedTotal = 0
      if (job.lineItems) {
        for (const item of job.lineItems) {
          const product = typeof item.product === 'object' ? item.product : null
          if (!product) continue
          let quantity = item.quantity || 1
          if (product.unitType === 'per-sq-ft' && job.sqFt) {
            quantity = job.sqFt
          }
          quotedTotal += quantity * (product.basePrice || 0)
        }
      }

      // Apply tax (same logic as generate.ts)
      const client = typeof job.client === 'object' ? job.client : null
      const taxExempt = client?.invoicingPreferences?.taxExempt || false
      const taxRate = taxExempt ? 0 : (client?.invoicingPreferences?.taxRate || 0)
      if (!taxExempt && taxRate > 0) {
        quotedTotal += (quotedTotal * taxRate) / 100
      }

      const completedAt = job.completedAt ? new Date(job.completedAt).getTime() : 0

      return {
        id: job.id,
        jobId: job.jobId,
        completedAt: job.completedAt,
        quotedTotal: Math.round(quotedTotal * 100) / 100,
        delta: Math.round((payment.amount - quotedTotal) * 100) / 100,
        dateDiffMs: Math.abs(paymentDate - completedAt),
      }
    })

    // Sort by date proximity (closest first)
    candidates.sort((a: any, b: any) => a.dateDiffMs - b.dateDiffMs)

    // Return top 10, strip internal sort key
    return NextResponse.json({
      candidates: candidates.slice(0, 10).map(({ dateDiffMs, ...rest }: any) => rest),
    })
  } catch (error: any) {
    console.error('[Payments] Error finding candidates:', error)
    return NextResponse.json(
      { error: 'Failed to find candidates', details: error.message },
      { status: 500 }
    )
  }
}
