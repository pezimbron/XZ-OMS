import type { FieldHook } from 'payload'

/**
 * Hook to auto-populate line item instructions from Product.defaultInstructions
 * when a product is added to a job's lineItems array
 */
export const populateLineItemInstructions: FieldHook = async ({
  data,
  req,
  operation,
  originalDoc,
}) => {
  // Only run on create or update
  if (operation !== 'create' && operation !== 'update') {
    return data
  }

  const lineItems = data?.lineItems || []

  // Process each line item
  for (let i = 0; i < lineItems.length; i++) {
    const item = lineItems[i]
    
    // Skip if instructions already exist (don't overwrite manual edits)
    if (item.instructions && item.instructions.trim() !== '') {
      continue
    }

    // If product is selected and instructions are empty, fetch product's defaultInstructions
    if (item.product) {
      try {
        const productId = typeof item.product === 'string' ? item.product : item.product.id
        
        const product = await req.payload.findByID({
          collection: 'products',
          id: productId,
        })

        if (product?.defaultInstructions) {
          lineItems[i].instructions = product.defaultInstructions
        }
      } catch (error) {
        req.payload.logger.error(`Error fetching product for instructions: ${error}`)
      }
    }
  }

  return lineItems
}

/**
 * Hook to auto-populate techInstructions from Client.instructionTemplate
 * when a client is selected for a job
 */
export const populateTechInstructions: FieldHook = async ({
  data,
  req,
  operation,
  originalDoc,
}) => {
  // Only run on create or when client changes
  if (operation !== 'create' && operation !== 'update') {
    return data
  }

  // Skip if techInstructions already exist (don't overwrite manual edits)
  if (data?.techInstructions && data.techInstructions.trim() !== '') {
    return data
  }

  // If client is selected and techInstructions are empty, fetch client's instructionTemplate
  if (data?.client) {
    try {
      const clientId = typeof data.client === 'string' ? data.client : data.client.id
      
      const client = await req.payload.findByID({
        collection: 'clients',
        id: clientId,
      })

      if (client?.instructionTemplate) {
        return client.instructionTemplate
      }
    } catch (error) {
      req.payload.logger.error(`Error fetching client for instructions: ${error}`)
    }
  }

  return data
}
