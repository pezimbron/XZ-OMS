import type { CollectionBeforeChangeHook } from 'payload'

export const populateWorkflowSteps: CollectionBeforeChangeHook = async ({
  data,
  req,
  operation,
  originalDoc,
}) => {
  const payload = req.payload

  try {
    // Only run on create or when workflow template changes
    const workflowTemplateId = typeof data.workflowTemplate === 'object' 
      ? data.workflowTemplate?.id 
      : data.workflowTemplate

    const originalTemplateId = typeof originalDoc?.workflowTemplate === 'object'
      ? originalDoc?.workflowTemplate?.id
      : originalDoc?.workflowTemplate

    // Check if template was just assigned or changed
    const templateChanged = workflowTemplateId && workflowTemplateId !== originalTemplateId

    if (!templateChanged) {
      return data
    }

    console.log('[Workflow] Template assigned/changed, populating steps...')

    // Fetch the workflow template
    const template = await payload.findByID({
      collection: 'workflow-templates',
      id: workflowTemplateId,
      overrideAccess: true,
    })

    if (!template || !template.steps || template.steps.length === 0) {
      console.log('[Workflow] Template has no steps')
      return data
    }

    // Generate workflow steps from template
    const workflowSteps = template.steps
      .sort((a: any, b: any) => a.order - b.order)
      .map((step: any) => ({
        stepName: step.name,
        completed: false,
        completedAt: null,
        completedBy: null,
        notes: '',
      }))

    // Set the workflow steps
    data.workflowSteps = workflowSteps

    console.log(`[Workflow] Populated ${workflowSteps.length} steps from template "${template.name}"`)

    return data
  } catch (error) {
    console.error('[Workflow] Error populating workflow steps:', error)
    return data
  }
}
