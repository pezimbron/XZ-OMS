import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'

export async function POST(request: NextRequest) {
  try {
    const payload = await getPayload({ config })
    const { jobId } = await request.json()

    // Fetch the job with tech relationship
    const job = await payload.findByID({
      collection: 'jobs',
      id: jobId,
      depth: 2,
    })

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    const tech = job.tech as any
    const techResponse = (job as any).techResponse
    const schedulingRequest = (job as any).schedulingRequest

    if (!techResponse) {
      return NextResponse.json({ error: 'No tech response found' }, { status: 400 })
    }

    // Check if email service is configured
    const hasEmailConfig = process.env.RESEND_API_KEY && (process.env.RESEND_DEFAULT_FROM || process.env.RESEND_DEFAULT_EMAIL)
    
    if (!hasEmailConfig) {
      payload.logger.warn('[Scheduling] Email notifications disabled - RESEND_API_KEY or RESEND_DEFAULT_FROM not configured')
      return NextResponse.json({ success: false, message: 'Email service not configured' })
    }

    // Get ops team members to notify
    const opsUsers = await payload.find({
      collection: 'users',
      where: {
        role: {
          in: ['ops-manager', 'sales-admin', 'super-admin'],
        },
      },
      limit: 100,
    })

    if (opsUsers.docs.length === 0) {
      payload.logger.warn('[Scheduling] No ops users found to notify')
      return NextResponse.json({ success: false, message: 'No ops users to notify' })
    }

    // Build response details based on whether tech accepted or declined
    const baseUrl = process.env.NEXT_PUBLIC_SERVER_URL || process.env.PAYLOAD_PUBLIC_SERVER_URL || 'http://localhost:3000'
    const jobLink = `${baseUrl}/oms/jobs/${job.id}?tab=instructions`
    
    let responseDetails = ''
    let statusColor = '#10b981' // green
    let statusIcon = '✅'
    let statusText = 'Accepted'

    if (!techResponse.interested) {
      statusColor = '#ef4444' // red
      statusIcon = '❌'
      statusText = 'Declined'
      responseDetails = `
        <div style="background-color: #fee2e2; padding: 16px; border-radius: 8px; margin-top: 12px; border-left: 4px solid #ef4444;">
          <h3 style="color: #991b1b; margin: 0 0 8px 0;">Tech Declined</h3>
          ${techResponse.declineReason ? `<p style="color: #7f1d1d; margin: 0;"><strong>Reason:</strong> ${techResponse.declineReason}</p>` : ''}
        </div>
      `
    } else {
      // Tech accepted
      if (schedulingRequest.requestType === 'time-windows' && techResponse.selectedOption) {
        const selectedOpt = schedulingRequest.timeOptions?.find((opt: any) => opt.optionNumber === techResponse.selectedOption)
        if (selectedOpt) {
          const date = new Date(selectedOpt.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
          responseDetails = `
            <div style="background-color: #d1fae5; padding: 16px; border-radius: 8px; margin-top: 12px; border-left: 4px solid #10b981;">
              <h3 style="color: #065f46; margin: 0 0 8px 0;">Selected Time Window</h3>
              <p style="color: #047857; margin: 4px 0;"><strong>Date:</strong> ${date}</p>
              ${techResponse.preferredStartTime ? `<p style="color: #047857; margin: 4px 0;"><strong>Preferred Start Time:</strong> ${techResponse.preferredStartTime}</p>` : ''}
            </div>
          `
        }
      } else if (schedulingRequest.requestType === 'specific-time') {
        const proposedOpt = schedulingRequest.timeOptions?.[0]
        if (proposedOpt) {
          const date = new Date(proposedOpt.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
          responseDetails = `
            <div style="background-color: #d1fae5; padding: 16px; border-radius: 8px; margin-top: 12px; border-left: 4px solid #10b981;">
              <h3 style="color: #065f46; margin: 0 0 8px 0;">Accepted Proposed Time</h3>
              <p style="color: #047857; margin: 4px 0;"><strong>Date:</strong> ${date}</p>
              <p style="color: #047857; margin: 4px 0;"><strong>Time:</strong> ${proposedOpt.specificTime || 'TBD'}</p>
            </div>
          `
        }
      } else if (schedulingRequest.requestType === 'tech-proposes' && techResponse.proposedOptions) {
        responseDetails = `
          <div style="background-color: #d1fae5; padding: 16px; border-radius: 8px; margin-top: 12px; border-left: 4px solid #10b981;">
            <h3 style="color: #065f46; margin: 0 0 12px 0;">Tech's Proposed Time Options</h3>
        `
        techResponse.proposedOptions.forEach((option: any, index: number) => {
          const date = new Date(option.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
          responseDetails += `
            <div style="background-color: white; padding: 12px; border-radius: 6px; margin-bottom: 8px;">
              <strong style="color: #065f46;">Option ${index + 1}:</strong> ${date} at ${option.startTime}
              ${option.notes ? `<br/><span style="color: #6b7280; font-size: 14px;">${option.notes}</span>` : ''}
            </div>
          `
        })
        responseDetails += '</div>'
      }

      if (techResponse.notes) {
        responseDetails += `
          <div style="background-color: #f3f4f6; padding: 16px; border-radius: 8px; margin-top: 12px;">
            <h4 style="color: #374151; margin: 0 0 8px 0;">Additional Notes:</h4>
            <p style="color: #6b7280; margin: 0; white-space: pre-wrap;">${techResponse.notes}</p>
          </div>
        `
      }
    }

    const respondedAt = new Date(techResponse.respondedAt).toLocaleString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric', 
      hour: 'numeric', 
      minute: '2-digit' 
    })

    // Send email to each ops user (with delay to avoid rate limits)
    for (let i = 0; i < opsUsers.docs.length; i++) {
      const opsUser = opsUsers.docs[i]
      if (!opsUser.email) continue

      // Add delay between emails to avoid Resend rate limit (2 req/sec)
      if (i > 0) {
        await new Promise(resolve => setTimeout(resolve, 600))
      }

      try {
        await payload.sendEmail({
          to: opsUser.email,
          subject: `${statusIcon} Tech ${statusText} Scheduling for Job ${job.jobId}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
                <h1 style="color: white; margin: 0; font-size: 28px;">${statusIcon} Scheduling Response Received</h1>
              </div>
              
              <div style="background-color: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
                <p style="color: #374151; font-size: 16px; margin-top: 0;">Hi ${opsUser.name},</p>
                
                <p style="color: #374151; font-size: 16px;"><strong>${tech?.name || 'A technician'}</strong> has responded to the scheduling request:</p>
                
                <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #e5e7eb;">
                  <h2 style="color: #1f2937; margin: 0 0 12px 0; font-size: 20px;">Job ${job.jobId}</h2>
                  <p style="color: #6b7280; margin: 4px 0;"><strong>Project:</strong> ${job.modelName || 'N/A'}</p>
                  <p style="color: #6b7280; margin: 4px 0;"><strong>Tech:</strong> ${tech?.name || 'N/A'}</p>
                  <p style="color: #6b7280; margin: 4px 0;"><strong>Responded:</strong> ${respondedAt}</p>
                  <div style="margin-top: 12px; padding: 12px; background-color: ${statusColor}15; border-radius: 6px; border-left: 4px solid ${statusColor};">
                    <strong style="color: ${statusColor}; font-size: 16px;">${statusIcon} ${statusText}</strong>
                  </div>
                </div>

                ${responseDetails}

                <div style="text-align: center; margin: 30px 0;">
                  <a href="${jobLink}" 
                     style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                    📋 View Job & ${techResponse.interested ? 'Accept Time' : 'Reassign'}
                  </a>
                </div>

                ${techResponse.interested ? `
                  <div style="background-color: #dbeafe; padding: 16px; border-radius: 8px; margin-top: 24px; border-left: 4px solid #2563eb;">
                    <p style="color: #1e40af; margin: 0; font-size: 14px;">
                      💡 <strong>Next Step:</strong> Review the response and click "Accept This Time" to confirm the schedule.
                    </p>
                  </div>
                ` : `
                  <div style="background-color: #fef3c7; padding: 16px; border-radius: 8px; margin-top: 24px; border-left: 4px solid #f59e0b;">
                    <p style="color: #92400e; margin: 0; font-size: 14px;">
                      ⚠️ <strong>Action Required:</strong> Tech declined. Consider reassigning to another technician.
                    </p>
                  </div>
                `}

                <p style="color: #9ca3af; font-size: 14px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
                  This is an automated notification from the scheduling system.<br/>
                  <span style="color: #d1d5db;">XZ Reality Capture OMS</span>
                </p>
              </div>
            </div>
          `,
        })

        payload.logger.info(`[Scheduling] Sent tech response email to ${opsUser.email} for job ${job.jobId}`)
      } catch (emailError) {
        payload.logger.error(`[Scheduling] Failed to send email to ${opsUser.email}:`, emailError)
      }

      // Create in-app notification
      try {
        await payload.create({
          collection: 'notifications',
          data: {
            user: opsUser.id,
            title: techResponse.interested ? 'Tech Accepted Scheduling' : 'Tech Declined Scheduling',
            message: techResponse.interested 
              ? `${tech?.name || 'A technician'} has accepted the scheduling request for Job ${job.jobId}. Review and confirm the time.`
              : `${tech?.name || 'A technician'} has declined the scheduling request for Job ${job.jobId}. ${techResponse.declineReason ? `Reason: ${techResponse.declineReason}` : ''}`,
            type: techResponse.interested ? 'info' : 'warning',
            read: false,
            relatedJob: job.id,
            actionUrl: `/oms/jobs/${job.id}?tab=instructions`,
          },
        })
        payload.logger.info(`[Scheduling] Created in-app notification for ${opsUser.email}`)
      } catch (notifError) {
        payload.logger.error(`[Scheduling] Failed to create notification for ${opsUser.email}:`, notifError)
      }
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error sending tech response email:', error)
    return NextResponse.json(
      { error: 'Failed to send email', details: error.message },
      { status: 500 }
    )
  }
}
