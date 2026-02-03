import { NextRequest, NextResponse } from 'next/server'
import { quickbooksClient } from '@/lib/quickbooks/client'

export async function POST(request: NextRequest) {
  try {
    const { vendorId, dateRange } = await request.json()

    if (!vendorId) {
      return NextResponse.json({ error: 'Vendor ID is required' }, { status: 400 })
    }

    const qbo = quickbooksClient
    if (!qbo) {
      return NextResponse.json({ error: 'QuickBooks not connected' }, { status: 400 })
    }

    // Default date range if not provided (last 90 days)
    const toDate = dateRange?.to || new Date().toISOString().split('T')[0]
    const fromDate = dateRange?.from || new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

    // Build query to get bills for this vendor
    const query = `SELECT * FROM Bill WHERE VendorRef = '${vendorId}' AND TxnDate >= '${fromDate}' AND TxnDate <= '${toDate}' ORDER BY TxnDate DESC`

    console.log('[QB Bills Query]', query)

    const result = await qbo.makeApiCall(
      `query?query=${encodeURIComponent(query)}`,
      'GET'
    )

    const bills = result?.QueryResponse?.Bill || []

    return NextResponse.json({
      success: true,
      bills: bills,
      count: bills.length,
    })

  } catch (error: any) {
    console.error('QuickBooks bill query error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to query bills from QuickBooks' },
      { status: 500 }
    )
  }
}
