'use client'

import React, { useState, useEffect } from 'react'
import { CheckCircle, Circle, Clock, Edit2 } from 'lucide-react'

 const normalizeRelationId = (value: unknown): number | string | null => {
   if (value === null || value === undefined) return null
   if (typeof value === 'number') return value
   if (typeof value === 'string') {
     const trimmed = value.trim()
     if (trimmed === '') return null
     const asNumber = Number(trimmed)
     if (!Number.isNaN(asNumber) && Number.isFinite(asNumber)) return asNumber
     return trimmed
   }
   if (typeof value === 'object' && value !== null && 'id' in value) {
     // eslint-disable-next-line
     return normalizeRelationId((value as any).id)
   }
   return null
 }

interface WorkflowStep {
  name: string
  description: string
  order: number
  statusMapping: string
  requiredRole: string
  actionLabel: string
  requiresDeliverables: boolean
}

interface WorkflowTemplate {
  id: string
  name: string
  steps: WorkflowStep[]
}

interface CompletedStep {
  stepName: string
  completed: boolean
  completedAt?: string
  completedBy?: string
  notes?: string
}

interface WorkflowTimelineProps {
  workflowTemplate: WorkflowTemplate | null
  workflowSteps: CompletedStep[]
  currentStatus: string
  jobId: string
  onStepComplete?: () => void
  onTemplateChange?: () => void
}

