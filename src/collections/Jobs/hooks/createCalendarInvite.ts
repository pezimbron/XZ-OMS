import type { CollectionAfterChangeHook } from 'payload'
import { google } from 'googleapis'

/**
 * Hook to auto-generate Google Calendar invite when a tech is assigned to a job
 * Triggers when:
 * - A job is created with a tech assigned
 * - A tech is assigned to an existing job (tech field changes)
 */
export const createCalendarInvite: CollectionAfterChangeHook = async ({
  doc,
  req,
  previousDoc,
  operation,
}) => {
  // Only proceed if a tech is assigned
  if (!doc.tech) {
    return doc
  }

  // Check if relevant fields changed that warrant a calendar update
  const shouldUpdateCalendar = () => {
    if (operation === 'create') {
      return true // Always create calendar event for new jobs with tech assigned
    }

    if (operation === 'update' && previousDoc) {
      // Check if any calendar-relevant fields changed
      const techChanged = previousDoc.tech !== doc.tech
      const dateChanged = previousDoc.targetDate !== doc.targetDate
      const addressChanged = previousDoc.captureAddress !== doc.captureAddress
      const cityChanged = previousDoc.city !== doc.city
      const stateChanged = previousDoc.state !== doc.state
      const zipChanged = previousDoc.zip !== doc.zip
      const modelNameChanged = previousDoc.modelName !== doc.modelName
      const clientChanged = previousDoc.client !== doc.client
      const instructionsChanged = previousDoc.techInstructions !== doc.techInstructions
      
      // Check if line items changed (products/services)
      const lineItemsChanged = JSON.stringify(previousDoc.lineItems) !== JSON.stringify(doc.lineItems)

      return (
        techChanged ||
        dateChanged ||
        addressChanged ||
        cityChanged ||
        stateChanged ||
        zipChanged ||
        modelNameChanged ||
        clientChanged ||
        instructionsChanged ||
        lineItemsChanged
      )
    }

    return false
  }

  if (!shouldUpdateCalendar()) {
    return doc // Skip calendar update if no relevant changes
  }

  try {
    // Fetch related data
    const [client, tech, products] = await Promise.all([
      doc.client
        ? req.payload.findByID({
            collection: 'clients',
            id: typeof doc.client === 'string' ? doc.client : doc.client.id,
          })
        : null,
      req.payload.findByID({
        collection: 'technicians',
        id: typeof doc.tech === 'string' ? doc.tech : doc.tech.id,
      }),
      doc.lineItems
        ? Promise.all(
            doc.lineItems.map(async (item: any) => {
              if (item.product) {
                return req.payload.findByID({
                  collection: 'products',
                  id:
                    typeof item.product === 'string'
                      ? item.product
                      : item.product.id,
                })
              }
              return null
            })
          )
        : [],
    ])

    // Format calendar event description
    const description = formatCalendarDescription(doc, client, products)

    // Format event title
    const eventTitle = `${doc.modelName || 'Job'} - ${client?.name || 'Client'}`

    // Get event date/time
    const eventDate = doc.targetDate ? new Date(doc.targetDate) : null

    if (!eventDate) {
      req.payload.logger.warn(
        `Job ${doc.id} has no targetDate, skipping calendar invite creation`
      )
      return doc
    }

    // Get tech email
    const techEmail = tech?.email

    if (!techEmail) {
      req.payload.logger.warn(
        `Tech ${tech?.id} has no email, skipping calendar invite creation`
      )
      return doc
    }

    // Create or update Google Calendar event
    const eventId = await createOrUpdateGoogleCalendarEvent({
      eventId: doc.googleCalendarEventId,
      summary: eventTitle,
      description,
      startDateTime: eventDate,
      attendeeEmail: techEmail,
      location: formatAddress(doc),
    })

    // Store the event ID for future updates
    if (eventId && eventId !== doc.googleCalendarEventId) {
      await req.payload.update({
        collection: 'jobs',
        id: doc.id,
        data: {
          googleCalendarEventId: eventId,
        } as any,
      })
    }

    req.payload.logger.info(
      `Calendar event ${doc.googleCalendarEventId ? 'updated' : 'created'} for job ${doc.id} assigned to ${techEmail}`
    )
  } catch (error) {
    req.payload.logger.error(`Error creating calendar invite: ${error}`)
    // Don't fail the job creation if calendar invite fails
  }

  return doc
}

