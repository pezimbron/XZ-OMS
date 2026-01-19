import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'

interface ImportResult {
  success: number
  failed: number
  errors: Array<{ row: number; error: string }>
}

// Simple AI-like parser for job creation from natural language
function parseJobsFromPrompt(prompt: string): any[] {
  const jobs: any[] = []
  const lines = prompt.split('\n').filter(line => line.trim())

  // Extract common patterns
  const clientMatch = prompt.match(/for\s+([A-Za-z0-9\s&]+?)(?:\s+at|\s+in|\s+,|$)/i)
  const clientName = clientMatch ? clientMatch[1].trim() : null

  // Look for addresses
  const addressPattern = /(?:at\s+)?(\d+\s+[A-Za-z0-9\s,]+?)(?:\s+in\s+|\s*,\s*[A-Z]{2}|\s+scheduled)/gi
  const addresses = [...prompt.matchAll(addressPattern)].map(m => m[1].trim())

  // Look for dates
  const datePattern = /(?:scheduled\s+for\s+|on\s+)([A-Za-z]+\s+\d{1,2}(?:st|nd|rd|th)?(?:\s+at\s+\d{1,2}(?::\d{2})?\s*(?:am|pm)?)?|next\s+\w+|tomorrow|\d{1,2}\/\d{1,2}\/\d{2,4})/gi
  const dates = [...prompt.matchAll(datePattern)].map(m => m[1].trim())

  // Look for job types
  const scanPattern = /(\d+)\s+(?:matterport\s+)?scans?/i
  const floorPlanPattern = /(\d+)\s+floor\s+plans?/i
  
  const scanMatch = prompt.match(scanPattern)
  const floorPlanMatch = prompt.match(floorPlanPattern)

  const scanCount = scanMatch ? parseInt(scanMatch[1]) : 0
  const floorPlanCount = floorPlanMatch ? parseInt(floorPlanMatch[1]) : 0

  // Look for cities
  const cityPattern = /in\s+([A-Za-z\s]+?)(?:\s*,|\s+scheduled|\s+next|\s+on|$)/i
  const cityMatch = prompt.match(cityPattern)
  const city = cityMatch ? cityMatch[1].trim() : 'Austin'

  // Look for regions
  const region = city.toLowerCase().includes('austin') ? 'austin' : 
                 city.toLowerCase().includes('san antonio') ? 'san-antonio' : 'other'

  // Generate jobs based on extracted information
  let jobIndex = 0

  // Create scan jobs
  for (let i = 0; i < scanCount; i++) {
    jobs.push({
      clientName,
      modelName: 'Matterport Scan',
      captureAddress: addresses[jobIndex] || `Address ${jobIndex + 1}`,
      city,
      state: 'TX',
      region,
      captureType: 'matterport',
      targetDate: dates[0] || null,
      status: 'scheduled',
      products: [{ name: 'Matterport Scan', quantity: 1 }],
    })
    jobIndex++
  }

  // Create floor plan jobs
  for (let i = 0; i < floorPlanCount; i++) {
    jobs.push({
      clientName,
      modelName: 'Floor Plan',
      captureAddress: addresses[jobIndex] || `Address ${jobIndex + 1}`,
      city,
      state: 'TX',
      region,
      captureType: 'other',
      targetDate: dates[0] || null,
      status: 'scheduled',
      products: [{ name: 'Floor Plan', quantity: 1 }],
    })
    jobIndex++
  }

  // If no specific counts found, create one job per address
  if (jobs.length === 0 && addresses.length > 0) {
    addresses.forEach((address, i) => {
      jobs.push({
        clientName,
        modelName: 'Property Scan',
        captureAddress: address,
        city,
        state: 'TX',
        region,
        captureType: 'matterport',
        targetDate: dates[i] || dates[0] || null,
        status: 'scheduled',
        products: [{ name: 'Matterport Scan', quantity: 1 }],
      })
    })
  }

  return jobs
}

