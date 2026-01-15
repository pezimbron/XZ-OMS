import { NextResponse } from 'next/server'
import { quickbooksClient } from '@/lib/quickbooks/client'

export async function GET() {
  try {
    const authUri = quickbooksClient.getAuthUri()
    return NextResponse.redirect(authUri)
  } catch (error: any) {
    console.error('QuickBooks auth error:', error)
    return NextResponse.json(
      { error: 'Failed to initiate QuickBooks authentication', details: error.message },
      { status: 500 }
    )
  }
}
