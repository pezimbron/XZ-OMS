import type { CollectionBeforeChangeHook } from 'payload'

/**
 * Validates that essential job information exists before allowing tech assignment
 * This ensures the tech receives complete job details when assigned or when receiving
 * a scheduling request
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

  // Validate essential job information exists
  const missingFields: string[] = []

  // Check for at least one product/service
  if (!data.lineItems || data.lineItems.length === 0) {
    missingFields.push('at least one Product/Service')
  }

  // Check for capture address
  if (!data.captureAddress || data.captureAddress.trim() === '') {
    missingFields.push('Capture Address')
  }

  // Check for workflow template
  if (!data.workflowTemplate) {
    missingFields.push('Workflow Template')
  }

  // If any required fields are missing, throw error
  if (missingFields.length > 0) {
    throw new Error(
      `Cannot assign tech: Please complete the following required fields first: ${missingFields.join(', ')}. This ensures the technician receives complete job information.`
    )
  }

  // Validation passed
  req.payload.logger.info(
    `[Tech Assignment] Validation passed - all essential fields are populated`
  )

  return data
}