/**
 * Format calendar event description according to user requirements:
 * 1. To-do List
 * 2. Client name and Purpose of the Scan
 * 3. Address and Square Footage
 * 4. POC Information
 * 5. Specific instructions for each item of the to-do list
 * 6. Where to upload the Project
 * 7. If there is other type of content, a url to upload the media
 */
function formatCalendarDescription(
  job: any,
  client: any,
  products: any[]
): string {
  const sections: string[] = []

  // 1. TO-DO LIST
  if (job.lineItems && job.lineItems.length > 0) {
    sections.push('📋 TO-DO LIST')
    job.lineItems.forEach((item: any, index: number) => {
      const product = products[index]
      const productName = product?.name || 'Service'
      const quantity = item.quantity || 1
      sections.push(`${index + 1}. ${productName} (Qty: ${quantity})`)
    })
    sections.push('')
  }

  // 2. CLIENT NAME AND PURPOSE OF SCAN
  sections.push('══════════')
  sections.push('👤 CLIENT & PURPOSE')
  if (job.isOutsourced) {
    sections.push(`Outsourcing Partner: ${client?.name || 'N/A'}`)
    // Don't share end client name for privacy
  } else {
    sections.push(`Client: ${client?.name || 'N/A'}`)
  }
  if (job.purposeOfScan) {
    sections.push(`Purpose: ${job.purposeOfScan}`)
  }
  if (job.captureType) {
    sections.push(`Capture Type: ${job.captureType}`)
  }
  sections.push('')

  // 3. ADDRESS AND SQUARE FOOTAGE
  sections.push('══════════')
  sections.push('📍 LOCATION & SIZE')
  if (job.captureAddress) {
    sections.push(`Address: ${job.captureAddress}`)
    if (job.city || job.state || job.zip) {
      sections.push(
        `         ${job.city || ''}${job.city && job.state ? ', ' : ''}${job.state || ''} ${job.zip || ''}`
      )
    }
  }
  if (job.sqFt) {
    sections.push(`Square Footage: ${job.sqFt} sq ft`)
  }
  if (job.propertyType) {
    sections.push(`Property Type: ${job.propertyType}`)
  }
  if (job.schedulingNotes) {
    sections.push(`⚠️  SCHEDULING NOTES: ${job.schedulingNotes}`)
  }
  sections.push('')

  // 4. POC INFORMATION
  if (job.sitePOCName || job.sitePOCPhone || job.sitePOCEmail) {
    sections.push('══════════')
    sections.push('📞 ON-SITE CONTACT')
    if (job.sitePOCName) sections.push(`Name: ${job.sitePOCName}`)
    if (job.sitePOCPhone) sections.push(`Phone: ${job.sitePOCPhone}`)
    if (job.sitePOCEmail) sections.push(`Email: ${job.sitePOCEmail}`)
    sections.push('')
  }

  // 5. GENERAL TECH INSTRUCTIONS (if any)
  if (job.techInstructions) {
    sections.push('══════════')
    sections.push('📝 GENERAL INSTRUCTIONS')
    sections.push(job.techInstructions)
    sections.push('')
  }

  // 5. SPECIFIC INSTRUCTIONS FOR EACH TO-DO ITEM
  if (job.lineItems && job.lineItems.length > 0) {
    const hasInstructions = job.lineItems.some((item: any) => item.instructions)
    if (hasInstructions) {
      sections.push('══════════')
      sections.push('📝 SPECIFIC INSTRUCTIONS PER ITEM')
      job.lineItems.forEach((item: any, index: number) => {
        if (item.instructions) {
          const product = products[index]
          const productName = product?.name || 'Service'
          sections.push(`${index + 1}. ${productName}:`)
          sections.push(`   ${item.instructions}`)
          sections.push('')
        }
      })
    }
  }

  // 6. WHERE TO UPLOAD THE PROJECT
  if (job.uploadLink) {
    sections.push('══════════')
    sections.push('📤 UPLOAD LOCATIONS')
    sections.push(`Primary Upload: ${job.uploadLink}`)
  }

  // 7. MEDIA UPLOAD URL (if different)
  if (job.mediaUploadLink) {
    if (!job.uploadLink) {
      sections.push('══════════')
      sections.push('📤 UPLOAD LOCATIONS')
    }
    sections.push(`Media Upload: ${job.mediaUploadLink}`)
  }

  if (job.uploadLink || job.mediaUploadLink) {
    sections.push('')
  }

  // Additional job info
  sections.push('══════════')
  sections.push('ℹ️  JOB INFO')
  if (job.jobId) sections.push(`Job ID: ${job.jobId}`)
  if (job.priority) sections.push(`Priority: ${job.priority}`)
  sections.push('')

  return sections.join('\n')
}

