'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useSearchParams } from 'next/navigation'
import { NotifyClientButton } from '@/components/oms/NotifyClientButton'
import QCPanel from '@/components/oms/QCPanel'
import { WorkflowTimeline } from '@/components/oms/WorkflowTimeline'
import { SaveIndicator } from '@/components/oms/SaveIndicator'
import { AddressAutocomplete } from '@/components/oms/AddressAutocomplete'
import { JobMessaging } from '@/components/oms/JobMessaging'
import SchedulingRequestPanel from '@/components/oms/SchedulingRequestPanel'
import { patchJob } from '@/lib/oms/patchJob'
import { useAutosaveField } from '@/lib/oms/useAutosaveField'
import { normalizeRelationId } from '@/lib/oms/normalizeRelationId'
import JobBasicInfoTab from '@/components/oms/jobs/tabs/JobBasicInfoTab'
import SchedulingTab from '@/components/oms/jobs/tabs/SchedulingTab'
import InstructionsTab from '@/components/oms/jobs/tabs/InstructionsTab'
import TechFeedbackTab from '@/components/oms/jobs/tabs/TechFeedbackTab'
import FinancialsTab from '@/components/oms/jobs/tabs/FinancialsTab'
import DeliverablesTab from '@/components/oms/jobs/tabs/DeliverablesTab'

interface Job {
  id: string
  jobId: string
  modelName: string
  targetDate: string
  timezone?: string
  status: string
  region?: string
  client?: any
  endClient?: any
  tech?: any
  captureAddress?: string
  city?: string
  state?: string
  zip?: string
  lineItems?: any[]
  customTodoItems?: any[]
  techInstructions?: string
  schedulingNotes?: string
  uploadLink?: string
  mediaUploadLink?: string
  sitePOCName?: string
  sitePOCPhone?: string
  sitePOCEmail?: string
  qcStatus?: string
  qcNotes?: string
  totalPayout?: number
  externalExpenses?: any[]
  discount?: {
    type?: string
    value?: number
    amount?: number
  }
  subtotal?: number
  taxAmount?: number
  totalWithTax?: number
  workflowTemplate?: any
  workflowSteps?: any[]
  invoiceStatus?: string
  invoice?: {
    id: string
    invoiceNumber?: string
    status: string
    total: number
  }
  invoicedAt?: string
  createdAt: string
  updatedAt: string
  schedulingRequest?: any
  techResponse?: any
}

