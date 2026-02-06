import { NextResponse } from 'next/server'
import { tokenStore } from '@/lib/quickbooks/token-store'

export async function GET() {
  try {
    const token = await tokenStore.load()

    if (!token || !token.access_token) {
      return NextResponse.json({
        connected: false,
        message: 'No QuickBooks token found',
      })
    }

    // Check if token is expired
    const expiresAt = token.createdAt
      ? new Date(token.createdAt).getTime() + (token.expires_in * 1000)
      : 0

    const isExpired = Date.now() > expiresAt

    return NextResponse.json({
      connected: true,
      expired: isExpired,
      realmId: token.realmId,
      expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
    })
  } catch (error: any) {
    console.error('Error checking QB status:', error)
    return NextResponse.json({
      connected: false,
      error: error.message,
    })
  }
}
