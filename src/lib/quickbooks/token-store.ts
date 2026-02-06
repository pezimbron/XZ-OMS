import { getPayload } from 'payload'
import config from '@payload-config'

// In-memory cache for token (faster reads)
let tokenCache: any = null

// Database-based token storage that persists across deploys
export const tokenStore = {
  set: async (token: any) => {
    try {
      tokenCache = token
      const payload = await getPayload({ config })

      // Find existing token record
      const existing = await payload.find({
        collection: 'settings' as any,
        where: { key: { equals: 'quickbooks-token' } },
        limit: 1,
      })

      if (existing.docs.length > 0) {
        await payload.update({
          collection: 'settings' as any,
          id: existing.docs[0].id,
          data: { value: JSON.stringify(token) },
        })
      } else {
        await payload.create({
          collection: 'settings' as any,
          data: { key: 'quickbooks-token', value: JSON.stringify(token) },
        })
      }
    } catch (error) {
      console.error('Error storing token:', error)
      // Fallback: still keep in memory
      tokenCache = token
    }
  },

  get: () => {
    // Return cached token synchronously (will be loaded on first API call)
    return tokenCache
  },

  // Async version for initial load
  load: async () => {
    if (tokenCache) return tokenCache

    try {
      const payload = await getPayload({ config })
      const result = await payload.find({
        collection: 'settings' as any,
        where: { key: { equals: 'quickbooks-token' } },
        limit: 1,
      })

      if (result.docs.length > 0 && result.docs[0].value) {
        tokenCache = JSON.parse(result.docs[0].value as string)
        return tokenCache
      }
      return null
    } catch (error) {
      console.error('Error loading token:', error)
      return null
    }
  },

  clear: async () => {
    try {
      tokenCache = null
      const payload = await getPayload({ config })
      const existing = await payload.find({
        collection: 'settings' as any,
        where: { key: { equals: 'quickbooks-token' } },
        limit: 1,
      })

      if (existing.docs.length > 0) {
        await payload.delete({
          collection: 'settings' as any,
          id: existing.docs[0].id,
        })
      }
    } catch (error) {
      console.error('Error clearing token:', error)
    }
  },
}
