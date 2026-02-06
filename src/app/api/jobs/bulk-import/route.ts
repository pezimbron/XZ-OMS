import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'

interface ImportRow {
  client: string
  jobType: string
  jobId: string
  invoiceNumber: string
  modelName: string
  address: string
  state: string
  city: string
  sqFt: string
  comments: string
  targetDate: string
  status: string
  tech: string
  tour: string
  photos: string
  extras: string
  total: string
  commission: string
  commissionPaid: string
  gasForTech: string
  invoiced: string
  asBuiltCost: string
}

interface MatchResult {
  row: ImportRow
  matchedJob: {
    id: string
    modelName: string
    captureAddress: string
    clientName: string
    jobId: string
    hasProducts: boolean
  } | null
  matchReason: string
  updates: Record<string, any>
  productToAdd: { id: number; name: string } | null
}

// Job type to product name mapping (must match exact product names in database)
const JOB_TYPE_TO_PRODUCT: Record<string, string[]> = {
  'MP': ['Matterport 3D Interior Scan'],
  'Z1': ['Z1 Survey'],
  'GSV': ['GSV'],
  'Drone': ['Aerial Imagery'],
  'MP/As-built': ['Matterport 3D Interior Scan', 'As-built'],
  'MP/Drone': ['Matterport 3D Interior Scan', 'Aerial Imagery'],
  'MP/360': ['Matterport 3D Interior Scan', '360 Photos'],
}

function parseCSV(csvText: string): ImportRow[] {
  const lines = csvText.split('\n')
  if (lines.length < 2) return []

  // Detect delimiter (tab or comma)
  const delimiter = lines[0].includes('\t') ? '\t' : ','

  // Parse header
  const header = lines[0].split(delimiter).map(h => h.trim().toLowerCase())

  const getIndex = (name: string) => header.findIndex(h => h.includes(name.toLowerCase()))

  const clientIdx = getIndex('client')
  const jobTypeIdx = getIndex('job type')
  const jobIdIdx = getIndex('job id')
  const invoiceIdx = getIndex('invoice')
  const modelIdx = getIndex('model name')
  const addressIdx = getIndex('address')
  const stateIdx = getIndex('state')
  const cityIdx = getIndex('city')
  const sqFtIdx = getIndex('sq ft')
  const commentsIdx = getIndex('comment')
  const targetDateIdx = getIndex('target date')
  const statusIdx = getIndex('status')
  const techIdx = getIndex('tech')
  const tourIdx = getIndex('tour')
  const photosIdx = getIndex('photo')
  const extrasIdx = getIndex('extra')
  const totalIdx = getIndex('total')
  const commissionIdx = header.findIndex(h => h === 'commission')
  const commissionPaidIdx = getIndex('comission paid') !== -1 ? getIndex('comission paid') : getIndex('commission paid')
  const gasIdx = getIndex('gas')
  const invoicedIdx = getIndex('invoiced')
  const asBuiltIdx = getIndex('as-built') !== -1 ? getIndex('as-built') : getIndex('as- built')

  const rows: ImportRow[] = []

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(delimiter).map(v => v.trim())
    if (values.length < 5 || !values[0]) continue

    rows.push({
      client: values[clientIdx] || '',
      jobType: values[jobTypeIdx] || '',
      jobId: values[jobIdIdx] || '',
      invoiceNumber: values[invoiceIdx] || '',
      modelName: values[modelIdx] || '',
      address: values[addressIdx] || '',
      state: values[stateIdx] || '',
      city: values[cityIdx] || '',
      sqFt: values[sqFtIdx] || '',
      comments: values[commentsIdx] || '',
      targetDate: values[targetDateIdx] || '',
      status: values[statusIdx] || '',
      tech: values[techIdx] || '',
      tour: values[tourIdx]?.replace(/[$,]/g, '') || '',
      photos: values[photosIdx]?.replace(/[$,]/g, '') || '',
      extras: values[extrasIdx]?.replace(/[$,]/g, '') || '',
      total: values[totalIdx]?.replace(/[$,]/g, '') || '',
      commission: values[commissionIdx]?.replace(/[$,]/g, '') || '',
      commissionPaid: values[commissionPaidIdx] || '',
      gasForTech: values[gasIdx]?.replace(/[$,]/g, '') || '',
      invoiced: values[invoicedIdx] || '',
      asBuiltCost: values[asBuiltIdx]?.replace(/[$,]/g, '') || '',
    })
  }

  return rows
}

