import type { Payload } from 'payload'

interface GenerateInvoiceParams {
  jobIds: string[]
  userId: string
  payload: Payload
}

interface InvoiceLineItem {
  description: string
  quantity: number
  rate: number
  amount: number
  taxable: boolean
  jobReference: string
}

/**
 * Generate an invoice from one or more jobs
 * All jobs must belong to the same client
 */
export async function generateInvoiceFromJobs({
  jobIds,
  userId,
  payload,
}: GenerateInvoiceParams) {
  try {
    // Validate input
    if (!jobIds || jobIds.length === 0) {
      throw new Error('At least one job ID is required')
    }

    // Fetch all jobs with full depth
    const jobs = await Promise.all(
      jobIds.map((id) =>
        payload.findByID({
          collection: 'jobs',
          id,
          depth: 2,
          overrideAccess: true,
        }),
      ),
    )

    // Validate all jobs exist
    if (jobs.some((job) => !job)) {
      throw new Error('One or more jobs not found')
    }

    // Validate all jobs belong to the same client
    const clientIds = jobs.map((job: any) => {
      return typeof job.client === 'object' ? job.client.id : job.client
    })
    const uniqueClientIds = [...new Set(clientIds)]
    if (uniqueClientIds.length > 1) {
      throw new Error('All jobs must belong to the same client')
    }

    // Validate all jobs are done and ready to invoice
    const invalidJobs = jobs.filter(
      (job: any) => job.status !== 'done' || job.invoiceStatus !== 'ready',
    )
    if (invalidJobs.length > 0) {
      const invalidJobIds = invalidJobs.map((j: any) => j.jobId).join(', ')
      throw new Error(
        `Jobs must have status='done' and invoiceStatus='ready'. Invalid jobs: ${invalidJobIds}`,
      )
    }

    // Fetch client with tax settings
    const clientId = uniqueClientIds[0]
    const client: any = await payload.findByID({
      collection: 'clients',
      id: clientId,
      depth: 1,
      overrideAccess: true,
    })

    if (!client) {
      throw new Error('Client not found')
    }

    // Generate line items from all jobs
    const lineItems: InvoiceLineItem[] = []
    let subtotal = 0

    for (const job of jobs) {
      const jobData = job as any

      // Process each line item in the job
      if (jobData.lineItems && jobData.lineItems.length > 0) {
        for (const item of jobData.lineItems) {
          const product = typeof item.product === 'object' ? item.product : null

          if (!product) {
            console.warn(`Product not found for line item in job ${jobData.jobId}`)
            continue
          }

          // Calculate amount based on unit type
          let quantity = item.quantity || 1
          let rate = product.basePrice || 0

          // For per-sq-ft products, multiply by job square footage
          if (product.unitType === 'per-sq-ft' && jobData.sqFt) {
            quantity = jobData.sqFt
          }

          const amount = quantity * rate

          lineItems.push({
            description: `${product.name} - Job #${jobData.jobId}`,
            quantity,
            rate,
            amount,
            taxable: product.taxable !== false, // Default to true if not specified
            jobReference: jobData.jobId,
          })

          subtotal += amount
        }
      }
    }

    if (lineItems.length === 0) {
      throw new Error('No line items found in the selected jobs')
    }

    // Calculate tax
    const taxExempt = client.invoicingPreferences?.taxExempt || false
    const taxRate = taxExempt ? 0 : client.invoicingPreferences?.taxRate || 0

    let taxAmount = 0
    if (!taxExempt && taxRate > 0) {
      // Calculate tax only on taxable items
      const taxableAmount = lineItems
        .filter((item) => item.taxable)
        .reduce((sum, item) => sum + item.amount, 0)
      taxAmount = (taxableAmount * taxRate) / 100
    }

    const total = subtotal + taxAmount

    // Calculate due date based on payment terms
    const terms = client.invoicingPreferences?.terms || 'net-30'
    const invoiceDate = new Date()
    const dueDate = new Date(invoiceDate)

    switch (terms) {
      case 'due-on-receipt':
        // Due immediately
        break
      case 'net-15':
        dueDate.setDate(dueDate.getDate() + 15)
        break
      case 'net-30':
        dueDate.setDate(dueDate.getDate() + 30)
        break
      case 'net-45':
        dueDate.setDate(dueDate.getDate() + 45)
        break
      case 'net-60':
        dueDate.setDate(dueDate.getDate() + 60)
        break
      default:
        dueDate.setDate(dueDate.getDate() + 30)
    }

    // Create the invoice
    const invoice = await payload.create({
      collection: 'invoices',
      data: {
        status: 'draft',
        client: clientId,
        jobs: jobIds.map(id => parseInt(id)),
        lineItems,
        subtotal,
        taxRate,
        taxAmount,
        total,
        invoiceDate: invoiceDate.toISOString(),
        dueDate: dueDate.toISOString(),
        terms,
        notes: client.invoicingPreferences?.invoiceNotes || '',
        createdBy: parseInt(userId),
        quickbooks: {
          syncStatus: 'not-synced',
        },
      },
      overrideAccess: true,
    })

    // Update jobs to mark as invoiced
    await Promise.all(
      jobIds.map((jobId) =>
        payload.update({
          collection: 'jobs',
          id: jobId,
          data: {
            invoiceStatus: 'invoiced',
            invoice: invoice.id,
            invoicedAt: new Date().toISOString(),
          },
          overrideAccess: true,
        }),
      ),
    )

    console.log(`[Invoice] Created invoice ${invoice.id} for ${jobIds.length} job(s)`)

    return {
      success: true,
      invoice,
      message: `Invoice created successfully with ${lineItems.length} line items`,
    }
  } catch (error: any) {
    console.error('[Invoice] Error generating invoice:', error)
    return {
      success: false,
      error: error.message,
    }
  }
}

/**
 * Calculate invoice totals (useful for previews)
 */
export function calculateInvoiceTotals(
  lineItems: InvoiceLineItem[],
  taxRate: number,
  taxExempt: boolean = false,
) {
  const subtotal = lineItems.reduce((sum, item) => sum + item.amount, 0)

  let taxAmount = 0
  if (!taxExempt && taxRate > 0) {
    const taxableAmount = lineItems
      .filter((item) => item.taxable)
      .reduce((sum, item) => sum + item.amount, 0)
    taxAmount = (taxableAmount * taxRate) / 100
  }

  const total = subtotal + taxAmount

  return {
    subtotal,
    taxAmount,
    total,
  }
}