function parseDate(dateStr: string): Date | null {
  try {
    // Handle "next Monday", "next Tuesday", etc.
    if (dateStr.toLowerCase().startsWith('next ')) {
      const dayName = dateStr.split(' ')[1]
      const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
      const targetDay = days.findIndex(d => d.startsWith(dayName.toLowerCase()))
      
      if (targetDay >= 0) {
        const today = new Date()
        const currentDay = today.getDay()
        const daysUntilTarget = (targetDay + 7 - currentDay) % 7 || 7
        const targetDate = new Date(today)
        targetDate.setDate(today.getDate() + daysUntilTarget)
        
        // Check for time in the string
        const timeMatch = dateStr.match(/at\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i)
        if (timeMatch) {
          let hours = parseInt(timeMatch[1])
          const minutes = timeMatch[2] ? parseInt(timeMatch[2]) : 0
          const period = timeMatch[3]?.toLowerCase()
          
          if (period === 'pm' && hours < 12) hours += 12
          if (period === 'am' && hours === 12) hours = 0
          
          targetDate.setHours(hours, minutes, 0, 0)
        } else {
          targetDate.setHours(10, 0, 0, 0) // Default to 10 AM
        }
        
        return targetDate
      }
    }

    // Handle "tomorrow"
    if (dateStr.toLowerCase() === 'tomorrow') {
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      tomorrow.setHours(10, 0, 0, 0)
      return tomorrow
    }

    // Try standard date parsing
    const date = new Date(dateStr)
    if (!isNaN(date.getTime())) {
      return date
    }

    return null
  } catch {
    return null
  }
}

export async function POST(request: NextRequest) {
  try {
    const payload = await getPayload({ config })
    const { prompt } = await request.json()

    if (!prompt || !prompt.trim()) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 })
    }

    // Parse jobs from the prompt
    const parsedJobs = parseJobsFromPrompt(prompt)

    if (parsedJobs.length === 0) {
      return NextResponse.json({ 
        error: 'Could not parse any jobs from the prompt. Please be more specific about the jobs you want to create.' 
      }, { status: 400 })
    }

    const result: ImportResult = {
      success: 0,
      failed: 0,
      errors: [],
    }

    // Create each job
    for (let i = 0; i < parsedJobs.length; i++) {
      const jobData = parsedJobs[i]
      
      try {
        // Find client
        if (jobData.clientName) {
          const clients = await payload.find({
            collection: 'clients',
            where: { name: { contains: jobData.clientName } },
            limit: 1,
          })

          if (clients.docs.length > 0) {
            jobData.client = clients.docs[0].id
          } else {
            result.failed++
            result.errors.push({
              row: i + 1,
              error: `Client "${jobData.clientName}" not found`,
            })
            continue
          }
        } else {
          result.failed++
          result.errors.push({
            row: i + 1,
            error: 'No client specified',
          })
          continue
        }

        // Parse date
        if (jobData.targetDate) {
          const parsedDate = parseDate(jobData.targetDate)
          if (parsedDate) {
            jobData.targetDate = parsedDate.toISOString()
          } else {
            delete jobData.targetDate
          }
        }

        // Find products and create line items
        const lineItems: Array<{ product: number | string; quantity: number }> = []
        for (const productInfo of jobData.products || []) {
          const products = await payload.find({
            collection: 'products',
            where: { name: { contains: productInfo.name } },
            limit: 1,
          })

          if (products.docs.length > 0) {
            lineItems.push({
              product: products.docs[0].id,
              quantity: productInfo.quantity || 1,
            })
          }
        }

        // Clean up the job data
        delete jobData.clientName
        delete jobData.products
        
        if (lineItems.length > 0) {
          jobData.lineItems = lineItems
        }

        // Create the job
        await payload.create({
          collection: 'jobs',
          data: jobData,
        })

        result.success++
      } catch (error: any) {
        result.failed++
        result.errors.push({
          row: i + 1,
          error: error.message,
        })
      }
    }

    return NextResponse.json(result)
  } catch (error: any) {
    console.error('AI create error:', error)
    return NextResponse.json({ 
      error: 'Failed to create jobs', 
      details: error.message 
    }, { status: 500 })
  }
}
