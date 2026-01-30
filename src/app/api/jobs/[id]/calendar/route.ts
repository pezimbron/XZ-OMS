import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import { google } from 'googleapis'

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const payload = await getPayload()
    const { id: jobId } = await context.params

    // Fetch the job with related data
    const job = await payload.findByID({
      collection: 'jobs',
      id: jobId,
      depth: 2, // Populate related data
    })

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    // Check if tech is assigned
    if (!job.tech) {
      return NextResponse.json({ error: 'No tech assigned to this job' }, { status: 400 })
    }

    // Process calendar invite creation/update
    const result = await processCalendarUpdate(job, payload)

    return NextResponse.json({ 
      success: true, 
      message: result.message,
      eventId: result.eventId 
    })

  } catch (error: any) {
    console.error('Calendar update error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update calendar' },
      { status: 500 }
    )
  }
}

async function processCalendarUpdate(job: any, payload: any) {
  try {
    // Fetch related data
    const [client, tech, products] = await Promise.all([
      job.client
        ? payload.findByID({
            collection: 'clients',
            id: typeof job.client === 'string' ? job.client : job.client.id,
          })
        : null,
      payload.findByID({
        collection: 'technicians',
        id: typeof job.tech === 'string' ? job.tech : job.tech.id,
      }),
      job.lineItems
        ? Promise.all(
            job.lineItems.map(async (item: any) => {
              if (item.product) {
                return payload.findByID({
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
    const description = formatCalendarDescription(job, client, products)

    // Format event title
    const eventTitle = `${job.modelName || 'Job'} - ${job.jobId || 'Scan'}`

    // Get event date/time
    const eventDate = job.targetDate ? new Date(job.targetDate) : null

    if (!eventDate) {
      throw new Error('Job has no target date, cannot create calendar invite')
    }

    // Get tech email
    const techEmail = tech?.email

    if (!techEmail) {
      throw new Error('Tech has no email, cannot create calendar invite')
    }

    // Create or update Google Calendar event
    const eventId = await createOrUpdateGoogleCalendarEvent({
      eventId: job.googleCalendarEventId,
      summary: eventTitle,
      description,
      startDateTime: eventDate,
      attendeeEmail: techEmail,
      location: formatAddress(job),
    })

    // Store the event ID if different
    if (eventId && eventId !== job.googleCalendarEventId) {
      await payload.update({
        collection: 'jobs',
        id: job.id,
        data: {
          googleCalendarEventId: eventId,
        } as any,
        context: {
          skipCalendarHook: true, // Prevent this update from triggering the hook again
        },
      })
    }

    return {
      message: job.googleCalendarEventId 
        ? 'Calendar event updated successfully' 
        : 'Calendar event created successfully',
      eventId
    }

  } catch (error) {
    throw error
  }
}

function formatCalendarDescription(
  job: any,
  client: any,
  products: any[]
): string {
  const sections: string[] = []

  // TO-DO LIST
  const calendarItems = job.lineItems?.filter((item: any) => !item.excludeFromCalendar && !item.product?.excludeFromCalendar) || []
  const customItems = job.customTodoItems || []
  
  if (calendarItems.length > 0 || customItems.length > 0) {
    sections.push('✅ TO-DO LIST')
    let itemNumber = 1
    
    calendarItems.forEach((item: any) => {
      const product = products[job.lineItems.indexOf(item)]
      const productName = product?.name || 'Service'
      const quantity = item.quantity || 1
      sections.push(`${itemNumber}. ${productName}${quantity > 1 ? ` (Qty: ${quantity})` : ''}`)
      if (item.instructions) {
        sections.push(`   ${item.instructions}`)
      }
      itemNumber++
    })
    
    customItems.forEach((item: any) => {
      sections.push(`${itemNumber}. ${item.task}`)
      if (item.notes) {
        sections.push(`   ${item.notes}`)
      }
      itemNumber++
    })
    sections.push('')
  }

  // JOB DETAILS
  sections.push('══════════')
  sections.push('📋 JOB DETAILS')
  if (job.jobId) sections.push(`Job ID: ${job.jobId}`)
  if (job.modelName) sections.push(`Model/Project: ${job.modelName}`)
  if (job.targetDate) {
    const date = new Date(job.targetDate)
    const timezone = job.timezone || 'America/Chicago'
    sections.push(`Target Date: ${date.toLocaleString('en-US', { timeZone: timezone })} (${timezone})`)
  }
  if (job.propertyType) sections.push(`Property Type: ${job.propertyType}`)
  sections.push('')

  // LOCATION & SIZE
  sections.push('══════════')
  sections.push('📍 LOCATION')
  if (job.captureAddress) {
    sections.push(`${job.captureAddress}`)
    if (job.city || job.state || job.zip) {
      sections.push(`${job.city || ''}${job.city && job.state ? ', ' : ''}${job.state || ''} ${job.zip || ''}`)
    }
  }
  if (job.sqFt) {
    sections.push(`Square Footage: ${job.sqFt} sq ft`)
  }
  sections.push('')

  // POC INFORMATION
  if (job.sitePOCName || job.sitePOCPhone) {
    sections.push('══════════')
    sections.push('📞 ON-SITE CONTACT (POC)')
    if (job.sitePOCName) sections.push(`Name: ${job.sitePOCName}`)
    if (job.sitePOCPhone) sections.push(`Phone: ${job.sitePOCPhone}`)
    sections.push('')
  }

  // TECH PORTAL ACCESS
  if (job.completionToken) {
    sections.push('══════════')
    sections.push('🔗 TECH PORTAL ACCESS')
    sections.push(`Complete job & upload files:`)
    sections.push(`https://xz-oms.vercel.app/forms/job/${job.completionToken}`)
    sections.push('')
  }

  // SCHEDULING NOTES
  if (job.schedulingNotes) {
    sections.push('══════════')
    sections.push('⚠️  SCHEDULING NOTES')
    sections.push(job.schedulingNotes)
    sections.push('')
  }

  // GENERAL INSTRUCTIONS
  if (job.techInstructions) {
    sections.push('══════════')
    sections.push('📝 GENERAL INSTRUCTIONS FOR TECH')
    sections.push(job.techInstructions)
    sections.push('')
  }

  // UPLOAD LOCATIONS
  if (job.uploadLink || job.mediaUploadLink) {
    sections.push('══════════')
    sections.push('📤 UPLOAD LOCATIONS')
    if (job.uploadLink) sections.push(`Primary Upload: ${job.uploadLink}`)
    if (job.mediaUploadLink) sections.push(`Media Upload: ${job.mediaUploadLink}`)
    sections.push('')
  }

  return sections.join('\n')
}

function formatAddress(job: any): string {
  const parts: string[] = []
  if (job.captureAddress) parts.push(job.captureAddress)
  if (job.city) parts.push(job.city)
  if (job.state) parts.push(job.state)
  if (job.zip) parts.push(job.zip)
  return parts.join(', ')
}

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