export function WorkflowTimeline({
  workflowTemplate,
  workflowSteps,
  currentStatus,
  jobId,
  onStepComplete,
  onTemplateChange,
}: WorkflowTimelineProps) {
  const [availableTemplates, setAvailableTemplates] = useState<WorkflowTemplate[]>([])
  const [isEditing, setIsEditing] = useState(false)
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('')
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    fetchTemplates()
    fetchUser()
  }, [])

  const fetchUser = async () => {
    try {
      const response = await fetch('/api/users/me')
      const data = await response.json()
      setUser(data.user)
    } catch (error) {
      console.error('Error fetching user:', error)
    }
  }

  const fetchTemplates = async () => {
    try {
      const response = await fetch('/api/workflow-templates?limit=100')
      const data = await response.json()
      setAvailableTemplates(data.docs || [])
    } catch (error) {
      console.error('Error fetching workflow templates:', error)
    }
  }

  const handleTemplateAssign = async (templateId: string) => {
    try {
      const normalizedTemplateId = normalizeRelationId(templateId)
      const response = await fetch(`/api/jobs/${jobId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workflowTemplate: normalizedTemplateId }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('Error assigning workflow template:', errorText)
        return
      }

      if (response.ok) {
        setIsEditing(false)
        onTemplateChange?.()
      }
    } catch (error) {
      console.error('Error assigning workflow template:', error)
    }
  }

  // Show template selector if no template assigned (admin only)
  if (!workflowTemplate || !workflowTemplate.steps) {
    // Tech users can't assign workflows
    if (user?.role === 'tech') {
      return (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Workflow</h3>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">No workflow assigned to this job yet.</p>
        </div>
      )
    }

    return (
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Workflow</h3>
        </div>
        <div className="space-y-3">
          <p className="text-sm text-gray-600 dark:text-gray-400">Select a workflow template to enable automation:</p>
          <select
            value={selectedTemplateId}
            onChange={(e) => setSelectedTemplateId(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Choose a workflow template...</option>
            {availableTemplates.map((template) => (
              <option key={template.id} value={template.id}>
                {template.name}
              </option>
            ))}
          </select>
          {selectedTemplateId && (
            <button
              onClick={() => handleTemplateAssign(selectedTemplateId)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
            >
              Assign Workflow
            </button>
          )}
        </div>
      </div>
    )
  }

  const templateSteps = workflowTemplate.steps.sort((a, b) => a.order - b.order)
  
  // Find current step index based on completed steps
  const currentStepIndex = workflowSteps.filter((s) => s.completed).length

  const handleCompleteStep = async () => {
    if (currentStepIndex >= templateSteps.length) return

    const currentStep = templateSteps[currentStepIndex]
    const updatedSteps = [...workflowSteps]
    
    // Mark current step as complete
    if (updatedSteps[currentStepIndex]) {
      updatedSteps[currentStepIndex] = {
        ...updatedSteps[currentStepIndex],
        completed: true,
        completedAt: new Date().toISOString(),
      }
    }

    try {
      const response = await fetch(`/api/jobs/${jobId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workflowSteps: updatedSteps }),
      })

      if (response.ok) {
        onStepComplete?.()
      }
    } catch (error) {
      console.error('Error completing step:', error)
    }
  }

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Workflow: {workflowTemplate.name}
          </h3>
          {user?.role !== 'tech' && (
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
              title="Change workflow template"
            >
              <Edit2 className="w-4 h-4" />
            </button>
          )}
        </div>
        <span className="text-sm text-gray-500 dark:text-gray-400">
          Step {currentStepIndex} of {templateSteps.length}
        </span>
      </div>

      {/* Template Editor */}
      {isEditing && (
        <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-900/40 border border-gray-200 dark:border-gray-700 rounded-lg">
          <div className="space-y-3">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Change Workflow Template:</label>
            <select
              value={selectedTemplateId}
              onChange={(e) => setSelectedTemplateId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Choose a different template...</option>
              {availableTemplates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name}
                </option>
              ))}
            </select>
            <div className="flex gap-2">
              <button
                onClick={() => selectedTemplateId && handleTemplateAssign(selectedTemplateId)}
                disabled={!selectedTemplateId}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Change Template
              </button>
              <button
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors text-sm font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Timeline */}
      <div className="relative">
        {/* Progress bar background */}
        <div className="absolute top-5 left-0 right-0 h-0.5 bg-gray-200" />
        
        {/* Progress bar fill */}
        <div
          className="absolute top-5 left-0 h-0.5 bg-blue-600 transition-all duration-500"
          style={{
            width: `${(currentStepIndex / templateSteps.length) * 100}%`,
          }}
        />

        {/* Steps */}
        <div className="relative flex justify-between">
          {templateSteps.map((step, index) => {
            const completedStep = workflowSteps.find((s) => s.stepName === step.name)
            const isCompleted = completedStep?.completed || false
            const isCurrent = index === currentStepIndex && !isCompleted
            const isPending = index > currentStepIndex

            return (
              <div
                key={step.name}
                className="flex flex-col items-center"
                style={{ width: `${100 / templateSteps.length}%` }}
              >
                {/* Step icon */}
                <div className="relative z-10 mb-2">
                  {isCompleted ? (
                    <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center">
                      <CheckCircle className="w-6 h-6 text-white" />
                    </div>
                  ) : isCurrent ? (
                    <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center animate-pulse">
                      <Clock className="w-6 h-6 text-white" />
                    </div>
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                      <Circle className="w-6 h-6 text-gray-400" />
                    </div>
                  )}
                </div>

                {/* Step info */}
                <div className="text-center">
                  <p
                    className={`text-sm font-medium mb-1 ${
                      isCompleted
                        ? 'text-green-600'
                        : isCurrent
                        ? 'text-blue-600'
                        : 'text-gray-400'
                    }`}
                  >
                    {step.name}
                  </p>
                  {completedStep?.completedAt && (
                    <p className="text-xs text-gray-500">
                      {new Date(completedStep.completedAt).toLocaleDateString()}
                    </p>
                  )}
                  {isCurrent && (
                    <p className="text-xs text-blue-600 font-medium mt-1">In Progress</p>
                  )}
                </div>

              </div>
            )
          })}
        </div>
      </div>

      {/* Complete Step Button */}
      {currentStepIndex < templateSteps.length && (() => {
        const currentStep = templateSteps[currentStepIndex]
        const userCanComplete = !user || !currentStep.requiredRole || user.role === currentStep.requiredRole || ['super-admin', 'ops-manager'].includes(user.role)
        
        return (
          <div className="mt-4 flex items-center justify-between">
            <div className="text-sm text-gray-600">
              <span className="font-medium">{currentStep.name}</span>
              {currentStep.requiresDeliverables && (
                <span className="ml-2 text-orange-600">• Requires deliverables</span>
              )}
              {currentStep.requiredRole && (
                <span className="ml-2 text-gray-500">• Role: {currentStep.requiredRole}</span>
              )}
            </div>
            {userCanComplete ? (
              <button
                onClick={handleCompleteStep}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
              >
                {currentStep.actionLabel || 'Complete Step'}
              </button>
            ) : (
              <div className="text-sm text-gray-500 italic">
                Only {currentStep.requiredRole} can complete this step
              </div>
            )}
          </div>
        )
      })()}

      {/* Completion message */}
      {currentStepIndex >= templateSteps.length && (
        <div className="mt-4 flex items-center justify-center p-3 bg-green-50 rounded-lg border border-green-200">
          <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
          <p className="text-sm font-semibold text-green-900">
            All workflow steps completed! 🎉
          </p>
        </div>
      )}
    </div>
  )
}
