import { NextRequest, NextResponse } from 'next/server'
import { quickbooksClient } from '@/lib/quickbooks/client'
import { getPayload } from 'payload'
import config from '@payload-config'

export async function POST(request: NextRequest) {
  try {
    const { vendorId, invoiceData, jobId } = await request.json()

    if (!vendorId || !invoiceData) {
      return NextResponse.json(
        { error: 'Vendor ID and invoice data are required' },
        { status: 400 }
      )
    }

    const payload = await getPayload({ config })

    // Get vendor to find QB vendor ID
    const vendor = await payload.findByID({
      collection: 'vendors',
      id: vendorId,
    })

    if (!vendor?.integrations?.quickbooks?.vendorId) {
      return NextResponse.json(
        { error: 'Vendor is not synced with QuickBooks' },
        { status: 400 }
      )
    }

    const qbo = quickbooksClient
    if (!qbo) {
      return NextResponse.json({ error: 'QuickBooks not connected' }, { status: 400 })
    }

    // Build QuickBooks bill object
    const billData = {
      VendorRef: {
        value: vendor.integrations.quickbooks.vendorId,
      },
      TxnDate: invoiceData.invoiceDate || new Date().toISOString().split('T')[0],
      DueDate: invoiceData.dueDate,
      DocNumber: invoiceData.invoiceNumber,
      PrivateNote: jobId ? `Job: ${jobId} - ${invoiceData.description || ''}` : invoiceData.description || '',
      Line: [
        {
          DetailType: 'AccountBasedExpenseLineDetail',
          Amount: invoiceData.amount,
          Description: invoiceData.description || 'Subcontractor services',
          AccountBasedExpenseLineDetail: {
            AccountRef: {
              value: '1', // Expense account - should be configurable
            },
          },
        },
      ],
    }

    console.log('[QB Bill Create]', billData)

    // Create bill in QuickBooks
    const result = await qbo.makeApiCall('bill', 'POST', billData)

    const qbBill = result?.Bill

    if (!qbBill) {
      throw new Error('Failed to create bill in QuickBooks')
    }

    return NextResponse.json({
      success: true,
      billId: qbBill.Id,
      docNumber: qbBill.DocNumber,
      totalAmount: qbBill.TotalAmt,
      bill: {
        Id: qbBill.Id,
        DocNumber: qbBill.DocNumber,
        TotalAmt: qbBill.TotalAmt,
        Balance: qbBill.Balance,
      },
    })

  } catch (error: any) {
    console.error('QuickBooks bill creation error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create bill in QuickBooks' },
      { status: 500 }
    )
  }
}
