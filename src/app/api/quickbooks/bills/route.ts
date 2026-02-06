import { NextRequest, NextResponse } from 'next/server'
import { quickbooksClient } from '@/lib/quickbooks/client'
import { getPayload } from 'payload'
import config from '@payload-config'

// Cache for expense account ID
let cachedExpenseAccountId: string | null = null

async function getExpenseAccountId(qbo: typeof quickbooksClient): Promise<string> {
  if (cachedExpenseAccountId) return cachedExpenseAccountId

  try {
    // Query for expense accounts - look for "Subcontractors" or "Cost of Goods Sold" type
    const query = `SELECT * FROM Account WHERE AccountType IN ('Expense', 'Cost of Goods Sold') MAXRESULTS 50`
    const result = await qbo.makeApiCall(
      `query?query=${encodeURIComponent(query)}`,
      'GET'
    )

    const accounts = result?.QueryResponse?.Account || []

    // Prefer accounts with "subcontractor" or "contractor" in the name
    let preferredAccount = accounts.find((a: any) =>
      a.Name?.toLowerCase().includes('subcontractor') ||
      a.Name?.toLowerCase().includes('contractor')
    )

    // Fall back to "Cost of Goods Sold" type
    if (!preferredAccount) {
      preferredAccount = accounts.find((a: any) => a.AccountType === 'Cost of Goods Sold')
    }

    // Fall back to any expense account
    if (!preferredAccount && accounts.length > 0) {
      preferredAccount = accounts[0]
    }

    if (preferredAccount) {
      cachedExpenseAccountId = preferredAccount.Id
      console.log(`[QB] Using expense account: ${preferredAccount.Name} (ID: ${preferredAccount.Id})`)
      return preferredAccount.Id
    }

    throw new Error('No expense account found in QuickBooks')
  } catch (error: any) {
    console.error('[QB] Error finding expense account:', error.message)
    console.error('[QB] Error response:', error.response?.data)
    // Re-throw with more context
    const detail = error.response?.data?.Fault?.Error?.[0]?.Detail || error.message
    throw new Error(detail)
  }
}

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

    // Get valid expense account ID
    let expenseAccountId: string
    try {
      expenseAccountId = await getExpenseAccountId(qbo)
    } catch (err: any) {
      console.error('Error getting expense account:', err)
      return NextResponse.json(
        { error: `Failed to find expense account: ${err.message}` },
        { status: 500 }
      )
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
              value: expenseAccountId,
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
    console.error('Error response data:', error.response?.data)
    console.error('Error status:', error.response?.status)

    // Extract more detailed error message from QuickBooks
    const qbError = error.response?.data?.Fault?.Error?.[0]
    const errorMessage = qbError
      ? `${qbError.Message}: ${qbError.Detail}`
      : error.message || 'Failed to create bill in QuickBooks'

    return NextResponse.json(
      { error: errorMessage, details: error.response?.data },
      { status: 500 }
    )
  }
}