/**
 * Format address for calendar event location field
 */
function formatAddress(job: any): string {
  const parts: string[] = []
  if (job.captureAddress) parts.push(job.captureAddress)
  if (job.city) parts.push(job.city)
  if (job.state) parts.push(job.state)
  if (job.zip) parts.push(job.zip)
  return parts.join(', ')
}

/**
 * Create or update Google Calendar event using Google Calendar API
 */
async function createOrUpdateGoogleCalendarEvent({
  eventId,
  summary,
  description,
  startDateTime,
  attendeeEmail,
  location,
}: {
  eventId?: string
  summary: string
  description: string
  startDateTime: Date
  attendeeEmail: string
  location?: string
}): Promise<string | undefined> {
  // Check if Google Calendar credentials are configured
  if (
    !process.env.GOOGLE_CLIENT_ID ||
    !process.env.GOOGLE_CLIENT_SECRET ||
    !process.env.GOOGLE_REFRESH_TOKEN
  ) {
    throw new Error(
      'Google Calendar credentials not configured. Please set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_REFRESH_TOKEN environment variables.'
    )
  }

  // Initialize OAuth2 client
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/oauth2callback'
  )

  oauth2Client.setCredentials({
    refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
  })

  const calendar = google.calendar({ version: 'v3', auth: oauth2Client })

  // Calculate end time (default 2 hours after start)
  const endDateTime = new Date(startDateTime)
  endDateTime.setHours(endDateTime.getHours() + 2)

  // Create event
  const event = {
    summary,
    description,
    location,
    start: {
      dateTime: startDateTime.toISOString(),
      timeZone: process.env.TIMEZONE || 'America/Chicago',
    },
    end: {
      dateTime: endDateTime.toISOString(),
      timeZone: process.env.TIMEZONE || 'America/Chicago',
    },
    attendees: [{ email: attendeeEmail }],
    reminders: {
      useDefault: false,
      overrides: [
        { method: 'email', minutes: 24 * 60 }, // 1 day before
        { method: 'popup', minutes: 60 }, // 1 hour before
      ],
    },
  }

  const calendarId = 'primary'
  let response

  // If we have an existing event ID, try to update it
  if (eventId) {
    try {
      response = await calendar.events.update({
        calendarId,
        eventId,
        requestBody: event,
        sendUpdates: 'all', // Send email notification to attendees
      })
      return response.data.id
    } catch (error: any) {
      // If event not found (404), create a new one
      if (error.code === 404) {
        console.warn(`Calendar event ${eventId} not found, creating new event`)
      } else {
        throw error
      }
    }
  }

  // Create new event if no eventId or update failed
  response = await calendar.events.insert({
    calendarId,
    requestBody: event,
    sendUpdates: 'all', // Send email notification to attendees
  })

  return response.data.id
}
