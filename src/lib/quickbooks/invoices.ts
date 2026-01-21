import type { Payload } from 'payload'
import { quickbooksClient } from './client'

// Helper to get QB client with token loaded
async function getQuickBooksClient() {
  // The client will load token automatically when making API calls
  return quickbooksClient
}

interface SyncInvoiceResult {
  success: boolean
  invoiceId?: string
  error?: string
}

/**
 * Sync an invoice to QuickBooks
 * Creates a new invoice in QuickBooks and updates the local invoice record
 */
export async function syncInvoiceToQuickBooks(
  payload: Payload,
  invoiceId: string,
): Promise<SyncInvoiceResult> {
  try {
    console.log(`[QB Invoice] Starting sync for invoice ${invoiceId}`)

    // Fetch the invoice with related data
    const invoice: any = await payload.findByID({
      collection: 'invoices',
      id: invoiceId,
      depth: 2,
      overrideAccess: true,
    })

    if (!invoice) {
      throw new Error('Invoice not found')
    }

    // Verify invoice is approved
    if (invoice.status !== 'approved') {
      throw new Error('Invoice must be approved before syncing to QuickBooks')
    }

    // Get client data
    const client = typeof invoice.client === 'object' ? invoice.client : null
    if (!client) {
      throw new Error('Client data not found')
    }

    // Get QuickBooks client first
    const qbo = await getQuickBooksClient()
    if (!qbo) {
      throw new Error('QuickBooks client not initialized. Please connect to QuickBooks.')
    }

    // Check if client has QuickBooks customer ID
    let qbCustomerId = client.integrations?.quickbooks?.customerId
    
    // If no QB ID or if the ID is invalid, sync the client to QuickBooks
    if (!qbCustomerId) {
      console.log(`[QB Invoice] Client ${client.name} not synced to QuickBooks. Syncing now...`)
      const { syncClientToQuickBooks } = require('./sync')
      const syncResult = await syncClientToQuickBooks(payload, client)
      
      if (!syncResult.success) {
        throw new Error(`Failed to sync client to QuickBooks: ${syncResult.error}`)
      }
      
      qbCustomerId = syncResult.customerId
      console.log(`[QB Invoice] Client synced successfully. QB Customer ID: ${qbCustomerId}`)
    } else {
      // Verify the customer exists in QuickBooks
      try {
        await qbo.getCustomer(qbCustomerId)
      } catch (error: any) {
        // If customer not found, re-sync the client
        if (error.response?.status === 400 || error.message?.includes('not found')) {
          console.log(`[QB Invoice] QB Customer ID ${qbCustomerId} not found. Re-syncing client...`)
          const { syncClientToQuickBooks } = require('./sync')
          const syncResult = await syncClientToQuickBooks(payload, client)
          
          if (!syncResult.success) {
            throw new Error(`Failed to re-sync client to QuickBooks: ${syncResult.error}`)
          }
          
          qbCustomerId = syncResult.customerId
          console.log(`[QB Invoice] Client re-synced successfully. New QB Customer ID: ${qbCustomerId}`)
        } else {
          throw error
        }
      }
    }

    // Format line items for QuickBooks
    const qbLineItems = invoice.lineItems.map((item: any, index: number) => {
      return {
        Description: item.description,
        Amount: item.amount,
        DetailType: 'SalesItemLineDetail',
        SalesItemLineDetail: {
          Qty: item.quantity,
          UnitPrice: item.rate,
          // Use TAX or NON for tax code
          TaxCodeRef: {
            value: item.taxable ? 'TAX' : 'NON',
          },
        },
        LineNum: index + 1,
      }
    })

    // Build QuickBooks invoice object
    const qbInvoice = {
      CustomerRef: {
        value: qbCustomerId,
      },
      Line: qbLineItems,
      TxnDate: new Date(invoice.invoiceDate).toISOString().split('T')[0],
      DueDate: new Date(invoice.dueDate).toISOString().split('T')[0],
      // Tax details
      TxnTaxDetail: {
        TotalTax: invoice.taxAmount,
      },
      // Customer-facing notes
      CustomerMemo: invoice.notes
        ? {
            value: invoice.notes,
          }
        : undefined,
      // Internal notes
      PrivateNote: invoice.internalNotes || undefined,
    }

    console.log('[QB Invoice] Creating invoice in QuickBooks:', {
      customer: client.name,
      total: invoice.total,
      lineItems: qbLineItems.length,
    })

    // Create invoice in QuickBooks using the API client
    const apiResponse = await qbo.createInvoice(qbInvoice)
    const qbResponse = apiResponse.Invoice

    console.log('[QB Invoice] QuickBooks invoice created:', {
      id: qbResponse.Id,
      docNumber: qbResponse.DocNumber,
    })

    // Update local invoice with QuickBooks data
    await payload.update({
      collection: 'invoices',
      id: invoiceId,
      data: {
        invoiceNumber: qbResponse.DocNumber,
        status: 'sent',
        quickbooks: {
          invoiceId: qbResponse.Id,
          syncStatus: 'synced',
          lastSyncedAt: new Date().toISOString(),
          syncError: null,
        },
      },
      overrideAccess: true,
    })

    console.log(`[QB Invoice] Successfully synced invoice ${invoiceId} to QuickBooks`)

    return {
      success: true,
      invoiceId: qbResponse.Id,
    }
  } catch (error: any) {
    console.error('[QB Invoice] Error syncing invoice:', error)

    // Update invoice with error
    try {
      await payload.update({
        collection: 'invoices',
        id: invoiceId,
        data: {
          quickbooks: {
            syncStatus: 'error',
            syncError: error.message || 'Unknown error occurred',
          },
        },
        overrideAccess: true,
      })
    } catch (updateError) {
      console.error('[QB Invoice] Failed to update invoice with error:', updateError)
    }

    return {
      success: false,
      error: error.message || 'Failed to sync invoice to QuickBooks',
    }
  }
}

