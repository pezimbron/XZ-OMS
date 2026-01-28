import type { CollectionAfterChangeHook } from 'payload'

export const notifyTeams: CollectionAfterChangeHook = async ({
  doc,
  previousDoc,
  operation,
  req,
}) => {
  // Only run on update operations
  if (operation !== 'update' || !previousDoc) {
    return doc
  }

  const { payload } = req

  try {
    // 1. Tech marks job as completed → Notify QC team
    if (
      previousDoc.completionStatus !== 'completed' &&
      doc.completionStatus === 'completed'
    ) {
      console.log(`[Notification] Tech marked job ${doc.jobId} as completed - notifying QC team`)
      
      // Find all QC team members (post-producer role)
      const qcTeam = await payload.find({
        collection: 'users',
        where: {
          role: {
            equals: 'post-producer',
          },
        },
      })

      // Create notification for each QC team member
      for (const qcMember of qcTeam.docs) {
        await payload.create({
          collection: 'notifications',
          data: {
            user: qcMember.id,
            title: 'Job Ready for QC',
            message: `Job ${doc.jobId} (${doc.modelName}) has been marked as completed by the tech and is ready for quality control review.`,
            type: 'info',
            read: false,
            relatedJob: doc.id,
            actionUrl: `/oms/jobs/${doc.id}`,
          },
        })
      }
      
      console.log(`[Notification] Created ${qcTeam.docs.length} notifications for QC team about job ${doc.jobId}`)
    }

    // 2. Check if job is past scheduled date and not completed
    if (doc.targetDate && doc.status !== 'done') {
      const targetDate = new Date(doc.targetDate)
      const now = new Date()
      
      // If past scheduled date and status changed (but not to done)
      if (now > targetDate && previousDoc.status !== doc.status) {
        console.log(`[Notification] Job ${doc.jobId} is past scheduled date and not completed - notifying admin`)
        
        const admins = await payload.find({
          collection: 'users',
          where: {
            role: {
              in: ['super-admin', 'ops-manager'],
            },
          },
        })

        // Create notification for each admin
        for (const admin of admins.docs) {
          await payload.create({
            collection: 'notifications',
            data: {
              user: admin.id,
              title: 'Job Delayed',
              message: `Job ${doc.jobId} (${doc.modelName}) is past its scheduled date (${new Date(doc.targetDate).toLocaleDateString()}) and has not been completed yet.`,
              type: 'warning',
              read: false,
              relatedJob: doc.id,
              actionUrl: `/oms/jobs/${doc.id}`,
            },
          })
        }
        
        console.log(`[Notification] Created ${admins.docs.length} notifications for admins about delayed job ${doc.jobId}`)
      }
    }

    // 4. QC marks job as "done" → Notify Financial team
    if (previousDoc.status !== 'done' && doc.status === 'done') {
      console.log(`[Notification] QC marked job ${doc.jobId} as done - notifying financial team`)
      
      // Find financial team members (users who handle invoicing)
      const financialTeam = await payload.find({
        collection: 'users',
        where: {
          role: {
            in: ['super-admin', 'sales-admin'],
          },
        },
      })

      // Create notification for each financial team member
      for (const member of financialTeam.docs) {
        await payload.create({
          collection: 'notifications',
          data: {
            user: member.id,
            title: 'Job Ready for Invoicing',
            message: `Job ${doc.jobId} (${doc.modelName}) has been completed and approved by QC. It is now ready for invoicing.`,
            type: 'success',
            read: false,
            relatedJob: doc.id,
            actionUrl: `/oms/invoicing`,
          },
        })
      }
      
      console.log(`[Notification] Created ${financialTeam.docs.length} notifications for financial team about completed job ${doc.jobId}`)
    }

  } catch (error) {
    console.error('[Notification] Error sending notifications:', error)
    // Don't fail the job update if notifications fail
  }

  return doc
}
