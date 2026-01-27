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

    const schedulingRequest = (job as any).schedulingRequest
    if (!schedulingRequest) {
      return NextResponse.json({ error: 'No scheduling request found' }, { status: 400 })
    }

    // Check if email service is configured
    const hasEmailConfig = process.env.RESEND_API_KEY && (process.env.RESEND_DEFAULT_FROM || process.env.RESEND_DEFAULT_EMAIL)
    
    if (!hasEmailConfig) {
      payload.logger.warn('[Scheduling] Email notifications disabled - RESEND_API_KEY or RESEND_DEFAULT_FROM not configured')
      return NextResponse.json({ success: false, message: 'Email service not configured' })
    }

    // Build email content based on request type
    const baseUrl = process.env.PAYLOAD_PUBLIC_SERVER_URL || 'http://localhost:3000'
    const portalLink = `${baseUrl}/forms/job/${(job as any).completionToken}`
    
    let requestDetails = ''
    const requestType = schedulingRequest.requestType
    
    if (requestType === 'time-windows') {
      requestDetails = '<h3 style="color: #1f2937; margin-top: 20px;">Available Time Windows:</h3><div style="margin-top: 12px;">'
      schedulingRequest.timeOptions?.forEach((option: any, index: number) => {
        const date = new Date(option.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
        requestDetails += `
          <div style="background-color: #f3f4f6; padding: 12px; border-radius: 6px; margin-bottom: 8px;">
            <strong>Option ${option.optionNumber || index + 1}:</strong> ${date}<br/>
            <span style="color: #6b7280; font-size: 14px;">Time: ${option.startTime || 'TBD'} - ${option.endTime || 'TBD'}</span>
          </div>
        `
      })
      requestDetails += '</div><p style="color: #6b7280; margin-top: 16px;">Please select your preferred time window and provide your preferred start time.</p>'
    } else if (requestType === 'specific-time') {
      const option = schedulingRequest.timeOptions?.[0]
      if (option) {
        const date = new Date(option.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
        requestDetails = `
          <h3 style="color: #1f2937; margin-top: 20px;">Proposed Time:</h3>
          <div style="background-color: #dbeafe; padding: 16px; border-radius: 8px; margin-top: 12px; border-left: 4px solid #2563eb;">
            <strong style="font-size: 16px;">${date}</strong><br/>
            <span style="color: #1e40af; font-size: 14px; margin-top: 4px; display: block;">Time: ${option.specificTime || 'TBD'}</span>
          </div>
          <p style="color: #6b7280; margin-top: 16px;">Please confirm if you can make this time, or decline if unavailable.</p>
        `
      }
    } else if (requestType === 'tech-proposes') {
      requestDetails = `
        <h3 style="color: #1f2937; margin-top: 20px;">Request:</h3>
        <div style="background-color: #fef3c7; padding: 16px; border-radius: 8px; margin-top: 12px; border-left: 4px solid #f59e0b;">
          <p style="color: #92400e; margin: 0;">${schedulingRequest.requestMessage || 'Please propose 3 time slots that work for you.'}</p>
        </div>
        <p style="color: #6b7280; margin-top: 16px;">Please provide 3 date/time options that work for your schedule.</p>
      `
    }

    const deadline = schedulingRequest.deadline ? new Date(schedulingRequest.deadline).toLocaleString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric', 
      hour: 'numeric', 
      minute: '2-digit' 
    }) : 'ASAP'

    // Send email
    await payload.sendEmail({
      to: tech.email,
      subject: `⏰ Scheduling Request for Job ${job.jobId}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">📅 Scheduling Request</h1>
          </div>
          
          <div style="background-color: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
            <p style="color: #374151; font-size: 16px; margin-top: 0;">Hi ${tech.name},</p>
            
            <p style="color: #374151; font-size: 16px;">We need to schedule the following job:</p>
            
            <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #e5e7eb;">
              <h2 style="color: #1f2937; margin: 0 0 12px 0; font-size: 20px;">Job ${job.jobId}</h2>
              <p style="color: #6b7280; margin: 4px 0;"><strong>Project:</strong> ${job.modelName || 'N/A'}</p>
              <p style="color: #6b7280; margin: 4px 0;"><strong>Location:</strong> ${job.captureAddress || 'N/A'}${job.city ? `, ${job.city}` : ''}${job.state ? `, ${job.state}` : ''}</p>
              <p style="color: #6b7280; margin: 4px 0;"><strong>Response Deadline:</strong> <span style="color: #dc2626; font-weight: 600;">${deadline}</span></p>
            </div>

            ${requestDetails}

            <div style="text-align: center; margin: 30px 0;">
              <a href="${portalLink}" 
                 style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                📋 View & Respond to Request
              </a>
            </div>

            <div style="background-color: #fef3c7; padding: 16px; border-radius: 8px; margin-top: 24px; border-left: 4px solid #f59e0b;">
              <p style="color: #92400e; margin: 0; font-size: 14px;">
                ⏰ <strong>Important:</strong> Please respond by ${deadline} to secure this job.
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

    payload.logger.info(`[Scheduling] Sent scheduling request email to ${tech.email} for job ${job.jobId}`)

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error sending scheduling request email:', error)
    return NextResponse.json(
      { error: 'Failed to send email', details: error.message },
      { status: 500 }
    )
  }
}
