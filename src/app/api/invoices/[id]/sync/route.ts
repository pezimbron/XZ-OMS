import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { syncInvoiceToQuickBooks } from '@/lib/quickbooks/invoices'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const payload = await getPayload({ config })
    const { id } = await params

    // Sync invoice to QuickBooks
    const result = await syncInvoiceToQuickBooks(payload, id)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      invoiceId: result.invoiceId,
      message: 'Invoice synced to QuickBooks successfully',
    })
  } catch (error: any) {
    console.error('Invoice sync error:', error)
    return NextResponse.json(
      { error: 'Failed to sync invoice', details: error.message },
      { status: 500 }
    )
  }
}
