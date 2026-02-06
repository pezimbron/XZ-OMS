import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'

interface MatterportRow {
  recordNumber: string
  jobId: string // Matterport's job ID
  apInvoiceNumber: string // AP Invoice Number (alternative ID)
  captureAddress: string
  floorUnit: string
  ctRate: number
  ctTravelPayout: number
  ctOffHoursPayout: number
  projectName: string
  mpClient: string
  jobScheduledDateTime: string
}

interface MatchedJob {
  matterportRow: MatterportRow
  omsJob: {
    id: string
    jobId: string
    captureAddress: string
    modelName: string
    status: string
  } | null
  matchConfidence: 'high' | 'medium' | 'low' | 'none'
  matchReason: string
}

function parseCSV(csvText: string): MatterportRow[] {
  // Parse CSV handling multi-line fields properly
  const records = parseCSVWithMultiline(csvText)
  if (records.length < 2) return []

  // First row is header
  const header = records[0].map(h => h.trim().replace(/^\uFEFF/, '')) // Remove BOM if present

  const getIndex = (name: string) => header.findIndex(h =>
    h.toLowerCase().includes(name.toLowerCase())
  )

  const recordNumberIdx = getIndex('Record Number')
  const jobIdIdx = getIndex('Job ID')
  const addressIdx = getIndex('Capture Address')
  const floorUnitIdx = getIndex('Floor/Unit')
  const ctRateIdx = getIndex('CT Rate')
  const ctTravelIdx = getIndex('CT Travel')
  const ctOffHoursIdx = getIndex('CT Off Hours')
  const projectNameIdx = getIndex('Project Name')
  const mpClientIdx = getIndex('MP Client')
  const scheduledIdx = getIndex('Job Scheduled')
  const apInvoiceIdx = getIndex('AP Invoice')

  const rows: MatterportRow[] = []

  for (let i = 1; i < records.length; i++) {
    const values = records[i]
    if (!values || values.length === 0) continue

    const ctRate = parseFloat(values[ctRateIdx]?.replace(/[$,]/g, '') || '0')

    // Skip rows without a job ID or with $0 CT Rate
    const jobIdValue = values[jobIdIdx] || ''
    if (!jobIdValue || jobIdValue === 'Job ID') continue
    if (ctRate <= 0) continue

    rows.push({
      recordNumber: values[recordNumberIdx] || '',
      jobId: values[jobIdIdx] || '',
      apInvoiceNumber: values[apInvoiceIdx] || '',
      captureAddress: values[addressIdx] || '',
      floorUnit: values[floorUnitIdx] || '',
      ctRate,
      ctTravelPayout: parseFloat(values[ctTravelIdx]?.replace(/[$,]/g, '') || '0'),
      ctOffHoursPayout: parseFloat(values[ctOffHoursIdx]?.replace(/[$,]/g, '') || '0'),
      projectName: values[projectNameIdx] || '',
      mpClient: values[mpClientIdx] || '',
      jobScheduledDateTime: values[scheduledIdx] || '',
    })
  }

  return rows
}

function parseCSVWithMultiline(csvText: string): string[][] {
  const records: string[][] = []
  let currentRecord: string[] = []
  let currentField = ''
  let inQuotes = false

  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i]
    const nextChar = csvText[i + 1]

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote
        currentField += '"'
        i++
      } else {
        // Toggle quote mode
        inQuotes = !inQuotes
      }
    } else if (char === ',' && !inQuotes) {
      // End of field
      currentRecord.push(currentField.trim())
      currentField = ''
    } else if ((char === '\n' || (char === '\r' && nextChar === '\n')) && !inQuotes) {
      // End of record
      if (char === '\r') i++ // Skip the \n in \r\n
      currentRecord.push(currentField.trim())
      if (currentRecord.some(f => f !== '')) {
        records.push(currentRecord)
      }
      currentRecord = []
      currentField = ''
    } else if (char === '\r' && !inQuotes) {
      // End of record (just \r)
      currentRecord.push(currentField.trim())
      if (currentRecord.some(f => f !== '')) {
        records.push(currentRecord)
      }
      currentRecord = []
      currentField = ''
    } else {
      currentField += char
    }
  }

  // Don't forget the last field/record
  if (currentField || currentRecord.length > 0) {
    currentRecord.push(currentField.trim())
    if (currentRecord.some(f => f !== '')) {
      records.push(currentRecord)
    }
  }

  return records
}

