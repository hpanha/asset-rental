'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Clock,
  Package,
  Calendar,
  MapPin,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Tag,
  Phone,
  FileText,
  CheckCircle2,
  X,
  ArrowLeft,
  Wrench,
  AlertCircle,
  LogIn,
} from 'lucide-react'
import { toast } from 'sonner'

export default function RenterActiveRentalsPage() {
  const [rentals, setRentals] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isUnauthenticated, setIsUnauthenticated] = useState(false)

  // Extension Modal
  const [extModalRental, setExtModalRental] = useState<any | null>(null)
  const [extEndDate, setExtEndDate] = useState<string>('')
  const [extQuote, setExtQuote] = useState<any | null>(null)
  const [quoting, setQuoting] = useState(false)
  const [submittingExt, setSubmittingExt] = useState(false)

  // Incident Modal
  const [incidentModalRental, setIncidentModalRental] = useState<any | null>(null)
  const [incidentCategory, setIncidentCategory] = useState('MALFUNCTION')
  const [incidentSeverity, setIncidentSeverity] = useState('MEDIUM')
  const [incidentDesc, setIncidentDesc] = useState('')
  const [submittingIncident, setSubmittingIncident] = useState(false)

  // Return Modal
  const [returnModalRental, setReturnModalRental] = useState<any | null>(null)
  const [returnTime, setReturnTime] = useState('')
  const [returnNotes, setReturnNotes] = useState('')
  const [submittingReturn, setSubmittingReturn] = useState(false)

  const fetchRentals = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/me/rentals?status=ACTIVE')
      if (res.status === 401) {
        setIsUnauthenticated(true)
        return
      }
      if (!res.ok) throw new Error('Failed to load active rentals')
      const data = await res.json()
      setRentals(data.rentals || [])
      setIsUnauthenticated(false)
    } catch (err: any) {
      toast.error('Could not load active rentals')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRentals()
  }, [])

  // Extension Quote preview
  const handleCheckExtension = async () => {
    if (!extModalRental || !extEndDate) return
    try {
      setQuoting(true)
      const res = await fetch(`/api/me/rentals/${extModalRental.id}/extensions/quote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestedEndAt: new Date(extEndDate).toISOString() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to quote extension')

      setExtQuote(data)
      if (!data.available) {
        toast.error(data.reason || 'Equipment unavailable for requested dates.')
      } else {
        toast.success(data.message)
      }
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setQuoting(false)
    }
  }

  const handleSubmitExtension = async () => {
    if (!extModalRental || !extQuote || !extQuote.available) return
    try {
      setSubmittingExt(true)
      const res = await fetch(`/api/me/rentals/${extModalRental.id}/extensions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestedEndAt: extQuote.requestedEndAt,
          additionalDays: extQuote.additionalDays,
          additionalCharge: extQuote.additionalCharge,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to request extension')

      toast.success('Extension request submitted! Awaiting operations approval.')
      setExtModalRental(null)
      setExtQuote(null)
      fetchRentals()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setSubmittingExt(false)
    }
  }

  // Incident submit
  const handleSubmitIncident = async () => {
    if (!incidentModalRental || !incidentDesc.trim()) {
      toast.error('Please describe the issue or malfunction.')
      return
    }
    try {
      setSubmittingIncident(true)
      const res = await fetch(`/api/me/rentals/${incidentModalRental.id}/incidents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: incidentCategory,
          severity: incidentSeverity,
          description: incidentDesc,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to report incident')

      toast.success('Incident ticket created. Our support team will assist you.')
      setIncidentModalRental(null)
      setIncidentDesc('')
      fetchRentals()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setSubmittingIncident(false)
    }
  }

  // Return schedule submit
  const handleSubmitReturn = async () => {
    if (!returnModalRental) return
    try {
      setSubmittingReturn(true)
      const res = await fetch(`/api/me/rentals/${returnModalRental.id}/returns`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scheduledAt: returnTime ? new Date(returnTime).toISOString() : new Date().toISOString(),
          notes: returnNotes,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to schedule return')

      toast.success('Return scheduled! Please bring equipment to the return counter.')
      setReturnModalRental(null)
      setReturnNotes('')
      fetchRentals()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setSubmittingReturn(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] py-10 px-4 sm:px-6">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between">
          <Link
            href="/rentals/my-requests"
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-emerald-700 transition"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Rental Portal
          </Link>

          <span className="text-xs text-slate-400">Step 08 Active Usage & Extensions</span>
        </div>

        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">My Active Equipment Rentals</h1>
          <p className="text-sm text-slate-500 mt-1">
            Track equipment in your custody, view return deadlines, request rental extensions, and arrange drop-off.
          </p>
        </div>

        {/* Rentals List */}
        {isUnauthenticated ? (
          <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 border-dashed shadow-sm space-y-3">
            <LogIn className="h-10 w-10 text-emerald-600/70 mx-auto" />
            <h3 className="font-bold text-slate-800 text-base">Sign In to View Active Rentals</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Please sign in with your customer account to track equipment in custody, view return deadlines, and request extensions.
            </p>
            <Link
              href="/login?from=/rentals/active"
              className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-sm"
            >
              <LogIn className="h-3.5 w-3.5" />
              Sign In to Account
            </Link>
          </div>
        ) : loading ? (
          <div className="p-12 text-center text-slate-400 bg-white rounded-2xl border">
            <Clock className="h-6 w-6 animate-spin mx-auto text-emerald-600 mb-2" />
            Loading active rentals...
          </div>
        ) : rentals.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <Package className="h-10 w-10 text-slate-300 mx-auto" />
            <h3 className="font-bold text-slate-800 text-base">No Equipment Currently in Custody</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              You do not have any active rentals checked out right now.
            </p>
            <Link
              href="/rentals/my-requests"
              className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-sm"
            >
              View My Requests
            </Link>
          </div>
        ) : (
          <div className="space-y-5">
            {rentals.map((r) => {
              const due = new Date(r.end_at)
              const hoursLeft = Math.round((due.getTime() - Date.now()) / (1000 * 60 * 60))

              return (
                <div
                  key={r.id}
                  className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-5 hover:border-emerald-200 transition"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                        <Package className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-slate-900 text-sm">{r.booking_no}</span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            {r.status}
                          </span>
                        </div>
                        <h2 className="font-bold text-slate-800 text-base mt-0.5">{r.asset.name}</h2>
                      </div>
                    </div>

                    {/* Countdown / Overdue Badge */}
                    <div className="text-left sm:text-right">
                      {r.is_overdue ? (
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 text-xs font-bold">
                          <AlertTriangle className="h-3.5 w-3.5" />
                          OVERDUE
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold">
                          <Clock className="h-3.5 w-3.5 text-emerald-600" />
                          {hoursLeft > 24 ? `${Math.round(hoursLeft / 24)} days left` : `${hoursLeft} hours left`}
                        </div>
                      )}
                      <p className="text-[11px] text-slate-400 mt-1">Due by: {due.toLocaleString()}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                    <div className="p-3 bg-slate-50 rounded-xl space-y-1">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Committed Units</span>
                      <div className="flex flex-wrap gap-1 font-mono font-bold text-slate-800">
                        {r.asset.allocated_units.map((tag: string) => (
                          <span key={tag} className="px-2 py-0.5 rounded bg-white border border-slate-200">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-xl space-y-1">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Return Location</span>
                      <p className="font-semibold text-slate-800">{r.location}</p>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-xl space-y-1">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Security Deposit</span>
                      <p className="font-bold text-indigo-700">${r.payment.deposit_held?.toFixed(2) || '500.00'} (Held in Escrow)</p>
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setExtModalRental(r)
                          setExtEndDate('')
                          setExtQuote(null)
                        }}
                        className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition inline-flex items-center gap-1.5"
                      >
                        <RotateCcw className="h-3.5 w-3.5 text-slate-600" />
                        Request Extension
                      </button>

                      <button
                        onClick={() => {
                          setIncidentModalRental(r)
                          setIncidentCategory('MALFUNCTION')
                          setIncidentSeverity('MEDIUM')
                          setIncidentDesc('')
                        }}
                        className="px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition inline-flex items-center gap-1.5"
                      >
                        <Wrench className="h-3.5 w-3.5 text-slate-500" />
                        Report Problem
                      </button>
                    </div>

                    <button
                      onClick={() => {
                        setReturnModalRental(r)
                        setReturnTime('')
                        setReturnNotes('')
                      }}
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition inline-flex items-center gap-1.5 shadow-sm"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Arrange Return (Step 09)
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Modal: Extension Request */}
        {extModalRental && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-150">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4 text-xs">
              <div className="flex items-center justify-between border-b pb-3">
                <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                  <RotateCcw className="h-4 w-4 text-emerald-600" />
                  Request Rental Extension (Step 08)
                </h3>
                <button onClick={() => setExtModalRental(null)}>
                  <X className="h-4 w-4 text-slate-400" />
                </button>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border space-y-1">
                <p>
                  <strong>Current Return Due:</strong> {new Date(extModalRental.end_at).toLocaleString()}
                </p>
                <p>
                  <strong>Asset:</strong> {extModalRental.asset.name}
                </p>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Proposed New Return Due Date:</label>
                <div className="flex gap-2">
                  <input
                    type="date"
                    value={extEndDate}
                    onChange={(e) => setExtEndDate(e.target.value)}
                    className="flex-1 p-2 rounded-xl border text-xs"
                  />
                  <button
                    disabled={quoting || !extEndDate}
                    onClick={handleCheckExtension}
                    className="px-3 py-2 bg-slate-800 text-white rounded-xl font-bold text-xs disabled:opacity-50"
                  >
                    {quoting ? 'Checking...' : 'Check Availability'}
                  </button>
                </div>
              </div>

              {extQuote && extQuote.available && (
                <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl space-y-1.5">
                  <span className="font-bold text-emerald-900 block">Extension Quote Available:</span>
                  <div className="flex justify-between">
                    <span>Additional Days:</span>
                    <span className="font-bold">+{extQuote.additionalDays} days</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Estimated Additional Charge:</span>
                    <span className="font-bold text-emerald-800">
                      ${extQuote.additionalCharge?.toFixed(2)} {extQuote.currency}
                    </span>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setExtModalRental(null)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  disabled={submittingExt || !extQuote?.available}
                  onClick={handleSubmitExtension}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold disabled:opacity-50"
                >
                  {submittingExt ? 'Submitting...' : 'Submit Extension Request'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Report Problem */}
        {incidentModalRental && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-150">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4 text-xs">
              <div className="flex items-center justify-between border-b pb-3">
                <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                  <Wrench className="h-4 w-4 text-amber-600" />
                  Report Equipment Problem / Incident
                </h3>
                <button onClick={() => setIncidentModalRental(null)}>
                  <X className="h-4 w-4 text-slate-400" />
                </button>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Category:</label>
                <select
                  value={incidentCategory}
                  onChange={(e) => setIncidentCategory(e.target.value)}
                  className="w-full p-2.5 rounded-xl border text-xs"
                >
                  <option value="MALFUNCTION">Technical Malfunction</option>
                  <option value="SAFETY">Safety Concern</option>
                  <option value="ACCIDENTAL_DAMAGE">Accidental Damage</option>
                  <option value="MISSING_ACCESSORY">Missing Accessory</option>
                  <option value="OTHER">Other Inquiry</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Problem Description:</label>
                <textarea
                  rows={3}
                  value={incidentDesc}
                  onChange={(e) => setIncidentDesc(e.target.value)}
                  placeholder="Please describe what happened in detail..."
                  className="w-full p-2.5 rounded-xl border text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setIncidentModalRental(null)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  disabled={submittingIncident}
                  onClick={handleSubmitIncident}
                  className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold disabled:opacity-50"
                >
                  {submittingIncident ? 'Submitting...' : 'Submit Incident Report'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Return Equipment */}
        {returnModalRental && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-150">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4 text-xs">
              <div className="flex items-center justify-between border-b pb-3">
                <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  Schedule Return (Step 09)
                </h3>
                <button onClick={() => setReturnModalRental(null)}>
                  <X className="h-4 w-4 text-slate-400" />
                </button>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border space-y-1">
                <p>
                  <strong>Drop-off Location:</strong> {returnModalRental.location}
                </p>
                <p>
                  <strong>Due By:</strong> {new Date(returnModalRental.end_at).toLocaleString()}
                </p>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Preferred Drop-off Date & Time:</label>
                <input
                  type="datetime-local"
                  value={returnTime}
                  onChange={(e) => setReturnTime(e.target.value)}
                  className="w-full p-2.5 rounded-xl border text-xs"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Notes / Discrepancy (Optional):</label>
                <textarea
                  rows={2}
                  value={returnNotes}
                  onChange={(e) => setReturnNotes(e.target.value)}
                  placeholder="e.g., Returning all cables and carrying bag intact."
                  className="w-full p-2.5 rounded-xl border text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setReturnModalRental(null)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  disabled={submittingReturn}
                  onClick={handleSubmitReturn}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold disabled:opacity-50"
                >
                  {submittingReturn ? 'Scheduling...' : 'Confirm Return Schedule'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
