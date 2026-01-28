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
  context,
}) => {
  const startTime = Date.now()
  req.payload.logger.info(`[Calendar Hook] Started for job ${doc.id}, operation: ${operation}`)

  // Skip if this update is from storing the calendar event ID (prevent recursion)
  if (context?.skipCalendarHook) {
    req.payload.logger.info(`[Calendar Hook] Skipped (skipCalendarHook context) - ${Date.now() - startTime}ms`)
    return doc
  }

  // Early exit for updates - check if ONLY non-calendar fields changed
  if (operation === 'update' && previousDoc) {
    // Helper to normalize relationship fields (handle both ID strings and populated objects)
    const normalizeId = (field: any) => {
      if (!field) return null
      if (typeof field === 'string') return field
      if (typeof field === 'number') return String(field)
      return field.id ? String(field.id) : null
    }
    
    // Check each calendar-relevant field individually for detailed logging
    const prevTechId = normalizeId(previousDoc.tech)
    const currTechId = normalizeId(doc.tech)
    const techChanged = prevTechId !== currTechId
    
    const prevClientId = normalizeId(previousDoc.client)
    const currClientId = normalizeId(doc.client)
    const clientChanged = prevClientId !== currClientId
    
    // Log the comparison for debugging
    if (techChanged) {
      req.payload.logger.info(`Tech changed: ${prevTechId} -> ${currTechId}`)
    }
    if (clientChanged) {
      req.payload.logger.info(`Client changed: ${prevClientId} -> ${currClientId}`)
    }
    
    const dateChanged = previousDoc.targetDate !== doc.targetDate
    const addressChanged = previousDoc.captureAddress !== doc.captureAddress
    const cityChanged = previousDoc.city !== doc.city
    const stateChanged = previousDoc.state !== doc.state
    const zipChanged = previousDoc.zip !== doc.zip
    const modelNameChanged = previousDoc.modelName !== doc.modelName
    const instructionsChanged = previousDoc.techInstructions !== doc.techInstructions
    const schedulingNotesChanged = previousDoc.schedulingNotes !== doc.schedulingNotes
    
    // POC fields
    const pocNameChanged = previousDoc.sitePOCName !== doc.sitePOCName
    const pocPhoneChanged = previousDoc.sitePOCPhone !== doc.sitePOCPhone
    const pocEmailChanged = previousDoc.sitePOCEmail !== doc.sitePOCEmail
    
    // Upload links
    const uploadLinkChanged = previousDoc.uploadLink !== doc.uploadLink
    const mediaUploadLinkChanged = previousDoc.mediaUploadLink !== doc.mediaUploadLink
    
    // Improved lineItems comparison - normalize data to avoid false positives
    const normalizeLineItems = (items: any[]) => {
      if (!items || items.length === 0) return []
      return items.map(item => ({
        product: typeof item.product === 'object' ? item.product?.id : item.product,
        quantity: item.quantity,
        instructions: item.instructions || '',
      }))
    }
    const prevLineItems = normalizeLineItems(previousDoc.lineItems || [])
    const currLineItems = normalizeLineItems(doc.lineItems || [])
    const lineItemsChanged = JSON.stringify(prevLineItems) !== JSON.stringify(currLineItems)
    
    // Check if custom todo items changed
    const customTodoItemsChanged = JSON.stringify(previousDoc.customTodoItems || []) !== JSON.stringify(doc.customTodoItems || [])
    
    // Exclude workflow-related fields from triggering calendar updates
    const statusChanged = previousDoc.status !== doc.status
    const workflowStepsChanged = JSON.stringify(previousDoc.workflowSteps) !== JSON.stringify(doc.workflowSteps)
    
    const calendarFieldsChanged = 
      techChanged || dateChanged || addressChanged || cityChanged || 
      stateChanged || zipChanged || modelNameChanged || clientChanged || 
      instructionsChanged || lineItemsChanged || customTodoItemsChanged ||
      schedulingNotesChanged || pocNameChanged || pocPhoneChanged || pocEmailChanged ||
      uploadLinkChanged || mediaUploadLinkChanged
    
    // Check if ONLY workflow fields changed (status, workflowSteps)
    const onlyWorkflowFieldsChanged = (statusChanged || workflowStepsChanged) && !calendarFieldsChanged
    
    if (onlyWorkflowFieldsChanged) {
      req.payload.logger.info(`[Calendar Hook] Skipped (only workflow fields changed) - ${Date.now() - startTime}ms`)
      return doc
    }
    
    // If no calendar fields changed, skip entirely
    if (!calendarFieldsChanged) {
      req.payload.logger.info(`[Calendar Hook] Skipped (no calendar fields changed) - ${Date.now() - startTime}ms`)
      return doc
    }
    
    // Log which fields changed
    const changedFields: string[] = []
    if (techChanged) changedFields.push('tech')
    if (dateChanged) changedFields.push('targetDate')
    if (addressChanged) changedFields.push('captureAddress')
    if (cityChanged) changedFields.push('city')
    if (stateChanged) changedFields.push('state')
    if (zipChanged) changedFields.push('zip')
    if (modelNameChanged) changedFields.push('modelName')
    if (clientChanged) changedFields.push('client')
    if (instructionsChanged) changedFields.push('techInstructions')
    if (schedulingNotesChanged) changedFields.push('schedulingNotes')
    if (pocNameChanged) changedFields.push('sitePOCName')
    if (pocPhoneChanged) changedFields.push('sitePOCPhone')
    if (pocEmailChanged) changedFields.push('sitePOCEmail')
    if (uploadLinkChanged) changedFields.push('uploadLink')
    if (mediaUploadLinkChanged) changedFields.push('mediaUploadLink')
    if (lineItemsChanged) changedFields.push('lineItems')
    if (customTodoItemsChanged) changedFields.push('customTodoItems')
    
    req.payload.logger.info(`[Calendar Hook] Calendar fields changed: ${changedFields.join(', ')} - proceeding with update`)
  }

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

      const calendarRelevantChanged = (
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

      // Don't update calendar if no relevant fields changed
      // This prevents updates when only QC fields, status, or other non-calendar fields change
      if (!calendarRelevantChanged) {
        return false
      }

      // Skip if ONLY googleCalendarEventId changed (prevents infinite loop)
      const onlyEventIdChanged = 
        previousDoc.googleCalendarEventId !== doc.googleCalendarEventId &&
        !calendarRelevantChanged
      
      if (onlyEventIdChanged) {
        return false // Don't trigger hook when we're just storing the event ID
      }

      return calendarRelevantChanged
    }

    return false
  }

  if (!shouldUpdateCalendar()) {
    return doc // Skip calendar update if no relevant changes
  }

  // Process calendar invite asynchronously - don't block the job update
  req.payload.logger.info(`[Calendar Hook] Triggering async calendar update`)
  processCalendarInviteAsync(doc, req, startTime).catch(error => {
    req.payload.logger.error(`[Calendar Hook] Async calendar update failed: ${error}`)
  })

  return doc // Return immediately without waiting for calendar
}

