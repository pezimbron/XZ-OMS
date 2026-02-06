import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'

// Client configurations
const CLIENT_CONFIGS: Record<string, {
  clientSearch: string
  workflowName: string
  products: string[]
}> = {
  matterport: {
    clientSearch: 'matterport',
    workflowName: 'MP - Scan Services',
    products: ['Matterport Scan Services'],
  },
  funkit: {
    clientSearch: 'funkit',
    workflowName: 'Matterport + Floor Plan + Photos (Funkit)',
    products: ['Matterport Scan Funkit', 'Floor Plan 2D', 'Photos from Scan'],
  },
}

export async function POST(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const clientKey = searchParams.get('client') || 'matterport'

    const clientConfig = CLIENT_CONFIGS[clientKey.toLowerCase()]
    if (!clientConfig) {
      return NextResponse.json({
        error: `Unknown client: ${clientKey}`,
        availableClients: Object.keys(CLIENT_CONFIGS),
      }, { status: 400 })
    }

    const payload = await getPayload({ config })

    // Find the client
    const clientsResult = await payload.find({
      collection: 'clients',
      where: {
        companyName: { contains: clientConfig.clientSearch },
      },
      limit: 1,
      overrideAccess: true,
    })

    if (clientsResult.docs.length === 0) {
      return NextResponse.json({ error: `Client "${clientConfig.clientSearch}" not found` }, { status: 404 })
    }

    const targetClientId = clientsResult.docs[0].id
    const targetClientName = clientsResult.docs[0].companyName

    // Find the workflow template
    const workflowsResult = await payload.find({
      collection: 'workflow-templates',
      limit: 50,
      overrideAccess: true,
    })

    const targetWorkflow = workflowsResult.docs.find(w =>
      (w.name as string).toLowerCase() === clientConfig.workflowName.toLowerCase()
    )

    if (!targetWorkflow) {
      return NextResponse.json({
        error: `Workflow "${clientConfig.workflowName}" not found`,
        availableWorkflows: workflowsResult.docs.map(w => ({ id: w.id, name: w.name }))
      }, { status: 404 })
    }

    // Find all required products
    const productsResult = await payload.find({
      collection: 'products',
      limit: 50,
      overrideAccess: true,
    })

    const targetProducts: Array<{ id: string | number; name: string }> = []
    const missingProducts: string[] = []

    for (const productName of clientConfig.products) {
      const found = productsResult.docs.find(p =>
        (p.name as string).toLowerCase() === productName.toLowerCase()
      )
      if (found) {
        targetProducts.push({ id: found.id, name: found.name as string })
      } else {
        missingProducts.push(productName)
      }
    }

    if (missingProducts.length > 0) {
      return NextResponse.json({
        error: `Products not found: ${missingProducts.join(', ')}`,
        availableProducts: productsResult.docs.map(p => ({ id: p.id, name: p.name }))
      }, { status: 404 })
    }

    // Find all jobs for this client
    const jobsResult = await payload.find({
      collection: 'jobs',
      where: {
        client: { equals: targetClientId },
      },
      limit: 500,
      depth: 0,
      overrideAccess: true,
    })

    const updates: Array<{ jobId: string; success: boolean; error?: string }> = []

    for (const job of jobsResult.docs) {
      try {
        // Check if job already has line items
        const existingLineItems = (job.lineItems as any[]) || []
        const hasProduct = existingLineItems.some(item => item.product)

        // Build update data
        const updateData: any = {
          workflowTemplate: targetWorkflow.id,
        }

        // Only add products if no line items exist
        if (!hasProduct) {
          updateData.lineItems = targetProducts.map(p => ({
            product: p.id,
            quantity: 1,
          }))
        }

        await payload.update({
          collection: 'jobs',
          id: String(job.id),
          data: updateData,
          overrideAccess: true,
        })

        updates.push({
          jobId: String(job.id),
          success: true,
        })
      } catch (err: any) {
        updates.push({
          jobId: String(job.id),
          success: false,
          error: err.message
        })
      }
    }

    return NextResponse.json({
      success: true,
      client: { id: targetClientId, name: targetClientName },
      workflowUsed: { id: targetWorkflow.id, name: targetWorkflow.name },
      productsUsed: targetProducts,
      totalJobs: jobsResult.docs.length,
      updated: updates.filter(u => u.success).length,
      failed: updates.filter(u => !u.success).length,
      details: updates,
    })

  } catch (error: any) {
    console.error('Bulk setup error:', error)
    return NextResponse.json({ error: error.message || 'Bulk setup failed' }, { status: 500 })
  }
}

// GET to preview what will be updated
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const clientKey = searchParams.get('client')

    const payload = await getPayload({ config })

    // Find workflow and product options
    const workflowsResult = await payload.find({
      collection: 'workflow-templates',
      limit: 50,
      overrideAccess: true,
    })

    const productsResult = await payload.find({
      collection: 'products',
      limit: 50,
      overrideAccess: true,
    })

    // If no client specified, show all available options
    if (!clientKey) {
      return NextResponse.json({
        message: 'Add ?client=matterport or ?client=funkit to preview specific client',
        availableClients: Object.entries(CLIENT_CONFIGS).map(([key, config]) => ({
          key,
          clientSearch: config.clientSearch,
          workflow: config.workflowName,
          products: config.products,
        })),
        availableWorkflows: workflowsResult.docs.map(w => ({ id: w.id, name: w.name })),
        availableProducts: productsResult.docs.map(p => ({ id: p.id, name: p.name })),
      })
    }

    const clientConfig = CLIENT_CONFIGS[clientKey.toLowerCase()]
    if (!clientConfig) {
      return NextResponse.json({
        error: `Unknown client: ${clientKey}`,
        availableClients: Object.keys(CLIENT_CONFIGS),
      }, { status: 400 })
    }

    // Find the client
    const clientsResult = await payload.find({
      collection: 'clients',
      where: {
        companyName: { contains: clientConfig.clientSearch },
      },
      limit: 1,
      overrideAccess: true,
    })

    if (clientsResult.docs.length === 0) {
      return NextResponse.json({ error: `Client "${clientConfig.clientSearch}" not found` }, { status: 404 })
    }

    const targetClientId = clientsResult.docs[0].id

    // Find all jobs for this client
    const jobsResult = await payload.find({
      collection: 'jobs',
      where: {
        client: { equals: targetClientId },
      },
      limit: 500,
      depth: 1,
      overrideAccess: true,
    })

    const jobsWithoutProducts = jobsResult.docs.filter(job => {
      const lineItems = (job.lineItems as any[]) || []
      return !lineItems.some(item => item.product)
    })

    const jobsWithoutWorkflow = jobsResult.docs.filter(job => !job.workflowTemplate)

    return NextResponse.json({
      client: { id: targetClientId, name: clientsResult.docs[0].companyName },
      config: clientConfig,
      totalJobs: jobsResult.docs.length,
      jobsWithoutProducts: jobsWithoutProducts.length,
      jobsWithoutWorkflow: jobsWithoutWorkflow.length,
      availableWorkflows: workflowsResult.docs.map(w => ({ id: w.id, name: w.name })),
      availableProducts: productsResult.docs.map(p => ({ id: p.id, name: p.name })),
    })

  } catch (error: any) {
    console.error('Preview error:', error)
    return NextResponse.json({ error: error.message || 'Preview failed' }, { status: 500 })
  }
}
