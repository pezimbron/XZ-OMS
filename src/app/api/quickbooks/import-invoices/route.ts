import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { importInvoicesFromQuickBooks } from '@/lib/quickbooks/importInvoices'

export async function POST(request: NextRequest) {
  try {
    const payload = await getPayload({ config })
    const body = await request.json()
    
    const { startDate, endDate, limit } = body

    // Import invoices from QuickBooks
    const result = await importInvoicesFromQuickBooks(payload, {
      startDate,
      endDate,
      limit: limit || 100,
    })

    if (!result.success) {
      return NextResponse.json(
        { 
          error: 'Import failed',
          errors: result.errors 
        },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      imported: result.imported,
      skipped: result.skipped,
      errors: result.errors,
      message: `Successfully imported ${result.imported} invoice(s). Skipped ${result.skipped}.`,
    })
  } catch (error: any) {
    console.error('Error importing invoices:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to import invoices' },
      { status: 500 }
    )
  }
}
