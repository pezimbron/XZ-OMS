import { NextRequest, NextResponse } from 'next/server'
import { quickbooksClient } from '@/lib/quickbooks/client'
import { tokenStore } from '@/lib/quickbooks/token-store'

export async function GET(request: NextRequest) {
  try {
    const url = request.url

    // Create token from callback URL
    const token = await quickbooksClient.createToken(url)

    // Store token in memory (TODO: Store in database for production)
    tokenStore.set(token)
    console.log('QuickBooks token stored successfully')

    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_SERVER_URL}/oms/settings?quickbooks=connected`
    )
  } catch (error: any) {
    console.error('QuickBooks callback error:', error)
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_SERVER_URL}/oms/settings?quickbooks=error&message=${encodeURIComponent(error.message)}`
    )
  }
}