function normalizeAddress(address: string): string {
  return address
    .toLowerCase()
    .replace(/[,.#\-]/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\b(street|st|avenue|ave|road|rd|drive|dr|lane|ln|court|ct|boulevard|blvd|way|circle|cir|place|pl)\b/gi, '')
    .trim()
}

function normalizeJobId(id: string): string {
  return id
    .toLowerCase()
    .replace(/^(jobid|job id:|job id|ap-|ap)/gi, '')
    .replace(/[:\s]/g, '')
    .trim()
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File
    const action = formData.get('action') as string // 'preview' or 'apply'

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const csvText = await file.text()
    const rows = parseCSV(csvText)

    if (rows.length === 0) {
      return NextResponse.json({ error: 'No valid rows found' }, { status: 400 })
    }

    const payload = await getPayload({ config })

    // Fetch all jobs
    const jobsResult = await payload.find({
      collection: 'jobs',
      limit: 2000,
      depth: 1,
      overrideAccess: true,
    })
    const jobs = jobsResult.docs

    // Fetch all products
    const productsResult = await payload.find({
      collection: 'products',
      limit: 100,
      overrideAccess: true,
    })
    const products = productsResult.docs

    // Build product name lookup (case insensitive)
    const productNameToObj: Record<string, { id: number; name: string }> = {}
    for (const product of products) {
      const name = (product.name as string)?.toLowerCase() || ''
      productNameToObj[name] = { id: Number(product.id), name: product.name as string }
    }

    const matches: MatchResult[] = []

    for (const row of rows) {
      let matchedJob: MatchResult['matchedJob'] = null
      let matchReason = 'No match found'

      // Try to match by Job ID first
      if (row.jobId) {
        const normalizedRowJobId = normalizeJobId(row.jobId)
        const jobByJobId = jobs.find(j => {
          const jid = normalizeJobId(j.jobId as string || '')
          return jid && normalizedRowJobId && (jid === normalizedRowJobId || jid.includes(normalizedRowJobId) || normalizedRowJobId.includes(jid))
        })

        if (jobByJobId) {
          const clientObj = jobByJobId.client as any
          const lineItems = (jobByJobId.lineItems as any[]) || []
          matchedJob = {
            id: String(jobByJobId.id),
            modelName: jobByJobId.modelName as string || '',
            captureAddress: jobByJobId.captureAddress as string || '',
            clientName: clientObj?.companyName || '',
            jobId: jobByJobId.jobId as string || '',
            hasProducts: lineItems.some(item => item.product),
          }
          matchReason = `Matched by Job ID: ${row.jobId}`
        }
      }

      // If no match by Job ID, try client + address
      if (!matchedJob) {
        const rowClientName = row.client.toLowerCase()
        const rowAddress = normalizeAddress(row.address)

        for (const job of jobs) {
          const clientObj = job.client as any
          const jobClientName = (clientObj?.companyName || '').toLowerCase()
          const jobAddress = normalizeAddress(job.captureAddress as string || '')

          // Check if client names match (partial match)
          const clientMatch = jobClientName.includes(rowClientName) || rowClientName.includes(jobClientName)

          if (clientMatch && rowAddress && jobAddress) {
            // Extract street number for comparison
            const rowStreetNum = rowAddress.match(/^\d+/)?.[0]
            const jobStreetNum = jobAddress.match(/^\d+/)?.[0]

            // Check if street numbers match and some part of address matches
            if (rowStreetNum && jobStreetNum && rowStreetNum === jobStreetNum) {
              const lineItems = (job.lineItems as any[]) || []
              matchedJob = {
                id: String(job.id),
                modelName: job.modelName as string || '',
                captureAddress: job.captureAddress as string || '',
                clientName: jobClientName,
                jobId: job.jobId as string || '',
                hasProducts: lineItems.some(item => item.product),
              }
              matchReason = `Matched by Client + Address (${rowStreetNum})`
              break
            }
          }
        }
      }

      // Determine what to update
      const updates: Record<string, any> = {}

      // Update Job ID if row has one and job doesn't
      if (row.jobId && matchedJob && !matchedJob.jobId) {
        updates.jobId = row.jobId
      }

      // Fields to update
      if (row.total) {
        updates.totalPrice = parseFloat(row.total) || undefined
      }
      if (row.commission) {
        updates.techCommission = parseFloat(row.commission) || undefined
      }
      if (row.commissionPaid) {
        // Parse date like "01/23/2026"
        const dateParts = row.commissionPaid.match(/(\d{2})\/(\d{2})\/(\d{4})/)
        if (dateParts) {
          updates.commissionPaidDate = `${dateParts[3]}-${dateParts[1]}-${dateParts[2]}`
        }
      }
      if (row.gasForTech) {
        updates.travelPayout = parseFloat(row.gasForTech) || undefined
      }
      if (row.invoiceNumber) {
        // Store invoice number reference (you may need to adjust field name)
        updates.externalInvoiceNumber = row.invoiceNumber
      }

      // Determine product to add based on job type
      let productToAdd: { id: number; name: string } | null = null
      if (row.jobType && matchedJob && !matchedJob.hasProducts) {
        const productNames = JOB_TYPE_TO_PRODUCT[row.jobType]
        if (productNames && productNames.length > 0) {
          // Find the product
          for (const pName of productNames) {
            const pNameLower = pName.toLowerCase()
            // Exact match
            if (productNameToObj[pNameLower]) {
              productToAdd = productNameToObj[pNameLower]
              break
            }
            // Partial match
            for (const [key, value] of Object.entries(productNameToObj)) {
              if (key.includes(pNameLower) || pNameLower.includes(key)) {
                productToAdd = value
                break
              }
            }
            if (productToAdd) break
          }
        }
      }

      matches.push({
        row,
        matchedJob,
        matchReason,
        updates,
        productToAdd,
      })
    }

    // If preview, return matches
    if (action === 'preview') {
      const summary = {
        totalRows: rows.length,
        matched: matches.filter(m => m.matchedJob).length,
        unmatched: matches.filter(m => !m.matchedJob).length,
        withUpdates: matches.filter(m => m.matchedJob && Object.keys(m.updates).length > 0).length,
        withProductToAdd: matches.filter(m => m.productToAdd && !m.matchedJob?.hasProducts).length,
      }

      return NextResponse.json({
        success: true,
        summary,
        matches: matches.map(m => ({
          ...m,
          row: {
            client: m.row.client,
            jobType: m.row.jobType,
            jobId: m.row.jobId,
            invoiceNumber: m.row.invoiceNumber,
            modelName: m.row.modelName,
            address: m.row.address,
            total: m.row.total,
            commission: m.row.commission,
            gasForTech: m.row.gasForTech,
          }
        })),
        availableProducts: products.map(p => ({ id: p.id, name: p.name })),
        jobTypeMapping: JOB_TYPE_TO_PRODUCT,
      })
    }

    // If apply, update the matched jobs
    if (action === 'apply') {
      const results: Array<{ rowIndex: number; modelName: string; success: boolean; error?: string }> = []

      for (let i = 0; i < matches.length; i++) {
        const match = matches[i]
        if (!match.matchedJob) {
          results.push({ rowIndex: i, modelName: match.row.modelName, success: false, error: 'No match found' })
          continue
        }

        if (Object.keys(match.updates).length === 0 && !match.productToAdd) {
          results.push({ rowIndex: i, modelName: match.row.modelName, success: true, error: 'Nothing to update' })
          continue
        }

        try {
          const updateData: any = { ...match.updates }

          // Add product if needed
          if (match.productToAdd && !match.matchedJob.hasProducts) {
            const amount = parseFloat(match.row.total) || 0
            updateData.lineItems = [
              {
                product: match.productToAdd.id,
                quantity: 1,
                amount: amount > 0 ? amount : undefined,
              }
            ]
          }

          await payload.update({
            collection: 'jobs',
            id: match.matchedJob.id,
            data: updateData,
            overrideAccess: true,
          })

          results.push({ rowIndex: i, modelName: match.row.modelName, success: true })
        } catch (err: any) {
          results.push({ rowIndex: i, modelName: match.row.modelName, success: false, error: err.message })
        }
      }

      return NextResponse.json({
        success: true,
        applied: results.filter(r => r.success && !r.error).length,
        skippedNoMatch: results.filter(r => r.error === 'No match found').length,
        skippedNoChanges: results.filter(r => r.error === 'Nothing to update').length,
        failed: results.filter(r => !r.success && r.error !== 'No match found').length,
        results,
      })
    }

    return NextResponse.json({ error: 'Invalid action. Use action=preview or action=apply' }, { status: 400 })

  } catch (error: any) {
    console.error('Bulk import error:', error)
    return NextResponse.json({ error: error.message || 'Import failed' }, { status: 500 })
  }
}

// GET to show available products and job type mapping
export async function GET() {
  try {
    const payload = await getPayload({ config })

    const productsResult = await payload.find({
      collection: 'products',
      limit: 100,
      overrideAccess: true,
    })

    return NextResponse.json({
      success: true,
      products: productsResult.docs.map(p => ({ id: p.id, name: p.name })),
      jobTypeMapping: JOB_TYPE_TO_PRODUCT,
      usage: {
        preview: 'POST with FormData: file (CSV/TSV), action=preview',
        apply: 'POST with FormData: file (CSV/TSV), action=apply',
      }
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
