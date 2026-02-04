'use client'

import React, { useState, useEffect } from 'react'

interface Payment {
  id: string
  client: { id: string; companyName?: string } | string
  amount: number
  paymentDate: string
  referenceNumber?: string
  source: string
  status: 'unmatched' | 'matched'
  matchedJob?: { id: string; jobId: string } | string | null
  matchedInvoice?: { id: string; invoiceNumber?: string } | string | null
  notes?: string
}

interface Candidate {
  id: string
  jobId: string
  completedAt: string
  quotedTotal: number
  delta: number
}

interface Client {
  id: string
  companyName: string
}

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('all')
  const [clientFilter, setClientFilter] = useState('all')
  const [userId, setUserId] = useState<string | null>(null)

  // Import modal
  const [showImportModal, setShowImportModal] = useState(false)
  const [importTab, setImportTab] = useState<'manual' | 'csv'>('manual')
  const [importStatus, setImportStatus] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  // Manual form
  const [manualForm, setManualForm] = useState({
    clientId: '',
    amount: '',
    paymentDate: new Date().toISOString().split('T')[0],
    referenceNumber: '',
    notes: '',
  })

  // CSV import
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [csvClientId, setCsvClientId] = useState('')

  // Match panel
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null)
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [candidatesLoading, setCandidatesLoading] = useState(false)
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null)
  const [matchStatus, setMatchStatus] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  useEffect(() => {
    fetchUser()
    fetchClients()
  }, [])

  useEffect(() => {
    fetchPayments()
  }, [statusFilter, clientFilter])

  const fetchUser = async () => {
    try {
      const res = await fetch('/api/users/me')
      const data = await res.json()
      if (data.user) setUserId(String(data.user.id))
    } catch (e) { console.error(e) }
  }

  const fetchClients = async () => {
    try {
      const res = await fetch('/api/clients?limit=200&depth=0')
      const data = await res.json()
      setClients(data.docs || [])
    } catch (e) { console.error(e) }
  }

  const fetchPayments = async () => {
    setLoading(true)
    try {
      const params: Record<string, string> = { depth: '1', limit: '100', sort: '-createdAt' }

      if (statusFilter !== 'all' && clientFilter !== 'all') {
        params['where[and][0][status][equals]'] = statusFilter
        params['where[and][1][client][equals]'] = clientFilter
      } else if (statusFilter !== 'all') {
        params['where[status][equals]'] = statusFilter
      } else if (clientFilter !== 'all') {
        params['where[client][equals]'] = clientFilter
      }

      const res = await fetch(`/api/payments?${new URLSearchParams(params)}`)
      const data = await res.json()
      setPayments(data.docs || [])
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  // --- Manual import ---
  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    setImportStatus(null)
    try {
      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client: manualForm.clientId,
          amount: parseFloat(manualForm.amount),
          paymentDate: new Date(manualForm.paymentDate).toISOString(),
          referenceNumber: manualForm.referenceNumber,
          notes: manualForm.notes,
          source: 'manual',
          status: 'unmatched',
          importedBy: userId ? parseInt(userId) : undefined,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.errors?.[0]?.message || err.error || 'Failed to create payment')
      }
      setImportStatus({ message: 'Payment added successfully', type: 'success' })
      setManualForm({ clientId: '', amount: '', paymentDate: new Date().toISOString().split('T')[0], referenceNumber: '', notes: '' })
      fetchPayments()
    } catch (err: any) {
      setImportStatus({ message: err.message, type: 'error' })
    } finally { setIsSaving(false) }
  }

  // --- CSV import ---
  const handleCsvImport = async () => {
    if (!csvFile || !csvClientId) return
    setIsSaving(true)
    setImportStatus(null)
    try {
      const formData = new FormData()
      formData.append('csv', csvFile)
      formData.append('clientId', csvClientId)
      if (userId) formData.append('userId', userId)

      const res = await fetch('/api/payments/import-csv', { method: 'POST', body: formData })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Import failed')

      const hasErrors = data.errors?.length > 0
      setImportStatus({
        message: `Imported ${data.created} payment(s).${hasErrors ? ` ${data.errors.length} row(s) skipped.` : ''}`,
        type: data.created > 0 ? 'success' : 'error',
      })
      setCsvFile(null)
      fetchPayments()
    } catch (err: any) {
      setImportStatus({ message: err.message, type: 'error' })
    } finally { setIsSaving(false) }
  }

  // --- Match flow ---
  const handleSelectPayment = async (payment: Payment) => {
    if (payment.status !== 'unmatched') return
    setSelectedPayment(payment)
    setSelectedJobId(null)
    setMatchStatus(null)
    setCandidatesLoading(true)
    try {
      const res = await fetch(`/api/payments/candidates?paymentId=${payment.id}`)
      const data = await res.json()
      setCandidates(data.candidates || [])
    } catch (e) {
      console.error(e)
      setCandidates([])
    } finally { setCandidatesLoading(false) }
  }

  const handleConfirmMatch = async () => {
    if (!selectedPayment || !selectedJobId || !userId) return
    setIsSaving(true)
    setMatchStatus(null)
    try {
      const res = await fetch('/api/payments/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentId: selectedPayment.id, jobId: selectedJobId, userId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Match failed')

      setMatchStatus({ message: 'Payment matched and invoice generated', type: 'success' })
      setTimeout(() => {
        setSelectedPayment(null)
        setCandidates([])
        setSelectedJobId(null)
        fetchPayments()
      }, 1500)
    } catch (err: any) {
      setMatchStatus({ message: err.message, type: 'error' })
    } finally { setIsSaving(false) }
  }

  // --- Helpers ---
  const getClientName = (client: Payment['client']) => {
    if (typeof client === 'object' && client) return client.companyName || 'Unknown'
    const found = clients.find(c => String(c.id) === String(client))
    return found?.companyName || 'Unknown'
  }

  const fmt = (n: number) => `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

  const fmtDate = (d: string) => {
    if (!d) return '—'
    const date = new Date(d)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  // --- Derived ---
  const unmatched = payments.filter(p => p.status === 'unmatched')
  const matched = payments.filter(p => p.status === 'matched')

  // --- Render ---
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Payments</h1>
          <div className="flex gap-2">
            <button
              onClick={() => { setShowImportModal(true); setImportTab('csv'); setImportStatus(null) }}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 font-medium text-sm transition-colors"
            >
              📥 Import CSV
            </button>
            <button
              onClick={() => { setShowImportModal(true); setImportTab('manual'); setImportStatus(null) }}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-sm transition-colors"
            >
              + Manual Entry
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-500 dark:text-gray-400">Total Payments</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{payments.length}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{fmt(payments.reduce((s, p) => s + p.amount, 0))}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700 border-l-4 border-l-amber-500">
            <p className="text-sm text-amber-600 dark:text-amber-400">Unmatched</p>
            <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{unmatched.length}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{fmt(unmatched.reduce((s, p) => s + p.amount, 0))}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700 border-l-4 border-l-green-500">
            <p className="text-sm text-green-600 dark:text-green-400">Matched</p>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">{matched.length}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{fmt(matched.reduce((s, p) => s + p.amount, 0))}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700 mb-6">
          <div className="flex flex-wrap gap-4 items-end">
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
              >
                <option value="all">All</option>
                <option value="unmatched">Unmatched</option>
                <option value="matched">Matched</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Client</label>
              <select
                value={clientFilter}
                onChange={(e) => setClientFilter(e.target.value)}
                className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
              >
                <option value="all">All Clients</option>
                {clients.map(c => (
                  <option key={c.id} value={c.id}>{c.companyName}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Match panel */}
        {selectedPayment && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 mb-6 overflow-hidden">
            <div className="bg-blue-50 dark:bg-blue-900/20 border-b border-blue-200 dark:border-blue-800 px-6 py-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-blue-800 dark:text-blue-200">Match Payment</p>
                <p className="text-sm text-blue-600 dark:text-blue-300">
                  {fmt(selectedPayment.amount)} from {getClientName(selectedPayment.client)} on {fmtDate(selectedPayment.paymentDate)}
                  {selectedPayment.referenceNumber && <span className="ml-2">· Ref: {selectedPayment.referenceNumber}</span>}
                </p>
              </div>
              <button
                onClick={() => { setSelectedPayment(null); setCandidates([]) }}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6">
              {matchStatus && (
                <div className={`mb-4 p-3 rounded-lg text-sm ${matchStatus.type === 'success' ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200' : 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200'}`}>
                  {matchStatus.message}
                </div>
              )}

              {candidatesLoading ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">Finding candidate jobs...</p>
              ) : candidates.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">No matching jobs found for this client with status done + ready to invoice.</p>
              ) : (
                <>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">Suggested jobs — sorted by date proximity to payment:</p>
                  <div className="space-y-2">
                    {candidates.map(c => (
                      <button
                        key={c.id}
                        onClick={() => setSelectedJobId(c.id)}
                        className={`w-full text-left p-3 rounded-lg border transition-colors ${
                          selectedJobId === c.id
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-400'
                            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-sm font-medium text-gray-900 dark:text-white">Job #{c.jobId}</span>
                            <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">completed {fmtDate(c.completedAt)}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-sm text-gray-600 dark:text-gray-300">quoted {fmt(c.quotedTotal)}</span>
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded ${
                              c.delta === 0
                                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                                : c.delta > 0
                                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                                  : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
                            }`}>
                              {c.delta >= 0 ? '+' : ''}{fmt(c.delta)}
                            </span>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>

                  <div className="mt-5 flex justify-end">
                    <button
                      onClick={handleConfirmMatch}
                      disabled={!selectedJobId || isSaving}
                      className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg font-medium text-sm transition-colors"
                    >
                      {isSaving ? 'Confirming...' : '✓ Confirm Match'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Payment table */}
        {loading ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl p-8 text-center shadow-sm border border-gray-200 dark:border-gray-700">
            <p className="text-gray-500 dark:text-gray-400">Loading...</p>
          </div>
        ) : payments.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl p-12 text-center shadow-sm border border-gray-200 dark:border-gray-700">
            <p className="text-gray-500 dark:text-gray-400">No payments yet. Import from CSV or add one manually.</p>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Amount</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Client</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Date</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Reference</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Matched To</th>
                </tr>
              </thead>
              <tbody>
                {payments.map(payment => (
                  <tr
                    key={payment.id}
                    onClick={() => payment.status === 'unmatched' && handleSelectPayment(payment)}
                    className={`border-b border-gray-100 dark:border-gray-700 transition-colors ${
                      payment.status === 'unmatched'
                        ? 'cursor-pointer hover:bg-amber-50 dark:hover:bg-amber-900/10'
                        : ''
                    } ${selectedPayment?.id === payment.id ? 'bg-blue-50 dark:bg-blue-900/10' : ''}`}
                  >
                    <td className="px-6 py-3 text-sm font-semibold text-gray-900 dark:text-white">{fmt(payment.amount)}</td>
                    <td className="px-6 py-3 text-sm text-gray-700 dark:text-gray-300">{getClientName(payment.client)}</td>
                    <td className="px-6 py-3 text-sm text-gray-600 dark:text-gray-400">{fmtDate(payment.paymentDate)}</td>
                    <td className="px-6 py-3 text-sm text-gray-600 dark:text-gray-400">{payment.referenceNumber || '—'}</td>
                    <td className="px-6 py-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        payment.status === 'unmatched'
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'
                          : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                      }`}>
                        {payment.status === 'unmatched' ? 'Unmatched' : 'Matched'}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-sm text-gray-600 dark:text-gray-400">
                      {payment.status === 'matched' && payment.matchedJob ? (
                        <span>
                          Job #{typeof payment.matchedJob === 'object' ? payment.matchedJob.jobId : payment.matchedJob}
                          {payment.matchedInvoice && (
                            <span className="ml-2 text-blue-600 dark:text-blue-400">
                              {typeof payment.matchedInvoice === 'object' && payment.matchedInvoice.invoiceNumber
                                ? payment.matchedInvoice.invoiceNumber
                                : '· Invoice'}
                            </span>
                          )}
                        </span>
                      ) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Import Modal */}
        {showImportModal && (
          <>
            <div className="fixed inset-0 bg-black bg-opacity-50 z-40" onClick={() => setShowImportModal(false)} />
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 w-full max-w-lg max-h-[90vh] overflow-y-auto">

                {/* Modal header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white">Add Payment</h2>
                  <button onClick={() => setShowImportModal(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-gray-200 dark:border-gray-700">
                  <button
                    onClick={() => setImportTab('manual')}
                    className={`flex-1 px-4 py-2.5 text-sm font-medium transition-colors ${
                      importTab === 'manual'
                        ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                    }`}
                  >Manual Entry</button>
                  <button
                    onClick={() => setImportTab('csv')}
                    className={`flex-1 px-4 py-2.5 text-sm font-medium transition-colors ${
                      importTab === 'csv'
                        ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                    }`}
                  >CSV Import</button>
                </div>

                {/* Tab content */}
                <div className="p-6">
                  {importStatus && (
                    <div className={`mb-4 p-3 rounded-lg text-sm ${importStatus.type === 'success' ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200' : 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200'}`}>
                      {importStatus.message}
                    </div>
                  )}

                  {importTab === 'manual' ? (
                    <form onSubmit={handleManualSubmit} className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Client *</label>
                        <select
                          required
                          value={manualForm.clientId}
                          onChange={(e) => setManualForm({ ...manualForm, clientId: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                        >
                          <option value="">Select client...</option>
                          {clients.map(c => <option key={c.id} value={c.id}>{c.companyName}</option>)}
                        </select>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Amount *</label>
                          <input
                            type="number"
                            required
                            step="0.01"
                            min="0.01"
                            value={manualForm.amount}
                            onChange={(e) => setManualForm({ ...manualForm, amount: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                            placeholder="0.00"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date *</label>
                          <input
                            type="date"
                            required
                            value={manualForm.paymentDate}
                            onChange={(e) => setManualForm({ ...manualForm, paymentDate: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Reference #</label>
                        <input
                          type="text"
                          value={manualForm.referenceNumber}
                          onChange={(e) => setManualForm({ ...manualForm, referenceNumber: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                          placeholder="Check #, wire ref, etc."
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes</label>
                        <textarea
                          value={manualForm.notes}
                          onChange={(e) => setManualForm({ ...manualForm, notes: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                          rows={2}
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={isSaving}
                        className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg font-medium text-sm transition-colors"
                      >
                        {isSaving ? 'Adding...' : 'Add Payment'}
                      </button>
                    </form>
                  ) : (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Client *</label>
                        <select
                          value={csvClientId}
                          onChange={(e) => setCsvClientId(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                        >
                          <option value="">Select client...</option>
                          {clients.map(c => <option key={c.id} value={c.id}>{c.companyName}</option>)}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">CSV File *</label>
                        <input
                          type="file"
                          accept=".csv"
                          onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                        />
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5">
                          Expected columns: <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">amount</code>, <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">date</code>, and optionally <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">reference</code> / <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">notes</code>
                        </p>
                      </div>

                      <button
                        onClick={handleCsvImport}
                        disabled={!csvFile || !csvClientId || isSaving}
                        className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg font-medium text-sm transition-colors"
                      >
                        {isSaving ? 'Importing...' : 'Import CSV'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}

      </div>
    </div>
  )
}
