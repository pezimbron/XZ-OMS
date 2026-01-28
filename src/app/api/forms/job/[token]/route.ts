import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'

// GET - Fetch job by token
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const payload = await getPayload({ config })
    const { token } = await params

    // Find job by completion token
    const jobs = await payload.find({
      collection: 'jobs',
      where: {
        completionToken: {
          equals: token,
        },
      },
      depth: 2,
    })

    if (jobs.docs.length === 0) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 404 }
      )
    }

    const job = jobs.docs[0]

    // Return only necessary job information (not sensitive data)
    return NextResponse.json({
      id: job.id,
      jobId: job.jobId,
      modelName: job.modelName,
      targetDate: job.targetDate,
      captureAddress: job.captureAddress,
      city: job.city,
      state: job.state,
      schedulingNotes: job.schedulingNotes,
      techInstructions: job.techInstructions,
      lineItems: job.lineItems,
      completionFormSubmitted: job.completionFormSubmitted,
      workflowSteps: (job as any).workflowSteps,
      schedulingRequest: (job as any).schedulingRequest,
      techResponse: (job as any).techResponse,
      tech: (job as any).tech,
    })
  } catch (error: any) {
    console.error('Error fetching job by token:', error)
    return NextResponse.json(
      { error: 'Failed to fetch job' },
      { status: 500 }
    )
  }
}

// POST - Submit completion form
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const payload = await getPayload({ config })
    const { token } = await params
    const body = await request.json()

    // Find job by completion token
    const jobs = await payload.find({
      collection: 'jobs',
      where: {
        completionToken: {
          equals: token,
        },
      },
    })

    if (jobs.docs.length === 0) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 404 }
      )
    }

    const job = jobs.docs[0]

    // Handle workflow step completion
    if (body.action === 'complete-step') {
      const currentWorkflowSteps = (job as any).workflowSteps || []
      const stepIndex = currentWorkflowSteps.findIndex((step: any) => step.stepName === body.stepName)
      
      if (stepIndex === -1) {
        return NextResponse.json({ error: 'Step not found' }, { status: 404 })
      }

      const updatedSteps = [...currentWorkflowSteps]
      updatedSteps[stepIndex] = {
        ...updatedSteps[stepIndex],
        completed: true,
        completedAt: new Date().toISOString(),
        completedBy: (job as any).tech?.email || 'Tech',
        notes: body.feedback || undefined,
      }

      console.log(`[Tech Portal] Completing step "${body.stepName}" with notes:`, body.feedback ? `"${body.feedback}"` : 'none')

      await payload.update({
        collection: 'jobs',
        id: job.id,
        data: {
          workflowSteps: updatedSteps,
        },
        overrideAccess: true,
      })

      console.log(`[Tech Portal] Step "${body.stepName}" marked complete for job ${(job as any).jobId}`)

      return NextResponse.json({ success: true })
    }

    // Check if already submitted
    if (job.completionFormSubmitted) {
      return NextResponse.json(
        { error: 'Form already submitted' },
        { status: 400 }
      )
    }

    // Get current workflow steps
    const currentWorkflowSteps = (job as any).workflowSteps || []
    
    // Auto-update workflow steps based on completion status
    let updatedWorkflowSteps = [...currentWorkflowSteps]
    if (body.completionStatus === 'completed' && updatedWorkflowSteps.length > 0) {
      const now = new Date().toISOString()
      const techEmail = (job as any).tech?.email || 'Tech'
      
      // Mark "Scan Completed" step as complete
      const scanStepIndex = updatedWorkflowSteps.findIndex((step: any) => 
        step.stepName?.toLowerCase().includes('scan completed') || 
        step.stepName?.toLowerCase().includes('scan complete')
      )
      if (scanStepIndex !== -1) {
        updatedWorkflowSteps[scanStepIndex] = {
          ...updatedWorkflowSteps[scanStepIndex],
          completed: true,
          completedAt: now,
          completedBy: techEmail,
          notes: 'Auto-completed via tech completion form'
        }
      }
      
      // Mark "Upload" related steps as complete
      const uploadStepIndex = updatedWorkflowSteps.findIndex((step: any) => 
        step.stepName?.toLowerCase().includes('upload')
      )
      if (uploadStepIndex !== -1) {
        updatedWorkflowSteps[uploadStepIndex] = {
          ...updatedWorkflowSteps[uploadStepIndex],
          completed: true,
          completedAt: now,
          completedBy: techEmail,
          notes: 'Auto-completed via tech completion form'
        }
      }
    }

    // Update job with completion data and workflow steps
    const updatedJob = await payload.update({
      collection: 'jobs',
      id: job.id,
      data: {
        completionStatus: body.completionStatus,
        incompletionReason: body.incompletionReason || null,
        incompletionNotes: body.incompletionNotes || null,
        techFeedback: body.techFeedback || null,
        scannedDate: body.scannedDate,
        completionFormSubmitted: true,
        status: body.completionStatus === 'completed' ? 'scanned' : job.status,
        workflowSteps: updatedWorkflowSteps.length > 0 ? updatedWorkflowSteps : undefined,
      },
    })

    console.log(`[Completion Form] Job ${job.jobId} completion form submitted via token`)
    if (updatedWorkflowSteps.length > 0) {
      console.log(`[Completion Form] Auto-updated workflow steps for job ${job.jobId}`)
    }

    return NextResponse.json({
      success: true,
      message: 'Completion form submitted successfully',
    })
  } catch (error: any) {
    console.error('Error submitting completion form:', error)
    return NextResponse.json(
      { error: 'Failed to submit form' },
      { status: 500 }
    )
  }
}
