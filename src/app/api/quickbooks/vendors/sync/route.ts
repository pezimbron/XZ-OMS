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

    // First, check if vendor already exists in QuickBooks by name
    const searchQuery = `SELECT * FROM Vendor WHERE DisplayName = '${vendor.companyName.replace(/'/g, "\\'")}'`
    const searchResult = await quickbooksClient.queryCustomers(searchQuery)
    const existingVendors = searchResult?.QueryResponse?.Vendor || []

    let qbVendorId: string
    let action: 'linked' | 'created'

    if (existingVendors.length > 0) {
      // Vendor already exists in QB - link it
      qbVendorId = existingVendors[0].Id
      action = 'linked'
    } else {
      // Create new vendor in QuickBooks
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
      qbVendorId = qbResult.Vendor.Id
      action = 'created'
    }

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
      message: action === 'linked'
        ? `Vendor "${vendor.companyName}" linked to existing QuickBooks vendor`
        : `Vendor "${vendor.companyName}" created in QuickBooks`,
      quickbooksId: qbVendorId,
      action,
    })
  } catch (error: any) {
    console.error('QuickBooks vendor sync error:', error)

    // Extract more detailed error from QuickBooks response
    let errorMessage = 'Failed to sync vendor to QuickBooks'
    if (error.response?.data?.Fault?.Error?.[0]?.Detail) {
      errorMessage = error.response.data.Fault.Error[0].Detail
    } else if (error.response?.data?.Fault?.Error?.[0]?.Message) {
      errorMessage = error.response.data.Fault.Error[0].Message
    } else if (error.message) {
      errorMessage = error.message
    }

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}
