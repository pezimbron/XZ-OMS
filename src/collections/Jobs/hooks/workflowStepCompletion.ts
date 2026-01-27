import type { CollectionBeforeChangeHook } from 'payload'

export const workflowStepCompletion: CollectionBeforeChangeHook = async ({
  data,
  req,
  operation,
  originalDoc,
}) => {
  if (operation !== 'update') {
    return data
  }

  const payload = req.payload

  try {
    // Check if workflowSteps have changed
    const currentSteps = data.workflowSteps || []
    const previousSteps = originalDoc?.workflowSteps || []

    // Find newly completed steps
    const newlyCompletedSteps = currentSteps.filter((currentStep: any, index: number) => {
      const previousStep = previousSteps[index]
      return currentStep.completed && (!previousStep || !previousStep.completed)
    })

    if (newlyCompletedSteps.length === 0) {
      return data
    }

    // Get the workflow template to access triggers
    const workflowTemplateId = data.workflowTemplate || originalDoc?.workflowTemplate
    if (!workflowTemplateId) {
      console.log('[Workflow] No workflow template assigned to job')
      return data
    }

    // Fetch the workflow template
    const templateId = typeof workflowTemplateId === 'object' ? workflowTemplateId.id : workflowTemplateId
    const template = await payload.findByID({
      collection: 'workflow-templates',
      id: templateId,
      overrideAccess: true,
    })

    if (!template || !template.steps) {
      console.log('[Workflow] Template not found or has no steps')
      return data
    }

    // Process each newly completed step
    for (const completedStep of newlyCompletedSteps) {
      const stepName = completedStep.stepName
      const templateStep = template.steps.find((s: any) => s.name === stepName)

      if (!templateStep) {
        console.log(`[Workflow] Template step not found for: ${stepName}`)
        continue
      }

      console.log(`[Workflow] Processing completed step: ${stepName}`)

      // Update job status based on step's status mapping
      if (templateStep.statusMapping) {
        data.status = templateStep.statusMapping
        console.log(`[Workflow] Updated status to: ${templateStep.statusMapping}`)
      }

      // Handle triggers
      const triggers = templateStep.triggers || {}

      // Create in-app notification
      if (triggers.sendNotification && triggers.notificationRecipients) {
        await createNotifications(
          payload,
          data,
          triggers.notificationRecipients,
          triggers.notificationMessage || `Step "${stepName}" completed for job ${data.jobId}`,
        )
      }

      // Send client email
      if (triggers.sendClientEmail && triggers.emailTemplate) {
        await sendClientEmail(payload, data, triggers.emailTemplate)
      }

      // Create invoice
      if (triggers.createInvoice) {
        await createInvoice(payload, data)
      }

      // Schedule recurring invoice
      if (triggers.createRecurringInvoice && triggers.recurringInvoiceDelay) {
        await scheduleRecurringInvoice(
          payload,
          data,
          triggers.recurringInvoiceDelay,
          triggers.recurringInvoiceAmount || 0,
        )
      }
    }

    return data
  } catch (error) {
    console.error('[Workflow] Error processing step completion:', error)
    return data
  }
}

// Helper function to create notifications
async function createNotifications(
  payload: any,
  job: any,
  recipients: string[],
  message: string,
) {
  try {
    // Replace placeholders in message
    const formattedMessage = message
      .replace(/\{\{jobId\}\}/g, job.jobId || '')
      .replace(/\{\{modelName\}\}/g, job.modelName || '')
      .replace(/\{\{clientName\}\}/g, job.client?.name || '')
      .replace(/\{\{targetDate\}\}/g, job.targetDate ? new Date(job.targetDate).toLocaleDateString() : '')

    // Get users based on recipient roles
    const users = await getUsersByRoles(payload, recipients, job)

    // Create notification for each user
    for (const user of users) {
      await payload.create({
        collection: 'notifications',
        data: {
          user: user.id,
          type: 'info',
          title: `Job Update: ${job.jobId}`,
          message: formattedMessage,
          relatedJob: job.id,
          actionUrl: `/oms/jobs/${job.id}`,
          read: false,
        },
      })
    }

    console.log(`[Workflow] Created ${users.length} notification(s)`)
  } catch (error) {
    console.error('[Workflow] Error creating notifications:', error)
  }
}

// Helper function to get users by roles
async function getUsersByRoles(payload: any, roles: string[], job: any) {
  const usersById = new Map<any, any>()

  const addUser = (user: any) => {
    if (!user?.id) return
    usersById.set(user.id, user)
  }

  const validRoles = new Set([
    'super-admin',
    'sales-admin',
    'ops-manager',
    'tech',
    'client-partner',
    'post-producer',
  ])

  const normalizeRole = (rawRole: unknown): string | null => {
    if (typeof rawRole !== 'string') return null
    const role = rawRole.trim().toLowerCase()

    const roleMap: Record<string, string> = {
      'post-production': 'post-producer',
      'post producer': 'post-producer',
      'postproducer': 'post-producer',
    }

    return roleMap[role] ?? role
  }

  for (const rawRole of roles) {
    const role = normalizeRole(rawRole)
    if (!role) continue

    if (role === 'tech' && job.tech) {
      // Get the assigned tech
      const techId = typeof job.tech === 'object' ? job.tech.id : job.tech
      const tech = await payload.findByID({
        collection: 'technicians',
        id: techId,
        overrideAccess: true,
      })
      if (tech && tech.user) {
        const userId = typeof tech.user === 'object' ? tech.user.id : tech.user
        addUser({ id: userId })
      }
    } else {
      if (!validRoles.has(role)) {
        continue
      }

      // Get users by role
      const roleUsers = await payload.find({
        collection: 'users',
        where: {
          role: {
            equals: role,
          },
        },
        limit: 100,
        overrideAccess: true,
      })
      for (const user of roleUsers.docs ?? []) {
        addUser(user)
      }
    }
  }

  return Array.from(usersById.values())
}

