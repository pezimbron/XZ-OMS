import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'

interface PeriodData {
  period: string
  revenue: number
  invoices: number
  paid: number
  outstanding: number
}

interface ClientData {
  clientId: string
  clientName: string
  revenue: number
  invoices: number
  paid: number
}

export async function GET(request: NextRequest) {
  try {
    const payload = await getPayload({ config })
    const { searchParams } = new URL(request.url)

    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const groupBy = searchParams.get('groupBy') || 'month' // day, week, month
    const clientId = searchParams.get('clientId')

    // Build date filter
    const dateFilter: any = {}
    if (startDate) {
      dateFilter.greater_than_equal = new Date(startDate).toISOString()
    }
    if (endDate) {
      dateFilter.less_than_equal = new Date(endDate).toISOString()
    }

    // Build where clause
    const where: any = {}
    if (startDate || endDate) {
      where.invoiceDate = dateFilter
    }
    if (clientId) {
      where.client = { equals: clientId }
    }

    // Fetch invoices
    const invoices = await payload.find({
      collection: 'invoices',
      where,
      limit: 10000,
      depth: 1,
    })

    // Calculate summary
    let totalRevenue = 0
    let paidAmount = 0
    let outstandingAmount = 0

    const byPeriodMap = new Map<string, PeriodData>()
    const byClientMap = new Map<string, ClientData>()

    for (const invoice of invoices.docs) {
      const inv = invoice as any
      const total = inv.total || 0
      const paid = inv.paidAmount || 0
      const outstanding = total - paid

      totalRevenue += total
      paidAmount += paid
      outstandingAmount += outstanding

      // Group by period
      const invoiceDate = inv.invoiceDate ? new Date(inv.invoiceDate) : new Date()
      const periodKey = getPeriodKey(invoiceDate, groupBy)

      if (!byPeriodMap.has(periodKey)) {
        byPeriodMap.set(periodKey, {
          period: periodKey,
          revenue: 0,
          invoices: 0,
          paid: 0,
          outstanding: 0,
        })
      }
      const periodData = byPeriodMap.get(periodKey)!
      periodData.revenue += total
      periodData.invoices += 1
      periodData.paid += paid
      periodData.outstanding += outstanding

      // Group by client
      const client = inv.client
      const cId = typeof client === 'object' ? client?.id : client
      const cName = typeof client === 'object' ? client?.name : 'Unknown'

      if (cId) {
        if (!byClientMap.has(String(cId))) {
          byClientMap.set(String(cId), {
            clientId: String(cId),
            clientName: cName || 'Unknown',
            revenue: 0,
            invoices: 0,
            paid: 0,
          })
        }
        const clientData = byClientMap.get(String(cId))!
        clientData.revenue += total
        clientData.invoices += 1
        clientData.paid += paid
      }
    }

    // Sort periods chronologically
    const byPeriod = Array.from(byPeriodMap.values()).sort((a, b) =>
      a.period.localeCompare(b.period)
    )

    // Sort clients by revenue descending
    const byClient = Array.from(byClientMap.values()).sort(
      (a, b) => b.revenue - a.revenue
    )

    const invoiceCount = invoices.docs.length
    const averageInvoice = invoiceCount > 0 ? totalRevenue / invoiceCount : 0

    return NextResponse.json({
      summary: {
        totalRevenue,
        invoiceCount,
        averageInvoice,
        paidAmount,
        outstandingAmount,
      },
      byPeriod,
      byClient,
    })
  } catch (error: any) {
    console.error('Revenue report error:', error)
    return NextResponse.json(
      { error: 'Failed to generate revenue report', details: error.message },
      { status: 500 }
    )
  }
}

function getPeriodKey(date: Date, groupBy: string): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  switch (groupBy) {
    case 'day':
      return `${year}-${month}-${day}`
    case 'week':
      // Get ISO week number
      const startOfYear = new Date(year, 0, 1)
      const days = Math.floor((date.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000))
      const week = Math.ceil((days + startOfYear.getDay() + 1) / 7)
      return `${year}-W${String(week).padStart(2, '0')}`
    case 'month':
    default:
      return `${year}-${month}`
  }
}
