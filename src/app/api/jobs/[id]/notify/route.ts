import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const payload = await getPayload({ config })
    const { notificationType, customMessage, customSubject, customBody } = await request.json()
    const { id } = await params

    // Fetch the job with client details
    const job = await payload.findByID({
      collection: 'jobs',
      id: id,
      depth: 2,
    })

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    // Get client data
    const client = typeof job.client === 'object' ? job.client : null
    if (!client) {
      return NextResponse.json({ error: 'Client not found for this job' }, { status: 404 })
    }

    // Check if notifications are enabled for this client
    const notificationPrefs = client.notificationPreferences
    if (!notificationPrefs?.enableNotifications) {
      return NextResponse.json({ 
        error: 'Notifications are disabled for this client' 
      }, { status: 400 })
    }

    // Check if this notification type is enabled
    const notificationTypeMap: Record<string, boolean | null | undefined> = {
      scheduled: notificationPrefs.notifyOnScheduled,
      completed: notificationPrefs.notifyOnCompleted,
      delivered: notificationPrefs.notifyOnDelivered,
      'scan-completed': notificationPrefs.notifyOnScanCompleted,
      'upload-completed': notificationPrefs.notifyOnUploadCompleted,
      'qc-completed': notificationPrefs.notifyOnQcCompleted,
      'transfer-completed': notificationPrefs.notifyOnTransferCompleted,
      'floorplan-completed': notificationPrefs.notifyOnFloorplanCompleted,
      'photos-completed': notificationPrefs.notifyOnPhotosCompleted,
      'asbuilts-completed': notificationPrefs.notifyOnAsbuiltsCompleted,
    }

    const shouldNotify = notificationTypeMap[notificationType]

    if (shouldNotify === false) {
      return NextResponse.json({ 
        error: `${notificationType} notifications are disabled for this client` 
      }, { status: 400 })
    }

    // Determine recipient email
    const recipientEmail = notificationPrefs.notificationEmail || client.email
    if (!recipientEmail) {
      return NextResponse.json({ 
        error: 'No email address configured for notifications' 
      }, { status: 400 })
    }

    let subject: string
    let body: string

    // If custom subject and body are provided, use them directly (already edited by user)
    if (customSubject && customBody) {
      subject = customSubject
      body = customBody
    } else {
      // Otherwise, fetch and process template
      const templates = await payload.find({
        collection: 'notification-templates',
        where: {
          and: [
            { type: { equals: notificationType } },
            { active: { equals: true } },
          ],
        },
        sort: '-defaultTemplate',
        limit: 1,
      })

      if (templates.docs.length === 0) {
        return NextResponse.json({ 
          error: `No active template found for ${notificationType} notifications. Please create one in the admin panel.` 
        }, { status: 400 })
      }

      const template = templates.docs[0]

      // Prepare variables for template substitution
      const variables = {
        jobNumber: job.jobId || job.id,
        clientName: client.name,
        location: job.captureAddress || 'Location TBD',
        targetDate: job.targetDate ? new Date(job.targetDate).toLocaleString() : 'TBD',
        scannedDate: job.scannedDate ? new Date(job.scannedDate).toLocaleString() : new Date().toLocaleString(),
        uploadLink: job.uploadLink || '',
        customMessage: customMessage || '',
        clientCustomMessage: notificationPrefs.customMessage || '',
      }

      // Replace variables in subject and body
      subject = template.subject
      body = template.body

      Object.entries(variables).forEach(([key, value]) => {
        const regex = new RegExp(`{{${key}}}`, 'g')
        subject = subject.replace(regex, value)
        body = body.replace(regex, value)
      })
    }

    // Send email notification
    await payload.sendEmail({
      to: recipientEmail,
      subject,
      text: body,
    })

    // TODO: Send SMS if phone number is provided
    // if (notificationPrefs.notificationPhone) {
    //   await sendSMS(notificationPrefs.notificationPhone, body)
    // }

    // Log the notification in the database (optional - could create a notifications collection)
    console.log(`Notification sent to ${recipientEmail} for job ${job.id}`)

    return NextResponse.json({ 
      success: true, 
      message: `Notification sent to ${recipientEmail}` 
    })

  } catch (error: any) {
    console.error('Error sending notification:', error)
    return NextResponse.json({ 
      error: 'Failed to send notification', 
      details: error.message 
    }, { status: 500 })
  }
}
