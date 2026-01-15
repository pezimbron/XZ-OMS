import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'

/**
 * API endpoint to receive forwarded job request emails and auto-create jobs
 * POST /api/parse-job-email
 * 
 * Accepts:
 * - Email forwarding services (SendGrid, Mailgun, etc.)
 * - Manual POST with email content
 */
export async function POST(req: NextRequest) {
  try {
    const payload = await getPayload({ config })

    // Parse incoming email data
    const body = await req.json()
    const emailContent = extractEmailContent(body)

    if (!emailContent) {
      return NextResponse.json(
        { error: 'No email content found' },
        { status: 400 }
      )
    }

    // Parse email with Gemini AI
    const parsedJob = await parseJobEmailWithGemini(emailContent)

    // Auto-match or create client
    const clientId = await findOrCreateClient(payload, parsedJob.client, parsedJob.isOutsourced)

    // Auto-match products and create line items
    const lineItems = await matchProducts(payload, parsedJob.lineItems)
    
    // Auto-detect region based on city
    const region = detectRegion(parsedJob.city, parsedJob.isOutsourced)
    
    console.log('Parsed data:', JSON.stringify(parsedJob, null, 2))
    // Create job in Payload
    const job = await payload.create({
      collection: 'jobs',
      data: {
        ...parsedJob,
        client: clientId,
        lineItems,
        region,
      },
    })

    return NextResponse.json({
      success: true,
      jobId: job.id,
      message: `Job created successfully: ${job.modelName}`,
    })
  } catch (error) {
    console.error('Error processing job email:', error)
    return NextResponse.json(
      { error: 'Failed to process job email', details: error.message },
      { status: 500 }
    )
  }
}

/**
 * Extract email content from various email service formats
 */
function extractEmailContent(body: any): string | null {
  // SendGrid format
  if (body.text) return body.text
  if (body.html) return stripHtml(body.html)

  // Mailgun format
  if (body['body-plain']) return body['body-plain']
  if (body['body-html']) return stripHtml(body['body-html'])

  // Manual format
  if (body.emailContent) return body.emailContent

  // Raw email
  if (typeof body === 'string') return body

  return null
}

/**
 * Strip HTML tags from email content
 */
function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ')
}

/**
 * Detect region based on city and outsourcing status
 */
function detectRegion(city: string | undefined, isOutsourced: boolean): string {
  if (isOutsourced) {
    return 'outsourced'
  }

  if (!city) {
    return 'other'
  }

  const cityLower = city.toLowerCase()

  // Austin area cities
  const austinCities = [
    'austin',
    'round rock',
    'cedar park',
    'pflugerville',
    'georgetown',
    'leander',
    'manor',
    'dripping springs',
    'bee cave',
    'lakeway',
  ]

  // San Antonio area cities
  const sanAntonioCities = [
    'san antonio',
    'new braunfels',
    'schertz',
    'seguin',
    'universal city',
    'converse',
    'live oak',
    'boerne',
  ]

  if (austinCities.some((city) => cityLower.includes(city))) {
    return 'austin'
  }

  if (sanAntonioCities.some((city) => cityLower.includes(city))) {
    return 'san-antonio'
  }

  return 'other'
}

/**
 * Parse job email with Gemini AI
 */
