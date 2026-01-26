import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'

interface ImportResult {
  success: number
  failed: number
  errors: Array<{ row: number; error: string }>
}

type ClientCandidate = {
  id: string | number
  name: string
}

type ClarificationResponse = {
  needsClarification: true
  kind: 'client'
  query: string
  candidates: ClientCandidate[]
  parsedJobs: any[]
}

function normalizeName(input: string): string {
  return (input || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function scoreClientMatch(query: string, candidateName: string): number {
  const q = normalizeName(query)
  const c = normalizeName(candidateName)
  if (!q || !c) return 0
  if (q === c) return 100
  if (c.startsWith(q)) return 85
  if (c.includes(q)) return 70

  const qTokens = new Set(q.split(' ').filter(Boolean))
  const cTokens = new Set(c.split(' ').filter(Boolean))
  let shared = 0
  for (const t of qTokens) if (cTokens.has(t)) shared++
  if (shared === 0) return 0
  return Math.min(60, 20 + shared * 10)
}

function buildClientWhere(query: string): any {
  const q = normalizeName(query)
  const tokens = q.split(' ').filter(Boolean)
  const noSpaces = q.replace(/\s+/g, '')

  const or: any[] = []

  if (query?.trim()) {
    or.push({ name: { contains: query } })
    or.push({ companyName: { contains: query } })
  }

  if (q) {
    or.push({ name: { contains: q } })
    or.push({ companyName: { contains: q } })
  }

  if (noSpaces && noSpaces !== q) {
    or.push({ name: { contains: noSpaces } })
    or.push({ companyName: { contains: noSpaces } })
  }

  for (const t of tokens) {
    if (t.length < 2) continue
    or.push({ name: { contains: t } })
    or.push({ companyName: { contains: t } })
  }

  return or.length ? { or } : {}
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

  const addressWithCityStatePattern = /(\d+\s+[^,\n]+),\s*([^,\n]+),\s*([A-Za-z]{2})/g
  const addressWithCityState = [...prompt.matchAll(addressWithCityStatePattern)].map(m => ({
    address: m[1].trim(),
    city: m[2].trim(),
    state: m[3].trim().toUpperCase(),
  }))

  // Look for addresses (fallback)
  const addressPattern = /(?:at\s+|in\s+)?(\d+\s+[A-Za-z0-9\s]+\s+(?:St|Street|Ave|Avenue|Rd|Road|Blvd|Boulevard|Ln|Lane|Dr|Drive|Ct|Court|Pl|Place))\b/gi
  const addresses = [...prompt.matchAll(addressPattern)]
    .map(m => m[1].trim())
    .filter((x) => !/\b(?:sq\s*ft|sqft|square\s*feet)\b/i.test(x))
    .filter(Boolean)

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

  const inferredCity = addressWithCityState[0]?.city || null
  const inferredState = addressWithCityState[0]?.state || null
  const city = inferredCity || 'Austin'

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
    const jobCity = addressWithCityState[jobIndex]?.city || cities[i % cities.length] || city
    const jobRegion = jobCity.toLowerCase().includes('austin') ? 'austin' :
                      jobCity.toLowerCase().includes('san antonio') ? 'san-antonio' : 'other'
    
    jobs.push({
      clientName,
      modelName: '3D Scan',
      captureAddress: addressWithCityState[jobIndex]?.address || addresses[jobIndex] || `Property ${jobIndex + 1}`,
      city: jobCity,
      state: addressWithCityState[jobIndex]?.state || inferredState || 'TX',
      region: jobRegion,
      captureType: 'matterport',
      targetDate: dates[i] || dates[0] || null,
      status: 'scheduled',
      sqFt: squareFootage,
      products: [{ name: 'Matterport Scan', quantity: 1 }],
    })
    jobIndex++
  }

  // Create floor plan jobs
  for (let i = 0; i < floorPlanCount; i++) {
    const jobCity = addressWithCityState[jobIndex]?.city || cities[i % cities.length] || city
    const jobRegion = jobCity.toLowerCase().includes('austin') ? 'austin' :
                      jobCity.toLowerCase().includes('san antonio') ? 'san-antonio' : 'other'
    
    jobs.push({
      clientName,
      modelName: 'Floor Plan',
      captureAddress: addressWithCityState[jobIndex]?.address || addresses[jobIndex] || `Property ${jobIndex + 1}`,
      city: jobCity,
      state: addressWithCityState[jobIndex]?.state || inferredState || 'TX',
      region: jobRegion,
      captureType: 'other',
      targetDate: dates[i] || dates[0] || null,
      status: 'scheduled',
      sqFt: squareFootage,
      products: [{ name: 'Floor Plan', quantity: 1 }],
    })
    jobIndex++
  }

  // If no specific counts found, create one job per address
  if (jobs.length === 0 && addresses.length > 0) {
    addresses.forEach((address, i) => {
      const jobCity = addressWithCityState[i]?.city || city
      const jobRegion = jobCity.toLowerCase().includes('austin') ? 'austin' :
                        jobCity.toLowerCase().includes('san antonio') ? 'san-antonio' : 'other'
      jobs.push({
        clientName,
        modelName: 'Property Scan',
        captureAddress: addressWithCityState[i]?.address || address,
        city: jobCity,
        state: addressWithCityState[i]?.state || inferredState || 'TX',
        region: jobRegion,
        captureType: 'matterport',
        targetDate: dates[i] || dates[0] || null,
        status: 'scheduled',
        sqFt: squareFootage,
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
    const { prompt, clientId } = await request.json()

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
        if (clientId) {
          jobData.client = clientId
        } else if (jobData.clientName) {
          const query = jobData.clientName
          const clients = await payload.find({
            collection: 'clients',
            where: buildClientWhere(query),
            limit: 50,
          })

          const scored = (clients.docs || [])
            .map((c: any) => ({
              id: c.id,
              name: c.name,
              score: scoreClientMatch(query, c.name),
            }))
            .filter((x: any) => x.score > 0)
            .sort((a: any, b: any) => b.score - a.score)

          const best = scored[0]
          const second = scored[1]

          if (!best) {
            const clarification: ClarificationResponse = {
              needsClarification: true,
              kind: 'client',
              query,
              candidates: [],
              parsedJobs,
            }
            return NextResponse.json(clarification, { status: 409 })
          }

          const isExact = best.score >= 100
          const isAmbiguous = !isExact && second && second.score >= best.score - 10
          const isWeak = !isExact && best.score < 85

          if (isAmbiguous || isWeak) {
            const candidates: ClientCandidate[] = scored
              .slice(0, 5)
              .map((x: any) => ({ id: x.id, name: x.name }))
            const clarification: ClarificationResponse = {
              needsClarification: true,
              kind: 'client',
              query,
              candidates,
              parsedJobs,
            }
            return NextResponse.json(clarification, { status: 409 })
          }

          jobData.client = best.id
        } else {
          const clarification: ClarificationResponse = {
            needsClarification: true,
            kind: 'client',
            query: '',
            candidates: [],
            parsedJobs,
          }
          return NextResponse.json(clarification, { status: 409 })
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
