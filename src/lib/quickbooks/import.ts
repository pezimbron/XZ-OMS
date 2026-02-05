import { quickbooksClient } from './client'
import type { Payload } from 'payload'

export async function importVendorsFromQuickBooks(payload: Payload, options?: { daysActive?: number, includeWithoutEmail?: boolean }) {
  try {
    console.log('Starting QuickBooks vendor import...')

    let vendorIds: Set<string> | null = null

    // If daysActive is specified, first get vendors with recent bills
    if (options?.daysActive) {
      const fromDate = new Date()
      fromDate.setDate(fromDate.getDate() - options.daysActive)
      const fromDateStr = fromDate.toISOString().split('T')[0]

      console.log(`Filtering vendors with bills since ${fromDateStr}...`)

      const billQuery = `SELECT VendorRef FROM Bill WHERE TxnDate >= '${fromDateStr}' MAXRESULTS 1000`
      const billResult = await quickbooksClient.queryCustomers(billQuery)
      const bills = billResult?.QueryResponse?.Bill || []

      vendorIds = new Set(bills.map((bill: any) => bill.VendorRef?.value).filter(Boolean))
      console.log(`Found ${vendorIds.size} unique vendors with recent bills`)
    }

    const query = "SELECT * FROM Vendor MAXRESULTS 1000"
    const result = await quickbooksClient.queryCustomers(query)

    let vendors = result?.QueryResponse?.Vendor || []

    // Filter to only active vendors if we have the list
    if (vendorIds) {
      vendors = vendors.filter((v: any) => vendorIds!.has(v.Id))
    }

    console.log(`Processing ${vendors.length} vendors`)

    const results = {
      total: vendors.length,
      imported: 0,
      updated: 0,
      skipped: 0,
      errors: 0,
      details: [] as any[],
    }

    for (const qbVendor of vendors) {
      try {
        const qbId = qbVendor.Id

        // Skip vendors without email unless includeWithoutEmail is true
        if (!qbVendor.PrimaryEmailAddr?.Address && !options?.includeWithoutEmail) {
          results.skipped++
          results.details.push({
            qbId,
            name: qbVendor.DisplayName,
            action: 'skipped',
            reason: 'No email address',
          })
          continue
        }

        // Check if vendor already exists with this QuickBooks ID
        const existing = await payload.find({
          collection: 'vendors',
          where: {
            'integrations.quickbooks.vendorId': {
              equals: qbId,
            },
          },
          limit: 1,
        })

        const vendorData: any = {
          companyName: qbVendor.DisplayName || 'Unknown',
          integrations: {
            quickbooks: {
              vendorId: qbId,
              syncStatus: 'synced',
              lastSyncedAt: new Date().toISOString(),
            },
          },
        }

        if (qbVendor.PrimaryEmailAddr?.Address) {
          vendorData.billingEmail = qbVendor.PrimaryEmailAddr.Address
        }

        if (qbVendor.PrimaryPhone?.FreeFormNumber) {
          vendorData.billingPhone = qbVendor.PrimaryPhone.FreeFormNumber
        }

        if (existing.docs.length > 0) {
          // Update existing vendor
          await payload.update({
            collection: 'vendors',
            id: existing.docs[0].id,
            data: vendorData as any,
          })
          results.updated++
          results.details.push({
            qbId,
            name: vendorData.companyName,
            action: 'updated',
          })
        } else {
          // Create new vendor
          await payload.create({
            collection: 'vendors',
            data: vendorData as any,
          })
          results.imported++
          results.details.push({
            qbId,
            name: vendorData.companyName,
            action: 'imported',
          })
        }
      } catch (error: any) {
        results.errors++
        results.details.push({
          qbId: qbVendor.Id,
          name: qbVendor.DisplayName,
          action: 'error',
          error: error.message,
        })
      }
    }

    console.log(`Vendor import complete: ${results.imported} imported, ${results.updated} updated, ${results.skipped} skipped, ${results.errors} errors`)
    return results
  } catch (error: any) {
    console.error('Error importing vendors from QuickBooks:', error)
    throw error
  }
}

export async function importCustomersFromQuickBooks(payload: Payload) {
  try {
    console.log('Starting QuickBooks customer import...')

    // Query all customers from QuickBooks
    const query = "SELECT * FROM Customer MAXRESULTS 1000"
    const result = await quickbooksClient.queryCustomers(query)

    const customers = result?.QueryResponse?.Customer || []
    console.log(`Found ${customers.length} customers in QuickBooks`)

    const results = {
      total: customers.length,
      imported: 0,
      updated: 0,
      skipped: 0,
      errors: 0,
      details: [] as any[],
    }

    for (const qbCustomer of customers) {
      try {
        const qbId = qbCustomer.Id

        // Check if client already exists with this QuickBooks ID
        const existing = await payload.find({
          collection: 'clients',
          where: {
            'integrations.quickbooks.customerId': {
              equals: qbId,
            },
          },
          limit: 1,
        })

        const clientData: any = {
          name: qbCustomer.DisplayName || qbCustomer.FullyQualifiedName || 'Unknown',
          clientType: 'retail',
          billingPreference: 'immediate',
          integrations: {
            quickbooks: {
              customerId: qbId,
              syncStatus: 'synced',
              lastSyncedAt: new Date().toISOString(),
            },
          },
          // Disable notifications for imported clients - enable manually per-client as needed
          notificationPreferences: {
            enableNotifications: false,
          },
        }

        // Only add optional fields if they have values
        if (qbCustomer.PrimaryEmailAddr?.Address) {
          clientData.email = qbCustomer.PrimaryEmailAddr.Address
        }
        if (qbCustomer.PrimaryPhone?.FreeFormNumber) {
          clientData.phone = qbCustomer.PrimaryPhone.FreeFormNumber
        }
        if (qbCustomer.CompanyName) {
          clientData.companyName = qbCustomer.CompanyName
        }
        if (qbCustomer.BillAddr?.Line1) {
          clientData.billingAddress = `${qbCustomer.BillAddr.Line1}${qbCustomer.BillAddr.City ? '\n' + qbCustomer.BillAddr.City : ''}${qbCustomer.BillAddr.CountrySubDivisionCode ? ', ' + qbCustomer.BillAddr.CountrySubDivisionCode : ''}${qbCustomer.BillAddr.PostalCode ? ' ' + qbCustomer.BillAddr.PostalCode : ''}`
        }

        if (existing.docs.length > 0) {
          // Update existing client
          await payload.update({
            collection: 'clients',
            id: existing.docs[0].id,
            data: clientData as any,
          })
          results.updated++
          results.details.push({
            qbId,
            name: clientData.name,
            action: 'updated',
          })
        } else {
          // Create new client
          await payload.create({
            collection: 'clients',
            data: clientData as any,
          })
          results.imported++
          results.details.push({
            qbId,
            name: clientData.name,
            action: 'imported',
          })
        }
      } catch (error: any) {
        results.errors++
        results.details.push({
          qbId: qbCustomer.Id,
          name: qbCustomer.DisplayName,
          action: 'error',
          error: error.message,
        })
      }
    }

    console.log(`Import complete: ${results.imported} imported, ${results.updated} updated, ${results.errors} errors`)
    return results
  } catch (error: any) {
    console.error('Error importing customers from QuickBooks:', error)
    throw error
  }
}
