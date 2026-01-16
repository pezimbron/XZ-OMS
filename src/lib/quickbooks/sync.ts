import { quickbooksClient } from './client'
import type { Payload } from 'payload'

interface Client {
  id: string
  name: string
  email?: string
  phone?: string
  companyName?: string
  billingAddress?: string
  integrations?: {
    quickbooks?: {
      customerId?: string
      syncStatus?: string
      lastSyncedAt?: string
      syncError?: string
    }
  }
}

export async function syncClientToQuickBooks(payload: Payload, client: Client) {
  try {
    // Check if client already has a QuickBooks ID
    const qbCustomerId = client.integrations?.quickbooks?.customerId

    // Prepare customer data - only include fields with values
    const customerData: any = {
      DisplayName: client.name || 'Unnamed Client',
    }

    // Only add optional fields if they have values
    if (client.email && client.email.trim()) {
      customerData.PrimaryEmailAddr = { Address: client.email.trim() }
    }

    if (client.phone && client.phone.trim()) {
      customerData.PrimaryPhone = { FreeFormNumber: client.phone.trim() }
    }

    if (client.companyName && client.companyName.trim()) {
      customerData.CompanyName = client.companyName.trim()
    }

    if (client.billingAddress && client.billingAddress.trim()) {
      // Parse billing address if it's a string
      const addressLines = client.billingAddress.split('\n').filter(line => line.trim())
      if (addressLines.length > 0) {
        customerData.BillAddr = {
          Line1: addressLines[0].trim(),
        }
      }
    }

    console.log('Customer Data to Send:', JSON.stringify(customerData, null, 2))

    let result

    if (qbCustomerId) {
      // Update existing customer
      const existingCustomer = await quickbooksClient.getCustomer(qbCustomerId)
      customerData.SyncToken = existingCustomer.Customer.SyncToken
      result = await quickbooksClient.updateCustomer(qbCustomerId, customerData)
    } else {
      // Create new customer
      result = await quickbooksClient.createCustomer(customerData)
    }

    console.log('QuickBooks API Response:', JSON.stringify(result, null, 2))

    // Handle different response structures
    const qbId = result?.Customer?.Id || result?.Id || null
    
    if (!qbId) {
      throw new Error(`Failed to get Customer ID from QuickBooks response: ${JSON.stringify(result)}`)
    }

    // Update client with QuickBooks ID and sync status
    try {
      const updateResult = await payload.update({
        collection: 'clients',
        id: client.id,
        data: {
          integrations: {
            quickbooks: {
              customerId: qbId,
              syncStatus: 'synced',
              lastSyncedAt: new Date().toISOString(),
              syncError: '',
            },
          },
        } as any,
      })
      console.log('Database update successful for client:', client.name, 'QB ID:', qbId)
    } catch (dbError: any) {
      console.error('Failed to update database:', dbError.message)
      throw new Error(`QuickBooks sync succeeded but database update failed: ${dbError.message}`)
    }

    return { success: true, customerId: qbId }
  } catch (error: any) {
    console.error('Error syncing client to QuickBooks:', error)

    // Update client with error status
    await payload.update({
      collection: 'clients',
      id: client.id,
      data: {
        integrations: {
          ...client.integrations,
          quickbooks: {
            ...client.integrations?.quickbooks,
            syncStatus: 'error',
            syncError: error.message || 'Unknown error occurred',
          },
        },
      },
    })

    return { success: false, error: error.message }
  }
}

export async function syncAllClientsToQuickBooks(payload: Payload) {
  try {
    // Get all clients that are not synced or have errors
    const clients = await payload.find({
      collection: 'clients',
      limit: 1000,
      where: {
        or: [
          {
            'integrations.quickbooks.syncStatus': {
              equals: 'not-synced',
            },
          },
          {
            'integrations.quickbooks.syncStatus': {
              equals: 'error',
            },
          },
          {
            'integrations.quickbooks.syncStatus': {
              exists: false,
            },
          },
        ],
      },
    })

    const results = {
      total: clients.docs.length,
      synced: 0,
      errors: 0,
      details: [] as any[],
    }

    for (const client of clients.docs) {
      const result = await syncClientToQuickBooks(payload, client as any)
      if (result.success) {
        results.synced++
      } else {
        results.errors++
      }
      results.details.push({
        clientId: client.id,
        clientName: client.name,
        ...result,
      })
    }

    return results
  } catch (error) {
    console.error('Error syncing all clients:', error)
    throw error
  }
}
