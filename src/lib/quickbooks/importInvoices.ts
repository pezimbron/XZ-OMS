import type { Payload } from 'payload'
import { quickbooksClient } from './client'

interface ImportInvoiceResult {
  success: boolean
  imported: number
  skipped: number
  errors: string[]
}

/**
 * Import invoices from QuickBooks
 * Fetches invoices from QB and creates corresponding records in local database
 */
export async function importInvoicesFromQuickBooks(
  payload: Payload,
  options?: {
    startDate?: string
    endDate?: string
    limit?: number
  }
): Promise<ImportInvoiceResult> {
  const result: ImportInvoiceResult = {
    success: true,
    imported: 0,
    skipped: 0,
    errors: [],
  }

  try {
    console.log('[QB Import] Starting invoice import from QuickBooks...')

    // Build query for invoices
    let query = 'SELECT * FROM Invoice'
    const conditions: string[] = []

    if (options?.startDate) {
      conditions.push(`TxnDate >= '${options.startDate}'`)
    }
    if (options?.endDate) {
      conditions.push(`TxnDate <= '${options.endDate}'`)
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ')
    }

    query += ' MAXRESULTS ' + (options?.limit || 100)

    console.log('[QB Import] Query:', query)

    // Fetch invoices from QuickBooks
    const response = await quickbooksClient.makeApiCall(
      `query?query=${encodeURIComponent(query)}`,
      'GET'
    )

    const qbInvoices = response.QueryResponse?.Invoice || []
    console.log(`[QB Import] Found ${qbInvoices.length} invoices in QuickBooks`)

    if (qbInvoices.length === 0) {
      return result
    }

    // Get all clients to map QB customer IDs to local client IDs
    const clientsResponse = await payload.find({
      collection: 'clients',
      limit: 1000,
      overrideAccess: true,
    })

    const clientMap = new Map<string, string>()
    clientsResponse.docs.forEach((client: any) => {
      const qbCustomerId = client.integrations?.quickbooks?.customerId
      if (qbCustomerId) {
        clientMap.set(qbCustomerId, client.id)
      }
    })

    // Process each invoice
    for (const qbInvoice of qbInvoices) {
      try {
        // Check if invoice already exists
        const existingInvoice = await payload.find({
          collection: 'invoices',
          where: {
            'quickbooks.invoiceId': {
              equals: qbInvoice.Id,
            },
          },
          limit: 1,
          overrideAccess: true,
        })

        if (existingInvoice.docs.length > 0) {
          console.log(`[QB Import] Invoice ${qbInvoice.DocNumber} already exists, skipping`)
          result.skipped++
          continue
        }

        // Map QB customer to local client
        const clientId = clientMap.get(qbInvoice.CustomerRef.value)
        if (!clientId) {
          console.log(`[QB Import] Client not found for QB customer ${qbInvoice.CustomerRef.value}, skipping invoice ${qbInvoice.DocNumber}`)
          result.skipped++
          continue
        }

        // Parse line items
        const lineItems = (qbInvoice.Line || [])
          .filter((line: any) => line.DetailType === 'SalesItemLineDetail')
          .map((line: any, index: number) => ({
            description: line.Description || line.SalesItemLineDetail?.ItemRef?.name || 'Service',
            quantity: line.SalesItemLineDetail?.Qty || 1,
            rate: line.SalesItemLineDetail?.UnitPrice || 0,
            amount: line.Amount || 0,
            taxable: line.SalesItemLineDetail?.TaxCodeRef?.value === 'TAX',
          }))

        // Map QB invoice status to local status
        const statusMap: Record<string, string> = {
          'Paid': 'paid',
          'Unpaid': 'sent',
          'Pending': 'sent',
          'Overdue': 'overdue',
          'Voided': 'void',
        }

        const localStatus = statusMap[qbInvoice.Balance === 0 ? 'Paid' : 'Unpaid'] || 'sent'

        // Calculate totals
        const subtotal = parseFloat(qbInvoice.TotalAmt || 0) - parseFloat(qbInvoice.TxnTaxDetail?.TotalTax || 0)
        const taxAmount = parseFloat(qbInvoice.TxnTaxDetail?.TotalTax || 0)
        const total = parseFloat(qbInvoice.TotalAmt || 0)
        const paidAmount = total - parseFloat(qbInvoice.Balance || 0)

        // Create invoice in local database
        const newInvoice = await payload.create({
          collection: 'invoices',
          data: {
            invoiceNumber: qbInvoice.DocNumber || undefined,
            client: clientId as any,
            jobs: [], // Can't map jobs automatically
            lineItems,
            subtotal,
            taxAmount,
            total,
            invoiceDate: qbInvoice.TxnDate,
            dueDate: qbInvoice.DueDate,
            terms: 'net-30', // Default, can't determine from QB
            status: localStatus as any,
            paidAmount: parseFloat(paidAmount.toString()),
            notes: qbInvoice.CustomerMemo?.value || undefined,
            internalNotes: qbInvoice.PrivateNote || undefined,
            quickbooks: {
              invoiceId: qbInvoice.Id,
              syncStatus: 'synced',
              lastSyncedAt: new Date().toISOString(),
            },
          },
          overrideAccess: true,
        })

        console.log(`[QB Import] Imported invoice ${qbInvoice.DocNumber} (ID: ${newInvoice.id})`)
        result.imported++
      } catch (error: any) {
        console.error(`[QB Import] Error importing invoice ${qbInvoice.DocNumber}:`, error.message)
        result.errors.push(`Invoice ${qbInvoice.DocNumber}: ${error.message}`)
      }
    }

    console.log(`[QB Import] Import complete. Imported: ${result.imported}, Skipped: ${result.skipped}, Errors: ${result.errors.length}`)
    return result
  } catch (error: any) {
    console.error('[QB Import] Error importing invoices:', error)
    result.success = false
    result.errors.push(error.message)
    return result
  }
}

