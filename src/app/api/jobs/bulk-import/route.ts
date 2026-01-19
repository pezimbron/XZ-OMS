import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'

interface ImportResult {
  success: number
  failed: number
  errors: Array<{ row: number; error: string }>
}

function parseCSV(csvText: string): string[][] {
  const lines = csvText.trim().split('\n')
  return lines.map(line => {
    const values: string[] = []
    let current = ''
    let inQuotes = false

    for (let i = 0; i < line.length; i++) {
      const char = line[i]
      
      if (char === '"') {
        inQuotes = !inQuotes
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim())
        current = ''
      } else {
        current += char
      }
    }
    values.push(current.trim())
    return values
  })
}

async function importJobFromRow(
  payload: any,
  headers: string[],
  row: string[],
  rowIndex: number
): Promise<{ success: boolean; error?: string }> {
  try {
    const jobData: any = {}

    // Map CSV columns to job fields
    for (let i = 0; i < headers.length; i++) {
      const header = headers[i].toLowerCase().trim()
      const value = row[i]?.trim()

      if (!value) continue

      switch (header) {
        case 'client name':
          // Find client by name
          const clients = await payload.find({
            collection: 'clients',
            where: { name: { equals: value } },
            limit: 1,
          })
          if (clients.docs.length > 0) {
            jobData.client = clients.docs[0].id
          } else {
            return { success: false, error: `Client "${value}" not found` }
          }
          break

        case 'job id':
          jobData.jobId = value
          break

        case 'model name':
          jobData.modelName = value
          break

        case 'capture address':
          jobData.captureAddress = value
          break

        case 'city':
          jobData.city = value
          break

        case 'state':
          jobData.state = value
          break

        case 'zip code':
          jobData.zipCode = value
          break

        case 'target date':
          jobData.targetDate = new Date(value).toISOString()
          break

        case 'status':
          jobData.status = value
          break

        case 'region':
          jobData.region = value
          break

        case 'capture type':
          jobData.captureType = value
          break

        case 'tech instructions':
          jobData.techInstructions = value
          break

        case 'product 1':
        case 'product 2':
        case 'product 3':
        case 'product 4':
        case 'product 5':
          const productNum = header.split(' ')[1]
          const qtyHeader = `product ${productNum} qty`
          const qtyIndex = headers.findIndex(h => h.toLowerCase().trim() === qtyHeader)
          const qty = qtyIndex >= 0 ? parseInt(row[qtyIndex]) : 1

          // Find product by name
          const products = await payload.find({
            collection: 'products',
            where: { name: { equals: value } },
            limit: 1,
          })

          if (products.docs.length > 0) {
            if (!jobData.lineItems) jobData.lineItems = []
            jobData.lineItems.push({
              product: products.docs[0].id,
              quantity: qty || 1,
            })
          }
          break
      }
    }

    // Validate required fields
    if (!jobData.client) {
      return { success: false, error: 'Client is required' }
    }

    // Create the job
    await payload.create({
      collection: 'jobs',
      data: jobData,
    })

    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function POST(request: NextRequest) {
  try {
    const payload = await getPayload({ config })
    const contentType = request.headers.get('content-type')

    let csvText = ''

    if (contentType?.includes('multipart/form-data')) {
      // Handle file upload
      const formData = await request.formData()
      const file = formData.get('file') as File

      if (!file) {
        return NextResponse.json({ error: 'No file provided' }, { status: 400 })
      }

      csvText = await file.text()
    } else {
      // Handle pasted CSV data
      const body = await request.json()
      csvText = body.csvData

      if (!csvText) {
        return NextResponse.json({ error: 'No CSV data provided' }, { status: 400 })
      }
    }

    // Parse CSV
    const rows = parseCSV(csvText)
    if (rows.length < 2) {
      return NextResponse.json({ error: 'CSV must have at least a header row and one data row' }, { status: 400 })
    }

    const headers = rows[0]
    const dataRows = rows.slice(1)

    const result: ImportResult = {
      success: 0,
      failed: 0,
      errors: [],
    }

    // Import each row
    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i]
      const rowNumber = i + 2 // +2 because of header row and 0-indexing

      const importResult = await importJobFromRow(payload, headers, row, rowNumber)

      if (importResult.success) {
        result.success++
      } else {
        result.failed++
        result.errors.push({
          row: rowNumber,
          error: importResult.error || 'Unknown error',
        })
      }
    }

    return NextResponse.json(result)
  } catch (error: any) {
    console.error('Bulk import error:', error)
    return NextResponse.json({ 
      error: 'Import failed', 
      details: error.message 
    }, { status: 500 })
  }
}
