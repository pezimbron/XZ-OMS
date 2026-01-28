import type { CollectionBeforeChangeHook } from 'payload'

export const applyClientDefaultWorkflow: CollectionBeforeChangeHook = async ({
  data,
  req,
  operation,
  originalDoc,
}) => {
  // Check if this is a new job or if the client has changed
  const isNewJob = operation === 'create'
  const clientChanged = operation === 'update' && data.client && data.client !== originalDoc?.client
  
  if (!isNewJob && !clientChanged) {
    return data
  }

  // Skip if workflow template is already manually set (and not changing client)
  if (data.workflowTemplate && !clientChanged) {
    return data
  }

  // Get the client ID
  const clientId = typeof data.client === 'object' ? data.client?.id : data.client
  
  if (!clientId) {
    return data
  }

  try {
    // Fetch the client to get their default workflow
    const client = await req.payload.findByID({
      collection: 'clients',
      id: clientId,
    })

    // If client has a default workflow, apply it to the job
    if (client?.defaultWorkflow) {
      const workflowId = typeof client.defaultWorkflow === 'object' 
        ? client.defaultWorkflow.id 
        : client.defaultWorkflow

      data.workflowTemplate = workflowId
      
      if (isNewJob) {
        console.log(`[Apply Client Default Workflow] Applied workflow ${workflowId} to new job from client ${clientId}`)
      } else {
        console.log(`[Apply Client Default Workflow] Applied workflow ${workflowId} after client change to ${clientId}`)
      }
    } else if (clientChanged) {
      // If changing to a client with no default workflow, clear the workflow
      console.log(`[Apply Client Default Workflow] Client ${clientId} has no default workflow, keeping existing workflow`)
    }
  } catch (error) {
    console.error('[Apply Client Default Workflow] Error fetching client:', error)
  }

  return data
}
