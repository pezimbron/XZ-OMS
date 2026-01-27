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

    // Get tech information
    const tech = job.tech as any
    if (!tech || !tech.email) {
      return NextResponse.json({ error: 'Tech not found or no email' }, { status: 400 })
    }

    if (!job.targetDate) {
      return NextResponse.json({ error: 'No target date set' }, { status: 400 })
    }

    // Check if email service is configured
    const hasEmailConfig = process.env.RESEND_API_KEY && (process.env.RESEND_DEFAULT_FROM || process.env.RESEND_DEFAULT_EMAIL)
    
    if (!hasEmailConfig) {
      payload.logger.warn('[Scheduling] Email notifications disabled - RESEND_API_KEY or RESEND_DEFAULT_FROM not configured')
      return NextResponse.json({ success: false, message: 'Email service not configured' })
    }

    // Format the confirmed date/time
    const confirmedDate = new Date(job.targetDate)
    const dateFormatted = confirmedDate.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    })
    const timeFormatted = confirmedDate.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true
    })

    const baseUrl = process.env.PAYLOAD_PUBLIC_SERVER_URL || 'http://localhost:3000'
    const portalLink = `${baseUrl}/forms/job/${(job as any).completionToken}`

    // Send confirmation email
    await payload.sendEmail({
      to: tech.email,
      subject: `✅ Schedule Confirmed for Job ${job.jobId}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">✅ Schedule Confirmed!</h1>
          </div>
          
          <div style="background-color: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
            <p style="color: #374151; font-size: 16px; margin-top: 0;">Hi ${tech.name},</p>
            
            <p style="color: #374151; font-size: 16px;">Great news! Your schedule has been confirmed for the following job:</p>
            
            <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #e5e7eb;">
              <h2 style="color: #1f2937; margin: 0 0 12px 0; font-size: 20px;">Job ${job.jobId}</h2>
              <p style="color: #6b7280; margin: 4px 0;"><strong>Project:</strong> ${job.modelName || 'N/A'}</p>
              <p style="color: #6b7280; margin: 4px 0;"><strong>Location:</strong> ${job.captureAddress || 'N/A'}${job.city ? `, ${job.city}` : ''}${job.state ? `, ${job.state}` : ''}</p>
            </div>

            <div style="background-color: #d1fae5; padding: 24px; border-radius: 12px; margin: 24px 0; border-left: 4px solid #10b981; text-align: center;">
              <div style="color: #065f46; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;">
                📅 Confirmed Date & Time
              </div>
              <div style="color: #047857; font-size: 24px; font-weight: 700; margin: 8px 0;">
                ${dateFormatted}
              </div>
              <div style="color: #059669; font-size: 20px; font-weight: 600;">
                🕐 ${timeFormatted}
              </div>
            </div>

            ${job.techInstructions ? `
              <div style="background-color: #f3f4f6; padding: 16px; border-radius: 8px; margin-top: 20px;">
                <h4 style="color: #374151; margin: 0 0 8px 0;">📋 Instructions:</h4>
                <p style="color: #6b7280; margin: 0; white-space: pre-wrap;">${job.techInstructions}</p>
              </div>
            ` : ''}

            ${job.schedulingNotes ? `
              <div style="background-color: #fef3c7; padding: 16px; border-radius: 8px; margin-top: 12px; border-left: 4px solid #f59e0b;">
                <h4 style="color: #92400e; margin: 0 0 8px 0;">📝 Scheduling Notes:</h4>
                <p style="color: #78350f; margin: 0; white-space: pre-wrap;">${job.schedulingNotes}</p>
              </div>
            ` : ''}

            <div style="text-align: center; margin: 30px 0;">
              <a href="${portalLink}" 
                 style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                📱 View Job Portal
              </a>
            </div>

            <div style="background-color: #dbeafe; padding: 16px; border-radius: 8px; margin-top: 24px; border-left: 4px solid #2563eb;">
              <p style="color: #1e40af; margin: 0; font-size: 14px;">
                💡 <strong>Reminder:</strong> Please arrive on time and review all instructions before the job. If you have any questions or need to make changes, contact the operations team immediately.
              </p>
            </div>

            <div style="margin-top: 30px; padding: 20px; background-color: #f9fafb; border-radius: 8px; text-align: center;">
              <p style="color: #6b7280; margin: 0 0 12px 0; font-size: 14px;">
                <strong>Add to Calendar</strong>
              </p>
              <p style="color: #9ca3af; margin: 0; font-size: 12px;">
                Save this email or add the event to your calendar to ensure you don't miss it!
              </p>
            </div>

            <p style="color: #9ca3af; font-size: 14px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
              Questions or need to reschedule? Contact the operations team.<br/>
              <span style="color: #d1d5db;">XZ Reality Capture</span>
            </p>
          </div>
        </div>
      `,
    })

    payload.logger.info(`[Scheduling] Sent confirmation email to ${tech.email} for job ${job.jobId}`)

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error sending confirmation email:', error)
    return NextResponse.json(
      { error: 'Failed to send email', details: error.message },
      { status: 500 }
    )
  }
}
