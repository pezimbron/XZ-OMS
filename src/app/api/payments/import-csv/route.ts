import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'

export async function POST(request: NextRequest) {
  try {
    const payload = await getPayload({ config })
    const formData = await request.formData()
    const file = formData.get('csv') as File
    const clientId = formData.get('clientId') as string
    const userId = formData.get('userId') as string

    if (!file) {
      return NextResponse.json({ error: 'No CSV file provided' }, { status: 400 })
    }

    if (!clientId) {
      return NextResponse.json({ error: 'clientId is required' }, { status: 400 })
    }

    const text = await file.text()
    const lines = text.split('\n').filter(line => line.trim())

    if (lines.length < 2) {
      return NextResponse.json({ error: 'CSV must have a header row and at least one data row' }, { status: 400 })
    }

    // Parse headers — case-insensitive, flexible column matching
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/"/g, ''))

    const amountIdx = headers.findIndex(h => h.includes('amount') || h.includes('total'))
    const dateIdx = headers.findIndex(h => h.includes('date'))
    const refIdx = headers.findIndex(h => h.includes('ref') || h.includes('check') || h.includes('number'))
    const notesIdx = headers.findIndex(h => h.includes('note') || h.includes('memo') || h.includes('desc'))

    if (amountIdx < 0) {
      return NextResponse.json({ error: 'CSV must have an amount or total column' }, { status: 400 })
    }
    if (dateIdx < 0) {
      return NextResponse.json({ error: 'CSV must have a date column' }, { status: 400 })
    }

    const created: { id: any; amount: number; referenceNumber: string }[] = []
    const errors: string[] = []

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''))

      try {
        const rawAmount = values[amountIdx]?.replace(/[^0-9.-]/g, '') || '0'
        const amount = parseFloat(rawAmount)
        if (isNaN(amount) || amount <= 0) {
          errors.push(`Row ${i + 1}: invalid amount "${values[amountIdx]}"`)
          continue
        }

        const dateStr = values[dateIdx]
        const parsedDate = new Date(dateStr)
        if (isNaN(parsedDate.getTime())) {
          errors.push(`Row ${i + 1}: invalid date "${dateStr}"`)
          continue
        }

        const payment = await payload.create({
          collection: 'payments',
          data: {
            client: parseInt(clientId),
            amount,
            paymentDate: parsedDate.toISOString(),
            referenceNumber: refIdx >= 0 ? (values[refIdx] || '') : '',
            notes: notesIdx >= 0 ? (values[notesIdx] || '') : '',
            source: 'csv-import',
            status: 'unmatched',
            importedBy: userId ? parseInt(userId) : undefined,
          },
          overrideAccess: true,
        }) as any

        created.push({ id: payment.id, amount, referenceNumber: payment.referenceNumber || '' })
      } catch (err: any) {
        errors.push(`Row ${i + 1}: ${err.message}`)
      }
    }

    return NextResponse.json({
      success: true,
      created: created.length,
      errors,
      payments: created,
    })
  } catch (error: any) {
    console.error('[Payments] CSV import error:', error)
    return NextResponse.json(
      { error: 'Failed to import CSV', details: error.message },
      { status: 500 }
    )
  }
}