/**
 * Import a single invoice from QuickBooks by ID
 */
export async function importSingleInvoiceFromQuickBooks(
  payload: Payload,
  qbInvoiceId: string
): Promise<{ success: boolean; invoiceId?: string; error?: string }> {
  try {
    console.log(`[QB Import] Importing single invoice ${qbInvoiceId}`)

    // Fetch invoice from QuickBooks
    const response = await quickbooksClient.getInvoice(qbInvoiceId)
    const qbInvoice = response.Invoice

    if (!qbInvoice) {
      throw new Error('Invoice not found in QuickBooks')
    }

    // Check if invoice already exists
    const existingInvoice = await payload.find({
      collection: 'invoices',
      where: {
        'quickbooks.invoiceId': {
          equals: qbInvoice.Id,
        },
      },
      limit: 1,
      overrideAccess: true,
    })

    if (existingInvoice.docs.length > 0) {
      return {
        success: false,
        error: 'Invoice already exists in database',
      }
    }

    // Get client by QB customer ID
    const clientsResponse = await payload.find({
      collection: 'clients',
      where: {
        'integrations.quickbooks.customerId': {
          equals: qbInvoice.CustomerRef.value,
        },
      },
      limit: 1,
      overrideAccess: true,
    })

    if (clientsResponse.docs.length === 0) {
      throw new Error(`Client not found for QB customer ${qbInvoice.CustomerRef.value}`)
    }

    const clientId = clientsResponse.docs[0].id

    // Parse line items
    const lineItems = (qbInvoice.Line || [])
      .filter((line: any) => line.DetailType === 'SalesItemLineDetail')
      .map((line: any) => ({
        description: line.Description || line.SalesItemLineDetail?.ItemRef?.name || 'Service',
        quantity: line.SalesItemLineDetail?.Qty || 1,
        rate: line.SalesItemLineDetail?.UnitPrice || 0,
        amount: line.Amount || 0,
        taxable: line.SalesItemLineDetail?.TaxCodeRef?.value === 'TAX',
      }))

    const localStatus = qbInvoice.Balance === 0 ? 'paid' : 'sent'
    const subtotal = parseFloat(qbInvoice.TotalAmt || 0) - parseFloat(qbInvoice.TxnTaxDetail?.TotalTax || 0)
    const taxAmount = parseFloat(qbInvoice.TxnTaxDetail?.TotalTax || 0)
    const total = parseFloat(qbInvoice.TotalAmt || 0)
    const paidAmount = total - parseFloat(qbInvoice.Balance || 0)

    // Create invoice
    const newInvoice = await payload.create({
      collection: 'invoices',
      data: {
        invoiceNumber: qbInvoice.DocNumber || undefined,
        client: clientId as any,
        jobs: [],
        lineItems,
        subtotal,
        taxAmount,
        total,
        invoiceDate: qbInvoice.TxnDate,
        dueDate: qbInvoice.DueDate,
        terms: 'net-30',
        status: localStatus as any,
        paidAmount: parseFloat(paidAmount.toString()),
        notes: qbInvoice.CustomerMemo?.value || undefined,
        internalNotes: qbInvoice.PrivateNote || undefined,
        quickbooks: {
          invoiceId: qbInvoice.Id,
          syncStatus: 'synced',
          lastSyncedAt: new Date().toISOString(),
        },
      },
      overrideAccess: true,
    })

    return {
      success: true,
      invoiceId: newInvoice.id,
    }
  } catch (error: any) {
    console.error('[QB Import] Error importing single invoice:', error)
    return {
      success: false,
      error: error.message,
    }
  }
}