/**
 * Process calendar invite in background without blocking job updates
 */
async function processCalendarInviteAsync(doc: any, req: any, startTime: number) {
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

    // Format event title (no client name for privacy)
    const eventTitle = `${doc.modelName || 'Job'} - ${doc.jobId || 'Scan'}`

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

    // Store the event ID for future updates (with context to prevent recursion)
    if (eventId && eventId !== doc.googleCalendarEventId) {
      await req.payload.update({
        collection: 'jobs',
        id: doc.id,
        data: {
          googleCalendarEventId: eventId,
        } as any,
        context: {
          skipCalendarHook: true, // Prevent this update from triggering the hook again
        },
      })
    }

    req.payload.logger.info(
      `Calendar event ${doc.googleCalendarEventId ? 'updated' : 'created'} for job ${doc.id} assigned to ${techEmail} - ${Date.now() - startTime}ms`
    )
  } catch (error) {
    req.payload.logger.error(`Error creating calendar invite: ${error} - ${Date.now() - startTime}ms`)
    // Don't fail the job creation if calendar invite fails
  }

  req.payload.logger.info(`[Calendar Hook] Async processing completed - ${Date.now() - startTime}ms`)
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

  // 1. TO-DO LIST - All items (products + custom tasks)
  const calendarItems = job.lineItems?.filter((item: any) => !item.excludeFromCalendar && !item.product?.excludeFromCalendar) || []
  const customItems = job.customTodoItems || []
  
  if (calendarItems.length > 0 || customItems.length > 0) {
    sections.push('✅ TO-DO LIST')
    let itemNumber = 1
    
    // Product-based items first
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
    
    // Custom tasks
    customItems.forEach((item: any) => {
      sections.push(`${itemNumber}. ${item.task}`)
      if (item.notes) {
        sections.push(`   ${item.notes}`)
      }
      itemNumber++
    })
    sections.push('')
  }

  // 2. JOB DETAILS
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
  if (job.purposeOfScan) sections.push(`Purpose: ${job.purposeOfScan}`)
  sections.push('')

  // 3. LOCATION & SIZE
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

  // 4. POC INFORMATION (no email)
  if (job.sitePOCName || job.sitePOCPhone) {
    sections.push('══════════')
    sections.push('📞 ON-SITE CONTACT (POC)')
    if (job.sitePOCName) sections.push(`Name: ${job.sitePOCName}`)
    if (job.sitePOCPhone) sections.push(`Phone: ${job.sitePOCPhone}`)
    sections.push('')
  }

  // 5. TECH PORTAL ACCESS
  if (job.completionToken) {
    sections.push('══════════')
    sections.push('� TECH PORTAL ACCESS')
    sections.push(`Complete job & upload files:`)
    sections.push(`https://xz-oms.vercel.app/forms/job/${job.completionToken}`)
    sections.push('')
  }

  // 6. SCHEDULING NOTES
  if (job.schedulingNotes) {
    sections.push('══════════')
    sections.push('⚠️  SCHEDULING NOTES')
    sections.push(job.schedulingNotes)
    sections.push('')
  }

  // 7. GENERAL INSTRUCTIONS FOR TECH
  if (job.techInstructions) {
    sections.push('══════════')
    sections.push('� GENERAL INSTRUCTIONS FOR TECH')
    sections.push(job.techInstructions)
    sections.push('')
  }

  // 8. UPLOAD LOCATIONS
  if (job.uploadLink || job.mediaUploadLink) {
    sections.push('══════════')
    sections.push('📤 UPLOAD LOCATIONS')
    if (job.uploadLink) sections.push(`Primary Upload: ${job.uploadLink}`)
    if (job.mediaUploadLink) sections.push(`Media Upload: ${job.mediaUploadLink}`)
    sections.push('')
  }

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
