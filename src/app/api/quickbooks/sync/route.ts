import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { syncClientToQuickBooks, syncAllClientsToQuickBooks } from '@/lib/quickbooks/sync'

export async function POST(request: NextRequest) {
  try {
    const payload = await getPayload({ config })
    const body = await request.json()
    const { clientId, syncAll } = body

    if (syncAll) {
      // Sync all clients
      const results = await syncAllClientsToQuickBooks(payload)
      return NextResponse.json({
        success: true,
        message: `Synced ${results.synced} clients, ${results.errors} errors`,
        results,
      })
    } else if (clientId) {
      // Sync single client
      const client = await payload.findByID({
        collection: 'clients',
        id: clientId,
      })

      const result = await syncClientToQuickBooks(payload, client as any)
      return NextResponse.json(result)
    } else {
      return NextResponse.json(
        { error: 'Please provide clientId or set syncAll to true' },
        { status: 400 }
      )
    }
  } catch (error: any) {
    console.error('QuickBooks sync error:', error)
    return NextResponse.json(
      { error: 'Failed to sync with QuickBooks', details: error.message },
      { status: 500 }
    )
  }
}
