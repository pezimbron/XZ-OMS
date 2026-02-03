import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('csv') as File

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const text = await file.text()
    const lines = text.split('\n').filter(line => line.trim())

    if (lines.length < 2) {
      return NextResponse.json({ error: 'CSV file is empty or invalid' }, { status: 400 })
    }

    // Simple CSV parsing - assumes format: Invoice Number, Date, Amount, Description
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase())
    const data = lines[1].split(',').map(d => d.trim())

    const invoiceNumberIndex = headers.findIndex(h => h.includes('invoice') || h.includes('number'))
    const dateIndex = headers.findIndex(h => h.includes('date'))
    const amountIndex = headers.findIndex(h => h.includes('amount') || h.includes('total'))
    const descriptionIndex = headers.findIndex(h => h.includes('description') || h.includes('desc'))

    const parsedData = {
      invoiceNumber: invoiceNumberIndex >= 0 ? data[invoiceNumberIndex] : '',
      invoiceDate: dateIndex >= 0 ? data[dateIndex] : '',
      amount: amountIndex >= 0 ? parseFloat(data[amountIndex].replace(/[^0-9.-]/g, '')) : 0,
      description: descriptionIndex >= 0 ? data[descriptionIndex] : '',
    }

    return NextResponse.json({
      success: true,
      data: parsedData,
    })

  } catch (error: any) {
    console.error('CSV parsing error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to parse CSV' },
      { status: 500 }
    )
  }
}
