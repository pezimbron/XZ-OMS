import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'

interface MatchResult {
  jobId: string
  jobName: string
  jobDate: string | null
  jobTotal: number
  invoiceId: string | null
  invoiceNumber: string | null
  invoiceDate: string | null
  invoiceTotal: number | null
  matchReason: string
  confidence: 'high' | 'medium' | 'low' | 'none'
}

export async function GET(req: NextRequest) {
  try {
    const payload = await getPayload({ config })

    // Find Matterport client to exclude
    const matterportClient = await payload.find({
      collection: 'clients',
      where: { companyName: { contains: 'matterport' } },
      limit: 1,
      overrideAccess: true,
    })
    const matterportClientId = matterportClient.docs[0]?.id

    // Find Funkit client to exclude
    const funkitClient = await payload.find({
      collection: 'clients',
      where: { companyName: { contains: 'funkit' } },
      limit: 1,
      overrideAccess: true,
    })
    const funkitClientId = funkitClient.docs[0]?.id

    // Find all jobs without invoice (excluding Matterport and Funkit)
    const jobsResult = await payload.find({
      collection: 'jobs',
      where: {
        and: [
          { invoice: { exists: false } },
          ...(matterportClientId ? [{ client: { not_equals: matterportClientId } }] : []),
          ...(funkitClientId ? [{ client: { not_equals: funkitClientId } }] : []),
        ],
      },
      limit: 500,
      depth: 1,
      overrideAccess: true,
    })

    // Find all invoices without jobs linked
    const invoicesResult = await payload.find({
      collection: 'invoices',
      where: {
        or: [
          { jobs: { exists: false } },
          { jobs: { equals: null } },
        ],
      },
      limit: 500,
      depth: 1,
      overrideAccess: true,
    })

    const matches: MatchResult[] = []
    const usedInvoiceIds = new Set<string>()

    for (const job of jobsResult.docs) {
      const clientId = typeof job.client === 'object' ? job.client?.id : job.client
      const jobDate = job.targetDate ? new Date(job.targetDate as string) : null

      // Calculate job total from line items
      const lineItems = (job.lineItems as any[]) || []
      const jobTotal = lineItems.reduce((sum, item) => {
        const amount = item.amount ?? (item.product?.basePrice || 0)
        return sum + (amount * (item.quantity || 1))
      }, 0)

      let bestMatch: {
        invoice: any
        confidence: 'high' | 'medium' | 'low'
        reason: string
      } | null = null

      for (const invoice of invoicesResult.docs) {
        if (usedInvoiceIds.has(String(invoice.id))) continue

        const invoiceClientId = typeof invoice.client === 'object' ? invoice.client?.id : invoice.client

        // Must be same client
        if (String(clientId) !== String(invoiceClientId)) continue

        const invoiceDate = invoice.invoiceDate ? new Date(invoice.invoiceDate as string) : null
        const invoiceTotal = invoice.total as number || 0

        // Calculate date difference
        let dateDiff = Infinity
        if (jobDate && invoiceDate) {
          dateDiff = Math.abs(jobDate.getTime() - invoiceDate.getTime()) / (1000 * 60 * 60 * 24)
        }

        // Calculate amount difference percentage
        const amountDiff = jobTotal > 0 ? Math.abs(invoiceTotal - jobTotal) / jobTotal : 1

        // Scoring
        let confidence: 'high' | 'medium' | 'low' = 'low'
        let reason = ''

        // High confidence: same client, date within 7 days, amount within 5%
        if (dateDiff <= 7 && amountDiff <= 0.05) {
          confidence = 'high'
          reason = `Client match, date within ${Math.round(dateDiff)} days, amount within ${Math.round(amountDiff * 100)}%`
        }
        // Medium confidence: same client, date within 30 days, amount within 15%
        else if (dateDiff <= 30 && amountDiff <= 0.15) {
          confidence = 'medium'
          reason = `Client match, date within ${Math.round(dateDiff)} days, amount within ${Math.round(amountDiff * 100)}%`
        }
        // Low confidence: same client, date within 60 days, amount within 30%
        else if (dateDiff <= 60 && amountDiff <= 0.30) {
          confidence = 'low'
          reason = `Client match, date within ${Math.round(dateDiff)} days, amount within ${Math.round(amountDiff * 100)}%`
        } else {
          continue // No match
        }

        // Keep best match
        const confidenceOrder = { high: 3, medium: 2, low: 1 }
        if (!bestMatch || confidenceOrder[confidence] > confidenceOrder[bestMatch.confidence]) {
          bestMatch = { invoice, confidence, reason }
        }
      }

      const clientName = typeof job.client === 'object' ? (job.client as any)?.companyName : 'Unknown'

      if (bestMatch) {
        usedInvoiceIds.add(String(bestMatch.invoice.id))
        matches.push({
          jobId: String(job.id),
          jobName: `${clientName} - ${job.modelName || 'Unnamed'}`,
          jobDate: job.targetDate as string | null,
          jobTotal,
          invoiceId: String(bestMatch.invoice.id),
          invoiceNumber: bestMatch.invoice.invoiceNumber as string,
          invoiceDate: bestMatch.invoice.invoiceDate as string,
          invoiceTotal: bestMatch.invoice.total as number,
          matchReason: bestMatch.reason,
          confidence: bestMatch.confidence,
        })
      } else {
        matches.push({
          jobId: String(job.id),
          jobName: `${clientName} - ${job.modelName || 'Unnamed'}`,
          jobDate: job.targetDate as string | null,
          jobTotal,
          invoiceId: null,
          invoiceNumber: null,
          invoiceDate: null,
          invoiceTotal: null,
          matchReason: 'No matching invoice found',
          confidence: 'none',
        })
      }
    }

    const summary = {
      totalJobsWithoutInvoice: jobsResult.docs.length,
      totalUnlinkedInvoices: invoicesResult.docs.length,
      high: matches.filter(m => m.confidence === 'high').length,
      medium: matches.filter(m => m.confidence === 'medium').length,
      low: matches.filter(m => m.confidence === 'low').length,
      none: matches.filter(m => m.confidence === 'none').length,
    }

    return NextResponse.json({
      success: true,
      summary,
      matches,
    })

  } catch (error: any) {
    console.error('Auto-match preview error:', error)
    return NextResponse.json({ error: error.message || 'Preview failed' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const minConfidence = searchParams.get('minConfidence') || 'high'

    const payload = await getPayload({ config })

    // Get the preview matches first
    const previewResponse = await GET(req)
    const previewData = await previewResponse.json()

    if (!previewData.success) {
      return NextResponse.json(previewData, { status: 400 })
    }

    const confidenceOrder = { high: 3, medium: 2, low: 1, none: 0 }
    const minConfidenceLevel = confidenceOrder[minConfidence as keyof typeof confidenceOrder] || 3

    const toApply = previewData.matches.filter((m: MatchResult) =>
      m.invoiceId && confidenceOrder[m.confidence] >= minConfidenceLevel
    )

    const results: Array<{ jobId: string; invoiceId: string; success: boolean; error?: string }> = []

    for (const match of toApply) {
      try {
        // Update job with invoice reference
        await payload.update({
          collection: 'jobs',
          id: match.jobId,
          data: {
            invoice: match.invoiceId,
            invoiceStatus: 'invoiced',
          },
          overrideAccess: true,
        })

        // Update invoice with job reference
        const invoice = await payload.findByID({
          collection: 'invoices',
          id: match.invoiceId,
          overrideAccess: true,
        })

        const existingJobs = (invoice.jobs as any[]) || []
        const jobIds = existingJobs.map((j: any) => typeof j === 'object' ? j.id : j)

        if (!jobIds.includes(match.jobId)) {
          await payload.update({
            collection: 'invoices',
            id: match.invoiceId,
            data: {
              jobs: [...jobIds, match.jobId],
            },
            overrideAccess: true,
          })
        }

        results.push({ jobId: match.jobId, invoiceId: match.invoiceId, success: true })
      } catch (err: any) {
        results.push({ jobId: match.jobId, invoiceId: match.invoiceId, success: false, error: err.message })
      }
    }

    return NextResponse.json({
      success: true,
      minConfidence,
      applied: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      skipped: previewData.matches.length - toApply.length,
      results,
    })

  } catch (error: any) {
    console.error('Auto-match apply error:', error)
    return NextResponse.json({ error: error.message || 'Apply failed' }, { status: 500 })
  }
}
