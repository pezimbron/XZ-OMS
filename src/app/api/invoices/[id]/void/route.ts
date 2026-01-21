import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { voidInvoiceInQuickBooks } from '@/lib/quickbooks/invoices'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const payload = await getPayload({ config })
    const { id } = await params

    // Void invoice in QuickBooks
    const result = await voidInvoiceInQuickBooks(payload, id)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Invoice voided successfully',
    })
  } catch (error: any) {
    console.error('Invoice void error:', error)
    return NextResponse.json(
      { error: 'Failed to void invoice', details: error.message },
      { status: 500 }
    )
  }
}
