import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'

interface ClientActivity {
  clientId: string
  name: string
  clientType: string
  jobCount: number
  completedJobs: number
  totalSpend: number
  averageJobValue: number
  lastJobDate: string | null
  invoiceCount: number
  paidInvoices: number
  pendingInvoices: number
  outstandingAmount: number
}

export async function GET(request: NextRequest) {
  try {
    const payload = await getPayload({ config })
    const { searchParams } = new URL(request.url)

    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const clientId = searchParams.get('clientId')

    // Build date filter
    const dateFilter: any = {}
    if (startDate) {
      dateFilter.greater_than_equal = new Date(startDate).toISOString()
    }
    if (endDate) {
      dateFilter.less_than_equal = new Date(endDate).toISOString()
    }

    // Fetch jobs
    const jobsWhere: any = {}
    if (startDate || endDate) {
      jobsWhere.targetDate = dateFilter
    }
    if (clientId) {
      jobsWhere.client = { equals: clientId }
    }

    const jobs = await payload.find({
      collection: 'jobs',
      where: jobsWhere,
      limit: 10000,
      depth: 1,
    })

    // Fetch invoices
    const invoicesWhere: any = {}
    if (startDate || endDate) {
      invoicesWhere.invoiceDate = dateFilter
    }
    if (clientId) {
      invoicesWhere.client = { equals: clientId }
    }

    const invoices = await payload.find({
      collection: 'invoices',
      where: invoicesWhere,
      limit: 10000,
      depth: 1,
    })

    // Aggregate by client
    const clientMap = new Map<string, ClientActivity>()

    // Process jobs
    for (const job of jobs.docs) {
      const j = job as any
      const client = j.client

      const cId = typeof client === 'object' ? client?.id : client
      const cName = typeof client === 'object' ? client?.name : 'Unknown'
      const cType = typeof client === 'object' ? client?.clientType : ''

      if (!cId) continue

      if (!clientMap.has(String(cId))) {
        clientMap.set(String(cId), {
          clientId: String(cId),
          name: cName || 'Unknown',
          clientType: cType || '',
          jobCount: 0,
          completedJobs: 0,
          totalSpend: 0,
          averageJobValue: 0,
          lastJobDate: null,
          invoiceCount: 0,
          paidInvoices: 0,
          pendingInvoices: 0,
          outstandingAmount: 0,
        })
      }

      const clientData = clientMap.get(String(cId))!
      clientData.jobCount += 1

      if (j.status === 'done') {
        clientData.completedJobs += 1
      }

      // Track last job date
      const jobDate = j.targetDate || j.scannedDate
      if (jobDate) {
        if (!clientData.lastJobDate || jobDate > clientData.lastJobDate) {
          clientData.lastJobDate = jobDate
        }
      }
    }

    // Process invoices
    for (const invoice of invoices.docs) {
      const inv = invoice as any
      const client = inv.client

      const cId = typeof client === 'object' ? client?.id : client
      const cName = typeof client === 'object' ? client?.name : 'Unknown'
      const cType = typeof client === 'object' ? client?.clientType : ''

      if (!cId) continue

      if (!clientMap.has(String(cId))) {
        clientMap.set(String(cId), {
          clientId: String(cId),
          name: cName || 'Unknown',
          clientType: cType || '',
          jobCount: 0,
          completedJobs: 0,
          totalSpend: 0,
          averageJobValue: 0,
          lastJobDate: null,
          invoiceCount: 0,
          paidInvoices: 0,
          pendingInvoices: 0,
          outstandingAmount: 0,
        })
      }

      const clientData = clientMap.get(String(cId))!
      clientData.invoiceCount += 1
      clientData.totalSpend += inv.total || 0

      const paid = inv.paidAmount || 0
      const total = inv.total || 0
      const outstanding = total - paid

      if (inv.status === 'paid' || paid >= total) {
        clientData.paidInvoices += 1
      } else {
        clientData.pendingInvoices += 1
        clientData.outstandingAmount += outstanding
      }
    }

    // Calculate averages and sort by total spend
    const clients = Array.from(clientMap.values())
      .map((c) => ({
        ...c,
        averageJobValue: c.jobCount > 0 ? c.totalSpend / c.jobCount : 0,
      }))
      .sort((a, b) => b.totalSpend - a.totalSpend)

    // Calculate totals
    const totalClients = clients.length
    const totalJobs = clients.reduce((sum, c) => sum + c.jobCount, 0)
    const totalSpend = clients.reduce((sum, c) => sum + c.totalSpend, 0)
    const totalOutstanding = clients.reduce((sum, c) => sum + c.outstandingAmount, 0)

    return NextResponse.json({
      summary: {
        totalClients,
        totalJobs,
        totalSpend,
        totalOutstanding,
        averageSpendPerClient: totalClients > 0 ? totalSpend / totalClients : 0,
      },
      clients,
    })
  } catch (error: any) {
    console.error('Client activity report error:', error)
    return NextResponse.json(
      { error: 'Failed to generate client activity report', details: error.message },
      { status: 500 }
    )
  }
}
