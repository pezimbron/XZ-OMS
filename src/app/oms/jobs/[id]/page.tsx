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
}

export default function JobDetailPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const [job, setJob] = useState<Job | null>(null)
  const [loading, setLoading] = useState(true)
  
  // Initialize activeTab from URL query parameter or default to 'details'
  const initialTab = searchParams.get('tab') as 'details' | 'instructions' | 'tech-feedback' | 'qc' | 'financials' | 'workflow' | 'deliverables' | 'messages' | null
  const [activeTab, setActiveTab] = useState<'details' | 'instructions' | 'tech-feedback' | 'qc' | 'financials' | 'workflow' | 'deliverables' | 'messages'>(initialTab || 'details')
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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Basic Info */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Basic Information</h2>
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Job ID</label>
                  {isTech ? (
                    <p className="text-gray-900 dark:text-white">{job.jobId || 'N/A'}</p>
                  ) : (
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={jobIdField.value || ''}
                          onChange={(e) => jobIdField.setValue(e.target.value)}
                          onBlur={() => jobIdField.onBlur()}
                          className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          placeholder="Enter custom Job ID (optional)"
                        />
                        {!job.jobId && (
                          <button
                            type="button"
                            onClick={autosaveJobId}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors whitespace-nowrap"
                            title="Generate random Job ID"
                          >
                            🎲 Generate
                          </button>
                        )}
                      </div>
                      <SaveIndicator status={jobIdField.status} error={jobIdField.error} />
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        For outsourcing partners who use their own IDs
                      </p>
                    </div>
                  )}
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Model Name</label>
                  {isTech ? (
                    <p className="text-gray-900 dark:text-white">{job.modelName || 'N/A'}</p>
                  ) : (
                    <div className="space-y-1">
                      <input
                        type="text"
                        value={modelNameField.value}
                        onChange={(e) => modelNameField.setValue(e.target.value)}
                        onBlur={() => modelNameField.onBlur()}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                      <SaveIndicator status={modelNameField.status} error={modelNameField.error} />
                    </div>
                  )}
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Target Date</label>
                  {isTech ? (
                    <p className="text-gray-900 dark:text-white">
                      {job.targetDate ? new Date(job.targetDate).toLocaleString() : 'N/A'}
                    </p>
                  ) : (
                    <div className="space-y-1">
                      <input
                        type="datetime-local"
                        value={targetDateField.value ? (() => {
                          const date = new Date(targetDateField.value)
                          const year = date.getFullYear()
                          const month = String(date.getMonth() + 1).padStart(2, '0')
                          const day = String(date.getDate()).padStart(2, '0')
                          const hours = String(date.getHours()).padStart(2, '0')
                          const minutes = String(date.getMinutes()).padStart(2, '0')
                          return `${year}-${month}-${day}T${hours}:${minutes}`
                        })() : ''}
                        onChange={(e) => targetDateField.commit(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                      <SaveIndicator status={targetDateField.status} error={targetDateField.error} />
                    </div>
                  )}
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Timezone</label>
                  {isTech ? (
                    <p className="text-gray-900 dark:text-white">
                      {job.timezone === 'America/Chicago' ? 'Central Time' :
                       job.timezone === 'America/New_York' ? 'Eastern Time' :
                       job.timezone === 'America/Denver' ? 'Mountain Time' :
                       job.timezone === 'America/Los_Angeles' ? 'Pacific Time' :
                       job.timezone === 'America/Phoenix' ? 'Arizona' :
                       'Central Time'}
                    </p>
                  ) : (
                    <div className="space-y-1">
                      <select
                        value={timezoneField.value || 'America/Chicago'}
                        onChange={(e) => timezoneField.commit(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      >
                        <option value="America/Chicago">Central Time (Austin/San Antonio)</option>
                        <option value="America/New_York">Eastern Time</option>
                        <option value="America/Denver">Mountain Time</option>
                        <option value="America/Los_Angeles">Pacific Time</option>
                        <option value="America/Phoenix">Arizona (No DST)</option>
                      </select>
                      <SaveIndicator status={timezoneField.status} error={timezoneField.error} />
                    </div>
                  )}
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Status</label>
                  {editMode ? (
                    <select
                      value={editedJob?.status || ''}
                      onChange={(e) => setEditedJob({...editedJob, status: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      <option value="request">Request</option>
                      <option value="scheduled">Scheduled</option>
                      <option value="scanned">Scanned</option>
                      <option value="qc">QC</option>
                      <option value="done">Done</option>
                      <option value="archived">Archived</option>
                    </select>
                  ) : (
                    <div className="space-y-1">
                      {isAdmin && !isTech ? (
                        <>
                          <select
                            value={statusField.value || 'request'}
                            onChange={(e) => statusField.setValue(e.target.value)}
                            onBlur={() => statusField.onBlur()}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          >
                            <option value="request">Request</option>
                            <option value="scheduled">Scheduled</option>
                            <option value="scanned">Scanned</option>
                            <option value="qc">QC</option>
                            <option value="done">Done</option>
                            <option value="archived">Archived</option>
                          </select>
                          <SaveIndicator status={statusField.status} error={statusField.error} />
                          <p className="text-xs text-gray-500">Admin Override</p>
                        </>
                      ) : (
                        <p className="text-gray-900 dark:text-white capitalize">{job.status || 'request'}</p>
                      )}
                    </div>
                  )}
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Region</label>
                  {isTech ? (
                    <p className="text-gray-900 dark:text-white capitalize">{job.region?.replace('-', ' ') || 'N/A'}</p>
                  ) : (
                    <div className="space-y-1">
                      <select
                        value={regionField.value || ''}
                        onChange={(e) => {
                          const next = e.target.value
                          const commit = (regionField as any).commit
                          if (typeof commit === 'function') {
                            commit(next)
                            return
                          }
                          regionField.setValue(next)
                        }}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      >
                        <option value="">Select Region</option>
                        <option value="austin">Austin Area</option>
                        <option value="san-antonio">San Antonio Area</option>
                        <option value="outsourced">Outsourced</option>
                        <option value="other">Other</option>
                      </select>
                      <SaveIndicator status={regionField.status} error={regionField.error} />
                    </div>
                  )}
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Square Feet</label>
                  {editMode ? (
                    <input
                      type="number"
                      value={editedJob?.sqFt || ''}
                      onChange={(e) => setEditedJob({...editedJob, sqFt: parseInt(e.target.value) || 0})}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="Enter square feet"
                    />
                  ) : (
                    <div className="space-y-1">
                      {isTech ? (
                        <p className="text-gray-900 dark:text-white">{(job as any).sqFt?.toLocaleString() || 'N/A'} sq ft</p>
                      ) : (
                        <input
                          type="number"
                          value={sqFtField.value || ''}
                          onChange={(e) => sqFtField.setValue(e.target.value)}
                          onBlur={() => sqFtField.onBlur()}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          placeholder="Enter square feet"
                        />
                      )}
                      {!isTech && <SaveIndicator status={sqFtField.status} error={sqFtField.error} />}
                    </div>
                  )}
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Estimated Duration (hours)</label>
                  {editMode ? (
                    <input
                      type="number"
                      step="0.5"
                      value={editedJob?.estimatedDuration || ''}
                      onChange={(e) => setEditedJob({...editedJob, estimatedDuration: parseFloat(e.target.value) || 0})}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="Auto-calculated from sqft"
                    />
                  ) : (
                    <div className="space-y-1">
                      {isTech ? (
                        <p className="text-gray-900 dark:text-white">{(job as any).estimatedDuration ? `${(job as any).estimatedDuration} hours` : 'N/A'}</p>
                      ) : (
                        <input
                          type="number"
                          step="0.5"
                          value={estimatedDurationField.value || ''}
                          onChange={(e) => estimatedDurationField.setValue(e.target.value)}
                          onBlur={() => estimatedDurationField.onBlur()}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          placeholder="Auto-calculated from sqft"
                        />
                      )}
                      {!isTech && <SaveIndicator status={estimatedDurationField.status} error={estimatedDurationField.error} />}
                    </div>
                  )}
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Property Type</label>
                  {isTech ? (
                    <p className="text-gray-900 dark:text-white capitalize">{(job as any).propertyType?.replace('-', ' ') || 'N/A'}</p>
                  ) : (
                    <div className="space-y-1">
                      <select
                        value={propertyTypeField.value || ''}
                        onChange={(e) => {
                          const next = e.target.value
                          const commit = (propertyTypeField as any).commit
                          if (typeof commit === 'function') {
                            commit(next)
                            return
                          }
                          propertyTypeField.setValue(next)
                        }}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      >
                        <option value="">Select Property Type</option>
                        <option value="commercial">Commercial</option>
                        <option value="residential">Residential</option>
                        <option value="industrial">Industrial</option>
                        <option value="other">Other</option>
                      </select>
                      <SaveIndicator status={propertyTypeField.status} error={propertyTypeField.error} />
                    </div>
                  )}
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Purpose of Scan</label>
                  {isTech ? (
                    <p className="text-gray-900 dark:text-white capitalize">{(job as any).purposeOfScan?.replace(/-/g, ' ') || 'N/A'}</p>
                  ) : (
                    <div className="space-y-1">
                      <select
                        value={purposeOfScanField.value || ''}
                        onChange={(e) => {
                          const next = e.target.value
                          const commit = (purposeOfScanField as any).commit
                          if (typeof commit === 'function') {
                            commit(next)
                            return
                          }
                          purposeOfScanField.setValue(next)
                        }}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      >
                        <option value="">Select Purpose</option>
                        <option value="construction-documentation">Construction Documentation</option>
                        <option value="property-marketing">Property Marketing</option>
                        <option value="facility-management">Facility Management</option>
                        <option value="insurance-claims">Insurance/Claims</option>
                        <option value="historical-preservation">Historical Preservation</option>
                        <option value="renovation-planning">Renovation Planning</option>
                        <option value="as-built-documentation">As-Built Documentation</option>
                        <option value="virtual-tours">Virtual Tours</option>
                        <option value="other">Other</option>
                      </select>
                      <SaveIndicator status={purposeOfScanField.status} error={purposeOfScanField.error} />
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-6">
              {/* Client Info */}
              <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-3">Client Information</h2>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Client</label>
                    {isTech ? (
                      <p className="text-gray-900 dark:text-white">{job.client?.name || 'N/A'}</p>
                    ) : (
                      <div className="space-y-1">
                        <select
                          value={clientField.value}
                          onChange={(e) => clientField.commit(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        >
                          <option value="">Select Client</option>
                          {clients.map(client => (
                            <option key={client.id} value={client.id}>{client.name}</option>
                          ))}
                        </select>
                        <SaveIndicator status={clientField.status} error={clientField.error} />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Location */}
              <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-3">Location</h2>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Address</label>
                    {isTech ? (
                      <p className="text-gray-900 dark:text-white">{job.captureAddress || 'N/A'}</p>
                    ) : editMode ? (
                      <input
                        type="text"
                        value={editedJob?.captureAddress || ''}
                        onChange={(e) => setEditedJob({...editedJob, captureAddress: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        placeholder="Enter address"
                      />
                    ) : (
                      <div className="space-y-1">
                        <AddressAutocomplete
                          value={captureAddressField.value || ''}
                          onChange={(next) => (captureAddressField as any).setLocal?.(next)}
                          onSelect={async (parsed) => {
                            if (!job?.id) return
                            try {
                              await patchJob(job.id, {
                                captureAddress: parsed.addressLine1 || null,
                                city: parsed.city || null,
                                state: parsed.state || null,
                                zip: parsed.zip || null,
                              })

                              ;(captureAddressField as any).setLocal?.(parsed.addressLine1 || '')
                              ;(cityField as any).setLocal?.(parsed.city || '')
                              ;(stateField as any).setLocal?.(parsed.state || '')
                              ;(zipField as any).setLocal?.(parsed.zip || '')

                              await fetchJob(job.id)
                            } catch (e) {
                              console.error('Failed to save address:', e)
                            }
                          }}
                          placeholder="Start typing an address..."
                        />
                        <SaveIndicator status={captureAddressField.status} error={captureAddressField.error} />
                      </div>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="text-sm font-medium text-gray-500 dark:text-gray-400">City</label>
                      {isTech ? (
                        <p className="text-gray-900 dark:text-white">{job.city || 'N/A'}</p>
                      ) : editMode ? (
                        <input
                          type="text"
                          value={editedJob?.city || ''}
                          onChange={(e) => setEditedJob({...editedJob, city: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          placeholder="City"
                        />
                      ) : (
                        <div className="space-y-1">
                          <input
                            type="text"
                            value={cityField.value || ''}
                            onChange={(e) => cityField.setValue(e.target.value)}
                            onBlur={() => cityField.onBlur()}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            placeholder="City"
                          />
                          <SaveIndicator status={cityField.status} error={cityField.error} />
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500 dark:text-gray-400">State</label>
                      {isTech ? (
                        <p className="text-gray-900 dark:text-white">{job.state || 'N/A'}</p>
                      ) : editMode ? (
                        <input
                          type="text"
                          value={editedJob?.state || ''}
                          onChange={(e) => setEditedJob({...editedJob, state: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          placeholder="State"
                        />
                      ) : (
                        <div className="space-y-1">
                          <input
                            type="text"
                            value={stateField.value || ''}
                            onChange={(e) => stateField.setValue(e.target.value)}
                            onBlur={() => stateField.onBlur()}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            placeholder="State"
                          />
                          <SaveIndicator status={stateField.status} error={stateField.error} />
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500 dark:text-gray-400">ZIP</label>
                      {isTech ? (
                        <p className="text-gray-900 dark:text-white">{job.zip || 'N/A'}</p>
                      ) : editMode ? (
                        <input
                          type="text"
                          value={editedJob?.zip || ''}
                          onChange={(e) => setEditedJob({...editedJob, zip: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          placeholder="ZIP"
                        />
                      ) : (
                        <div className="space-y-1">
                          <input
                            type="text"
                            value={zipField.value || ''}
                            onChange={(e) => zipField.setValue(e.target.value)}
                            onBlur={() => zipField.onBlur()}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            placeholder="ZIP"
                          />
                          <SaveIndicator status={zipField.status} error={zipField.error} />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Tech Assignment */}
              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Tech Assignment</h2>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Assigned Tech</label>
                    {isTech ? (
                      <p className="text-gray-900 dark:text-white">
                        {job.tech?.name || <span className="text-gray-400 italic">Unassigned</span>}
                      </p>
                    ) : (
                      <div className="space-y-1">
                        <select
                          value={techField.value || ''}
                          onChange={(e) => {
                            const next = e.target.value
                            const commit = (techField as any).commit
                            if (typeof commit === 'function') {
                              commit(next)
                              return
                            }
                            techField.setValue(next)
                          }}
                          onBlur={() => techField.onBlur()}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        >
                          <option value="">Unassigned</option>
                          {techs.map((tech) => (
                            <option key={tech.id} value={String(tech.id)}>{tech.name}</option>
                          ))}
                        </select>
                        <SaveIndicator status={techField.status} error={techField.error} />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Scheduling Request */}
            {!isTech && (
              <SchedulingRequestPanel
                jobId={job.id}
                existingRequest={(job as any).schedulingRequest}
                onSave={() => fetchJob(job.id)}
              />
            )}

            {/* Tech Scheduling Response */}
            {!isTech && (job as any).techResponse?.respondedAt && (
              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Tech Scheduling Response</h2>
                
                <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border-l-4 border-green-500 rounded">
                  <p className="text-sm text-green-800 dark:text-green-300">
                    <strong>Responded:</strong> {new Date((job as any).techResponse.respondedAt).toLocaleString()}
                  </p>
                </div>

                {(job as any).techResponse.interested ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="font-semibold">Tech Accepted</span>
                    </div>

                    {(job as any).schedulingRequest?.requestType === 'time-windows' && (job as any).techResponse.selectedOption && (
                      <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Selected Time Window:</p>
                            <p className="font-medium text-gray-900 dark:text-white">
                              Option {(job as any).techResponse.selectedOption}
                              {(job as any).schedulingRequest.timeOptions?.find((opt: any) => opt.optionNumber === (job as any).techResponse.selectedOption) && (
                                <span className="ml-2">
                                  - {new Date((job as any).schedulingRequest.timeOptions.find((opt: any) => opt.optionNumber === (job as any).techResponse.selectedOption).date).toLocaleDateString()}
                                </span>
                              )}
                            </p>
                            {(job as any).techResponse.preferredStartTime && (
                              <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">
                                Preferred start time: {(job as any).techResponse.preferredStartTime}
                              </p>
                            )}
                          </div>
                          {!job.targetDate && (
                            <button
                              onClick={async () => {
                              const selectedOption = (job as any).schedulingRequest.timeOptions?.find((opt: any) => opt.optionNumber === (job as any).techResponse.selectedOption)
                              if (!selectedOption) return
                              const startTime = (job as any).techResponse.preferredStartTime || '09:00'
                              if (!confirm(`Confirm this time slot: ${new Date(selectedOption.date).toLocaleDateString()} at ${startTime}?`)) return
                              try {
                                const timezone = job.timezone || 'America/Chicago'
                                const timezoneOffsets: Record<string, string> = {
                                  'America/Chicago': '-06:00',
                                  'America/New_York': '-05:00',
                                  'America/Denver': '-07:00',
                                  'America/Los_Angeles': '-08:00',
                                  'America/Phoenix': '-07:00',
                                }
                                const offset = timezoneOffsets[timezone] || '-06:00'
                                const dateOnly = selectedOption.date.split('T')[0]
                                let hours = 9, minutes = 0
                                const time24Match = startTime.match(/^(\d{1,2}):(\d{2})$/)
                                const time12Match = startTime.match(/^(\d{1,2}):(\d{2})\s?(am|pm)$/i)
                                if (time24Match) {
                                  hours = parseInt(time24Match[1])
                                  minutes = parseInt(time24Match[2])
                                } else if (time12Match) {
                                  hours = parseInt(time12Match[1])
                                  minutes = parseInt(time12Match[2])
                                  const period = time12Match[3].toLowerCase()
                                  if (period === 'pm' && hours !== 12) hours += 12
                                  if (period === 'am' && hours === 12) hours = 0
                                }
                                const timeStr = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:00`
                                const targetDateTime = `${dateOnly}T${timeStr}${offset}`
                                await patchJob(job.id, { targetDate: targetDateTime })
                                try {
                                  await fetch('/api/scheduling/notify-confirmation', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ jobId: job.id }),
                                  })
                                } catch (emailError) {
                                  console.error('Failed to send confirmation email:', emailError)
                                }
                                await fetchJob(job.id)
                                alert('Schedule confirmed!')
                              } catch (error) {
                                console.error('Error confirming schedule:', error)
                                alert('Failed to confirm schedule')
                              }
                            }}
                              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors whitespace-nowrap"
                            >
                              Accept This Time
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                    <p className="text-red-800 dark:text-red-300 font-medium">Tech Declined</p>
                    {(job as any).techResponse.declineReason && (
                      <p className="text-sm text-red-700 dark:text-red-400 mt-2">
                        Reason: {(job as any).techResponse.declineReason}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

          </div>
        )}

        {activeTab === 'instructions' && (
          <div className="space-y-6">
            {/* Row 1: POC, Upload Links, To-Do List */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* On-Site Contact (POC) */}
              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">On-Site Contact (POC)</h2>
                {isTech ? (
                  <div className="space-y-3">
                    {job.sitePOCName || job.sitePOCPhone || job.sitePOCEmail ? (
                      <>
                        {job.sitePOCName && (
                          <div>
                            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Name</label>
                            <p className="text-sm text-gray-900 dark:text-white">{job.sitePOCName}</p>
                          </div>
                        )}
                        {job.sitePOCPhone && (
                          <div>
                            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Phone</label>
                            <a href={`tel:${job.sitePOCPhone}`} className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
                              {job.sitePOCPhone}
                            </a>
                          </div>
                        )}
                        {job.sitePOCEmail && (
                          <div>
                            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Email</label>
                            <a href={`mailto:${job.sitePOCEmail}`} className="text-sm text-blue-600 dark:text-blue-400 hover:underline break-all">
                              {job.sitePOCEmail}
                            </a>
                          </div>
                        )}
                      </>
                    ) : (
                      <p className="text-sm text-gray-400 italic">No contact info</p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">Name</label>
                      <input
                        type="text"
                        value={sitePOCNameField.value || ''}
                        onChange={(e) => sitePOCNameField.setValue(e.target.value)}
                        onBlur={() => sitePOCNameField.onBlur()}
                        className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        placeholder="John Doe"
                      />
                      <SaveIndicator status={sitePOCNameField.status} error={sitePOCNameField.error} />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">Phone</label>
                      <input
                        type="tel"
                        value={sitePOCPhoneField.value || ''}
                        onChange={(e) => sitePOCPhoneField.setValue(e.target.value)}
                        onBlur={() => sitePOCPhoneField.onBlur()}
                        className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        placeholder="(555) 123-4567"
                      />
                      <SaveIndicator status={sitePOCPhoneField.status} error={sitePOCPhoneField.error} />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">Email</label>
                      <input
                        type="email"
                        value={sitePOCEmailField.value || ''}
                        onChange={(e) => sitePOCEmailField.setValue(e.target.value)}
                        onBlur={() => sitePOCEmailField.onBlur()}
                        className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        placeholder="contact@example.com"
                      />
                      <SaveIndicator status={sitePOCEmailField.status} error={sitePOCEmailField.error} />
                    </div>
                  </div>
                )}
              </div>

              {/* Upload Links */}
              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Upload Locations</h2>
                {isTech ? (
                  <div className="space-y-3">
                    {job.uploadLink ? (
                      <div>
                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Primary Upload</label>
                        <a href={job.uploadLink} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 dark:text-blue-400 hover:underline break-all">
                          {job.uploadLink}
                        </a>
                      </div>
                    ) : null}
                    {job.mediaUploadLink ? (
                      <div>
                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Media Upload</label>
                        <a href={job.mediaUploadLink} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 dark:text-blue-400 hover:underline break-all">
                          {job.mediaUploadLink}
                        </a>
                      </div>
                    ) : null}
                    {!job.uploadLink && !job.mediaUploadLink && (
                      <p className="text-sm text-gray-400 italic">No upload links</p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">Primary Upload</label>
                      <input
                        type="url"
                        value={uploadLinkField.value || ''}
                        onChange={(e) => uploadLinkField.setValue(e.target.value)}
                        onBlur={() => uploadLinkField.onBlur()}
                        className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        placeholder="https://..."
                      />
                      <SaveIndicator status={uploadLinkField.status} error={uploadLinkField.error} />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">Media Upload</label>
                      <input
                        type="url"
                        value={mediaUploadLinkField.value || ''}
                        onChange={(e) => mediaUploadLinkField.setValue(e.target.value)}
                        onBlur={() => mediaUploadLinkField.onBlur()}
                        className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        placeholder="https://..."
                      />
                      <SaveIndicator status={mediaUploadLinkField.status} error={mediaUploadLinkField.error} />
                    </div>
                  </div>
                )}
              </div>

              {/* To-Do List / Services */}
              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white">To-Do List / Services</h2>
                  {!isTech && !showCustomItemForm && (
                    <button
                      onClick={() => setShowCustomItemForm(true)}
                      className="px-3 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                    >
                      + Add Custom Item
                    </button>
                  )}
                </div>
                {((job.lineItems?.filter((item: any) => !item.product?.excludeFromCalendar && !item.excludeFromCalendar).length ?? 0) > 0 || (job.customTodoItems?.length ?? 0) > 0) ? (
                  <ul className="space-y-2 list-disc list-inside text-gray-900 dark:text-white">
                    {job.lineItems
                      ?.filter((item: any) => !item.product?.excludeFromCalendar && !item.excludeFromCalendar)
                      .map((item: any, index: number) => (
                      <li key={`product-${index}`} className="text-sm">
                        <span className="font-medium">{item.product?.name || 'Product'}</span>
                        {item.quantity > 1 && <span className="text-gray-500 dark:text-gray-400"> (Qty: {item.quantity})</span>}
                        {item.instructions && (
                          <p className="ml-5 text-xs text-gray-600 dark:text-gray-400 mt-0.5">{item.instructions}</p>
                        )}
                      </li>
                    ))}
                    {job.customTodoItems?.map((item: any, index: number) => (
                      <li key={`custom-${index}`} className="text-sm group">
                        <span className="font-medium">{item.task}</span>
                        {!isTech && (
                          <button
                            onClick={async () => {
                              if (!confirm('Remove this item?')) return
                              const updatedItems = job.customTodoItems?.filter((_: any, i: number) => i !== index) || []
                              try {
                                await patchJob(job.id, { customTodoItems: updatedItems })
                                await fetchJob(job.id)
                              } catch (error) {
                                console.error('Error removing item:', error)
                                alert('Failed to remove item')
                              }
                            }}
                            className="ml-2 text-red-500 hover:text-red-700 opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Remove item"
                          >
                            ×
                          </button>
                        )}
                        {item.notes && (
                          <p className="ml-5 text-xs text-gray-600 dark:text-gray-400 mt-0.5">{item.notes}</p>
                        )}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-gray-400 italic">No items added</p>
                )}

                {/* Inline Add Form */}
                {!isTech && showCustomItemForm && (
                  <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-300 dark:border-gray-600">
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Task Description *
                        </label>
                        <input
                          type="text"
                          value={newCustomTask}
                          onChange={(e) => setNewCustomTask(e.target.value)}
                          placeholder="e.g., Take photos of HVAC system"
                          className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          autoFocus
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Additional Notes (optional)
                        </label>
                        <textarea
                          value={newCustomNotes}
                          onChange={(e) => setNewCustomNotes(e.target.value)}
                          placeholder="Any additional details..."
                          rows={2}
                          className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={async () => {
                            if (!newCustomTask.trim()) {
                              alert('Please enter a task description')
                              return
                            }
                            
                            const currentItems = job.customTodoItems || []
                            const updatedItems = [...currentItems, { task: newCustomTask, notes: newCustomNotes }]
                            
                            try {
                              await patchJob(job.id, { customTodoItems: updatedItems })
                              await fetchJob(job.id)
                              setNewCustomTask('')
                              setNewCustomNotes('')
                              setShowCustomItemForm(false)
                            } catch (error) {
                              console.error('Error adding custom item:', error)
                              alert('Failed to add item')
                            }
                          }}
                          className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => {
                            setNewCustomTask('')
                            setNewCustomNotes('')
                            setShowCustomItemForm(false)
                          }}
                          className="px-4 py-2 text-sm bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg font-medium transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Row 2: Scheduling Notes */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Scheduling Notes / Restrictions</h2>
              {isTech ? (
                <div className="prose dark:prose-invert max-w-none">
                  {job.schedulingNotes ? (
                    <pre className="whitespace-pre-wrap text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">
                      {job.schedulingNotes}
                    </pre>
                  ) : (
                    <p className="text-gray-400 italic">No scheduling notes</p>
                  )}
                </div>
              ) : editMode ? (
                <textarea
                  value={editedJob?.schedulingNotes || ''}
                  onChange={(e) => setEditedJob({...editedJob, schedulingNotes: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white min-h-[100px]"
                  placeholder="Enter scheduling notes, restrictions, or special requirements..."
                />
              ) : (
                <div className="space-y-1">
                  <textarea
                    value={schedulingNotesField.value || ''}
                    onChange={(e) => schedulingNotesField.setValue(e.target.value)}
                    onBlur={() => schedulingNotesField.onBlur()}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white min-h-[100px]"
                    placeholder="Enter scheduling notes, restrictions, or special requirements..."
                  />
                  <SaveIndicator status={schedulingNotesField.status} error={schedulingNotesField.error} />
                </div>
              )}
            </div>

            {/* Row 3: General Instructions */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">General Instructions for Tech</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                Auto-generated from client template + product instructions. Will regenerate when products are added/changed. Add all products first, then make manual edits if needed.
              </p>
              {isTech ? (
                <div className="prose dark:prose-invert max-w-none">
                  {job.techInstructions ? (
                    <pre className="whitespace-pre-wrap text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">
                      {job.techInstructions}
                    </pre>
                  ) : (
                    <p className="text-gray-400 italic">No instructions provided</p>
                  )}
                </div>
              ) : editMode ? (
                <textarea
                  value={editedJob?.techInstructions || ''}
                  onChange={(e) => setEditedJob({...editedJob, techInstructions: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white min-h-[150px]"
                  placeholder="Enter general instructions for the tech..."
                />
              ) : (
                <div className="space-y-1">
                  <textarea
                    value={techInstructionsField.value || ''}
                    onChange={(e) => techInstructionsField.setValue(e.target.value)}
                    onBlur={() => techInstructionsField.onBlur()}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white min-h-[150px]"
                    placeholder="Enter general instructions for the tech..."
                  />
                  <SaveIndicator status={techInstructionsField.status} error={techInstructionsField.error} />
                </div>
              )}
            </div>

          </div>
        )}

        {activeTab === 'tech-feedback' && (
          <div className="space-y-6">
            {/* Tech Contact Information */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Assigned Technician</h2>
              {job.tech ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Name</label>
                    <p className="text-gray-900 dark:text-white font-medium">{job.tech.name}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Email</label>
                    <p className="text-gray-900 dark:text-white">
                      <a href={`mailto:${job.tech.email}`} className="text-blue-600 hover:text-blue-700 dark:text-blue-400">
                        {job.tech.email}
                      </a>
                    </p>
                  </div>
                  {job.tech.phone && (
                    <div>
                      <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Phone</label>
                      <p className="text-gray-900 dark:text-white">
                        <a href={`tel:${job.tech.phone}`} className="text-blue-600 hover:text-blue-700 dark:text-blue-400">
                          {job.tech.phone}
                        </a>
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-gray-400 italic">No technician assigned yet</p>
              )}
            </div>

            {/* Workflow Step Completion Timeline */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Workflow Completion Timeline</h2>
              
              {(() => {
                const techSteps = (job as any).workflowSteps?.filter((step: any) => 
                  step.completed && 
                  step.completedBy && 
                  step.completedBy !== 'system' &&
                  !['Job Request', 'Job Scheduled'].includes(step.stepName)
                ) || []
                
                if (techSteps.length > 0) {
                  return (
                    <div className="space-y-3">
                      {techSteps.map((step: any, index: number) => (
                        <div key={index} className="flex items-start gap-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border-l-4 border-green-500">
                          <div className="flex-shrink-0 mt-1">
                            <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <h3 className="font-semibold text-gray-900 dark:text-white">{step.stepName}</h3>
                              {step.completedAt && (
                                <span className="text-sm text-gray-500 dark:text-gray-400">
                                  {new Date(step.completedAt).toLocaleString()}
                                </span>
                              )}
                            </div>
                            {step.completedBy && (
                              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                                Completed by: {step.completedBy}
                              </p>
                            )}
                            {step.notes && (
                              <p className="text-sm text-gray-700 dark:text-gray-300 mt-2 p-2 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700">
                                {step.notes}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                } else {
                  return <p className="text-gray-400 italic">No workflow steps completed by technician yet</p>
                }
              })()}
            </div>

            {/* Upload Links */}
            {((job as any).uploadLink || (job as any).mediaUploadLink) && (
              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Upload Links</h3>
                <div className="space-y-2">
                  {(job as any).uploadLink && (
                    <div className="bg-gray-50 dark:bg-gray-900 p-3 rounded-lg">
                      <label className="text-sm font-medium text-gray-500 dark:text-gray-400 block mb-1">
                        Primary Upload Link
                      </label>
                      <a
                        href={(job as any).uploadLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-700 dark:text-blue-400 break-all"
                      >
                        {(job as any).uploadLink}
                      </a>
                    </div>
                  )}
                  {(job as any).mediaUploadLink && (
                    <div className="bg-gray-50 dark:bg-gray-900 p-3 rounded-lg">
                      <label className="text-sm font-medium text-gray-500 dark:text-gray-400 block mb-1">
                        Media Upload Link
                      </label>
                      <a
                        href={(job as any).mediaUploadLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-700 dark:text-blue-400 break-all"
                      >
                        {(job as any).mediaUploadLink}
                      </a>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'qc' && (
          <QCPanel job={job} user={user} onUpdate={() => fetchJob(params.id as string)} />
        )}

        {activeTab === 'financials' && (
          <div className="space-y-6">
            {/* Invoice Status */}
            {job.invoiceStatus && job.invoiceStatus !== 'not-invoiced' && (
              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Invoice Status</h2>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-gray-600 dark:text-gray-400">Status:</span>
                      <span className={`px-3 py-1 text-sm font-medium rounded-full ${
                        job.invoiceStatus === 'paid' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' :
                        job.invoiceStatus === 'invoiced' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' :
                        job.invoiceStatus === 'ready' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300' :
                        'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
                      }`}>
                        {job.invoiceStatus?.toUpperCase()}
                      </span>
                    </div>
                    {job.invoice && (
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        <p>Invoice: {job.invoice.invoiceNumber || `#${String(job.invoice.id).slice(0, 8)}`}</p>
                        <p>Amount: ${job.invoice.total?.toFixed(2)}</p>
                        {job.invoicedAt && (
                          <p>Invoiced: {new Date(job.invoicedAt).toLocaleDateString()}</p>
                        )}
                      </div>
                    )}
                  </div>
                  {job.invoice && (
                    <Link
                      href={`/oms/invoices/${job.invoice.id}`}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                    >
                      View Invoice
                    </Link>
                  )}
                </div>
              </div>
            )}
            
            {/* Line Items / Products */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Products / Services</h2>
                {!isTech && !editMode && (
                  <div className="flex gap-2">
                    {productsEditOpen ? (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            ;(lineItemsField as any).commit?.(lineItemsField.value)
                            setProductsEditOpen(false)
                          }}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                        >
                          Done
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            lineItemsField.setValue((job as any)?.lineItems ?? [])
                            setProductsEditOpen(false)
                          }}
                          className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setProductsEditOpen(true)}
                        className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors"
                      >
                        Edit
                      </button>
                    )}
                  </div>
                )}

                {editMode && (
                  <button
                    onClick={() => {
                      const newLineItems = [...(editedJob?.lineItems || []), { product: '', quantity: 1, instructions: '' }]
                      setEditedJob({...editedJob, lineItems: newLineItems})
                    }}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                  >
                    + Add Product
                  </button>
                )}
              </div>
              
              {editMode ? (
                <div className="space-y-3">
                  {(editedJob?.lineItems || []).map((item: any, index: number) => (
                    <div key={index} className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                      <div className="flex gap-3 items-start">
                        <div className="flex-1">
                          <label className="text-sm font-medium text-gray-500 dark:text-gray-400 block mb-1">Product</label>
                          <select
                            value={typeof item.product === 'object' ? item.product?.id : item.product}
                            onChange={(e) => {
                              const newLineItems = [...editedJob.lineItems]
                              newLineItems[index] = {...newLineItems[index], product: e.target.value}
                              setEditedJob({...editedJob, lineItems: newLineItems})
                            }}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          >
                            <option value="">Select Product...</option>
                            {products.map((product) => (
                              <option key={product.id} value={product.id}>
                                {product.name} - ${product.basePrice}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="w-24">
                          <label className="text-sm font-medium text-gray-500 dark:text-gray-400 block mb-1">Qty</label>
                          <input
                            type="number"
                            min="1"
                            value={item.quantity || 1}
                            onChange={(e) => {
                              const newLineItems = [...editedJob.lineItems]
                              newLineItems[index] = {...newLineItems[index], quantity: parseInt(e.target.value)}
                              setEditedJob({...editedJob, lineItems: newLineItems})
                            }}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          />
                        </div>
                        <button
                          onClick={() => {
                            const newLineItems = editedJob.lineItems.filter((_: any, i: number) => i !== index)
                            setEditedJob({...editedJob, lineItems: newLineItems})
                          }}
                          className="mt-7 p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                      <div className="mt-3">
                        <label className="text-sm font-medium text-gray-500 dark:text-gray-400 block mb-1">Instructions</label>
                        <textarea
                          value={item.instructions || ''}
                          onChange={(e) => {
                            const newLineItems = [...editedJob.lineItems]
                            newLineItems[index] = {...newLineItems[index], instructions: e.target.value}
                            setEditedJob({...editedJob, lineItems: newLineItems})
                          }}
                          rows={2}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          placeholder="Optional instructions for this service..."
                        />
                      </div>
                      <div className="mt-3">
                        <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                          <input
                            type="checkbox"
                            checked={item.excludeFromCalendar || false}
                            onChange={(e) => {
                              const newLineItems = [...editedJob.lineItems]
                              newLineItems[index] = {...newLineItems[index], excludeFromCalendar: e.target.checked}
                              setEditedJob({...editedJob, lineItems: newLineItems})
                            }}
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded"
                          />
                          Exclude from tech calendar (post-production only)
                        </label>
                      </div>
                    </div>
                  ))}
                  {(!editedJob?.lineItems || editedJob.lineItems.length === 0) && (
                    <p className="text-gray-400 italic text-center py-4">No products added yet. Click &quot;Add Product&quot; to get started.</p>
                  )}
                </div>
              ) : productsEditOpen && !isTech ? (
                <div className="space-y-3">
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        const next = [...(lineItemsField.value || []), { product: '', quantity: 1, instructions: '' }]
                        lineItemsField.setValue(next)
                      }}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                    >
                      + Add Product
                    </button>
                  </div>
                  {(lineItemsField.value || []).map((item: any, index: number) => (
                    <div key={index} className="flex gap-3 items-start p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                      <div className="flex-1">
                        <label className="text-sm font-medium text-gray-500 dark:text-gray-400 block mb-1">Product</label>
                        <select
                          value={typeof item.product === 'object' ? item.product?.id : item.product}
                          onChange={(e) => {
                            const selectedProduct = products.find(p => String(p.id) === String(e.target.value))
                            const next = [...(lineItemsField.value || [])]
                            const updatedItem: any = { 
                              ...next[index], 
                              product: e.target.value,
                            }
                            if (selectedProduct?.excludeFromCalendar) {
                              updatedItem.excludeFromCalendar = true
                            }
                            next[index] = updatedItem
                            lineItemsField.setValue(next)
                          }}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        >
                          <option value="">Select Product...</option>
                          {products.map((product) => (
                            <option key={product.id} value={product.id}>
                              {product.name} - ${product.basePrice}
                            </option>
                          ))}
                        </select>

                        <label className="mt-3 text-sm font-medium text-gray-500 dark:text-gray-400 block mb-1">Instructions</label>
                        <textarea
                          value={item.instructions || ''}
                          onChange={(e) => {
                            const next = [...(lineItemsField.value || [])]
                            next[index] = { ...next[index], instructions: e.target.value }
                            lineItemsField.setValue(next)
                          }}
                          rows={2}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          placeholder="Optional instructions for this service..."
                        />

                        <div className="mt-3">
                          <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                            <input
                              type="checkbox"
                              checked={(() => {
                                if (item.excludeFromCalendar !== undefined) {
                                  return item.excludeFromCalendar
                                }
                                const productId = typeof item.product === 'object' ? item.product?.id : item.product
                                const product = products.find(p => p.id === productId)
                                return product?.excludeFromCalendar || false
                              })()}
                              onChange={(e) => {
                                const next = [...(lineItemsField.value || [])]
                                next[index] = { ...next[index], excludeFromCalendar: e.target.checked }
                                lineItemsField.setValue(next)
                              }}
                              className="w-4 h-4 text-blue-600 border-gray-300 rounded"
                            />
                            Exclude from tech calendar (post-production only)
                          </label>
                        </div>
                      </div>
                      <div className="w-24">
                        <label className="text-sm font-medium text-gray-500 dark:text-gray-400 block mb-1">Qty</label>
                        <input
                          type="number"
                          min="1"
                          value={item.quantity || 1}
                          onChange={(e) => {
                            const next = [...(lineItemsField.value || [])]
                            next[index] = { ...next[index], quantity: parseInt(e.target.value) }
                            lineItemsField.setValue(next)
                          }}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const next = (lineItemsField.value || []).filter((_: any, i: number) => i !== index)
                          lineItemsField.setValue(next)
                        }}
                        className="mt-7 p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  ))}
                  {(!lineItemsField.value || lineItemsField.value.length === 0) && (
                    <p className="text-gray-400 italic text-center py-4">No products added yet. Click &quot;Add Product&quot; to get started.</p>
                  )}
                  <SaveIndicator status={lineItemsField.status} error={lineItemsField.error} />
                </div>
              ) : (
                <div className="space-y-2">
                  {job.lineItems && job.lineItems.length > 0 ? (
                    job.lineItems.map((item: any, index: number) => (
                      <div key={index} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {item.product?.name || 'Unknown Product'}
                          </p>
                          {item.instructions && (
                            <p className="text-sm text-gray-600 dark:text-gray-400">{item.instructions}</p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-gray-900 dark:text-white">Qty: {item.quantity || 1}</p>
                          {item.product?.basePrice && (
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              ${(() => {
                                const price = item.product.basePrice
                                const jobSqFt = parseInt((job as any).sqFt) || 0
                                const multiplier = item.product.unitType === 'per-sq-ft' ? jobSqFt : (item.quantity || 1)
                                return (price * multiplier).toFixed(2)
                              })()}
                              {item.product.unitType === 'per-sq-ft' && ` (${(job as any).sqFt || 0} sq ft)`}
                            </p>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-400 italic text-center py-4">No products added</p>
                  )}
                </div>
              )}
            </div>

            {/* Invoice Breakdown */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Invoice Breakdown</h2>
              
              {(() => {
                const currentJob = editMode
                  ? editedJob
                  : ({
                      ...job,
                      lineItems: (productsEditOpen ? lineItemsField.value : (job as any).lineItems) ?? (job as any).lineItems,
                      discount: (discountEditOpen ? discountField.value : (job as any).discount) ?? (job as any).discount,
                      externalExpenses: (expensesEditOpen ? externalExpensesField.value : (job as any).externalExpenses) ?? (job as any).externalExpenses,
                    } as any)
                const jobSqFt = parseInt(currentJob?.sqFt) || 0
                
                // Calculate subtotal
                let subtotal = 0
                if (currentJob?.lineItems && currentJob.lineItems.length > 0) {
                  currentJob.lineItems.forEach((item: any) => {
                    const productId = typeof item.product === 'object' ? item.product?.id : item.product
                    const product = products.find(p => p.id === productId)
                    if (product?.basePrice) {
                      const price = product.basePrice
                      const multiplier = product.unitType === 'per-sq-ft' ? jobSqFt : (item.quantity || 1)
                      subtotal += price * multiplier
                    }
                  })
                }
                
                // Calculate discount
                const discountType = currentJob?.discount?.type || 'none'
                const discountValue = currentJob?.discount?.value || 0
                const discountAmount = discountType === 'fixed' 
                  ? discountValue
                  : discountType === 'percentage'
                  ? subtotal * (discountValue / 100)
                  : 0
                
                // Calculate tax
                let taxAmount = 0
                const clientData = clients.find(c => c.id === (typeof currentJob?.client === 'object' ? currentJob.client?.id : currentJob?.client))
                if (clientData && !clientData.invoicingPreferences?.taxExempt && clientData.invoicingPreferences?.taxRate) {
                  let taxableAmount = 0
                  currentJob?.lineItems?.forEach((item: any) => {
                    const productId = typeof item.product === 'object' ? item.product?.id : item.product
                    const product = products.find(p => p.id === productId)
                    if (product?.taxable) {
                      const price = product.basePrice || 0
                      const multiplier = product.unitType === 'per-sq-ft' ? jobSqFt : (item.quantity || 1)
                      taxableAmount += price * multiplier
                    }
                  })
                  taxAmount = taxableAmount * ((clientData.invoicingPreferences.taxRate || 0) / 100)
                }
                
                const totalWithTax = subtotal + taxAmount - discountAmount
                
                return (
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 dark:text-gray-400">Subtotal:</span>
                      <span className="text-lg font-semibold text-gray-900 dark:text-white">
                        ${subtotal.toFixed(2)}
                      </span>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <span className="text-gray-600 dark:text-gray-400">Tax:</span>
                        {clientData?.invoicingPreferences?.taxRate && (
                          <span className="text-sm text-gray-500">({clientData.invoicingPreferences.taxRate}%)</span>
                        )}
                        {clientData?.invoicingPreferences?.taxExempt && (
                          <span className="text-sm text-gray-500">(Tax Exempt)</span>
                        )}
                      </div>
                      <span className="text-lg font-semibold text-gray-900 dark:text-white">
                        ${taxAmount.toFixed(2)}
                      </span>
                    </div>
                    
                    {editMode && (
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <span className="text-gray-600 dark:text-gray-400">Discount:</span>
                          <select
                            value={editedJob?.discount?.type || 'none'}
                            onChange={(e) => setEditedJob({
                              ...editedJob,
                              discount: { ...editedJob?.discount, type: e.target.value, value: 0 }
                            })}
                            className="text-sm px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          >
                            <option value="none">None</option>
                            <option value="fixed">Fixed $</option>
                            <option value="percentage">Percentage %</option>
                          </select>
                          {editedJob?.discount?.type !== 'none' && (
                            <input
                              type="number"
                              step="0.01"
                              value={editedJob?.discount?.value || 0}
                              onChange={(e) => setEditedJob({
                                ...editedJob,
                                discount: { ...editedJob?.discount, value: parseFloat(e.target.value) || 0 }
                              })}
                              className="w-20 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                              placeholder="0"
                            />
                          )}
                        </div>
                        <span className="text-lg font-semibold text-red-600 dark:text-red-400">
                          -${discountAmount.toFixed(2)}
                        </span>
                      </div>
                    )}

                    {!editMode && !isTech && (
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <span className="text-gray-600 dark:text-gray-400">Discount:</span>
                          {discountEditOpen ? (
                            <>
                              <select
                                value={discountField.value?.type || 'none'}
                                onChange={(e) =>
                                  discountField.setValue({
                                    ...(discountField.value || {}),
                                    type: e.target.value,
                                    value: e.target.value === 'none' ? 0 : discountField.value?.value || 0,
                                  })
                                }
                                onBlur={() => discountField.onBlur()}
                                className="text-sm px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                              >
                                <option value="none">None</option>
                                <option value="fixed">Fixed $</option>
                                <option value="percentage">Percentage %</option>
                              </select>
                              {(discountField.value?.type || 'none') !== 'none' && (
                                <input
                                  type="number"
                                  step="0.01"
                                  value={discountField.value?.value || 0}
                                  onChange={(e) =>
                                    discountField.setValue({
                                      ...(discountField.value || {}),
                                      value: parseFloat(e.target.value) || 0,
                                    })
                                  }
                                  onBlur={() => discountField.onBlur()}
                                  className="w-20 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                  placeholder="0"
                                />
                              )}
                              <button
                                type="button"
                                onClick={() => {
                                  ;(discountField as any).commit?.(discountField.value)
                                  setDiscountEditOpen(false)
                                }}
                                className="ml-2 px-3 py-1 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                              >
                                Done
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  discountField.setValue((job as any)?.discount ?? { type: 'none', value: 0 })
                                  setDiscountEditOpen(false)
                                }}
                                className="px-3 py-1 text-sm bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors"
                              >
                                Cancel
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setDiscountEditOpen(true)}
                              className="px-3 py-1 text-sm bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors"
                            >
                              Edit
                            </button>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <span
                            className={`text-lg font-semibold ${
                              discountAmount > 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white'
                            }`}
                          >
                            {discountAmount > 0 ? `-$${discountAmount.toFixed(2)}` : '$0.00'}
                          </span>
                          {discountEditOpen && <SaveIndicator status={discountField.status} error={discountField.error} />}
                        </div>
                      </div>
                    )}
                    
                    {!editMode && discountAmount > 0 && (
                      <div className="flex justify-between items-center text-red-600 dark:text-red-400">
                        <span>Discount:</span>
                        <span className="text-lg font-semibold">
                          -${discountAmount.toFixed(2)}
                        </span>
                      </div>
                    )}
                    
                    <div className="border-t-2 border-gray-300 dark:border-gray-600 my-3"></div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-xl font-bold text-gray-900 dark:text-white">
                        Total (Client Invoice):
                      </span>
                      <span className="text-2xl font-bold text-green-600 dark:text-green-400">
                        ${totalWithTax.toFixed(2)}
                      </span>
                    </div>
                  </div>
                )
              })()}
            </div>

            {/* Costs & Expenses */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Costs & Expenses</h2>
              
              {/* Tech Payouts Section */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Tech Payouts</h3>
                <div className="space-y-2 pl-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 dark:text-gray-400">Capture Payout:</span>
                    {isTech ? (
                      <span className="font-semibold text-gray-900 dark:text-white">
                        ${((job as any).vendorPrice?.toFixed(2) || '0.00')}
                      </span>
                    ) : editMode ? (
                      <input
                        type="number"
                        step="0.01"
                        value={editedJob?.vendorPrice || ''}
                        onChange={(e) => setEditedJob({...editedJob, vendorPrice: parseFloat(e.target.value) || 0})}
                        className="w-32 px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-right"
                        placeholder="0.00"
                      />
                    ) : (
                      <div className="flex flex-col items-end gap-1">
                        <input
                          type="number"
                          step="0.01"
                          value={vendorPriceField.value}
                          onChange={(e) => vendorPriceField.setValue(e.target.value)}
                          onBlur={() => vendorPriceField.onBlur()}
                          className="w-32 px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-right"
                          placeholder="0.00"
                        />
                        <SaveIndicator status={vendorPriceField.status} error={vendorPriceField.error} />
                      </div>
                    )}
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 dark:text-gray-400">Travel Payout:</span>
                    {isTech ? (
                      <span className="font-semibold text-gray-900 dark:text-white">
                        ${((job as any).travelPayout?.toFixed(2) || '0.00')}
                      </span>
                    ) : editMode ? (
                      <input
                        type="number"
                        step="0.01"
                        value={editedJob?.travelPayout || ''}
                        onChange={(e) => setEditedJob({...editedJob, travelPayout: parseFloat(e.target.value) || 0})}
                        className="w-32 px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-right"
                        placeholder="0.00"
                      />
                    ) : (
                      <div className="flex flex-col items-end gap-1">
                        <input
                          type="number"
                          step="0.01"
                          value={travelPayoutField.value}
                          onChange={(e) => travelPayoutField.setValue(e.target.value)}
                          onBlur={() => travelPayoutField.onBlur()}
                          className="w-32 px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-right"
                          placeholder="0.00"
                        />
                        <SaveIndicator status={travelPayoutField.status} error={travelPayoutField.error} />
                      </div>
                    )}
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 dark:text-gray-400">Off-Hours Payout:</span>
                    {isTech ? (
                      <span className="font-semibold text-gray-900 dark:text-white">
                        ${((job as any).offHoursPayout?.toFixed(2) || '0.00')}
                      </span>
                    ) : editMode ? (
                      <input
                        type="number"
                        step="0.01"
                        value={editedJob?.offHoursPayout || ''}
                        onChange={(e) => setEditedJob({...editedJob, offHoursPayout: parseFloat(e.target.value) || 0})}
                        className="w-32 px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-right"
                        placeholder="0.00"
                      />
                    ) : (
                      <div className="flex flex-col items-end gap-1">
                        <input
                          type="number"
                          step="0.01"
                          value={offHoursPayoutField.value}
                          onChange={(e) => offHoursPayoutField.setValue(e.target.value)}
                          onBlur={() => offHoursPayoutField.onBlur()}
                          className="w-32 px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-right"
                          placeholder="0.00"
                        />
                        <SaveIndicator status={offHoursPayoutField.status} error={offHoursPayoutField.error} />
                      </div>
                    )}
                  </div>
                  
                  <div className="border-t border-gray-200 dark:border-gray-700 pt-2 mt-2">
                    <div className="flex justify-between font-semibold">
                      <span className="text-gray-900 dark:text-white">Subtotal Tech:</span>
                      <span className="text-gray-900 dark:text-white">
                        ${(
                          ((editMode ? editedJob?.vendorPrice : (job as any).vendorPrice) || 0) +
                          ((editMode ? editedJob?.travelPayout : (job as any).travelPayout) || 0) +
                          ((editMode ? editedJob?.offHoursPayout : (job as any).offHoursPayout) || 0)
                        ).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* External Expenses Section */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">External Supplier Expenses</h3>
                  {!isTech && !editMode && (
                    <div className="flex gap-2">
                      {expensesEditOpen ? (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              ;(externalExpensesField as any).commit?.(externalExpensesField.value)
                              setExpensesEditOpen(false)
                            }}
                            className="px-3 py-1 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                          >
                            Done
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              externalExpensesField.setValue((job as any)?.externalExpenses ?? [])
                              setExpensesEditOpen(false)
                            }}
                            className="px-3 py-1 text-sm bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors"
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setExpensesEditOpen(true)}
                          className="px-3 py-1 text-sm bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors"
                        >
                          Edit
                        </button>
                      )}
                    </div>
                  )}
                  {editMode && (
                    <button
                      onClick={() => {
                        const newExpenses = [...(editedJob?.externalExpenses || []), {
                          description: '',
                          supplier: '',
                          contactInfo: '',
                          amount: 0,
                          paymentStatus: 'unpaid',
                          notes: ''
                        }]
                        setEditedJob({...editedJob, externalExpenses: newExpenses})
                      }}
                      className="px-3 py-1 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                    >
                      + Add Expense
                    </button>
                  )}
                </div>
                
                <div className="space-y-2 pl-4">
                  {editMode ? (
                    <>
                      {(editedJob?.externalExpenses || []).map((expense: any, index: number) => (
                        <div key={index} className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg space-y-2">
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={expense.description || ''}
                              onChange={(e) => {
                                const newExpenses = [...(editedJob.externalExpenses || [])]
                                newExpenses[index] = {...newExpenses[index], description: e.target.value}
                                setEditedJob({...editedJob, externalExpenses: newExpenses})
                              }}
                              className="flex-1 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                              placeholder="Description (e.g., Floor Plans)"
                            />
                            <input
                              type="number"
                              step="0.01"
                              value={expense.amount || ''}
                              onChange={(e) => {
                                const newExpenses = [...(editedJob.externalExpenses || [])]
                                newExpenses[index] = {...newExpenses[index], amount: parseFloat(e.target.value) || 0}
                                setEditedJob({...editedJob, externalExpenses: newExpenses})
                              }}
                              className="w-28 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-right"
                              placeholder="0.00"
                            />
                            <button
                              onClick={() => {
                                const newExpenses = editedJob.externalExpenses.filter((_: any, i: number) => i !== index)
                                setEditedJob({...editedJob, externalExpenses: newExpenses})
                              }}
                              className="p-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                          <input
                            type="text"
                            value={expense.supplier || ''}
                            onChange={(e) => {
                              const newExpenses = [...(editedJob.externalExpenses || [])]
                              newExpenses[index] = {...newExpenses[index], supplier: e.target.value}
                              setEditedJob({...editedJob, externalExpenses: newExpenses})
                            }}
                            className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            placeholder="Supplier name (optional)"
                          />
                        </div>
                      ))}
                      {(!editedJob?.externalExpenses || editedJob.externalExpenses.length === 0) && (
                        <p className="text-gray-400 italic text-center py-2 text-sm">No external expenses. Click &quot;Add Expense&quot; to add one.</p>
                      )}
                    </>
                  ) : expensesEditOpen && !isTech ? (
                    <>
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={() => {
                            const next = [...(externalExpensesField.value || []), {
                              description: '',
                              supplier: '',
                              contactInfo: '',
                              amount: 0,
                              paymentStatus: 'unpaid',
                              notes: '',
                            }]
                            externalExpensesField.setValue(next)
                          }}
                          className="px-3 py-1 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                        >
                          + Add Expense
                        </button>
                      </div>
                      {(externalExpensesField.value || []).map((expense: any, index: number) => (
                        <div key={index} className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg space-y-2">
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={expense.description || ''}
                              onChange={(e) => {
                                const next = [...(externalExpensesField.value || [])]
                                next[index] = { ...next[index], description: e.target.value }
                                externalExpensesField.setValue(next)
                              }}
                              className="flex-1 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                              placeholder="Description (e.g., Floor Plans)"
                            />
                            <input
                              type="number"
                              step="0.01"
                              value={expense.amount || ''}
                              onChange={(e) => {
                                const next = [...(externalExpensesField.value || [])]
                                next[index] = { ...next[index], amount: parseFloat(e.target.value) || 0 }
                                externalExpensesField.setValue(next)
                              }}
                              className="w-28 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-right"
                              placeholder="0.00"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const next = (externalExpensesField.value || []).filter((_: any, i: number) => i !== index)
                                externalExpensesField.setValue(next)
                              }}
                              className="p-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                          <input
                            type="text"
                            value={expense.supplier || ''}
                            onChange={(e) => {
                              const next = [...(externalExpensesField.value || [])]
                              next[index] = { ...next[index], supplier: e.target.value }
                              externalExpensesField.setValue(next)
                            }}
                            className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            placeholder="Supplier name (optional)"
                          />
                        </div>
                      ))}
                      {(!externalExpensesField.value || externalExpensesField.value.length === 0) && (
                        <p className="text-gray-400 italic text-center py-2 text-sm">No external expenses. Click &quot;Add Expense&quot; to add one.</p>
                      )}
                      <SaveIndicator status={externalExpensesField.status} error={externalExpensesField.error} />
                    </>
                  ) : (
                    <>
                      {(job.externalExpenses && job.externalExpenses.length > 0) ? (
                        job.externalExpenses.map((expense: any, index: number) => (
                          <div key={index} className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-900 rounded">
                            <div>
                              <span className="font-medium text-gray-900 dark:text-white">{expense.description}</span>
                              {expense.supplier && (
                                <span className="text-sm text-gray-500"> ({expense.supplier})</span>
                              )}
                            </div>
                            <span className="font-semibold text-gray-900 dark:text-white">${expense.amount.toFixed(2)}</span>
                          </div>
                        ))
                      ) : (
                        <p className="text-gray-400 italic text-center py-2 text-sm">No external expenses</p>
                      )}
                    </>
                  )}
                  
                  <div className="border-t border-gray-200 dark:border-gray-700 pt-2 mt-2">
                    <div className="flex justify-between font-semibold">
                      <span className="text-gray-900 dark:text-white">Subtotal Expenses:</span>
                      <span className="text-gray-900 dark:text-white">
                        ${(() => {
                          const currentJob = editMode
                            ? editedJob
                            : ({
                                ...job,
                                externalExpenses:
                                  (expensesEditOpen ? externalExpensesField.value : (job as any).externalExpenses) ??
                                  (job as any).externalExpenses,
                              } as any)
                          return (currentJob?.externalExpenses || []).reduce((sum: number, exp: any) => sum + (exp.amount || 0), 0).toFixed(2)
                        })()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Total Costs & Profit */}
              {(() => {
                const currentJob = editMode
                  ? editedJob
                  : ({
                      ...job,
                      lineItems: (productsEditOpen ? lineItemsField.value : (job as any).lineItems) ?? (job as any).lineItems,
                      discount: (discountEditOpen ? discountField.value : (job as any).discount) ?? (job as any).discount,
                      externalExpenses:
                        (expensesEditOpen ? externalExpensesField.value : (job as any).externalExpenses) ?? (job as any).externalExpenses,
                    } as any)
                const jobSqFt = parseInt(currentJob?.sqFt) || 0
                
                // Calculate revenue
                let subtotal = 0
                if (currentJob?.lineItems && currentJob.lineItems.length > 0) {
                  currentJob.lineItems.forEach((item: any) => {
                    const productId = typeof item.product === 'object' ? item.product?.id : item.product
                    const product = products.find(p => p.id === productId)
                    if (product?.basePrice) {
                      const price = product.basePrice
                      const multiplier = product.unitType === 'per-sq-ft' ? jobSqFt : (item.quantity || 1)
                      subtotal += price * multiplier
                    }
                  })
                }
                
                const discountType = currentJob?.discount?.type || 'none'
                const discountValue = currentJob?.discount?.value || 0
                const discountAmount = discountType === 'fixed' 
                  ? discountValue
                  : discountType === 'percentage'
                  ? subtotal * (discountValue / 100)
                  : 0
                
                let taxAmount = 0
                const clientData = clients.find(c => c.id === (typeof currentJob?.client === 'object' ? currentJob.client?.id : currentJob?.client))
                if (clientData && !clientData.invoicingPreferences?.taxExempt && clientData.invoicingPreferences?.taxRate) {
                  let taxableAmount = 0
                  currentJob?.lineItems?.forEach((item: any) => {
                    const productId = typeof item.product === 'object' ? item.product?.id : item.product
                    const product = products.find(p => p.id === productId)
                    if (product?.taxable) {
                      const price = product.basePrice || 0
                      const multiplier = product.unitType === 'per-sq-ft' ? jobSqFt : (item.quantity || 1)
                      taxableAmount += price * multiplier
                    }
                  })
                  taxAmount = taxableAmount * ((clientData.invoicingPreferences.taxRate || 0) / 100)
                }
                
                const revenue = subtotal + taxAmount - discountAmount
                
                // Calculate costs
                const techPayout = (currentJob?.vendorPrice || 0) + (currentJob?.travelPayout || 0) + (currentJob?.offHoursPayout || 0)
                const externalExpenses = (currentJob?.externalExpenses || []).reduce((sum: number, exp: any) => sum + (exp.amount || 0), 0)
                const totalCosts = techPayout + externalExpenses
                
                // Calculate profit and margin
                const grossProfit = revenue - totalCosts
                const margin = revenue > 0 ? (grossProfit / revenue) * 100 : 0
                
                return (
                  <div className="border-t-2 border-gray-300 dark:border-gray-600 pt-4 space-y-3">
                    <div className="flex justify-between items-center text-lg font-bold">
                      <span className="text-gray-900 dark:text-white">Total Costs:</span>
                      <span className="text-red-600 dark:text-red-400">
                        ${totalCosts.toFixed(2)}
                      </span>
                    </div>
                    
                    <div className="flex justify-between items-center text-xl font-bold">
                      <span className="text-gray-900 dark:text-white">Gross Profit:</span>
                      <span className={grossProfit >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}>
                        ${grossProfit.toFixed(2)}
                      </span>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 dark:text-gray-400">Margin:</span>
                      <span className={`text-lg font-semibold ${margin >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                        {margin.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                )
              })()}
            </div>
          </div>
        )}

        {activeTab === 'deliverables' && (
          <div className="space-y-6">
            {/* Deliverables Section */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Client Deliverables & Assets</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                Links to final deliverables. These will be accessible to clients in their portal.
              </p>
              
              <div className="space-y-4">
                {/* 3D Model Link */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    🏢 3D Model Link
                  </label>
                  {isTech ? (
                    <div>
                      {(job as any)?.deliverables?.model3dLink ? (
                        <a
                          href={(job as any).deliverables.model3dLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 dark:text-blue-400 hover:underline break-all"
                        >
                          {(job as any).deliverables.model3dLink}
                        </a>
                      ) : (
                        <p className="text-gray-400 italic">No link provided</p>
                      )}
                    </div>
                  ) : editMode ? (
                    <input
                      type="text"
                      value={(editedJob as any)?.deliverables?.model3dLink || ''}
                      onChange={(e) => setEditedJob({
                        ...editedJob,
                        deliverables: { ...(editedJob as any)?.deliverables, model3dLink: e.target.value }
                      })}
                      placeholder="https://my.matterport.com/show/?m=..."
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  ) : (
                    <div className="space-y-1">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={deliverablesField.value?.model3dLink || ''}
                          onChange={(e) => deliverablesField.setValue({ ...deliverablesField.value, model3dLink: e.target.value })}
                          onBlur={() => deliverablesField.onBlur()}
                          placeholder="https://my.matterport.com/show/?m=..."
                          className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        />
                        <button
                          type="button"
                          disabled={!deliverablesField.value?.model3dLink}
                          onClick={() => window.open(deliverablesField.value?.model3dLink, '_blank', 'noopener,noreferrer')}
                          className="px-3 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Open link"
                        >
                          Open
                        </button>
                        <button
                          type="button"
                          disabled={!deliverablesField.value?.model3dLink}
                          onClick={() => {
                            const v = deliverablesField.value?.model3dLink || ''
                            navigator.clipboard.writeText(v)
                          }}
                          className="px-3 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Copy link"
                        >
                          Copy
                        </button>
                      </div>
                      <SaveIndicator status={deliverablesField.status} error={deliverablesField.error} />
                    </div>
                  )}
                </div>

                {/* Floor Plans Link */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    📐 Floor Plans Link
                  </label>
                  {isTech ? (
                    <div>
                      {(job as any)?.deliverables?.floorPlansLink ? (
                        <a
                          href={(job as any).deliverables.floorPlansLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 dark:text-blue-400 hover:underline break-all"
                        >
                          {(job as any).deliverables.floorPlansLink}
                        </a>
                      ) : (
                        <p className="text-gray-400 italic">No link provided</p>
                      )}
                    </div>
                  ) : editMode ? (
                    <input
                      type="text"
                      value={(editedJob as any)?.deliverables?.floorPlansLink || ''}
                      onChange={(e) => setEditedJob({
                        ...editedJob,
                        deliverables: { ...(editedJob as any)?.deliverables, floorPlansLink: e.target.value }
                      })}
                      placeholder="https://drive.google.com/... or https://dropbox.com/..."
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  ) : (
                    <div className="space-y-1">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={deliverablesField.value?.floorPlansLink || ''}
                          onChange={(e) => deliverablesField.setValue({ ...deliverablesField.value, floorPlansLink: e.target.value })}
                          onBlur={() => deliverablesField.onBlur()}
                          placeholder="https://drive.google.com/... or https://dropbox.com/..."
                          className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        />
                        <button
                          type="button"
                          disabled={!deliverablesField.value?.floorPlansLink}
                          onClick={() => window.open(deliverablesField.value?.floorPlansLink, '_blank', 'noopener,noreferrer')}
                          className="px-3 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Open link"
                        >
                          Open
                        </button>
                        <button
                          type="button"
                          disabled={!deliverablesField.value?.floorPlansLink}
                          onClick={() => {
                            const v = deliverablesField.value?.floorPlansLink || ''
                            navigator.clipboard.writeText(v)
                          }}
                          className="px-3 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Copy link"
                        >
                          Copy
                        </button>
                      </div>
                      <SaveIndicator status={deliverablesField.status} error={deliverablesField.error} />
                    </div>
                  )}
                </div>

                {/* Photos/Videos Link */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    📸 Photos/Videos Link
                  </label>
                  {isTech ? (
                    <div>
                      {(job as any)?.deliverables?.photosVideosLink ? (
                        <a
                          href={(job as any).deliverables.photosVideosLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 dark:text-blue-400 hover:underline break-all"
                        >
                          {(job as any).deliverables.photosVideosLink}
                        </a>
                      ) : (
                        <p className="text-gray-400 italic">No link provided</p>
                      )}
                    </div>
                  ) : editMode ? (
                    <input
                      type="text"
                      value={(editedJob as any)?.deliverables?.photosVideosLink || ''}
                      onChange={(e) => setEditedJob({
                        ...editedJob,
                        deliverables: { ...(editedJob as any)?.deliverables, photosVideosLink: e.target.value }
                      })}
                      placeholder="https://drive.google.com/... or https://dropbox.com/..."
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  ) : (
                    <div className="space-y-1">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={deliverablesField.value?.photosVideosLink || ''}
                          onChange={(e) => deliverablesField.setValue({ ...deliverablesField.value, photosVideosLink: e.target.value })}
                          onBlur={() => deliverablesField.onBlur()}
                          placeholder="https://drive.google.com/... or https://dropbox.com/..."
                          className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        />
                        <button
                          type="button"
                          disabled={!deliverablesField.value?.photosVideosLink}
                          onClick={() => window.open(deliverablesField.value?.photosVideosLink, '_blank', 'noopener,noreferrer')}
                          className="px-3 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Open link"
                        >
                          Open
                        </button>
                        <button
                          type="button"
                          disabled={!deliverablesField.value?.photosVideosLink}
                          onClick={() => {
                            const v = deliverablesField.value?.photosVideosLink || ''
                            navigator.clipboard.writeText(v)
                          }}
                          className="px-3 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Copy link"
                        >
                          Copy
                        </button>
                      </div>
                      <SaveIndicator status={deliverablesField.status} error={deliverablesField.error} />
                    </div>
                  )}
                </div>

                {/* As-Builts Link */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    📋 As-Built Files Link
                  </label>
                  {isTech ? (
                    <div>
                      {(job as any)?.deliverables?.asBuiltsLink ? (
                        <a
                          href={(job as any).deliverables.asBuiltsLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 dark:text-blue-400 hover:underline break-all"
                        >
                          {(job as any).deliverables.asBuiltsLink}
                        </a>
                      ) : (
                        <p className="text-gray-400 italic">No link provided</p>
                      )}
                    </div>
                  ) : editMode ? (
                    <input
                      type="text"
                      value={(editedJob as any)?.deliverables?.asBuiltsLink || ''}
                      onChange={(e) => setEditedJob({
                        ...editedJob,
                        deliverables: { ...(editedJob as any)?.deliverables, asBuiltsLink: e.target.value }
                      })}
                      placeholder="https://drive.google.com/... or https://dropbox.com/..."
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  ) : (
                    <div className="space-y-1">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={deliverablesField.value?.asBuiltsLink || ''}
                          onChange={(e) => deliverablesField.setValue({ ...deliverablesField.value, asBuiltsLink: e.target.value })}
                          onBlur={() => deliverablesField.onBlur()}
                          placeholder="https://drive.google.com/... or https://dropbox.com/..."
                          className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        />
                        <button
                          type="button"
                          disabled={!deliverablesField.value?.asBuiltsLink}
                          onClick={() => window.open(deliverablesField.value?.asBuiltsLink, '_blank', 'noopener,noreferrer')}
                          className="px-3 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Open link"
                        >
                          Open
                        </button>
                        <button
                          type="button"
                          disabled={!deliverablesField.value?.asBuiltsLink}
                          onClick={() => {
                            const v = deliverablesField.value?.asBuiltsLink || ''
                            navigator.clipboard.writeText(v)
                          }}
                          className="px-3 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Copy link"
                        >
                          Copy
                        </button>
                      </div>
                      <SaveIndicator status={deliverablesField.status} error={deliverablesField.error} />
                    </div>
                  )}
                </div>

                {/* Other Assets Link */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    📦 Other Assets Link
                  </label>
                  {isTech ? (
                    <div>
                      {(job as any)?.deliverables?.otherAssetsLink ? (
                        <a
                          href={(job as any).deliverables.otherAssetsLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 dark:text-blue-400 hover:underline break-all"
                        >
                          {(job as any).deliverables.otherAssetsLink}
                        </a>
                      ) : (
                        <p className="text-gray-400 italic">No link provided</p>
                      )}
                    </div>
                  ) : editMode ? (
                    <input
                      type="text"
                      value={(editedJob as any)?.deliverables?.otherAssetsLink || ''}
                      onChange={(e) => setEditedJob({
                        ...editedJob,
                        deliverables: { ...(editedJob as any)?.deliverables, otherAssetsLink: e.target.value }
                      })}
                      placeholder="https://..."
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  ) : (
                    <div className="space-y-1">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={deliverablesField.value?.otherAssetsLink || ''}
                          onChange={(e) => deliverablesField.setValue({ ...deliverablesField.value, otherAssetsLink: e.target.value })}
                          onBlur={() => deliverablesField.onBlur()}
                          placeholder="https://..."
                          className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        />
                        <button
                          type="button"
                          disabled={!deliverablesField.value?.otherAssetsLink}
                          onClick={() => window.open(deliverablesField.value?.otherAssetsLink, '_blank', 'noopener,noreferrer')}
                          className="px-3 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Open link"
                        >
                          Open
                        </button>
                        <button
                          type="button"
                          disabled={!deliverablesField.value?.otherAssetsLink}
                          onClick={() => {
                            const v = deliverablesField.value?.otherAssetsLink || ''
                            navigator.clipboard.writeText(v)
                          }}
                          className="px-3 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Copy link"
                        >
                          Copy
                        </button>
                      </div>
                      <SaveIndicator status={deliverablesField.status} error={deliverablesField.error} />
                    </div>
                  )}
                </div>

                {/* Delivery Notes */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    📝 Delivery Notes
                  </label>
                  {isTech ? (
                    <div>
                      {(job as any)?.deliverables?.deliveryNotes ? (
                        <p className="text-gray-900 dark:text-white whitespace-pre-wrap">
                          {(job as any).deliverables.deliveryNotes}
                        </p>
                      ) : (
                        <p className="text-gray-400 italic">No notes</p>
                      )}
                    </div>
                  ) : editMode ? (
                    <textarea
                      value={(editedJob as any)?.deliverables?.deliveryNotes || ''}
                      onChange={(e) => setEditedJob({
                        ...editedJob,
                        deliverables: { ...(editedJob as any)?.deliverables, deliveryNotes: e.target.value }
                      })}
                      rows={3}
                      placeholder="Internal notes about the deliverables..."
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  ) : (
                    <div className="space-y-1">
                      <textarea
                        value={deliverablesField.value?.deliveryNotes || ''}
                        onChange={(e) => deliverablesField.setValue({ ...deliverablesField.value, deliveryNotes: e.target.value })}
                        onBlur={() => deliverablesField.onBlur()}
                        rows={3}
                        placeholder="Internal notes about the deliverables..."
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                      <SaveIndicator status={deliverablesField.status} error={deliverablesField.error} />
                    </div>
                  )}
                </div>

                {/* Delivered Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    📅 Date Delivered
                  </label>
                  {isTech ? (
                    <div>
                      {(job as any)?.deliverables?.deliveredDate ? (
                        <p className="text-gray-900 dark:text-white">
                          {new Date((job as any).deliverables.deliveredDate).toLocaleDateString()}
                        </p>
                      ) : (
                        <p className="text-gray-400 italic">Not delivered yet</p>
                      )}
                    </div>
                  ) : editMode ? (
                    <input
                      type="date"
                      value={(editedJob as any)?.deliverables?.deliveredDate?.split('T')[0] || ''}
                      onChange={(e) => setEditedJob({
                        ...editedJob,
                        deliverables: { ...(editedJob as any)?.deliverables, deliveredDate: e.target.value }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  ) : (
                    <div className="space-y-1">
                      <input
                        type="date"
                        value={deliverablesField.value?.deliveredDate?.split?.('T')?.[0] || ''}
                        onChange={(e) => deliverablesField.setValue({ ...deliverablesField.value, deliveredDate: e.target.value })}
                        onBlur={() => deliverablesField.onBlur()}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                      <SaveIndicator status={deliverablesField.status} error={deliverablesField.error} />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
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
