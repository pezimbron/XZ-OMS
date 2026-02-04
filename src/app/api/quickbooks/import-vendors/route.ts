import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { importVendorsFromQuickBooks } from '@/lib/quickbooks/import'

export async function POST(request: NextRequest) {
  try {
    const payload = await getPayload({ config })

    console.log('Starting QuickBooks vendor import...')
    const results = await importVendorsFromQuickBooks(payload)

    return NextResponse.json({
      success: true,
      message: `Imported ${results.imported} new vendors, updated ${results.updated} existing vendors. ${results.skipped} skipped, ${results.errors} errors.`,
      results,
    })
  } catch (error: any) {
    console.error('QuickBooks vendor import error:', error)
    return NextResponse.json(
      { error: 'Failed to import vendors from QuickBooks', details: error.message },
      { status: 500 }
    )
  }
}