function normalizeAddress(address: string): string {
  return address
    .toLowerCase()
    .replace(/[,.\-#]/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\b(street|st|avenue|ave|road|rd|drive|dr|lane|ln|court|ct|boulevard|blvd|way|circle|cir|place|pl)\b/gi, '')
    .replace(/\b(texas|tx|usa)\b/gi, '')
    .replace(/\b(county)\b/gi, '')
    .trim()
}

function normalizeJobId(id: string): string {
  // Normalize job IDs for comparison - remove common prefixes and lowercase
  return id
    .toLowerCase()
    .replace(/^(jobid|ap-|ap)/i, '')
    .trim()
}

function jobIdMatch(omsJobId: string, matterportJobId: string, apInvoiceNumber: string): { match: boolean; confidence: 'high' | 'medium' | 'low' } {
  if (!omsJobId) return { match: false, confidence: 'low' }

  const normalizedOms = normalizeJobId(omsJobId)
  const normalizedMpJobId = normalizeJobId(matterportJobId)
  const normalizedApInvoice = normalizeJobId(apInvoiceNumber)

  // Exact match with Matterport Job ID
  if (normalizedOms === normalizedMpJobId) {
    return { match: true, confidence: 'high' }
  }

  // Exact match with AP Invoice Number
  if (normalizedOms === normalizedApInvoice) {
    return { match: true, confidence: 'high' }
  }

  // Check if OMS jobId contains the Matterport ID or vice versa
  if (normalizedOms.includes(normalizedMpJobId) || normalizedMpJobId.includes(normalizedOms)) {
    return { match: true, confidence: 'medium' }
  }

  // Check AP Invoice Number partial match
  if (normalizedOms.includes(normalizedApInvoice) || normalizedApInvoice.includes(normalizedOms)) {
    return { match: true, confidence: 'medium' }
  }

  return { match: false, confidence: 'low' }
}

function addressMatch(addr1: string, addr2: string): { match: boolean; confidence: 'high' | 'medium' | 'low' } {
  const norm1 = normalizeAddress(addr1)
  const norm2 = normalizeAddress(addr2)

  // Exact match after normalization
  if (norm1 === norm2) {
    return { match: true, confidence: 'high' }
  }

  // Extract street number and name
  const getStreetParts = (addr: string) => {
    const parts = addr.split(' ').filter(Boolean)
    const number = parts[0]?.replace(/\D/g, '')
    const street = parts.slice(1, 3).join(' ')
    return { number, street }
  }

  const parts1 = getStreetParts(norm1)
  const parts2 = getStreetParts(norm2)

  // Street number and partial street name match
  if (parts1.number && parts1.number === parts2.number) {
    if (norm1.includes(parts2.street) || norm2.includes(parts1.street)) {
      return { match: true, confidence: 'medium' }
    }
  }

  // Check if one contains the other's street number and name
  if (parts1.number && norm2.includes(parts1.number) && norm2.includes(parts1.street.split(' ')[0])) {
    return { match: true, confidence: 'low' }
  }

  return { match: false, confidence: 'low' }
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File
    const action = formData.get('action') as string

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const csvText = await file.text()
    const matterportRows = parseCSV(csvText)

    if (matterportRows.length === 0) {
      return NextResponse.json({ error: 'No valid rows found in CSV' }, { status: 400 })
    }

    const payload = await getPayload({ config })

    // Fetch all jobs to match against
    const jobsResult = await payload.find({
      collection: 'jobs',
      limit: 2000,
      depth: 0,
    })

    const jobs = jobsResult.docs

    // Match Matterport rows to OMS jobs
    const matches: MatchedJob[] = matterportRows.map(row => {
      let bestMatch: MatchedJob['omsJob'] = null
      let bestConfidence: 'high' | 'medium' | 'low' | 'none' = 'none'
      let matchReason = 'No match found'

      for (const job of jobs) {
        const confidenceOrder = { high: 3, medium: 2, low: 1, none: 0 }

        // First try matching by Job ID or AP Invoice Number
        if (job.jobId) {
          const jobIdResult = jobIdMatch(
            job.jobId as string,
            row.jobId,
            row.apInvoiceNumber
          )

          if (jobIdResult.match && confidenceOrder[jobIdResult.confidence] > confidenceOrder[bestConfidence]) {
            bestMatch = {
              id: String(job.id),
              jobId: job.jobId as string || '',
              captureAddress: job.captureAddress as string || '',
              modelName: job.modelName as string || '',
              status: job.status as string || '',
            }
            bestConfidence = jobIdResult.confidence
            matchReason = `Job ID match (${jobIdResult.confidence} confidence)`
            // If high confidence job ID match, stop looking
            if (jobIdResult.confidence === 'high') continue
          }
        }

        // Fall back to address matching if no job ID match yet
        if (job.captureAddress && bestConfidence !== 'high') {
          const { match, confidence } = addressMatch(row.captureAddress, job.captureAddress as string)

          if (match && confidenceOrder[confidence] > confidenceOrder[bestConfidence]) {
            bestMatch = {
              id: String(job.id),
              jobId: job.jobId as string || '',
              captureAddress: job.captureAddress as string,
              modelName: job.modelName as string || '',
              status: job.status as string || '',
            }
            bestConfidence = confidence
            matchReason = `Address match (${confidence} confidence)`
          }
        }
      }

      return {
        matterportRow: row,
        omsJob: bestMatch,
        matchConfidence: bestConfidence,
        matchReason,
      }
    })

    // If action is 'preview', just return the matches
    if (action === 'preview') {
      return NextResponse.json({
        success: true,
        totalRows: matterportRows.length,
        matches,
        summary: {
          high: matches.filter(m => m.matchConfidence === 'high').length,
          medium: matches.filter(m => m.matchConfidence === 'medium').length,
          low: matches.filter(m => m.matchConfidence === 'low').length,
          none: matches.filter(m => m.matchConfidence === 'none').length,
        }
      })
    }

    // If action is 'apply', update the matched jobs
    if (action === 'apply') {
      const selectedMatches = JSON.parse(formData.get('selectedMatches') as string || '[]') as string[]

      const updates: Array<{ jobId: string; success: boolean; error?: string }> = []

      for (const match of matches) {
        if (!match.omsJob) continue
        if (selectedMatches.length > 0 && !selectedMatches.includes(match.omsJob.id)) continue

        try {
          // Get current job to update line items
          const currentJob = await payload.findByID({
            collection: 'jobs',
            id: match.omsJob.id,
            depth: 0,
          })

          // Update line items with amount if they exist
          let lineItems = (currentJob.lineItems as any[]) || []
          if (lineItems.length > 0) {
            // Set the amount on the first line item (or all if you prefer)
            lineItems = lineItems.map((item, index) => ({
              ...item,
              amount: index === 0 ? match.matterportRow.ctRate : item.amount,
            }))
          }

          // Build update data
          const updateData: any = {
            lineItems,
            travelPayout: match.matterportRow.ctTravelPayout || undefined,
            offHoursPayout: match.matterportRow.ctOffHoursPayout || undefined,
          }

          // Save AP Invoice Number if available
          if (match.matterportRow.apInvoiceNumber) {
            updateData.apInvoiceNumber = match.matterportRow.apInvoiceNumber
          }

          await payload.update({
            collection: 'jobs',
            id: match.omsJob.id,
            data: updateData,
          })

          updates.push({ jobId: match.omsJob.id, success: true })
        } catch (err: any) {
          updates.push({ jobId: match.omsJob.id, success: false, error: err.message })
        }
      }

      return NextResponse.json({
        success: true,
        updated: updates.filter(u => u.success).length,
        failed: updates.filter(u => !u.success).length,
        details: updates,
      })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })

  } catch (error: any) {
    console.error('Matterport import error:', error)
    return NextResponse.json({ error: error.message || 'Import failed' }, { status: 500 })
  }
}
