import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const payload = await getPayload({ config })
    const { id } = await params
    const body = await request.json()
    const { userId } = body

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      )
    }

    // Fetch the invoice
    const invoice: any = await payload.findByID({
      collection: 'invoices',
      id,
      overrideAccess: true,
    })

    if (!invoice) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      )
    }

    // Verify invoice is in draft or pending-approval status
    if (!['draft', 'pending-approval'].includes(invoice.status)) {
      return NextResponse.json(
        { error: `Invoice cannot be approved from status: ${invoice.status}` },
        { status: 400 }
      )
    }

    // Update invoice to approved
    const updatedInvoice = await payload.update({
      collection: 'invoices',
      id,
      data: {
        status: 'approved',
        approvedBy: userId,
        approvedAt: new Date().toISOString(),
      },
      overrideAccess: true,
    })

    console.log(`[Invoice] Invoice ${id} approved by user ${userId}`)

    return NextResponse.json({
      success: true,
      invoice: updatedInvoice,
      message: 'Invoice approved successfully',
    })
  } catch (error: any) {
    console.error('Invoice approval error:', error)
    return NextResponse.json(
      { error: 'Failed to approve invoice', details: error.message },
      { status: 500 }
    )
  }
}