export default function JobDetailPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const [job, setJob] = useState<Job | null>(null)
  const [loading, setLoading] = useState(true)
  
  // Initialize activeTab from URL query parameter or default to 'details'
  const initialTab = searchParams.get('tab') as 'details' | 'instructions' | 'schedule' | 'tech-feedback' | 'qc' | 'financials' | 'workflow' | 'deliverables' | 'messages' | null
  const [activeTab, setActiveTab] = useState<'details' | 'instructions' | 'schedule' | 'tech-feedback' | 'qc' | 'financials' | 'workflow' | 'deliverables' | 'messages'>(initialTab || 'details')
  const [editingStatus, setEditingStatus] = useState(false)
  const [newStatus, setNewStatus] = useState('')
  const [saving, setSaving] = useState(false)
  const [productsEditOpen, setProductsEditOpen] = useState(false)
  const [expensesEditOpen, setExpensesEditOpen] = useState(false)
  const [discountEditOpen, setDiscountEditOpen] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [editedJob, setEditedJob] = useState<any>(null)
  const [clients, setClients] = useState<any[]>([])
  const [techs, setTechs] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [user, setUser] = useState<any>(null)

  const toISOWithTimezoneOffset = (datetimeLocalValue: string, timezone: string) => {
    if (!datetimeLocalValue) return datetimeLocalValue
    if (datetimeLocalValue.includes('Z') || datetimeLocalValue.includes('+')) return datetimeLocalValue

    const dateStr = datetimeLocalValue.length === 16 ? datetimeLocalValue + ':00' : datetimeLocalValue
    const timezoneOffsets: Record<string, string> = {
      'America/Chicago': '-06:00',
      'America/New_York': '-05:00',
      'America/Denver': '-07:00',
      'America/Los_Angeles': '-08:00',
      'America/Phoenix': '-07:00',
    }
    const offset = timezoneOffsets[timezone] || '-06:00'
    return dateStr + offset
  }

  const isTech = user?.role === 'tech'
  const isAdmin = user?.role === 'admin'
  
  // Custom todo item form state
  const [showCustomItemForm, setShowCustomItemForm] = useState(false)
  const [newCustomTask, setNewCustomTask] = useState('')
  const [newCustomNotes, setNewCustomNotes] = useState('')
  
  // Generate random job ID for direct customers
  const generateJobId = () => {
    const prefix = 'XZOMS'
    const now = new Date()
    const year = now.getFullYear().toString().slice(-2)
    const month = (now.getMonth() + 1).toString().padStart(2, '0')
    const day = now.getDate().toString().padStart(2, '0')
    
    const chars = '0123456789'
    let randomPart = ''
    
    for (let i = 0; i < 3; i++) {
      randomPart += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    
    const newJobId = `${prefix}-${year}${month}${day}-${randomPart}`
    setEditedJob({ ...editedJob, jobId: newJobId })
  }

  const autosaveJobId = async () => {
    if (!job?.id) return
    const newJobId = (() => {
      const prefix = 'XZOMS'
      const now = new Date()
      const year = now.getFullYear().toString().slice(-2)
      const month = (now.getMonth() + 1).toString().padStart(2, '0')
      const day = now.getDate().toString().padStart(2, '0')
      const chars = '0123456789'
      let randomPart = ''
      for (let i = 0; i < 3; i++) randomPart += chars.charAt(Math.floor(Math.random() * chars.length))
      return `${prefix}-${year}${month}${day}-${randomPart}`
    })()

    try {
      setJob((prev) => (prev ? { ...prev, jobId: newJobId } : prev))
      setEditedJob((prev: any) => (prev ? { ...prev, jobId: newJobId } : prev))
      await patchJob(job.id, { jobId: newJobId })
      await fetchJob(job.id)
    } catch (e) {
      console.error('Failed to generate Job ID:', e)
      alert('Failed to generate Job ID')
    }
  }

  const targetDateField = useAutosaveField<string>({
    value: job?.targetDate || '',
    onSave: async (next) => {
      const jobId = params.id as string
      if (!jobId) return
      const timezone = timezoneField.value || job?.timezone || 'America/Chicago'
      const nextISO = toISOWithTimezoneOffset(next, timezone)
      await patchJob(jobId, { targetDate: nextISO })
      await fetchJob(jobId)
    },
    debounceMs: 0,
  })

  const statusField = useAutosaveField<string>({
    value: job?.status || 'request',
    onSave: async (next) => {
      if (!job?.id) return
      await patchJob(job.id, { status: next })
      await fetchJob(job.id)
    },
    debounceMs: 0,
  })

  const modelNameField = useAutosaveField<string>({
    value: job?.modelName || '',
    onSave: async (next) => {
      const jobId = params.id as string
      if (!jobId) return
      await patchJob(jobId, { modelName: next })
      await fetchJob(jobId)
    },
    debounceMs: 800,
  })

  const clientField = useAutosaveField<string>({
    value: typeof job?.client === 'object' ? job.client?.id : job?.client || '',
    onSave: async (next) => {
      const jobId = params.id as string
      if (!jobId) return
      await patchJob(jobId, { client: next })
      await fetchJob(jobId)
    },
    debounceMs: 0,
  })

  const propertyTypeField = useAutosaveField<string>({
    value: (job as any)?.propertyType || '',
    onSave: async (next) => {
      const jobId = params.id as string
      if (!jobId) return
      await patchJob(jobId, { propertyType: next || null })
      await fetchJob(jobId)
    },
    debounceMs: 0,
  })

  const purposeOfScanField = useAutosaveField<string>({
    value: (job as any)?.purposeOfScan || '',
    onSave: async (next) => {
      const jobId = params.id as string
      if (!jobId) return
      await patchJob(jobId, { purposeOfScan: next || null })
      await fetchJob(jobId)
    },
    debounceMs: 0,
  })

  const schedulingNotesField = useAutosaveField<string>({
    value: job?.schedulingNotes || '',
    onSave: async (next) => {
      if (!job?.id) return
      await patchJob(job.id, { schedulingNotes: next || null })
      await fetchJob(job.id)
    },
    debounceMs: 900,
  })

  const techInstructionsField = useAutosaveField<string>({
    value: job?.techInstructions || '',
    onSave: async (next) => {
      if (!job?.id) return
      await patchJob(job.id, { techInstructions: next || null })
      await fetchJob(job.id)
    },
    debounceMs: 900,
  })

  const uploadLinkField = useAutosaveField<string | null>({
    value: job?.uploadLink || null,
    onSave: async (next) => {
      if (!job?.id) return
      const valueToSave = !next || next.trim() === '' ? null : next
      await patchJob(job.id, { uploadLink: valueToSave })
    },
    debounceMs: 900,
  })

  const mediaUploadLinkField = useAutosaveField<string | null>({
    value: job?.mediaUploadLink || null,
    onSave: async (next) => {
      if (!job?.id) return
      const valueToSave = !next || next.trim() === '' ? null : next
      await patchJob(job.id, { mediaUploadLink: valueToSave })
    },
    debounceMs: 900,
  })

  const sitePOCNameField = useAutosaveField<string>({
    value: job?.sitePOCName || '',
    onSave: async (next) => {
      if (!job?.id) return
      await patchJob(job.id, { sitePOCName: next || null })
      await fetchJob(job.id)
    },
    debounceMs: 900,
  })

  const sitePOCPhoneField = useAutosaveField<string>({
    value: job?.sitePOCPhone || '',
    onSave: async (next) => {
      if (!job?.id) return
      await patchJob(job.id, { sitePOCPhone: next || null })
      await fetchJob(job.id)
    },
    debounceMs: 900,
  })

  const sitePOCEmailField = useAutosaveField<string>({
    value: job?.sitePOCEmail || '',
    onSave: async (next) => {
      if (!job?.id) return
      await patchJob(job.id, { sitePOCEmail: next || null })
      await fetchJob(job.id)
    },
    debounceMs: 900,
  })

  const vendorPriceField = useAutosaveField<string>({
    value: String(((job as any)?.vendorPrice ?? '') ?? ''),
    onSave: async (next) => {
      if (!job?.id) return
      const asNumber = next === '' ? null : Number(next)
      await patchJob(job.id, { vendorPrice: asNumber })
      await fetchJob(job.id)
    },
    debounceMs: 700,
  })

  const travelPayoutField = useAutosaveField<string>({
    value: String(((job as any)?.travelPayout ?? '') ?? ''),
    onSave: async (next) => {
      if (!job?.id) return
      const asNumber = next === '' ? null : Number(next)
      await patchJob(job.id, { travelPayout: asNumber })
      await fetchJob(job.id)
    },
    debounceMs: 700,
  })

  const offHoursPayoutField = useAutosaveField<string>({
    value: String(((job as any)?.offHoursPayout ?? '') ?? ''),
    onSave: async (next) => {
      if (!job?.id) return
      const asNumber = next === '' ? null : Number(next)
      await patchJob(job.id, { offHoursPayout: asNumber })
      await fetchJob(job.id)
    },
    debounceMs: 700,
  })

  const deliverablesField = useAutosaveField<any>({
    value: (job as any)?.deliverables ?? null,
    onSave: async (next) => {
      if (!job?.id) return
      await patchJob(job.id, { deliverables: next || {} })
      await fetchJob(job.id)
    },
    debounceMs: 900,
  })

  const lineItemsField = useAutosaveField<any[]>({
    value: (job as any)?.lineItems ?? [],
    onSave: async (next) => {
      if (!job?.id) return
      const normalized = Array.isArray(next)
        ? next
            .filter((item: any) => item?.product && item.product !== '')
            .map((item: any) => ({
              product: normalizeRelationId(item?.product) || item?.product || null,
              quantity: item?.quantity ?? 1,
              instructions: item?.instructions ?? '',
              excludeFromCalendar: item?.excludeFromCalendar ?? undefined,
            }))
        : []
      await patchJob(job.id, { lineItems: normalized })
      await fetchJob(job.id)
    },
    debounceMs: 999999,
  })

  const externalExpensesField = useAutosaveField<any[]>({
    value: (job as any)?.externalExpenses ?? [],
    onSave: async (next) => {
      if (!job?.id) return
      await patchJob(job.id, { externalExpenses: Array.isArray(next) ? next : [] })
      await fetchJob(job.id)
    },
    debounceMs: 999999,
  })

  const discountField = useAutosaveField<any>({
    value: (job as any)?.discount ?? { type: 'none', value: 0 },
    onSave: async (next) => {
      if (!job?.id) return
      const type = next?.type || 'none'
      const value = Number(next?.value || 0)
      await patchJob(job.id, { discount: { type, value } })
      await fetchJob(job.id)
    },
    debounceMs: 700,
  })

  const captureAddressField = useAutosaveField<string>({
    value: job?.captureAddress || '',
    onSave: async (next) => {
      if (!job?.id) return
      await patchJob(job.id, { captureAddress: next || null })
      await fetchJob(job.id)
    },
    debounceMs: 700,
  })

  const cityField = useAutosaveField<string>({
    value: job?.city || '',
    onSave: async (next) => {
      if (!job?.id) return
      await patchJob(job.id, { city: next || null })
      await fetchJob(job.id)
    },
    debounceMs: 700,
  })

  const stateField = useAutosaveField<string>({
    value: job?.state || '',
    onSave: async (next) => {
      if (!job?.id) return
      await patchJob(job.id, { state: next || null })
      await fetchJob(job.id)
    },
    debounceMs: 700,
  })

  const zipField = useAutosaveField<string>({
    value: (job as any)?.zip || job?.zip || '',
    onSave: async (next) => {
      if (!job?.id) return
      await patchJob(job.id, { zip: next || null })
      await fetchJob(job.id)
    },
    debounceMs: 700,
  })

  const timezoneField = useAutosaveField<string>({
    value: job?.timezone || 'America/Chicago',
    onSave: async (next) => {
      const jobId = params.id as string
      if (!jobId) return
      await patchJob(jobId, { timezone: next })
      await fetchJob(jobId)
    },
    debounceMs: 0,
  })

  const regionField = useAutosaveField<string>({
    value: job?.region || '',
    onSave: async (next) => {
      const jobId = params.id as string
      if (!jobId) return
      await patchJob(jobId, { region: next || null })
      await fetchJob(jobId)
    },
    debounceMs: 0,
  })

  const sqFtField = useAutosaveField<string>({
    value: typeof (job as any)?.sqFt === 'number' ? String((job as any).sqFt) : '',
    onSave: async (next) => {
      const jobIdRaw = (job as any)?.id ?? (params as any)?.id
      const jobId = Array.isArray(jobIdRaw) ? jobIdRaw[0] : jobIdRaw
      if (!jobId) {
        throw new Error('Job ID not loaded')
      }

      const trimmed = String(next ?? '').trim()
      if (trimmed === '') {
        await patchJob(String(jobId), { sqFt: null })
        await fetchJob(String(jobId))
        return
      }

      const parsed = Number(trimmed)
      if (!Number.isFinite(parsed)) {
        throw new Error('Invalid square feet value')
      }

      await patchJob(String(jobId), { sqFt: parsed })
      await fetchJob(String(jobId))
    },
    debounceMs: 700,
  })

  const estimatedDurationField = useAutosaveField<string>({
    value: typeof (job as any)?.estimatedDuration === 'number' ? String((job as any).estimatedDuration) : '',
    onSave: async (next) => {
      const jobIdRaw = (job as any)?.id ?? (params as any)?.id
      const jobId = Array.isArray(jobIdRaw) ? jobIdRaw[0] : jobIdRaw
      if (!jobId) {
        throw new Error('Job ID not loaded')
      }

      const trimmed = String(next ?? '').trim()
      if (trimmed === '') {
        await patchJob(String(jobId), { estimatedDuration: null })
        await fetchJob(String(jobId))
        return
      }

      const parsed = Number(trimmed)
      if (!Number.isFinite(parsed) || parsed < 0) {
        throw new Error('Invalid duration value')
      }

      await patchJob(String(jobId), { estimatedDuration: parsed })
      await fetchJob(String(jobId))
    },
    debounceMs: 700,
  })

  const jobIdField = useAutosaveField<string>({
    value: (job as any)?.jobId || '',
    onSave: async (next) => {
      const jobIdRaw = (job as any)?.id ?? (params as any)?.id
      const jobId = Array.isArray(jobIdRaw) ? jobIdRaw[0] : jobIdRaw
      if (!jobId) {
        throw new Error('Job ID not loaded')
      }

      const trimmed = String(next ?? '').trim()
      
      await patchJob(String(jobId), { jobId: trimmed || null })
      await fetchJob(String(jobId))
    },
    debounceMs: 700,
  })

  const techField = useAutosaveField<string>({
    value: (() => {
      const raw = job?.tech && typeof job.tech === 'object' ? (job.tech as any)?.id : (job?.tech as any)
      if (raw === null || typeof raw === 'undefined') return ''
      const s = String(raw).trim()
      return s === '' ? '' : s
    })(),
    onSave: async (next) => {
      const jobIdRaw = (job as any)?.id ?? (params as any)?.id
      const jobId = Array.isArray(jobIdRaw) ? jobIdRaw[0] : jobIdRaw
      if (!jobId) {
        throw new Error('Job ID not loaded')
      }
      const techId = normalizeRelationId(next)
      const response = await fetch(`/api/jobs/${jobId}/assign-tech`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ techId: techId || null }),
      })
      if (!response.ok) {
        const text = await response.text()
        throw new Error(text || 'Failed to assign tech')
      }
      await fetchJob(String(jobId))
    },
    debounceMs: 0,
  })
  
  useEffect(() => {
    fetchClients()
    fetchTechs()
    fetchProducts()
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
  
  const fetchClients = async () => {
    try {
      const response = await fetch('/api/clients?limit=1000')
      const data = await response.json()
      setClients(data.docs || [])
    } catch (error) {
      console.error('Error fetching clients:', error)
    }
  }
  
  const fetchTechs = async () => {
    try {
      const response = await fetch('/api/technicians?limit=1000')
      const data = await response.json()
      setTechs(data.docs || [])
    } catch (error) {
      console.error('Error fetching techs:', error)
    }
  }

  const fetchProducts = async () => {
    try {
      const response = await fetch('/api/products?limit=1000')
      const data = await response.json()
      setProducts(data.docs || [])
    } catch (error) {
      console.error('Error fetching products:', error)
    }
  }

  useEffect(() => {
    if (params.id) {
      fetchJob(params.id as string)
    }
  }, [params.id])

  const fetchJob = async (id: string) => {
    try {
      const response = await fetch(`/api/jobs/${id}?depth=2`)
      const data = await response.json()
      setJob(data)
      setNewStatus(data.status)
      setEditedJob(data)
    } catch (error) {
      console.error('Error fetching job:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleEditToggle = () => {
    if (editMode) {
      setEditedJob(job)
    }
    setEditMode(!editMode)
  }

  const handleSaveJob = async () => {
    if (!editedJob) return
    
    setSaving(true)
    try {
      const clientValue = typeof editedJob.client === 'object' ? editedJob.client.id : editedJob.client
      const workflowTemplateValue = normalizeRelationId(editedJob.workflowTemplate)
      
      // Get the tech value for separate update
      let techValue = null
      if (editedJob.tech) {
        if (typeof editedJob.tech === 'object' && editedJob.tech !== null) {
          techValue = editedJob.tech.id
        } else if (editedJob.tech !== '') {
          techValue = editedJob.tech
        }
      }
      
      // Format line items - convert product IDs to integers
      const formattedLineItems = (editedJob.lineItems || []).map((item: any) => ({
        product: typeof item.product === 'object' ? parseInt(item.product.id) : parseInt(item.product),
        quantity: parseInt(item.quantity) || 1,
        instructions: item.instructions || '',
      })).filter((item: any) => item.product && !isNaN(item.product))

      // Calculate total price from products
      let calculatedTotal = 0
      const jobSqFt = parseInt(editedJob.sqFt) || 0
      formattedLineItems.forEach((item: any) => {
        const product = products.find(p => p.id === item.product)
        if (product) {
          const price = product.basePrice || 0
          const multiplier = product.unitType === 'per-sq-ft' ? jobSqFt : item.quantity
          calculatedTotal += price * multiplier
        }
      })

      // Update main job fields (without tech)
      // Convert datetime-local value to ISO string while preserving the intended time
      // datetime-local gives us "2026-01-22T12:00" which represents 12:00 PM in the job's timezone
      let targetDateISO = editedJob.targetDate
      if (editedJob.targetDate && !editedJob.targetDate.includes('Z') && !editedJob.targetDate.includes('+')) {
        // Append seconds if missing
        const dateStr = editedJob.targetDate.length === 16 ? editedJob.targetDate + ':00' : editedJob.targetDate
        
        // Get timezone offset based on job's timezone setting
        const timezone = editedJob.timezone || 'America/Chicago'
        const timezoneOffsets: Record<string, string> = {
          'America/Chicago': '-06:00',    // CST
          'America/New_York': '-05:00',   // EST
          'America/Denver': '-07:00',     // MST
          'America/Los_Angeles': '-08:00', // PST
          'America/Phoenix': '-07:00',    // MST (no DST)
        }
        
        const offset = timezoneOffsets[timezone] || '-06:00'
        targetDateISO = dateStr + offset
      }

      // Calculate financial values
      const subtotal = calculatedTotal
      const discountAmount = editedJob.discount?.type === 'fixed' 
        ? (editedJob.discount?.value || 0)
        : editedJob.discount?.type === 'percentage'
        ? subtotal * ((editedJob.discount?.value || 0) / 100)
        : 0
      
      // Calculate tax based on client settings and taxable products
      let taxAmount = 0
      const client = clients.find(c => c.id === clientValue)
      if (client && !client.invoicingPreferences?.taxExempt && client.invoicingPreferences?.taxRate) {
        let taxableAmount = 0
        formattedLineItems.forEach((item: any) => {
          const product = products.find(p => p.id === item.product)
          if (product?.taxable) {
            const price = product.basePrice || 0
            const jobSqFt = parseInt(editedJob.sqFt) || 0
            const multiplier = product.unitType === 'per-sq-ft' ? jobSqFt : item.quantity
            taxableAmount += price * multiplier
          }
        })
        taxAmount = taxableAmount * ((client.invoicingPreferences.taxRate || 0) / 100)
      }
      
      const totalWithTax = subtotal + taxAmount - discountAmount

      const updateData: any = {
        jobId: editedJob.jobId,
        modelName: editedJob.modelName,
        client: clientValue,
        captureAddress: editedJob.captureAddress,
        city: editedJob.city,
        state: editedJob.state,
        zip: editedJob.zip,
        region: editedJob.region,
        status: editedJob.status,
        targetDate: targetDateISO,
        timezone: editedJob.timezone || 'America/Chicago',
        sqFt: parseInt(editedJob.sqFt) || 0,
        schedulingNotes: editedJob.schedulingNotes,
        techInstructions: editedJob.techInstructions,
        lineItems: formattedLineItems,
        vendorPrice: parseFloat(editedJob.vendorPrice) || 0,
        travelPayout: parseFloat(editedJob.travelPayout) || 0,
        offHoursPayout: parseFloat(editedJob.offHoursPayout) || 0,
        totalPrice: calculatedTotal > 0 ? calculatedTotal : (parseFloat(editedJob.totalPrice) || 0),
        // Don't send externalExpenses - let the hook manage auto-generation
        // Only send if user explicitly modified them
        ...(editedJob.externalExpenses && editedJob.externalExpenses.length > 0 
          ? { externalExpenses: editedJob.externalExpenses }
          : {}),
        discount: {
          type: editedJob.discount?.type || 'none',
          value: editedJob.discount?.value || 0,
          amount: discountAmount,
        },
        subtotal: subtotal,
        taxAmount: taxAmount,
        totalWithTax: totalWithTax,
        workflowTemplate: workflowTemplateValue,
        workflowSteps: editedJob.workflowSteps || [],
      }
      
      console.log('Sending update:', updateData)
      
      const response = await fetch(`/api/jobs/${job?.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error('Update failed:', errorData)
        alert(`Failed to update job: ${errorData.errors?.[0]?.message || 'Unknown error'}`)
        setSaving(false)
        return
      }

      // If tech assignment changed, update it separately
      const originalTechId = typeof job?.tech === 'object' ? job?.tech?.id : job?.tech
      if (techValue !== originalTechId) {
        const techResponse = await fetch(`/api/jobs/${job?.id}/assign-tech`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ techId: techValue }),
        })

        if (!techResponse.ok) {
          console.error('Tech assignment failed')
          alert('Job updated but tech assignment failed. Please assign tech in admin panel.')
        }
      }

      // Refresh job data - fetch fresh to get data modified by hooks
      setEditMode(false)
      await fetchJob(job?.id as string)
      alert('Job updated successfully!')
    } catch (error) {
      console.error('Error updating job:', error)
      alert(`Error updating job: ${error}`)
    } finally {
      setSaving(false)
    }
  }

  const handleStatusUpdate = async () => {
    if (!job || !newStatus) return
    
    setSaving(true)
    try {
      const response = await fetch(`/api/jobs/${job.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: newStatus,
        }),
      })

      if (response.ok) {
        const updatedJob = await response.json()
        setJob(updatedJob)
        setEditingStatus(false)
        alert('Status updated successfully!')
      } else {
        const errorText = await response.text()
        console.error('Status update failed with status:', response.status)
        console.error('Error response:', errorText)
        try {
          const errorData = JSON.parse(errorText)
          console.error('Parsed error:', errorData)
        } catch (e) {
          console.error('Could not parse error as JSON')
        }
        alert('Failed to update status')
      }
    } catch (error) {
      console.error('Error updating status:', error)
      alert('Error updating status')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <svg className="animate-spin h-12 w-12 mx-auto mb-4 text-blue-600 dark:text-blue-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-lg font-medium text-gray-700 dark:text-gray-300">Loading job...</p>
        </div>
      </div>
    )
  }

  if (!job) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Job Not Found</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">The job you&apos;re looking for doesn&apos;t exist.</p>
          <Link href="/oms/jobs" className="text-blue-600 hover:text-blue-700 dark:text-blue-400">
            ← Back to Jobs
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="px-8 py-6">
          <div className="flex items-center justify-between mb-4">
            <Link
              href="/oms/jobs"
              className="text-blue-600 hover:text-blue-700 dark:text-blue-400 flex items-center gap-2"
            >
              ← Back to Jobs
            </Link>
            <div className="flex gap-2">
              {user?.role !== 'tech' && (
                <>
                  <NotifyClientButton 
                    jobId={job.id} 
                    clientName={job.client?.name}
                    clientEmail={job.client?.email}
                  />
                  {(job as any).completionToken ? (
                    <button
                      onClick={() => {
                        const url = `${window.location.origin}/forms/job/${(job as any).completionToken}`
                        navigator.clipboard.writeText(url)
                        alert('Tech Portal link copied to clipboard!')
                      }}
                      className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                      title="Copy tech portal link for subcontractor"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      Copy Tech Portal Link
                    </button>
                  ) : (
                    <button
                      onClick={async () => {
                        try {
                          const token = Math.random().toString(36).substring(2) + Date.now().toString(36)
                          await patchJob(job.id, { completionToken: token })
                          await fetchJob(job.id)
                          alert('Tech portal link generated! Click the button again to copy it.')
                        } catch (e) {
                          console.error('Failed to generate token:', e)
                          alert('Failed to generate tech portal link')
                        }
                      }}
                      className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                      title="Generate tech portal link"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Generate Tech Portal Link
                    </button>
                  )}

 
                  {editMode ? (
                    <>
                      <button
                        onClick={handleSaveJob}
                        disabled={saving}
                        className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors"
                      >
                        {saving ? 'Saving...' : 'Save Changes'}
                      </button>
                      <button
                        onClick={handleEditToggle}
                        className="px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg font-medium transition-colors"
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <></>
                  )}
                </>
              )}
            </div>
          </div>
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                {job.jobId || 'Job Details'}
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                {job.modelName}
              </p>
            </div>
            <div className="flex flex-col items-end gap-2">
              {user?.role !== 'tech' ? (
                <>
                  {editingStatus ? (
                    <div className="flex items-center gap-2">
                      <select
                        value={newStatus}
                        onChange={(e) => setNewStatus(e.target.value)}
                        className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="request">Request</option>
                        <option value="scheduled">Scheduled</option>
                        <option value="scanned">Scanned</option>
                        <option value="qc">QC</option>
                        <option value="done">Done</option>
                        <option value="archived">Archived</option>
                      </select>
                      <button
                        onClick={handleStatusUpdate}
                        disabled={saving}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors"
                      >
                        {saving ? 'Saving...' : 'Save'}
                      </button>
                      <button
                        onClick={() => {
                          setEditingStatus(false)
                          setNewStatus(job.status)
                        }}
                        className="px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg font-medium transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setEditingStatus(true)}
                      className={`px-3 py-1 rounded-full text-sm font-semibold cursor-pointer transition-all hover:ring-2 hover:ring-blue-500 ${
                        job.status === 'request' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' :
                        job.status === 'scheduled' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' :
                        job.status === 'scanned' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300' :
                        job.status === 'qc' ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300' :
                        job.status === 'done' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' :
                        job.status === 'archived' ? 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300' :
                        'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300'
                      }`}
                    >
                  {job.status || 'request'} ✏️
                </button>
                  )}
                </>
              ) : (
                <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                  job.status === 'request' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' :
                  job.status === 'scheduled' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' :
                  job.status === 'scanned' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300' :
                  job.status === 'qc' ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300' :
                  job.status === 'done' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' :
                  job.status === 'archived' ? 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300' :
                  'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300'
                }`}>
                  {job.status || 'request'}
                </span>
              )}
              {job.region && (
                <span className="px-3 py-1 rounded-full text-sm font-semibold bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300 capitalize">
                  {job.region.replace('-', ' ')}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Workflow Section */}
        <div className="px-4 md:px-8 py-4">
          {user?.role === 'tech' ? (
            // Simple buttons for tech users
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 md:p-6 shadow-sm border border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Job Actions</h3>
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={async () => {
                    if (!job?.id || !job.workflowSteps) {
                      console.error('Job ID or workflow steps missing')
                      return
                    }
                    try {
                      // Find the "Scanned" workflow step and mark it as complete
                      const updatedSteps = job.workflowSteps.map((step: any) => {
                        if (step.stepName === 'Scanned' && !step.completed) {
                          return { ...step, completed: true, completedAt: new Date().toISOString() }
                        }
                        return step
                      })
                      
                      const response = await fetch(`/api/jobs/${job.id}`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ workflowSteps: updatedSteps }),
                      })
                      if (response.ok) {
                        await fetchJob(job.id)
                      } else {
                        console.error('Failed to complete scan:', await response.text())
                      }
                    } catch (error) {
                      console.error('Error completing scan:', error)
                    }
                  }}
                  disabled={!job?.id || !job.workflowSteps || job.workflowSteps.find((s: any) => s.stepName === 'Scanned')?.completed}
                  className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                >
                  <span className="text-xl">📸</span>
                  <span>{job.workflowSteps?.find((s: any) => s.stepName === 'Scanned')?.completed ? 'Scan Completed' : 'Complete Scan'}</span>
                </button>
                <button
                  onClick={async () => {
                    if (!job?.id || !job.workflowSteps) {
                      console.error('Job ID or workflow steps missing')
                      return
                    }
                    try {
                      // Find the "Scan Uploaded" workflow step and mark it as complete
                      const updatedSteps = job.workflowSteps.map((step: any) => {
                        if (step.stepName === 'Scan Uploaded' && !step.completed) {
                          return { ...step, completed: true, completedAt: new Date().toISOString() }
                        }
                        return step
                      })
                      
                      const response = await fetch(`/api/jobs/${job.id}`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ workflowSteps: updatedSteps }),
                      })
                      if (response.ok) {
                        await fetchJob(job.id)
                      } else {
                        console.error('Failed to complete upload:', await response.text())
                      }
                    } catch (error) {
                      console.error('Error completing upload:', error)
                    }
                  }}
                  disabled={!job?.id || !job.workflowSteps || !job.workflowSteps.find((s: any) => s.stepName === 'Scanned')?.completed || job.workflowSteps.find((s: any) => s.stepName === 'Scan Uploaded')?.completed}
                  className="flex-1 px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                >
                  <span className="text-xl">☁️</span>
                  <span>{job.workflowSteps?.find((s: any) => s.stepName === 'Scan Uploaded')?.completed ? 'Upload Completed' : 'Complete Upload'}</span>
                </button>
              </div>
              {job.status === 'done' && (
                <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                  <p className="text-sm font-medium text-green-900 dark:text-green-100 text-center">
                    ✅ Job completed! Great work!
                  </p>
                </div>
              )}
            </div>
          ) : (
            // Full workflow timeline for admin users
            <WorkflowTimeline
              workflowTemplate={job.workflowTemplate}
              workflowSteps={job.workflowSteps || []}
              currentStatus={job.status}
              jobId={job.id}
              onStepComplete={() => fetchJob(job.id)}
              onTemplateChange={() => fetchJob(job.id)}
            />
          )}
        </div>

        {/* Tabs */}
        <div className="px-8">
          <div className="flex gap-6 border-b border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setActiveTab('details')}
              className={`pb-3 px-1 font-medium transition-colors ${
                activeTab === 'details'
                  ? 'border-b-2 border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              Details
            </button>
            <button
              onClick={() => setActiveTab('instructions')}
              className={`pb-3 px-1 font-medium transition-colors ${
                activeTab === 'instructions'
                  ? 'border-b-2 border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              Instructions
            </button>
            {/* Schedule tab - only show when schedulingRequest exists AND targetDate is empty */}
            {job.schedulingRequest && !job.targetDate && (
              <button
                onClick={() => setActiveTab('schedule')}
                className={`pb-3 px-1 font-medium transition-colors ${
                  activeTab === 'schedule'
                    ? 'border-b-2 border-blue-600 text-blue-600 dark:text-blue-400'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                📅 Schedule
              </button>
            )}
            <button
              onClick={() => setActiveTab('tech-feedback')}
              className={`pb-3 px-1 font-medium transition-colors ${
                activeTab === 'tech-feedback'
                  ? 'border-b-2 border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              Tech Feedback
            </button>
            {user?.role !== 'tech' && (
              <button
                onClick={() => setActiveTab('qc')}
                className={`pb-3 px-1 font-medium transition-colors ${
                  activeTab === 'qc'
                    ? 'border-b-2 border-blue-600 text-blue-600 dark:text-blue-400'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                Post-Processing
              </button>
            )}
            {user?.role !== 'tech' && (
              <button
                onClick={() => setActiveTab('financials')}
                className={`pb-3 px-1 font-medium transition-colors ${
                  activeTab === 'financials'
                    ? 'border-b-2 border-blue-600 text-blue-600 dark:text-blue-400'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                Financials
              </button>
            )}
            {user?.role !== 'tech' && (
              <button
                onClick={() => setActiveTab('deliverables')}
                className={`pb-3 px-1 font-medium transition-colors ${
                  activeTab === 'deliverables'
                    ? 'border-b-2 border-blue-600 text-blue-600 dark:text-blue-400'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                Deliverables
              </button>
            )}
            <button
              onClick={() => setActiveTab('messages')}
              className={`pb-3 px-1 font-medium transition-colors ${
                activeTab === 'messages'
                  ? 'border-b-2 border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              💬 Messages
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-8">
        {activeTab === 'details' && (
          <JobBasicInfoTab
            job={job}
            user={user}
            clients={clients}
            techs={techs}
            clientField={clientField}
            jobIdField={jobIdField}
            modelNameField={modelNameField}
            targetDateField={targetDateField}
            timezoneField={timezoneField}
            purposeOfScanField={purposeOfScanField}
            captureAddressField={captureAddressField}
            cityField={cityField}
            stateField={stateField}
            zipField={zipField}
            regionField={regionField}
            propertyTypeField={propertyTypeField}
            sqFtField={sqFtField}
            estimatedDurationField={estimatedDurationField}
            techField={techField}
            fetchJob={fetchJob}
          />
        )}

        {activeTab === 'instructions' && (
          <InstructionsTab
            job={job}
            user={user}
            sitePOCNameField={sitePOCNameField}
            sitePOCPhoneField={sitePOCPhoneField}
            sitePOCEmailField={sitePOCEmailField}
            uploadLinkField={uploadLinkField}
            mediaUploadLinkField={mediaUploadLinkField}
            schedulingNotesField={schedulingNotesField}
            techInstructionsField={techInstructionsField}
            onUpdate={() => fetchJob(params.id as string)}
          />
        )}

        {activeTab === 'schedule' && (
          <SchedulingTab
            job={job}
            user={user}
            onUpdate={() => fetchJob(params.id as string)}
          />
        )}

        {activeTab === 'tech-feedback' && (
          <TechFeedbackTab
            job={job}
            user={user}
          />
        )}

        {activeTab === 'qc' && (
          <QCPanel job={job} user={user} onUpdate={() => fetchJob(params.id as string)} />
        )}

        {activeTab === 'financials' && (
          <FinancialsTab
            job={job}
            user={user}
            clients={clients}
            products={products}
            productsEditOpen={productsEditOpen}
            setProductsEditOpen={setProductsEditOpen}
            expensesEditOpen={expensesEditOpen}
            setExpensesEditOpen={setExpensesEditOpen}
            discountEditOpen={discountEditOpen}
            setDiscountEditOpen={setDiscountEditOpen}
            lineItemsField={lineItemsField}
            externalExpensesField={externalExpensesField}
            discountField={discountField}
            vendorPriceField={vendorPriceField}
            travelPayoutField={travelPayoutField}
            offHoursPayoutField={offHoursPayoutField}
          />
        )}

        {activeTab === 'deliverables' && (
          <DeliverablesTab
            job={job}
            user={user}
            deliverablesField={deliverablesField}
            editMode={editMode}
            editedJob={editedJob}
            setEditedJob={setEditedJob}
          />
        )}

        {activeTab === 'messages' && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
            <JobMessaging jobId={job.id} currentUser={user} />
          </div>
        )}
      </div>
    </div>
  )
}
