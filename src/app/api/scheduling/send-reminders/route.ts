import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'

export async function GET(request: NextRequest) {
  try {
    const payload = await getPayload({ config })

    // Verify this is called from a cron job (optional security check)
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if email service is configured
    const hasEmailConfig = process.env.RESEND_API_KEY && (process.env.RESEND_DEFAULT_FROM || process.env.RESEND_DEFAULT_EMAIL)
    
    if (!hasEmailConfig) {
      payload.logger.warn('[Scheduling Reminders] Email notifications disabled - RESEND_API_KEY or RESEND_DEFAULT_FROM not configured')
      return NextResponse.json({ success: false, message: 'Email service not configured' })
    }

    // Find all jobs with scheduling requests that need reminders
    const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000)
    
    const jobs = await payload.find({
      collection: 'jobs',
      where: {
        and: [
          {
            'schedulingRequest.sentAt': {
              less_than: sixHoursAgo.toISOString(),
            },
          },
          {
            'schedulingRequest.reminderSent': {
              not_equals: true,
            },
          },
          {
            'techResponse.respondedAt': {
              exists: false,
            },
          },
          {
            targetDate: {
              exists: false,
            },
          },
        ],
      },
      depth: 2,
      limit: 100,
    })

    payload.logger.info(`[Scheduling Reminders] Found ${jobs.docs.length} jobs needing reminders`)

    let sentCount = 0
    let errorCount = 0

    // Send reminder emails
    for (const job of jobs.docs) {
      try {
        const tech = job.tech as any
        if (!tech || !tech.email) {
          payload.logger.warn(`[Scheduling Reminders] Job ${job.jobId} has no tech or tech email`)
          continue
        }

        const schedulingRequest = (job as any).schedulingRequest
        if (!schedulingRequest) continue

        const baseUrl = process.env.PAYLOAD_PUBLIC_SERVER_URL || 'http://localhost:3000'
        const portalLink = `${baseUrl}/forms/job/${(job as any).completionToken}`

        const deadline = schedulingRequest.deadline ? new Date(schedulingRequest.deadline).toLocaleString('en-US', { 
          weekday: 'short', 
          month: 'short', 
          day: 'numeric', 
          hour: 'numeric', 
          minute: '2-digit' 
        }) : 'ASAP'

        // Calculate time remaining
        let timeRemaining = ''
        if (schedulingRequest.deadline) {
          const deadlineDate = new Date(schedulingRequest.deadline)
          const now = new Date()
          const hoursRemaining = Math.floor((deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60))
          
          if (hoursRemaining > 0) {
            timeRemaining = `<p style="color: #dc2626; font-weight: 600; font-size: 16px; margin: 12px 0;">⏰ ${hoursRemaining} hours remaining to respond!</p>`
          } else {
            timeRemaining = `<p style="color: #dc2626; font-weight: 600; font-size: 16px; margin: 12px 0;">⚠️ Deadline has passed!</p>`
          }
        }

        // Send reminder email
        await payload.sendEmail({
          to: tech.email,
          subject: `⏰ REMINDER: Scheduling Request for Job ${job.jobId}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
                <h1 style="color: white; margin: 0; font-size: 28px;">⏰ Scheduling Reminder</h1>
              </div>
              
              <div style="background-color: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
                <p style="color: #374151; font-size: 16px; margin-top: 0;">Hi ${tech.name},</p>
                
                <div style="background-color: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
                  <p style="color: #92400e; margin: 0; font-size: 16px; font-weight: 600;">
                    ⚠️ You haven't responded to the scheduling request yet!
                  </p>
                  ${timeRemaining}
                </div>

                <p style="color: #374151; font-size: 16px;">This is a reminder about the scheduling request for:</p>
                
                <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #e5e7eb;">
                  <h2 style="color: #1f2937; margin: 0 0 12px 0; font-size: 20px;">Job ${job.jobId}</h2>
                  <p style="color: #6b7280; margin: 4px 0;"><strong>Project:</strong> ${job.modelName || 'N/A'}</p>
                  <p style="color: #6b7280; margin: 4px 0;"><strong>Location:</strong> ${job.captureAddress || 'N/A'}${job.city ? `, ${job.city}` : ''}${job.state ? `, ${job.state}` : ''}</p>
                  <p style="color: #6b7280; margin: 4px 0;"><strong>Response Deadline:</strong> <span style="color: #dc2626; font-weight: 600;">${deadline}</span></p>
                </div>

                <div style="text-align: center; margin: 30px 0;">
                  <a href="${portalLink}" 
                     style="display: inline-block; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                    📋 Respond Now
                  </a>
                </div>

                <div style="background-color: #fee2e2; padding: 16px; border-radius: 8px; margin-top: 24px; border-left: 4px solid #ef4444;">
                  <p style="color: #991b1b; margin: 0; font-size: 14px;">
                    ⚠️ <strong>Important:</strong> Please respond as soon as possible to avoid losing this job opportunity. If you cannot accept, please decline so we can reassign.
                  </p>
                </div>

                <p style="color: #9ca3af; font-size: 14px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
                  Questions? Reply to this email or contact the operations team.<br/>
                  <span style="color: #d1d5db;">XZ Reality Capture</span>
                </p>
              </div>
            </div>
          `,
        })

        // Mark reminder as sent
        await payload.update({
          collection: 'jobs',
          id: job.id,
          data: {
            schedulingRequest: {
              ...schedulingRequest,
              reminderSent: true,
              reminderSentAt: new Date().toISOString(),
            },
          },
        })

        payload.logger.info(`[Scheduling Reminders] Sent reminder to ${tech.email} for job ${job.jobId}`)
        sentCount++
      } catch (error) {
        payload.logger.error(`[Scheduling Reminders] Failed to send reminder for job ${job.jobId}:`, error)
        errorCount++
      }
    }

    return NextResponse.json({
      success: true,
      message: `Sent ${sentCount} reminders, ${errorCount} errors`,
      sentCount,
      errorCount,
      totalChecked: jobs.docs.length,
    })
  } catch (error: any) {
    console.error('Error sending scheduling reminders:', error)
    return NextResponse.json(
      { error: 'Failed to send reminders', details: error.message },
      { status: 500 }
    )
  }
}
