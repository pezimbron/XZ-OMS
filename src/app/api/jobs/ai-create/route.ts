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

  // Extract common patterns - handle both "for [client]" and "for client [name]"
  let clientMatch = prompt.match(/for\s+client\s+([A-Za-z0-9\s&]+?)(?:\s+for|\s+at|\s+in|\s+,|\s+one|\s+\d)/i)
  if (!clientMatch) {
    clientMatch = prompt.match(/for\s+([A-Za-z0-9\s&]+?)(?:\s+for|\s+at|\s+in|\s+,|\s+one|\s+\d)/i)
  }
  const clientName = clientMatch ? clientMatch[1].trim() : null

  // Look for addresses
  const addressPattern = /(?:at\s+)?(\d+\s+[A-Za-z0-9\s,]+?)(?:\s+in\s+|\s*,\s*[A-Z]{2}|\s+scheduled)/gi
  const addresses = [...prompt.matchAll(addressPattern)].map(m => m[1].trim())

  // Look for dates - improved to catch dates like "2/1 and 2/2"
  const datePattern = /(?:scheduled\s+for\s+|on\s+|for\s+)(\d{1,2}\/\d{1,2}(?:\/\d{2,4})?|[A-Za-z]+\s+\d{1,2}(?:st|nd|rd|th)?(?:\s+at\s+\d{1,2}(?::\d{2})?\s*(?:am|pm)?)?|next\s+\w+|tomorrow)/gi
  const dates = [...prompt.matchAll(datePattern)].map(m => m[1].trim())

  // Look for job count - handle "create X jobs" or "X scans" or "X floor plans"
  const createJobsPattern = /create\s+(\d+)\s+jobs?/i
  const scanPattern = /(\d+)\s+(?:matterport\s+)?(?:3D\s+)?scans?/i
  const floorPlanPattern = /(\d+)\s+floor\s+plans?/i
  
  const createJobsMatch = prompt.match(createJobsPattern)
  const scanMatch = prompt.match(scanPattern)
  const floorPlanMatch = prompt.match(floorPlanPattern)

  // Determine job count and type
  let totalJobCount = 0
  let scanCount = 0
  let floorPlanCount = 0
  
  if (createJobsMatch) {
    totalJobCount = parseInt(createJobsMatch[1])
    // Check if it mentions scans or floor plans
    if (prompt.toLowerCase().includes('scan')) {
      scanCount = totalJobCount
    } else if (prompt.toLowerCase().includes('floor plan')) {
      floorPlanCount = totalJobCount
    } else {
      // Default to scans
      scanCount = totalJobCount
    }
  } else {
    scanCount = scanMatch ? parseInt(scanMatch[1]) : 0
    floorPlanCount = floorPlanMatch ? parseInt(floorPlanMatch[1]) : 0
  }

  // Look for cities
  const cityPattern = /in\s+([A-Za-z\s]+?)(?:\s*,|\s+scheduled|\s+next|\s+on|$)/i
  const cityMatch = prompt.match(cityPattern)
  const city = cityMatch ? cityMatch[1].trim() : 'Austin'

  // Look for regions
  const region = city.toLowerCase().includes('austin') ? 'austin' : 
                 city.toLowerCase().includes('san antonio') ? 'san-antonio' : 'other'

  // Parse cities if multiple mentioned (e.g., "one in San Antonio and one in Austin")
  const cityMatches = [...prompt.matchAll(/(?:one\s+)?in\s+([A-Za-z\s]+?)(?:\s+and|\s+areas?|,|$)/gi)]
  const cities = cityMatches.length > 0 ? cityMatches.map(m => m[1].trim()) : [city]
  
  // Extract square footage
  const sqftMatch = prompt.match(/(\d+)\s*(?:sq\s*ft|sqft|square\s*feet)/i)
  const squareFootage = sqftMatch ? parseInt(sqftMatch[1]) : null
  
  // Generate jobs based on extracted information
  let jobIndex = 0

  // Create scan jobs
  for (let i = 0; i < scanCount; i++) {
    const jobCity = cities[i % cities.length] || city
    const jobRegion = jobCity.toLowerCase().includes('austin') ? 'austin' : 
                      jobCity.toLowerCase().includes('san antonio') ? 'san-antonio' : 'other'
    
    jobs.push({
      clientName,
      modelName: '3D Scan',
      captureAddress: addresses[jobIndex] || `Property ${jobIndex + 1}`,
      city: jobCity,
      state: 'TX',
      region: jobRegion,
      captureType: 'matterport',
      targetDate: dates[i] || dates[0] || null,
      status: 'scheduled',
      squareFootage: squareFootage,
      products: [{ name: 'Matterport Scan', quantity: 1 }],
    })
    jobIndex++
  }

  // Create floor plan jobs
  for (let i = 0; i < floorPlanCount; i++) {
    const jobCity = cities[i % cities.length] || city
    const jobRegion = jobCity.toLowerCase().includes('austin') ? 'austin' : 
                      jobCity.toLowerCase().includes('san antonio') ? 'san-antonio' : 'other'
    
    jobs.push({
      clientName,
      modelName: 'Floor Plan',
      captureAddress: addresses[jobIndex] || `Property ${jobIndex + 1}`,
      city: jobCity,
      state: 'TX',
      region: jobRegion,
      captureType: 'other',
      targetDate: dates[i] || dates[0] || null,
      status: 'scheduled',
      squareFootage: squareFootage,
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
        squareFootage: squareFootage,
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

    // Handle M/D or M/D/YY format - add current year if missing
    const shortDateMatch = dateStr.match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?$/)
    if (shortDateMatch) {
      const month = parseInt(shortDateMatch[1]) - 1 // JS months are 0-indexed
      const day = parseInt(shortDateMatch[2])
      let year = shortDateMatch[3] ? parseInt(shortDateMatch[3]) : new Date().getFullYear()
      
      // Handle 2-digit years
      if (year < 100) {
        year += 2000
      }
      
      const date = new Date(year, month, day, 10, 0, 0, 0) // Default to 10 AM
      if (!isNaN(date.getTime())) {
        return date
      }
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
        // Find client with improved matching
        if (jobData.clientName) {
          // First, try exact match (case-insensitive)
          let clients = await payload.find({
            collection: 'clients',
            where: {
              name: {
                equals: jobData.clientName,
              },
            },
            limit: 1,
          })

          // If no exact match, try contains search
          if (clients.docs.length === 0) {
            clients = await payload.find({
              collection: 'clients',
              where: {
                name: {
                  contains: jobData.clientName,
                },
              },
              limit: 5,
            })
          }

          // If still no match, try searching by company name
          if (clients.docs.length === 0) {
            clients = await payload.find({
              collection: 'clients',
              where: {
                companyName: {
                  contains: jobData.clientName,
                },
              },
              limit: 5,
            })
          }

          if (clients.docs.length > 0) {
            // If multiple matches, use the first one
            jobData.client = clients.docs[0].id
            
            // If we found multiple, log a warning
            if (clients.docs.length > 1) {
              console.log(`Multiple clients found for "${jobData.clientName}", using: ${clients.docs[0].name}`)
            }
          } else {
            // Get all clients to show in error message
            const allClients = await payload.find({
              collection: 'clients',
              limit: 100,
            })
            
            const clientNames = allClients.docs.map(c => c.name).join(', ')
            
            result.failed++
            result.errors.push({
              row: i + 1,
              error: `Client "${jobData.clientName}" not found. Available clients: ${clientNames}`,
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
