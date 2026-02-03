import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('pdf') as File

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    if (!file.name.toLowerCase().endsWith('.pdf')) {
      return NextResponse.json({ error: 'File must be a PDF' }, { status: 400 })
    }

    const arrayBuffer = await file.arrayBuffer()

    // Fix Array.prototype pollution that breaks PDF.js
    // @ts-ignore
    if (Array.prototype.random) {
      // @ts-ignore
      delete Array.prototype.random
    }

    // Use unpdf - designed for Next.js/serverless environments
    const { extractText } = await import('unpdf')
    
    // Extract text from PDF buffer
    const { text } = await extractText(arrayBuffer, { mergePages: true })

    if (!text || text.trim().length === 0) {
      return NextResponse.json(
        { error: 'No text could be extracted from PDF. This may be a scanned image or corrupted file.' },
        { status: 400 }
      )
    }

    console.log('Extracted text:', text.substring(0, 1000))
    
    const parsedData = parseInvoiceText(text)
    console.log('Parsed data:', parsedData)

    return NextResponse.json({
      success: true,
      data: parsedData,
      rawText: text.substring(0, 500),
    })
  } catch (error: any) {
    console.error('Error parsing PDF:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to parse PDF' },
      { status: 500 }
    )
  }
}

function parseInvoiceText(text: string): {
  invoiceNumber?: string
  invoiceDate?: string
  amount?: number
  description?: string
  vendorName?: string
} {
  const result: any = {}

  const invoiceNumberPatterns = [
    /Invoice\s+Number\s*:?\s*([A-Z0-9-]+)/i,
    /Invoice\s*#\s*:?\s*([A-Z0-9-]+)/i,
    /Bill\s+Number\s*:?\s*([A-Z0-9-]+)/i,
    /Bill\s*#\s*:?\s*([A-Z0-9-]+)/i,
    /INV-?(\d+)/i,
  ]

  for (const pattern of invoiceNumberPatterns) {
    const match = text.match(pattern)
    if (match) {
      result.invoiceNumber = match[1].trim()
      break
    }
  }

  const datePatterns = [
    /(?:Invoice\s+)?Date\s*:?\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i,
    /(?:Bill\s+)?Date\s*:?\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i,
    /((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},?\s+\d{4})/i,
    /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/,
  ]

  for (const pattern of datePatterns) {
    const match = text.match(pattern)
    if (match) {
      const dateStr = match[1].trim()
      // Convert to YYYY-MM-DD format
      try {
        const date = new Date(dateStr)
        if (!isNaN(date.getTime())) {
          result.invoiceDate = date.toISOString().split('T')[0]
        } else {
          result.invoiceDate = dateStr
        }
      } catch {
        result.invoiceDate = dateStr
      }
      break
    }
  }

  const amountPatterns = [
    /Total\s*(?:Amount|Due)?\s*:?\s*\$?\s*([\d,]+\.?\d{0,2})/i,
    /Amount\s*Due\s*:?\s*\$?\s*([\d,]+\.?\d{0,2})/i,
    /Balance\s*Due\s*:?\s*\$?\s*([\d,]+\.?\d{0,2})/i,
    /Grand\s*Total\s*:?\s*\$?\s*([\d,]+\.?\d{0,2})/i,
  ]

  for (const pattern of amountPatterns) {
    const match = text.match(pattern)
    if (match) {
      const amountStr = match[1].replace(/,/g, '')
      result.amount = parseFloat(amountStr)
      break
    }
  }

  // Extract vendor name - look for company name patterns
  const vendorPatterns = [
    /(?:From|Vendor)\s*:?\s*([^\n]{3,50})/i,
    /^([A-Z][A-Za-z\s&,.-]{2,40})(?=\s*\n)/m,
  ]
  
  for (const pattern of vendorPatterns) {
    const match = text.match(pattern)
    if (match) {
      result.vendorName = match[1].trim()
      break
    }
  }

  const descriptionMatch = text.match(/(?:Description|Services|Work\s+Performed)\s*:?\s*([^\n]{10,200})/i)
  if (descriptionMatch) {
    result.description = descriptionMatch[1].trim()
  } else {
    const lines = text.split('\n').filter(line => line.trim().length > 0)
    const middleLines = lines.slice(2, 5).join(' ')
    if (middleLines.length > 10) {
      result.description = middleLines.substring(0, 200)
    }
  }

  return result
}
