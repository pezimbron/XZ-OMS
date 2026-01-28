import type { CollectionBeforeChangeHook } from 'payload'

/**
 * Validates that a tech can only be assigned after the first workflow step is completed
 * This ensures the job is fully configured before scheduling/calendar invites are sent
 */
export const validateTechAssignment: CollectionBeforeChangeHook = async ({
  data,
  req,
  operation,
  originalDoc,
}) => {
  // Only validate on update when tech is being assigned
  if (operation !== 'update') {
    return data
  }

  // Check if tech is being assigned (changed from null/undefined to a value)
  const previousTech = originalDoc?.tech
  const newTech = data.tech
  
  // Normalize tech IDs for comparison
  const previousTechId = typeof previousTech === 'object' ? previousTech?.id : previousTech
  const newTechId = typeof newTech === 'object' ? newTech?.id : newTech
  
  // If tech isn't being assigned or changed, skip validation
  if (!newTechId || previousTechId === newTechId) {
    return data
  }

  // Check if job has workflow steps
  if (!data.workflowSteps || data.workflowSteps.length === 0) {
    throw new Error('Cannot assign tech: Job must have a workflow template assigned first.')
  }

  // Check if the first workflow step is completed
  const firstStep = data.workflowSteps[0]
  
  if (!firstStep.completed) {
    throw new Error(
      `Cannot assign tech: The first workflow step "${firstStep.stepName}" must be completed before assigning a technician. This ensures all job details, products/services, and scheduling information are ready.`
    )
  }

  // Validation passed
  req.payload.logger.info(
    `[Tech Assignment] Validation passed - First step "${firstStep.stepName}" is completed`
  )

  return data
}
