import { quickbooksClient } from './client'
import type { Payload } from 'payload'

export async function importVendorsFromQuickBooks(payload: Payload) {
  try {
    console.log('Starting QuickBooks vendor import...')

    const query = "SELECT * FROM Vendor MAXRESULTS 1000"
    const result = await quickbooksClient.queryCustomers(query)

    console.log('QuickBooks vendor query result:', JSON.stringify(result, null, 2))

    const vendors = result?.QueryResponse?.Vendor || []
    console.log(`Found ${vendors.length} vendors in QuickBooks`)

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

        // Skip vendors without a billing email (required field)
        if (!qbVendor.PrimaryEmailAddr?.Address) {
          results.skipped++
          results.details.push({
            qbId,
            name: qbVendor.DisplayName,
            action: 'skipped',
            reason: 'No email address',
          })
          console.log(`Skipped vendor (no email): ${qbVendor.DisplayName} (QB ID: ${qbId})`)
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
          billingEmail: qbVendor.PrimaryEmailAddr.Address,
          integrations: {
            quickbooks: {
              vendorId: qbId,
              syncStatus: 'synced',
              lastSyncedAt: new Date().toISOString(),
            },
          },
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
          console.log(`Updated vendor: ${vendorData.companyName} (QB ID: ${qbId})`)
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
          console.log(`Imported vendor: ${vendorData.companyName} (QB ID: ${qbId})`)
        }
      } catch (error: any) {
        results.errors++
        results.details.push({
          qbId: qbVendor.Id,
          name: qbVendor.DisplayName,
          action: 'error',
          error: error.message,
        })
        console.error(`Error importing vendor ${qbVendor.DisplayName}:`, error.message)
      }
    }

    console.log('Vendor import complete:', results)
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

    console.log('QuickBooks query result:', JSON.stringify(result, null, 2))

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
          console.log(`Updated client: ${clientData.name} (QB ID: ${qbId})`)
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
          console.log(`Imported client: ${clientData.name} (QB ID: ${qbId})`)
        }
      } catch (error: any) {
        results.errors++
        results.details.push({
          qbId: qbCustomer.Id,
          name: qbCustomer.DisplayName,
          action: 'error',
          error: error.message,
        })
        console.error(`Error importing customer ${qbCustomer.DisplayName}:`, error.message)
      }
    }

    console.log('Import complete:', results)
    return results
  } catch (error: any) {
    console.error('Error importing customers from QuickBooks:', error)
    throw error
  }
}
