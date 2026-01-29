import type { FieldHook, CollectionBeforeChangeHook } from 'payload'

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
 * combined with all Product.defaultInstructions from line items
 */
export const populateTechInstructions: CollectionBeforeChangeHook = async ({
  data,
  req,
  operation,
}) => {
  // Only run on create or update
  if (operation !== 'create' && operation !== 'update') {
    return data
  }

  try {
    let instructions = ''

    // Start with client instruction template if available
    if (data?.client) {
      let clientId: string | number | undefined
      if (typeof data.client === 'string' || typeof data.client === 'number') {
        clientId = data.client
      } else if (typeof data.client === 'object' && data.client?.id) {
        clientId = data.client.id
      }

      if (clientId) {
        const client = await req.payload.findByID({
          collection: 'clients',
          id: String(clientId),
          depth: 0,
        })

        if (client?.instructionTemplate && client.instructionTemplate.trim()) {
          instructions = client.instructionTemplate
          req.payload.logger.info(`[Populate Instructions] Added client template for client ${clientId}`)
        }
      }
    }

    // Fetch and append product instructions from line items
    const lineItems = data?.lineItems || []
    let lineItemCount = 0
    
    for (const item of lineItems) {
      if (item.product) {
        try {
          // Extract product ID
          let productId: string | number | undefined
          if (typeof item.product === 'string' || typeof item.product === 'number') {
            productId = item.product
          } else if (typeof item.product === 'object' && item.product?.id) {
            productId = item.product.id
          }

          if (productId) {
            // Fetch product to get defaultInstructions
            const product = await req.payload.findByID({
              collection: 'products',
              id: String(productId),
              depth: 0,
            })

            if (product?.defaultInstructions && product.defaultInstructions.trim()) {
              instructions += `\n\n${product.name}:\n${product.defaultInstructions}`
              lineItemCount++
            }
          }
        } catch (error) {
          req.payload.logger.error(`[Populate Instructions] Error fetching product for line item: ${error}`)
        }
      }
    }

    if (lineItemCount > 0) {
      req.payload.logger.info(`[Populate Instructions] Added ${lineItemCount} product instructions from line items`)
    }

    if (instructions) {
      data.techInstructions = instructions
      req.payload.logger.info(`[Populate Instructions] Populated combined instructions`)
    }
  } catch (error) {
    req.payload.logger.error(`[Populate Instructions] Error in populateTechInstructions: ${error}`)
  }

  return data
}
