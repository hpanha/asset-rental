'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Boxes,
  Truck,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  Search,
  RefreshCw,
  Eye,
  Check,
  X,
  Tag,
  Wrench,
  ShieldCheck,
  RotateCcw,
  Sparkles,
  ArrowRight,
  User,
  Calendar,
  Layers,
  ChevronRight,
  ShieldAlert,
} from 'lucide-react'
import { toast } from 'sonner'

export default function AdminOperationsPage() {
  const [activeTab, setActiveTab] = useState<'HANDOVER' | 'ACTIVE' | 'RETURNS' | 'INSPECTION' | 'CLOSURE'>('HANDOVER')
  const [loading, setLoading] = useState(true)

  // Data states
  const [handovers, setHandovers] = useState<any[]>([])
  const [activeRentals, setActiveRentals] = useState<any[]>([])
  const [returnCases, setReturnCases] = useState<any[]>([])
  const [inspections, setInspections] = useState<any[]>([])
  const [readyToClose, setReadyToClose] = useState<any[]>([])

  // Modal states
  const [handoverModalRes, setHandoverModalRes] = useState<any | null>(null)
  const [receiverName, setReceiverName] = useState('')
  const [handoverNotes, setHandoverNotes] = useState('')
  const [submittingHandover, setSubmittingHandover] = useState(false)

  const [inspectModalItem, setInspectModalItem] = useState<any | null>(null)
  const [inspectVerdict, setInspectVerdict] = useState<string>('PASS')
  const [damageFee, setDamageFee] = useState<number>(0)
  const [cleaningFee, setCleaningFee] = useState<number>(0)
  const [inspectNotes, setInspectNotes] = useState('')
  const [submittingInspect, setSubmittingInspect] = useState(false)

  const [closeModalRes, setCloseModalRes] = useState<any | null>(null)
  const [submittingClose, setSubmittingClose] = useState(false)

  const loadAllData = async () => {
    try {
      setLoading(true)
      const [handoverRes, activeRes, returnsRes, inspRes, closeRes] = await Promise.all([
        fetch('/api/admin/handovers?status=ALL'),
        fetch('/api/admin/active-rentals'),
        fetch('/api/admin/returns?status=ALL'),
        fetch('/api/admin/inspections?status=ALL'),
        fetch('/api/admin/rentals/ready-to-close?status=ALL'),
      ])

      const [hData, aData, rData, iData, cData] = await Promise.all([
        handoverRes.json(),
        activeRes.json(),
        returnsRes.json(),
        inspRes.json(),
        closeRes.json(),
      ])

      setHandovers(hData.handovers || [])
      setActiveRentals(aData.rentals || [])
      setReturnCases(rData.returnCases || [])
      setInspections(iData.inspections || [])
      setReadyToClose(cData.reservations || [])
    } catch (err: any) {
      toast.error('Failed to load operations data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAllData()
  }, [])

  // Step 07 Handover Handler
  const handleCompleteHandover = async () => {
    if (!handoverModalRes) return
    if (!receiverName.trim()) {
      toast.error('Please enter receiver/customer name.')
      return
    }
    try {
      setSubmittingHandover(true)
      const res = await fetch(`/api/admin/handovers/${handoverModalRes.id}/finalize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          receiverName,
          staffName: 'Vannak Chen (Warehouse Lead)',
          notes: handoverNotes || 'Handed over in verified condition with all accessories.',
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Handover failed')

      toast.success('Handover completed! Rental is now ACTIVE.')
      setHandoverModalRes(null)
      setReceiverName('')
      setHandoverNotes('')
      loadAllData()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setSubmittingHandover(false)
    }
  }

  // Step 08 Extension Approve Handler
  const handleApproveExtension = async (extId: string) => {
    try {
      const res = await fetch(`/api/admin/extensions/${extId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reviewerName: 'Vannak Chen' }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to approve extension')

      toast.success('Extension approved! Return due date and unit allocations updated.')
      loadAllData()
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  // Step 09 Confirm Physical Receipt Handler
  const handleConfirmReturn = async (returnCaseId: string) => {
    try {
      const res = await fetch(`/api/admin/returns/${returnCaseId}/confirm-receipt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          receivingStaffName: 'Vannak Chen',
          discrepancyNotes: 'All units received. Power adapter and accessories included.',
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to confirm return')

      toast.success(`Physical return receipt #${data.receiptNo} issued! Queued for inspection.`)
      loadAllData()
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  // Step 10 Complete Inspection Handler
  const handleCompleteInspection = async () => {
    if (!inspectModalItem) return
    try {
      setSubmittingInspect(true)
      const res = await fetch(`/api/admin/inspections/${inspectModalItem.id}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inspectorName: 'Vannak Chen',
          verdict: inspectVerdict,
          notes: inspectNotes || 'Inspection verified against Step 07 baseline.',
          damageFee: Number(damageFee) || 0,
          cleaningFee: Number(cleaningFee) || 0,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to complete inspection')

      toast.success('Inspection completed and financial settlement calculated!')
      setInspectModalItem(null)
      setInspectVerdict('PASS')
      setDamageFee(0)
      setCleaningFee(0)
      setInspectNotes('')
      loadAllData()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setSubmittingInspect(false)
    }
  }

  // Step 10 Approve Settlement Handler
  const handleApproveSettlement = async (resId: string) => {
    try {
      const res = await fetch(`/api/admin/settlements/${resId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approvedBy: 'Finance Lead (Vannak Chen)' }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to approve settlement')

      toast.success('Settlement approved! Security deposit liability settled.')
      loadAllData()
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  // Step 11 Final Close Rental Handler
  const handleCloseRental = async () => {
    if (!closeModalRes) return
    try {
      setSubmittingClose(true)
      const res = await fetch(`/api/admin/rentals/${closeModalRes.id}/close`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          closedBy: 'Vannak Chen (Finance Operations)',
          notes: 'Preconditions verified. Deposit refunded. Unit released back to catalog.',
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to close rental')

      toast.success('Rental successfully CLOSED and COMPLETED! Inventory released.')
      setCloseModalRes(null)
      loadAllData()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setSubmittingClose(false)
    }
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              Steps 07–11 Lifecycle
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 mt-1">
            Rental Operations & Custody Center
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Handover dispatch, active rental monitoring, returns receiving, condition inspection, and final inventory closeout.
          </p>
        </div>

        <button
          onClick={loadAllData}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-sm font-semibold transition shadow-sm"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh Operations
        </button>
      </div>

      {/* Process Tabs */}
      <div className="flex items-center gap-2 p-1.5 bg-slate-100/90 rounded-2xl overflow-x-auto border border-slate-200/60">
        {[
          { id: 'HANDOVER', label: `Step 07: Handover (${handovers.filter((h) => h.status !== 'ACTIVE').length})` },
          { id: 'ACTIVE', label: `Step 08: Active (${activeRentals.length})` },
          { id: 'RETURNS', label: `Step 09: Returns (${returnCases.filter((r) => r.status === 'SCHEDULED').length})` },
          { id: 'INSPECTION', label: `Step 10: Inspection (${inspections.filter((i) => i.status === 'IN_PROGRESS').length})` },
          { id: 'CLOSURE', label: `Step 11: Closeout (${readyToClose.filter((c) => c.status === 'SETTLED').length})` },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
              activeTab === tab.id
                ? 'bg-[#0d4a2e] text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab 1: Step 07 Handover Queue */}
      {activeTab === 'HANDOVER' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100">
            <h2 className="text-base font-bold text-slate-900">Step 07: Equipment Handover & Dispatch</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Verify reserved units, check accessories, record renter acknowledgment, and transfer physical custody.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/70 border-b border-slate-100 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  <th className="py-3.5 px-5">Booking & Renter</th>
                  <th className="py-3.5 px-5">Asset</th>
                  <th className="py-3.5 px-5">Pickup Schedule</th>
                  <th className="py-3.5 px-5">Allocated Unit Tag</th>
                  <th className="py-3.5 px-5">Status</th>
                  <th className="py-3.5 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {handovers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      No handovers in queue.
                    </td>
                  </tr>
                ) : (
                  handovers.map((h) => (
                    <tr key={h.id} className="hover:bg-slate-50/60 transition">
                      <td className="py-4 px-5">
                        <span className="font-mono font-bold text-slate-900">{h.bookingNo}</span>
                        <div className="text-slate-600 font-medium">{h.request.contactName}</div>
                      </td>
                      <td className="py-4 px-5 font-semibold text-slate-800">{h.request.listing.name}</td>
                      <td className="py-4 px-5 text-slate-600">
                        {new Date(h.startAt).toLocaleString()}
                      </td>
                      <td className="py-4 px-5">
                        <span className="inline-flex items-center gap-1 font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-800 font-bold">
                          <Tag className="h-3 w-3 text-emerald-600" />
                          {h.lines[0]?.unitAllocations[0]?.unit.assetTag || 'Allocated'}
                        </span>
                      </td>
                      <td className="py-4 px-5">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                            h.status === 'ACTIVE'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-teal-50 text-teal-700 border border-teal-200'
                          }`}
                        >
                          {h.status === 'ACTIVE' ? 'HANDED OVER / ACTIVE' : 'READY FOR DISPATCH'}
                        </span>
                      </td>
                      <td className="py-4 px-5 text-right space-x-2">
                        {h.status !== 'ACTIVE' ? (
                          <button
                            onClick={() => {
                              setHandoverModalRes(h)
                              setReceiverName(h.request.contactName)
                            }}
                            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] shadow-sm transition inline-flex items-center gap-1"
                          >
                            <Check className="h-3 w-3" />
                            Complete Handover
                          </button>
                        ) : (
                          <Link
                            href={`/rentals/requests/${h.requestId}/receipt`}
                            target="_blank"
                            className="px-2.5 py-1.5 rounded-lg bg-slate-100 text-slate-700 font-semibold text-[11px] transition inline-flex items-center gap-1"
                          >
                            <FileText className="h-3 w-3" />
                            Receipt
                          </Link>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Step 08 Active Rentals & Extensions */}
      {activeTab === 'ACTIVE' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100">
            <h2 className="text-base font-bold text-slate-900">Step 08: Active Rental Monitoring & Extensions</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Live custody tracking, return due countdowns, extension requests, and reported incident tickets.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/70 border-b border-slate-100 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  <th className="py-3.5 px-5">Booking & Renter</th>
                  <th className="py-3.5 px-5">Asset</th>
                  <th className="py-3.5 px-5">Return Due Date</th>
                  <th className="py-3.5 px-5">Extension Request</th>
                  <th className="py-3.5 px-5">Status</th>
                  <th className="py-3.5 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {activeRentals.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      No active rentals in custody.
                    </td>
                  </tr>
                ) : (
                  activeRentals.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50/60 transition">
                      <td className="py-4 px-5">
                        <span className="font-mono font-bold text-slate-900">{r.bookingNo}</span>
                        <div className="text-slate-600 font-medium">{r.request.contactName}</div>
                      </td>
                      <td className="py-4 px-5 font-semibold text-slate-800">{r.request.listing.name}</td>
                      <td className="py-4 px-5">
                        <div className="font-medium text-slate-800">{new Date(r.endAt).toLocaleString()}</div>
                        {r.is_overdue && (
                          <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                            OVERDUE
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-5">
                        {r.pending_extension ? (
                          <div className="bg-amber-50 p-2 rounded-lg border border-amber-200 space-y-1">
                            <span className="text-[10px] font-bold text-amber-800 block">
                              Requesting +{r.pending_extension.additionalDays}d ($
                              {r.pending_extension.additionalCharge})
                            </span>
                            <div className="flex gap-1.5 pt-1">
                              <button
                                onClick={() => handleApproveExtension(r.pending_extension.id)}
                                className="px-2 py-0.5 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px]"
                              >
                                Approve
                              </button>
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">None</span>
                        )}
                      </td>
                      <td className="py-4 px-5">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          ACTIVE IN USE
                        </span>
                      </td>
                      <td className="py-4 px-5 text-right">
                        <Link
                          href={`/rentals/bookings/${r.id}`}
                          target="_blank"
                          className="px-2.5 py-1.5 rounded-lg bg-slate-100 text-slate-700 font-semibold text-[11px] inline-flex items-center gap-1"
                        >
                          <Eye className="h-3 w-3" />
                          View
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Step 09 Returns & Receiving */}
      {activeTab === 'RETURNS' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100">
            <h2 className="text-base font-bold text-slate-900">Step 09: Asset Returns & Physical Receipt</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Scheduled returns from customers, barcode receiving, and physical receipt issuance.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/70 border-b border-slate-100 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  <th className="py-3.5 px-5">Booking & Customer</th>
                  <th className="py-3.5 px-5">Asset</th>
                  <th className="py-3.5 px-5">Scheduled Arrival</th>
                  <th className="py-3.5 px-5">Return Status</th>
                  <th className="py-3.5 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {returnCases.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-400">
                      No return cases scheduled.
                    </td>
                  </tr>
                ) : (
                  returnCases.map((rc) => (
                    <tr key={rc.id} className="hover:bg-slate-50/60 transition">
                      <td className="py-4 px-5">
                        <span className="font-mono font-bold text-slate-900">{rc.reservation.bookingNo}</span>
                        <div className="text-slate-600 font-medium">{rc.requestedBy}</div>
                      </td>
                      <td className="py-4 px-5 font-semibold text-slate-800">
                        {rc.reservation.request.listing.name}
                      </td>
                      <td className="py-4 px-5 text-slate-600">
                        {new Date(rc.scheduledAt).toLocaleString()}
                      </td>
                      <td className="py-4 px-5">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                            rc.status === 'AWAITING_INSPECTION'
                              ? 'bg-teal-50 text-teal-700 border border-teal-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                        >
                          {rc.status}
                        </span>
                      </td>
                      <td className="py-4 px-5 text-right space-x-2">
                        {rc.status === 'SCHEDULED' ? (
                          <button
                            onClick={() => handleConfirmReturn(rc.id)}
                            className="px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-bold text-[11px] shadow-sm transition inline-flex items-center gap-1"
                          >
                            <Check className="h-3 w-3" />
                            Confirm Physical Receipt
                          </button>
                        ) : (
                          <span className="text-slate-400 italic">Received #{rc.receipt?.receiptNo}</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 4: Step 10 Inspection & Settlement */}
      {activeTab === 'INSPECTION' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100">
            <h2 className="text-base font-bold text-slate-900">Step 10: Technical Inspection & Deposit Settlement</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Evaluate equipment condition, record damage/late fees, compute net deposit refund, and authorize settlement.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/70 border-b border-slate-100 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  <th className="py-3.5 px-5">Booking & Renter</th>
                  <th className="py-3.5 px-5">Asset</th>
                  <th className="py-3.5 px-5">Verdict</th>
                  <th className="py-3.5 px-5">Deposit Liability</th>
                  <th className="py-3.5 px-5">Status</th>
                  <th className="py-3.5 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {inspections.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      No inspections in queue.
                    </td>
                  </tr>
                ) : (
                  inspections.map((insp) => {
                    const settlement = insp.reservation.settlement
                    return (
                      <tr key={insp.id} className="hover:bg-slate-50/60 transition">
                        <td className="py-4 px-5">
                          <span className="font-mono font-bold text-slate-900">{insp.reservation.bookingNo}</span>
                          <div className="text-slate-600 font-medium">{insp.reservation.request.contactName}</div>
                        </td>
                        <td className="py-4 px-5 font-semibold text-slate-800">
                          {insp.reservation.request.listing.name}
                        </td>
                        <td className="py-4 px-5">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              insp.verdict === 'PASS'
                                ? 'bg-emerald-50 text-emerald-700'
                                : 'bg-rose-50 text-rose-700'
                            }`}
                          >
                            {insp.verdict}
                          </span>
                        </td>
                        <td className="py-4 px-5">
                          <span className="font-bold text-indigo-700">
                            ${insp.reservation.request.paymentOrder?.depositAmount?.toFixed(2) || '500.00'}
                          </span>
                        </td>
                        <td className="py-4 px-5">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                              settlement?.status === 'SETTLED'
                                ? 'bg-emerald-50 text-emerald-700'
                                : 'bg-amber-50 text-amber-700'
                            }`}
                          >
                            {settlement?.status || insp.status}
                          </span>
                        </td>
                        <td className="py-4 px-5 text-right space-x-2">
                          {insp.status === 'IN_PROGRESS' ? (
                            <button
                              onClick={() => {
                                setInspectModalItem(insp)
                                setInspectVerdict('PASS')
                                setDamageFee(0)
                                setCleaningFee(0)
                              }}
                              className="px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-bold text-[11px] shadow-sm transition inline-flex items-center gap-1"
                            >
                              <Wrench className="h-3 w-3" />
                              Inspect & Settle
                            </button>
                          ) : settlement && settlement.status === 'PENDING' ? (
                            <button
                              onClick={() => handleApproveSettlement(insp.reservationId)}
                              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] shadow-sm transition inline-flex items-center gap-1"
                            >
                              <ShieldCheck className="h-3 w-3" />
                              Approve Settlement
                            </button>
                          ) : (
                            <span className="text-emerald-700 font-bold text-[11px]">Settled</span>
                          )}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 5: Step 11 Closeout & Inventory Release */}
      {activeTab === 'CLOSURE' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100">
            <h2 className="text-base font-bold text-slate-900">Step 11: Close Rental & Update Inventory Status</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Verify completion invariants, release units back to available stock, and generate final statement.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/70 border-b border-slate-100 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  <th className="py-3.5 px-5">Booking & Renter</th>
                  <th className="py-3.5 px-5">Asset</th>
                  <th className="py-3.5 px-5">Settlement Outcome</th>
                  <th className="py-3.5 px-5">Final Status</th>
                  <th className="py-3.5 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {readyToClose.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-400">
                      No settled rentals awaiting closeout.
                    </td>
                  </tr>
                ) : (
                  readyToClose.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50/60 transition">
                      <td className="py-4 px-5">
                        <span className="font-mono font-bold text-slate-900">{c.bookingNo}</span>
                        <div className="text-slate-600 font-medium">{c.request.contactName}</div>
                      </td>
                      <td className="py-4 px-5 font-semibold text-slate-800">{c.request.listing.name}</td>
                      <td className="py-4 px-5">
                        <div className="text-slate-800 font-medium">
                          Refunded: ${c.settlement?.netRefundAmount?.toFixed(2) || '0.00'}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          Deductions: ${c.settlement?.totalDeductions?.toFixed(2) || '0.00'}
                        </div>
                      </td>
                      <td className="py-4 px-5">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                            c.status === 'COMPLETED'
                              ? 'bg-slate-100 text-slate-700'
                              : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          }`}
                        >
                          {c.status === 'COMPLETED' ? 'COMPLETED & CLOSED' : 'READY TO CLOSE'}
                        </span>
                      </td>
                      <td className="py-4 px-5 text-right">
                        {c.status !== 'COMPLETED' ? (
                          <button
                            onClick={() => setCloseModalRes(c)}
                            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] shadow-sm transition inline-flex items-center gap-1"
                          >
                            <CheckCircle2 className="h-3 w-3" />
                            Finalize & Release Stock
                          </button>
                        ) : (
                          <span className="text-slate-400 italic">Closed {new Date(c.updatedAt).toLocaleDateString()}</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal: Step 07 Handover */}
      {handoverModalRes && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <Truck className="h-4 w-4 text-emerald-600" />
                Complete Asset Handover (Step 07)
              </h3>
              <button onClick={() => setHandoverModalRes(null)}>
                <X className="h-4 w-4 text-slate-400" />
              </button>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border space-y-1">
              <p>
                <strong>Booking:</strong> {handoverModalRes.bookingNo}
              </p>
              <p>
                <strong>Asset:</strong> {handoverModalRes.request.listing.name}
              </p>
              <p>
                <strong>Committed Unit:</strong>{' '}
                <span className="font-mono font-bold text-emerald-700">
                  {handoverModalRes.lines[0]?.unitAllocations[0]?.unit.assetTag || 'TO-MAC-0102'}
                </span>
              </p>
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                Authorized Receiver / Customer Name:
              </label>
              <input
                type="text"
                value={receiverName}
                onChange={(e) => setReceiverName(e.target.value)}
                className="w-full p-2.5 rounded-xl border text-xs"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">Handover Notes / Evidence:</label>
              <textarea
                rows={2}
                value={handoverNotes}
                onChange={(e) => setHandoverNotes(e.target.value)}
                placeholder="Inspected, charger and sleeve bundled, signed digital acknowledgment."
                className="w-full p-2.5 rounded-xl border text-xs"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setHandoverModalRes(null)}
                className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                disabled={submittingHandover}
                onClick={handleCompleteHandover}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold disabled:opacity-50"
              >
                {submittingHandover ? 'Transferring...' : 'Confirm Physical Handover'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Step 10 Inspection & Settlement */}
      {inspectModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <Wrench className="h-4 w-4 text-teal-600" />
                Technical Return Inspection (Step 10)
              </h3>
              <button onClick={() => setInspectModalItem(null)}>
                <X className="h-4 w-4 text-slate-400" />
              </button>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border space-y-1">
              <p>
                <strong>Booking:</strong> {inspectModalItem.reservation.bookingNo}
              </p>
              <p>
                <strong>Deposit Held:</strong>{' '}
                <span className="font-bold text-indigo-700">
                  ${inspectModalItem.reservation.request.paymentOrder?.depositAmount?.toFixed(2) || '500.00'} USD
                </span>
              </p>
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">Condition Verdict:</label>
              <select
                value={inspectVerdict}
                onChange={(e) => setInspectVerdict(e.target.value)}
                className="w-full p-2.5 rounded-xl border text-xs"
              >
                <option value="PASS">PASS — Good Condition & Clean</option>
                <option value="CLEANING_REQUIRED">CLEANING REQUIRED</option>
                <option value="REPAIR_REQUIRED">REPAIR REQUIRED</option>
                <option value="DAMAGED">DAMAGED — Physical Fault</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Damage Fee ($):</label>
                <input
                  type="number"
                  value={damageFee}
                  onChange={(e) => setDamageFee(Number(e.target.value))}
                  className="w-full p-2 rounded-xl border text-xs"
                />
              </div>
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Cleaning Fee ($):</label>
                <input
                  type="number"
                  value={cleaningFee}
                  onChange={(e) => setCleaningFee(Number(e.target.value))}
                  className="w-full p-2 rounded-xl border text-xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">Inspection Findings:</label>
              <textarea
                rows={2}
                value={inspectNotes}
                onChange={(e) => setInspectNotes(e.target.value)}
                placeholder="Hardware functional test passed. Screen and casing in original grade."
                className="w-full p-2.5 rounded-xl border text-xs"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setInspectModalItem(null)}
                className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                disabled={submittingInspect}
                onClick={handleCompleteInspection}
                className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold disabled:opacity-50"
              >
                {submittingInspect ? 'Saving...' : 'Complete & Calculate Settlement'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Step 11 Closeout */}
      {closeModalRes && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                Close Rental & Release Stock (Step 11)
              </h3>
              <button onClick={() => setCloseModalRes(null)}>
                <X className="h-4 w-4 text-slate-400" />
              </button>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-xl border space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500">Booking:</span>
                <span className="font-bold text-slate-900">{closeModalRes.bookingNo}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Deposit Refunded:</span>
                <span className="font-bold text-emerald-700">
                  ${closeModalRes.settlement?.netRefundAmount?.toFixed(2) || '500.00'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Inventory Action:</span>
                <span className="font-semibold text-slate-800">Return unit to AVAILABLE catalog</span>
              </div>
            </div>

            <p className="text-slate-600 leading-relaxed text-[11px]">
              Finalizing will officially archive this contract as COMPLETED and make the physical unit available for future rentals.
            </p>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setCloseModalRes(null)}
                className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                disabled={submittingClose}
                onClick={handleCloseRental}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold disabled:opacity-50"
              >
                {submittingClose ? 'Finalizing...' : 'Close Rental & Release Stock'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
