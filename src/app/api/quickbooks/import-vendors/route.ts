import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { importVendorsFromQuickBooks } from '@/lib/quickbooks/import'

export async function POST(request: NextRequest) {
  try {
    const payload = await getPayload({ config })

    // Parse optional parameters
    let daysActive: number | undefined = 365
    let includeWithoutEmail = true // Default to including all vendors
    try {
      const body = await request.json()
      daysActive = body.daysActive ?? 365
      includeWithoutEmail = body.includeWithoutEmail ?? true
    } catch {
      // Use defaults if no body
    }

    console.log(`Starting QuickBooks vendor import (last ${daysActive} days, includeWithoutEmail: ${includeWithoutEmail})...`)
    const results = await importVendorsFromQuickBooks(payload, { daysActive, includeWithoutEmail })

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
