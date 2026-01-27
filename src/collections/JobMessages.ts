import type { CollectionConfig } from 'payload'

export const JobMessages: CollectionConfig = {
  slug: 'job-messages',
  admin: {
    useAsTitle: 'message',
    defaultColumns: ['job', 'author', 'messageType', 'createdAt'],
    group: 'Operations',
  },
  access: {
    read: ({ req: { user } }) => {
      if (!user) return false
      // All authenticated users can read messages
      return true
    },
    create: ({ req: { user } }) => {
      if (!user) return false
      // All authenticated users can create messages
      return true
    },
    update: ({ req: { user } }) => {
      if (!user) return false
      // Only admins can update messages
      return ['super-admin', 'sales-admin', 'ops-manager'].includes(user.role)
    },
    delete: ({ req: { user } }) => {
      if (!user) return false
      // Only admins can delete messages
      return ['super-admin', 'sales-admin', 'ops-manager'].includes(user.role)
    },
  },
  fields: [
    {
      name: 'job',
      type: 'relationship',
      relationTo: 'jobs',
      required: true,
      index: true,
      admin: {
        description: 'The job this message belongs to',
      },
    },
    {
      name: 'author',
      type: 'relationship',
      relationTo: ['users', 'technicians'],
      required: true,
      admin: {
        description: 'Who sent this message',
      },
    },
    {
      name: 'message',
      type: 'textarea',
      required: true,
      admin: {
        rows: 4,
      },
    },
    {
      name: 'messageType',
      type: 'select',
      required: true,
      defaultValue: 'message',
      options: [
        { label: 'Message', value: 'message' },
        { label: 'Question', value: 'question' },
        { label: 'Answer', value: 'answer' },
        { label: 'Update', value: 'update' },
        { label: 'Issue', value: 'issue' },
        { label: 'QC Feedback', value: 'qc-feedback' },
      ],
      admin: {
        description: 'Type of message for categorization',
      },
    },
    {
      name: 'attachments',
      type: 'array',
      label: 'Attachments',
      fields: [
        {
          name: 'file',
          type: 'upload',
          relationTo: 'media',
          required: true,
        },
        {
          name: 'description',
          type: 'text',
        },
      ],
    },
    {
      name: 'isRead',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        description: 'Has this message been read by the recipient',
      },
    },
    {
      name: 'sentVia',
      type: 'select',
      defaultValue: 'app',
      options: [
        { label: 'App', value: 'app' },
        { label: 'Email', value: 'email' },
        { label: 'SMS', value: 'sms' },
      ],
      admin: {
        description: 'How this message was sent',
      },
    },
    {
      name: 'emailSent',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        description: 'Whether email notification was sent',
        readOnly: true,
      },
    },
    {
      name: 'smsSent',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        description: 'Whether SMS notification was sent',
        readOnly: true,
      },
    },
  ],
  hooks: {
    afterChange: [
      async ({ doc, req, operation }) => {
        // Only send notifications for new messages
        if (operation !== 'create') return

        try {
          req.payload.logger.info(`[Job Messages] New message created, processing notifications...`)
          
          // Fetch the job to get participants
          const job = await req.payload.findByID({
            collection: 'jobs',
            id: typeof doc.job === 'string' ? doc.job : doc.job.id,
          })

          req.payload.logger.info(`[Job Messages] Job fetched: ${job.jobId}`)

          // Fetch the author
          const authorCollection = typeof doc.author === 'object' && 'relationTo' in doc.author 
            ? doc.author.relationTo 
            : 'users'
          const authorId = typeof doc.author === 'object' && 'value' in doc.author
            ? (typeof doc.author.value === 'object' ? doc.author.value.id : doc.author.value)
            : (typeof doc.author === 'object' ? doc.author.id : doc.author)

          req.payload.logger.info(`[Job Messages] Author collection: ${authorCollection}, Author ID: ${authorId}`)

          const author = await req.payload.findByID({
            collection: authorCollection as any,
            id: authorId,
            depth: 1, // Populate user relationship if author is a tech
          })

          // Get the author's user account ID for proper exclusion
          let authorUserId: string | null = null
          if (authorCollection === 'users') {
            authorUserId = String(authorId)
          } else if (authorCollection === 'technicians' && author?.user) {
            authorUserId = typeof author.user === 'object' ? String(author.user.id) : String(author.user)
          }

          // Determine recipients (everyone on the job except the author)
          const recipients: any[] = []

          // Add tech if different from author
          if (job.tech) {
            const techId = typeof job.tech === 'object' ? job.tech.id : job.tech
            
            // Skip if author is the same technician
            if (authorCollection === 'technicians' && String(techId) === String(authorId)) {
              req.payload.logger.info(`[Job Messages] Skipped tech (author is the tech): tech ID ${techId}`)
            } else {
              const tech = await req.payload.findByID({
                collection: 'technicians',
                id: techId,
                depth: 1, // Populate the user relationship
              })
              if (tech?.email) {
                // Get the user ID from the tech's user account relationship
                const techUserId = tech.user ? (typeof tech.user === 'object' ? tech.user.id : tech.user) : null
                
                // Only add if the tech's user account is different from the author's user account
                const techUserIdStr = techUserId ? String(techUserId) : null
                if (!authorUserId || techUserIdStr !== authorUserId) {
                  recipients.push({ email: tech.email, name: tech.name, userId: techUserId })
                  req.payload.logger.info(`[Job Messages] Added tech to recipients: ${tech.email}, userId: ${techUserId}`)
                } else {
                  req.payload.logger.info(`[Job Messages] Skipped tech (same user as author): ${tech.email}`)
                }
              }
            }
          }

          // Add QC assignee if different from author
          if (job.qcAssignedTo && job.qcAssignedTo !== authorId) {
            const qcUserId = typeof job.qcAssignedTo === 'object' ? job.qcAssignedTo.id : job.qcAssignedTo
            const qcUser = await req.payload.findByID({
              collection: 'users',
              id: qcUserId,
            })
            if (qcUser?.email) {
              recipients.push({ email: qcUser.email, name: qcUser.name, userId: qcUser.id })
            }
          }

          req.payload.logger.info(`[Job Messages] Current recipients count: ${recipients.length}, Author collection: ${authorCollection}`)
          
          // Check if the author (user) is also the assigned tech
          let isAuthorTheTech = false
          if (authorCollection === 'users' && job.tech) {
            const techId = typeof job.tech === 'object' ? job.tech.id : job.tech
            const tech = await req.payload.findByID({
              collection: 'technicians',
              id: techId,
              depth: 1,
            })
            const techUserId = tech?.user ? (typeof tech.user === 'object' ? String(tech.user.id) : String(tech.user)) : null
            isAuthorTheTech = techUserId === authorUserId
            req.payload.logger.info(`[Job Messages] Is author the tech? ${isAuthorTheTech} (author: ${authorUserId}, tech user: ${techUserId})`)
          }
          
          // If tech is the author (either as technician or as user) and no other recipients, notify ops team
          if ((authorCollection === 'technicians' || isAuthorTheTech) && recipients.length === 0) {
            // Get all ops managers and sales admins
            req.payload.logger.info(
              `[Job Messages] Tech is author, finding ops team to notify. Author user ID: ${authorUserId}`
            )
            
            const opsUsers = await req.payload.find({
              collection: 'users',
              where: {
                role: {
                  in: ['ops-manager', 'sales-admin', 'super-admin'],
                },
              },
              limit: 100,
            })

            req.payload.logger.info(
              `[Job Messages] Found ${opsUsers.docs.length} ops users: ${JSON.stringify(opsUsers.docs.map((u: any) => ({ id: u.id, email: u.email, role: u.role })))}`
            )

            opsUsers.docs.forEach((user: any) => {
              // Exclude the author by comparing user account IDs
              if (user.email && user.id !== authorUserId) {
                recipients.push({ email: user.email, name: user.name, userId: user.id })
                req.payload.logger.info(`[Job Messages] Added ops user to recipients: ${user.email}`)
              } else {
                req.payload.logger.info(`[Job Messages] Skipped ops user (author or no email): ${user.email || 'no email'}, id: ${user.id}`)
              }
            })
          }

          // If message is from ops/admin, always notify the tech
          if (authorCollection === 'users' && job.tech) {
            const techId = typeof job.tech === 'object' ? job.tech.id : job.tech
            const tech = await req.payload.findByID({
              collection: 'technicians',
              id: techId,
              depth: 1, // Populate the user relationship
            })
            if (tech?.email && !recipients.find(r => r.email === tech.email)) {
              // Get the user ID from the tech's user account relationship
              const techUserId = tech.user ? (typeof tech.user === 'object' ? tech.user.id : tech.user) : null
              
              // Only add if the tech's user account is different from the author's user account
              const techUserIdStr = techUserId ? String(techUserId) : null
              if (!authorUserId || techUserIdStr !== authorUserId) {
                recipients.push({ email: tech.email, name: tech.name, userId: techUserId })
              } else {
                req.payload.logger.info(`[Job Messages] Skipped tech notification (same user as author): ${tech.email}`)
              }
            }
          }

          // Send email notifications
          if (recipients.length > 0) {
            // Check if email service is configured
            const hasEmailConfig = process.env.RESEND_API_KEY && (process.env.RESEND_DEFAULT_FROM || process.env.RESEND_DEFAULT_EMAIL)
            
            if (!hasEmailConfig) {
              req.payload.logger.warn(
                `[Job Messages] Email notifications disabled - RESEND_API_KEY or RESEND_DEFAULT_FROM/RESEND_DEFAULT_EMAIL not configured. Would notify ${recipients.length} recipient(s) for job ${job.jobId}`
              )
              return
            }

            req.payload.logger.info(
              `[Job Messages] Sending email notification to ${recipients.length} recipient(s) for job ${job.jobId}`
            )

            // Get message type label
            const messageTypeLabels: Record<string, string> = {
              'question': '❓ Question',
              'answer': '✅ Answer',
              'issue': '⚠️ Issue',
              'qc-feedback': '🔍 QC Feedback',
              'update': '📢 Update',
              'message': '💬 Message',
            }
            const messageTypeLabel = messageTypeLabels[doc.messageType] || '💬 Message'

            try {
              // Send email to each recipient
              for (const recipient of recipients) {
                try {
                  // Determine the appropriate link based on whether recipient has a user account
                  const baseUrl = process.env.PAYLOAD_PUBLIC_SERVER_URL || 'http://localhost:3000'
                  let replyLink = `${baseUrl}/oms/jobs/${job.id}?tab=messages`
                  let linkText = 'View Job & Reply'
                  
                  // If recipient is a tech without a user account, use the message token link
                  const messageToken = (job as any).messageToken
                  if (!recipient.userId && messageToken) {
                    replyLink = `${baseUrl}/forms/job-message/${messageToken}`
                    linkText = 'View Conversation & Reply'
                  }

                  await req.payload.sendEmail({
                    to: recipient.email,
                    subject: `New ${doc.messageType === 'message' ? 'Message' : doc.messageType.charAt(0).toUpperCase() + doc.messageType.slice(1)} on Job ${job.jobId}`,
                    html: `
                      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <h2 style="color: #2563eb;">New Message on Job ${job.jobId}</h2>
                        <p style="color: #6b7280;">Hi ${recipient.name},</p>
                        <p style="color: #6b7280;">A new message has been posted on job <strong>${job.jobId}</strong> (${job.modelName || 'Untitled'}):</p>
                        
                        <div style="background-color: #f3f4f6; padding: 16px; border-radius: 8px; margin: 20px 0;">
                          <div style="color: #6b7280; font-size: 12px; margin-bottom: 8px;">
                            <strong>${author?.name || 'Unknown'}</strong> • ${messageTypeLabel}
                          </div>
                          <div style="color: #111827; white-space: pre-wrap;">${doc.message}</div>
                        </div>

                        <p style="color: #6b7280;">
                          <a href="${replyLink}" 
                             style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                            ${linkText}
                          </a>
                        </p>

                        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
                        
                        <p style="color: #9ca3af; font-size: 12px;">
                          You're receiving this because you're involved in this job.${recipient.userId ? ' To manage your notification preferences, visit your account settings.' : ''}
                        </p>
                      </div>
                    `,
                  })
                  req.payload.logger.info(`[Job Messages] Email sent to ${recipient.email}`)
                } catch (singleEmailError) {
                  req.payload.logger.error(`[Job Messages] Failed to send email to ${recipient.email}: ${singleEmailError}`)
                }
              }

              req.payload.logger.info(
                `[Job Messages] Successfully sent ${recipients.length} email notification(s) for job ${job.jobId}`
              )
            } catch (emailError) {
              req.payload.logger.error(`[Job Messages] Error sending email notifications: ${emailError}`)
            }

            // Create in-app notifications for internal users
            try {
              req.payload.logger.info(
                `[Job Messages] Processing ${recipients.length} recipients for in-app notifications. Recipients: ${JSON.stringify(recipients.map(r => ({ email: r.email, userId: r.userId, hasUserId: !!r.userId })))}`
              )
              
              let notificationCount = 0
              for (const recipient of recipients) {
                // Only create in-app notifications for users (not technicians without user accounts)
                // Technicians without user accounts will get email only
                if (recipient.userId) {
                  try {
                    const messageTypeForTitle = doc.messageType === 'message' 
                      ? 'Message' 
                      : doc.messageType.charAt(0).toUpperCase() + doc.messageType.slice(1)
                    
                    await req.payload.create({
                      collection: 'notifications',
                      data: {
                        user: recipient.userId,
                        type: doc.messageType === 'issue' ? 'warning' : 'info',
                        title: `New ${messageTypeForTitle} on Job ${job.jobId}`,
                        message: `${author?.name || 'Someone'} posted: "${doc.message.substring(0, 100)}${doc.message.length > 100 ? '...' : ''}"`,
                        relatedJob: job.id,
                        read: false,
                      },
                    })
                    notificationCount++
                    req.payload.logger.info(`[Job Messages] Created in-app notification for user ${recipient.userId}`)
                  } catch (notifError) {
                    req.payload.logger.error(`[Job Messages] Failed to create in-app notification for ${recipient.email}: ${notifError}`)
                  }
                }
              }
              
              req.payload.logger.info(
                `[Job Messages] Created ${notificationCount} in-app notification(s) for job ${job.jobId}`
              )
            } catch (notificationError) {
              req.payload.logger.error(`[Job Messages] Error creating in-app notifications: ${notificationError}`)
            }
          }

        } catch (error) {
          req.payload.logger.error(`[Job Messages] Error sending notifications: ${error}`)
        }
      },
    ],
  },
}
