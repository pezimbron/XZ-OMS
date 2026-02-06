import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { quickbooksClient } from '@/lib/quickbooks/client'

export async function POST(request: NextRequest) {
  try {
    const payload = await getPayload({ config })
    const { vendorId } = await request.json()

    if (!vendorId) {
      return NextResponse.json(
        { error: 'vendorId is required' },
        { status: 400 }
      )
    }

    // Get the vendor from OMS
    const vendor = await payload.findByID({
      collection: 'vendors',
      id: vendorId,
    })

    if (!vendor) {
      return NextResponse.json(
        { error: 'Vendor not found' },
        { status: 404 }
      )
    }

    // Check if already synced
    if (vendor.integrations?.quickbooks?.vendorId) {
      return NextResponse.json(
        { error: 'Vendor already synced to QuickBooks', quickbooksId: vendor.integrations.quickbooks.vendorId },
        { status: 400 }
      )
    }

    // Create vendor in QuickBooks
    const qbVendorData: any = {
      DisplayName: vendor.companyName,
    }

    if (vendor.billingEmail) {
      qbVendorData.PrimaryEmailAddr = { Address: vendor.billingEmail }
    }

    if (vendor.billingPhone) {
      qbVendorData.PrimaryPhone = { FreeFormNumber: vendor.billingPhone }
    }

    const qbResult = await quickbooksClient.createVendor(qbVendorData)
    const qbVendorId = qbResult.Vendor.Id

    // Update OMS vendor with QuickBooks ID
    await payload.update({
      collection: 'vendors',
      id: vendorId,
      data: {
        integrations: {
          quickbooks: {
            vendorId: qbVendorId,
            syncStatus: 'synced',
            lastSyncedAt: new Date().toISOString(),
          },
        },
      },
    })

    return NextResponse.json({
      success: true,
      message: `Vendor "${vendor.companyName}" created in QuickBooks`,
      quickbooksId: qbVendorId,
    })
  } catch (error: any) {
    console.error('QuickBooks vendor sync error:', error)
    return NextResponse.json(
      { error: 'Failed to sync vendor to QuickBooks', details: error.message },
      { status: 500 }
    )
  }
}