/**
 * Get an invoice from QuickBooks by ID
 */
export async function getInvoiceFromQuickBooks(qbInvoiceId: string) {
  try {
    const qbo = await getQuickBooksClient()
    if (!qbo) {
      throw new Error('QuickBooks client not initialized')
    }

    const apiResponse = await qbo.getInvoice(qbInvoiceId)
    const invoice = apiResponse.Invoice

    return {
      success: true,
      invoice,
    }
  } catch (error: any) {
    console.error('[QB Invoice] Error fetching invoice from QuickBooks:', error)
    return {
      success: false,
      error: error.message,
    }
  }
}

/**
 * Update invoice status based on QuickBooks data
 * Called from webhook or manual sync
 */
export async function updateInvoiceStatus(
  payload: Payload,
  invoiceId: string,
  status: string,
  paidAmount?: number,
  paidDate?: string,
) {
  try {
    const updateData: any = {
      status,
    }

    if (paidAmount !== undefined) {
      updateData.paidAmount = paidAmount
    }

    if (paidDate) {
      updateData.paidDate = paidDate
    }

    // If fully paid, update related jobs
    if (status === 'paid') {
      const invoice: any = await payload.findByID({
        collection: 'invoices',
        id: invoiceId,
        depth: 1,
        overrideAccess: true,
      })

      if (invoice && invoice.jobs) {
        const jobIds = invoice.jobs.map((job: any) =>
          typeof job === 'object' ? job.id : job,
        )

        // Update all jobs to paid status
        await Promise.all(
          jobIds.map((jobId: string) =>
            payload.update({
              collection: 'jobs',
              id: jobId,
              data: {
                invoiceStatus: 'paid',
              },
              overrideAccess: true,
            }),
          ),
        )

        console.log(`[QB Invoice] Updated ${jobIds.length} jobs to paid status`)
      }
    }

    await payload.update({
      collection: 'invoices',
      id: invoiceId,
      data: updateData,
      overrideAccess: true,
    })

    console.log(`[QB Invoice] Updated invoice ${invoiceId} status to ${status}`)

    return {
      success: true,
    }
  } catch (error: any) {
    console.error('[QB Invoice] Error updating invoice status:', error)
    return {
      success: false,
      error: error.message,
    }
  }
}

/**
 * Void an invoice in QuickBooks
 */
export async function voidInvoiceInQuickBooks(payload: Payload, invoiceId: string) {
  try {
    const invoice: any = await payload.findByID({
      collection: 'invoices',
      id: invoiceId,
      depth: 1,
      overrideAccess: true,
    })

    if (!invoice) {
      throw new Error('Invoice not found')
    }

    const qbInvoiceId = invoice.quickbooks?.invoiceId
    if (!qbInvoiceId) {
      throw new Error('Invoice is not synced with QuickBooks')
    }

    const qbo = await getQuickBooksClient()
    if (!qbo) {
      throw new Error('QuickBooks client not initialized')
    }

    // Void the invoice in QuickBooks
    await qbo.voidInvoice(qbInvoiceId)

    // Update local invoice
    await payload.update({
      collection: 'invoices',
      id: invoiceId,
      data: {
        status: 'void',
      },
      overrideAccess: true,
    })

    console.log(`[QB Invoice] Voided invoice ${invoiceId} in QuickBooks`)

    return {
      success: true,
    }
  } catch (error: any) {
    console.error('[QB Invoice] Error voiding invoice:', error)
    return {
      success: false,
      error: error.message,
    }
  }
}