// Helper function to send client email
async function sendClientEmail(payload: any, job: any, template: string) {
  try {
    // Get client details
    const clientId = typeof job.client === 'object' ? job.client.id : job.client
    if (!clientId) {
      console.log('[Workflow] No client assigned to job, skipping email')
      return
    }

    const client = await payload.findByID({
      collection: 'clients',
      id: clientId,
      overrideAccess: true,
    })

    if (!client?.email) {
      console.log('[Workflow] Client has no email address, skipping email')
      return
    }

    // Build email content based on template
    let subject = ''
    let html = ''

    if (template === 'job-complete') {
      subject = `Your Project ${job.jobId} is Complete - ${job.modelName}`
      html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">Your Project is Complete! 🎉</h2>
          
          <p>Hi ${client.name},</p>
          
          <p>Great news! Your project <strong>${job.jobId}</strong> for <strong>${job.modelName}</strong> has been completed and is ready for delivery.</p>
          
          <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0;">Project Details:</h3>
            <ul style="list-style: none; padding: 0;">
              <li><strong>Job ID:</strong> ${job.jobId}</li>
              <li><strong>Property:</strong> ${job.modelName}</li>
              <li><strong>Location:</strong> ${job.captureAddress || 'N/A'}, ${job.city || ''} ${job.state || ''}</li>
              ${job.targetDate ? `<li><strong>Capture Date:</strong> ${new Date(job.targetDate).toLocaleDateString()}</li>` : ''}
            </ul>
          </div>
          
          <p>Your deliverables are now available. Our team will be in touch shortly with download links and next steps.</p>
          
          <p>If you have any questions or need any revisions, please don't hesitate to reach out.</p>
          
          <p>Thank you for choosing XZ Reality Capture!</p>
          
          <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
            Best regards,<br>
            The XZ OMS Team
          </p>
        </div>
      `
    } else {
      // Generic template
      subject = `Update on Your Project ${job.jobId}`
      html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Project Update</h2>
          <p>Hi ${client.name},</p>
          <p>This is an update regarding your project <strong>${job.jobId}</strong> for <strong>${job.modelName}</strong>.</p>
          <p>If you have any questions, please contact us.</p>
          <p>Thank you!</p>
        </div>
      `
    }

    // Send email using Payload's email adapter
    await payload.sendEmail({
      to: client.email,
      subject: subject,
      html: html,
    })

    console.log(`[Workflow] ✓ Email sent to ${client.email} for job ${job.jobId}`)
  } catch (error) {
    console.error('[Workflow] Error sending client email:', error)
  }
}

// Helper function to create invoice
async function createInvoice(payload: any, job: any) {
  try {
    // Mark job as ready for invoicing
    await payload.update({
      collection: 'jobs',
      where: {
        id: {
          equals: job.id,
        },
      },
      data: {
        invoiceStatus: 'ready',
      },
    })
    
    console.log(`[Workflow] ✓ Job ${job.jobId} marked as ready for invoicing`)
    
    // Future: Create actual invoice record or sync to QuickBooks
    // await payload.create({
    //   collection: 'invoices',
    //   data: {
    //     job: job.id,
    //     client: job.client,
    //     amount: job.totalWithTax || job.totalPrice,
    //     status: 'pending',
    //     dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    //   },
    // })
  } catch (error) {
    console.error('[Workflow] Error creating invoice:', error)
  }
}

// Helper function to schedule recurring invoice
async function scheduleRecurringInvoice(
  payload: any,
  job: any,
  delayDays: number,
  amount: number,
) {
  try {
    // TODO: Implement recurring invoice scheduling
    // This could use a job queue, cron job, or scheduled task
    console.log(
      `[Workflow] Would schedule recurring invoice for job ${job.jobId} in ${delayDays} days for $${amount}`,
    )
    
    // Example implementation:
    // const scheduledDate = new Date(Date.now() + delayDays * 24 * 60 * 60 * 1000)
    // await payload.create({
    //   collection: 'scheduled-invoices',
    //   data: {
    //     job: job.id,
    //     client: job.client,
    //     amount: amount,
    //     scheduledFor: scheduledDate,
    //     type: 'recurring',
    //     description: 'Annual hosting fee',
    //   },
    // })
  } catch (error) {
    console.error('[Workflow] Error scheduling recurring invoice:', error)
  }
}
