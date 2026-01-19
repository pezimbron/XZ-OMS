import { CollectionAfterChangeHook } from 'payload'

export const afterWorkflowStepUpdate: CollectionAfterChangeHook = async ({
  doc,
  req,
  previousDoc,
  operation,
}) => {
  if (operation !== 'update') return doc

  const { payload } = req

  // Check if any workflow steps were just completed
  const newlyCompletedSteps = doc.workflowSteps?.filter((step: any, index: number) => {
    const prevStep = previousDoc.workflowSteps?.[index]
    return step.completed && !prevStep?.completed
  })

  if (!newlyCompletedSteps || newlyCompletedSteps.length === 0) return doc

  // Get client with notification preferences
  let client
  if (typeof doc.client === 'object' && doc.client !== null) {
    client = doc.client
  } else if (doc.client) {
    try {
      client = await payload.findByID({
        collection: 'clients',
        id: doc.client,
        depth: 1,
      })
    } catch (error) {
      console.error('Error fetching client:', error)
      return doc
    }
  }

  if (!client?.notificationPreferences?.enableNotifications) return doc

  // Send notifications for each completed step
  for (const step of newlyCompletedSteps) {
    const stepName = step.stepName.toLowerCase()
    let notificationType: string | null = null
    let shouldNotify = false

    // Map workflow step names to notification types
    if (stepName.includes('scan')) {
      notificationType = 'scan-completed'
      shouldNotify = client.notificationPreferences.notifyOnScanCompleted
    } else if (stepName.includes('upload')) {
      notificationType = 'upload-completed'
      shouldNotify = client.notificationPreferences.notifyOnUploadCompleted
    } else if (stepName.includes('qc') || stepName.includes('post')) {
      notificationType = 'qc-completed'
      shouldNotify = client.notificationPreferences.notifyOnQcCompleted
    } else if (stepName.includes('transfer')) {
      notificationType = 'transfer-completed'
      shouldNotify = client.notificationPreferences.notifyOnTransferCompleted
    } else if (stepName.includes('floor plan')) {
      notificationType = 'floorplan-completed'
      shouldNotify = client.notificationPreferences.notifyOnFloorplanCompleted
    } else if (stepName.includes('photo')) {
      notificationType = 'photos-completed'
      shouldNotify = client.notificationPreferences.notifyOnPhotosCompleted
    } else if (stepName.includes('as-built')) {
      notificationType = 'asbuilts-completed'
      shouldNotify = client.notificationPreferences.notifyOnAsbuiltsCompleted
    }

    if (!notificationType || !shouldNotify) continue

    // Send notification asynchronously (don't block the update)
    setImmediate(async () => {
      try {
        const serverUrl = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000'
        const response = await fetch(`${serverUrl}/api/jobs/${doc.id}/notify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            notificationType,
            customMessage: `Workflow step "${step.stepName}" has been completed.`,
          }),
        })

        if (!response.ok) {
          console.error(`Failed to send ${notificationType} notification for job ${doc.id}`)
        } else {
          console.log(`Sent ${notificationType} notification for job ${doc.id}`)
        }
      } catch (error) {
        console.error(`Error sending ${notificationType} notification:`, error)
      }
    })
  }

  return doc
}