async function parseJobEmailWithGemini(emailContent: string): Promise<any> {
  const apiKey = process.env.GEMINI_API_KEY

  if (!apiKey) {
    throw new Error('GEMINI_API_KEY not configured')
  }

  const prompt = `
You are an AI assistant that extracts structured job data from email confirmations for a 3D scanning/capture service company.

IMPORTANT CONTEXT:
- For OUTSOURCED jobs (from partners like Matterport), the email sender is the outsourcing partner (who pays us)
- The "Client Company" field in the email is the END CLIENT (the partner's customer)
- For DIRECT jobs, the client is the actual customer

Extract the following fields from the email and return as JSON:

{
  "isOutsourced": boolean, // true if from outsourcing partner (Matterport, etc.)
  "client": string, // Outsourcing partner name (e.g., "Matterport") OR direct client name
  "endClientName": string, // Only for outsourced jobs - full name from "Client Company:" field
  "endClientCompany": string, // Only for outsourced jobs - company name only
  "jobId": string,
  "modelName": string, // Project name
  "captureAddress": string,
  "city": string,
  "state": string,
  "zip": string,
  "sqFt": number,
  "propertyType": "commercial" | "residential" | "industrial" | "other",
  "targetDate": string, // ISO 8601 format
  "sitePOCName": string,
  "sitePOCPhone": string,
  "sitePOCEmail": string,
  "captureType": "matterport" | "lidar" | "drone" | "other",
  "vendorPrice": number, // Capture payout
  "travelPayout": number,
  "offHoursPayout": number,
  "schedulingNotes": string,
  "purposeOfScan": string,
  "lineItems": [
    {
      "productName": string,
      "quantity": number
    }
  ]
}

EXAMPLES:

Example 1 - Outsourced Job (Matterport):
Email from: dfraser@matterport.com
"Client Company: Spencer Technologies (4)"
→ isOutsourced: true
→ client: "Matterport"
→ endClientName: "Spencer Technologies (4)"
→ endClientCompany: "Spencer Technologies"

Example 2 - Direct Job:
Email from: john@localbusiness.com
→ isOutsourced: false
→ client: "Local Business"
→ endClientName: null
→ endClientCompany: null

EMAIL CONTENT:
${emailContent}

Return ONLY valid JSON, no markdown or explanations.
`

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 4096,
        },
      }),
    }
  )

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    console.error('Gemini API error:', {
      status: response.status,
      statusText: response.statusText,
      error: errorData,
      url: response.url
    })
    throw new Error(`Gemini API error: ${response.statusText} - ${JSON.stringify(errorData)}`)
  }

  const data = await response.json()
  
  const generatedText = data.candidates[0].content.parts[0].text

  // Extract JSON from response (Gemini sometimes wraps it in markdown)
  const jsonMatch = generatedText.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    throw new Error('Failed to extract JSON from Gemini response')
  }

  return JSON.parse(jsonMatch[0])
}

/**
 * Find existing client or create new one
 */
async function findOrCreateClient(
  payload: any,
  clientName: string,
  isOutsourced: boolean
): Promise<string> {
  console.log('findOrCreateClient called with:', clientName)
  // Search for existing client by name
  const existingClients = await payload.find({
    collection: 'clients',
    where: {
      name: {
        equals: clientName,
      },
    },
    limit: 1,
  })

  if (existingClients.docs.length > 0) {
    return existingClients.docs[0].id
  }

  // Create new client
  const newClient = await payload.create({
    collection: 'clients',
    data: {
      name: clientName,
      clientType: isOutsourced ? 'outsourcing-partner' : 'retail',
      billingPreference: 'immediate',
    },
  })

  return newClient.id
}

/**
 * Match product names to existing products in catalog
 */
async function matchProducts(payload: any, lineItems: any[]): Promise<any[]> {
  const matchedItems = []

  for (const item of lineItems) {
    // Search for product by name (fuzzy match)
    const products = await payload.find({
      collection: 'products',
      where: {
        name: {
          contains: item.productName,
        },
      },
      limit: 1,
    })

    if (products.docs.length > 0) {
      matchedItems.push({
        product: products.docs[0].id,
        quantity: item.quantity || 1,
      })
    } else {
      // Create new product if not found
      const newProduct = await payload.create({
        collection: 'products',
        data: {
          name: item.productName,
          category: 'capture-service',
          unitType: 'flat',
          basePrice: 0, // Will be updated manually later
        },
      })

      matchedItems.push({
        product: newProduct.id,
        quantity: item.quantity || 1,
      })
    }
  }

  return matchedItems
}
