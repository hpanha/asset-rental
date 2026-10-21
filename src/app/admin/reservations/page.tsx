'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  CalendarCheck,
  CheckCircle2,
  Clock,
  Package,
  Search,
  RefreshCw,
  Eye,
  Check,
  AlertCircle,
  ExternalLink,
  Printer,
  Tag,
  ArrowRight,
  ShieldCheck,
  User,
  MapPin,
  Calendar,
  X,
  FileText,
  Wrench,
  Layers,
} from 'lucide-react'
import { toast } from 'sonner'

interface ReservationLine {
  id: string
  listingId: string
  quantity: number
  listing: {
    id: string
    code: string
    name: string
    coverImage: string
  }
  unitAllocations: Array<{
    id: string
    unitId: string
    status: string
    unit: {
      id: string
      assetTag: string
      serialNumber?: string
      conditionGrade: string
      accessories?: string
      baseStatus: string
    }
  }>
}

interface Reservation {
  id: string
  bookingNo: string
  requestId: string
  renterId: string
  status: string
  startAt: string
  endAt: string
  locationId?: string
  fulfillmentMode: string
  confirmedAt: string
  notes?: string
  request: {
    id: string
    requestNo: string
    status: string
    contactName: string
    contactPhone: string
    contactEmail: string
    rentalDays: number
    quantity: number
    listing: {
      id: string
      code: string
      name: string
      coverImage: string
    }
    quoteSnapshot?: {
      totalPayable: number
      currency: string
    }
    paymentOrder?: {
      id: string
      paymentStatus: string
      totalDue: number
      currency: string
      receipt?: {
        receiptNo: string
      }
    }
    pickupLocation?: {
      name: string
      address: string
      city: string
    }
    deliveryAddress?: {
      addressLine1: string
      city: string
    }
  }
  lines: ReservationLine[]
  fulfillmentTask?: {
    id: string
    status: string
    pickupAt: string
    assignedStaffName?: string
    checklistJson?: string
    notes?: string
    preparedAt?: string
  }
  location?: {
    name: string
    address: string
    city: string
  }
}

interface ReservationCounts {
  reserved: number
  ready_for_handover: number
  pickup_today: number
  active: number
  total: number
}

export default function AdminReservationsPage() {
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [counts, setCounts] = useState<ReservationCounts>({
    reserved: 0,
    ready_for_handover: 0,
    pickup_today: 0,
    active: 0,
    total: 0,
  })
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'ALL' | 'PICKUP_TODAY' | 'RESERVED' | 'READY_FOR_HANDOVER' | 'ACTIVE'>('ALL')
  const [searchQuery, setSearchQuery] = useState('')

  // Modals state
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null)
  const [markReadyRes, setMarkReadyRes] = useState<Reservation | null>(null)
  const [readyNotes, setReadyNotes] = useState('')
  const [submittingReady, setSubmittingReady] = useState(false)

  // Reallocation modal state
  const [reassignRes, setReassignRes] = useState<Reservation | null>(null)
  const [oldUnitId, setOldUnitId] = useState('')
  const [newUnitId, setNewUnitId] = useState('')
  const [reassignReason, setReassignReason] = useState('')
  const [submittingReassign, setSubmittingReassign] = useState(false)

  const fetchReservations = async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/admin/reservations?status=${activeTab}&search=${encodeURIComponent(searchQuery)}`)
      if (!res.ok) throw new Error('Failed to load reservations')
      const data = await res.json()
      setReservations(data.reservations || [])
      setCounts(
        data.counts || {
          reserved: 0,
          ready_for_handover: 0,
          pickup_today: 0,
          active: 0,
          total: 0,
        }
      )
    } catch (err: any) {
      toast.error(err.message || 'Error loading reservations')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchReservations()
  }, [activeTab])

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    fetchReservations()
  }

  const handleMarkReady = async () => {
    if (!markReadyRes) return
    try {
      setSubmittingReady(true)
      const res = await fetch(`/api/admin/reservations/${markReadyRes.id}/mark-ready`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          staffName: 'Vannak Chen (Warehouse Lead)',
          notes: readyNotes || 'Equipment inspected, cleaned, tested, and staged for handover.',
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to mark ready')

      toast.success('Reservation marked as Ready for Handover!')
      setMarkReadyRes(null)
      setReadyNotes('')
      fetchReservations()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setSubmittingReady(false)
    }
  }

  const handleReallocate = async () => {
    if (!reassignRes || !oldUnitId || !newUnitId || !reassignReason) {
      toast.error('Please select both units and enter a reason.')
      return
    }
    try {
      setSubmittingReassign(true)
      const res = await fetch(`/api/admin/reservations/${reassignRes.id}/propose-reallocation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          oldUnitId,
          newUnitId,
          reason: reassignReason,
          staffName: 'Vannak Chen (Warehouse Lead)',
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Reallocation failed')

      toast.success(data.message || 'Unit successfully reallocated')
      setReassignRes(null)
      setOldUnitId('')
      setNewUnitId('')
      setReassignReason('')
      fetchReservations()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setSubmittingReassign(false)
    }
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              Step 06 Booking & Fulfillment
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 mt-1">
            Confirmed Reservations & Stock Commitments
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Committed inventory allocations, scheduled pickup preparations, and warehouse handover stage.
          </p>
        </div>

        <button
          onClick={fetchReservations}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-sm font-semibold transition shadow-sm"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Confirmed</span>
            <div className="h-9 w-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CalendarCheck className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-extrabold text-slate-900">{counts.total}</span>
            <p className="text-xs text-slate-500 font-medium mt-1">Total committed bookings</p>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-500 uppercase tracking-wider">Pickup Today</span>
            <div className="h-9 w-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-extrabold text-amber-600">{counts.pickup_today}</span>
            <p className="text-xs text-amber-700 font-medium mt-1">Scheduled for collection today</p>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-teal-600 uppercase tracking-wider">Ready for Handover</span>
            <div className="h-9 w-9 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-extrabold text-teal-700">{counts.ready_for_handover}</span>
            <p className="text-xs text-teal-600 font-medium mt-1">Inspected & staged at counter</p>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-indigo-500 uppercase tracking-wider">Reserved in Advance</span>
            <div className="h-9 w-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Package className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-extrabold text-indigo-900">{counts.reserved}</span>
            <p className="text-xs text-indigo-600 font-medium mt-1">Upcoming future bookings</p>
          </div>
        </div>
      </div>

      {/* Main Table Section */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        {/* Filter Tabs & Search */}
        <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-1.5 p-1 bg-slate-100/80 rounded-xl overflow-x-auto">
            {(
              [
                { id: 'ALL', label: `All (${counts.total})` },
                { id: 'PICKUP_TODAY', label: `Pickup Today (${counts.pickup_today})` },
                { id: 'RESERVED', label: `Reserved (${counts.reserved})` },
                { id: 'READY_FOR_HANDOVER', label: `Ready for Handover (${counts.ready_for_handover})` },
                { id: 'ACTIVE', label: `Active / Out (${counts.active})` },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  activeTab === tab.id
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <form onSubmit={handleSearchSubmit} className="relative w-full md:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search booking #, renter, unit tag..."
              className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
            />
          </form>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-100 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                <th className="py-3.5 px-5">Booking & Renter</th>
                <th className="py-3.5 px-5">Asset & Qty</th>
                <th className="py-3.5 px-5">Rental Schedule</th>
                <th className="py-3.5 px-5">Assigned Unit(s)</th>
                <th className="py-3.5 px-5">Status</th>
                <th className="py-3.5 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <RefreshCw className="h-6 w-6 animate-spin mx-auto text-emerald-600 mb-2" />
                    Loading reservations...
                  </td>
                </tr>
              ) : reservations.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    No reservations found in this view.
                  </td>
                </tr>
              ) : (
                reservations.map((res) => {
                  const allocations = res.lines[0]?.unitAllocations || []
                  const isReady = res.status === 'READY_FOR_HANDOVER'
                  const isReserved = res.status === 'RESERVED'

                  return (
                    <tr key={res.id} className="hover:bg-slate-50/60 transition">
                      {/* Booking & Renter */}
                      <td className="py-4 px-5">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-slate-900 text-sm">{res.bookingNo}</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200">
                            {res.request.requestNo}
                          </span>
                        </div>
                        <div className="text-slate-700 font-semibold mt-1">{res.request.contactName}</div>
                        <div className="text-[11px] text-slate-400">{res.request.contactPhone}</div>
                      </td>

                      {/* Asset & Qty */}
                      <td className="py-4 px-5">
                        <div className="font-semibold text-slate-900">{res.request.listing.name}</div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          Quantity: <span className="font-bold text-slate-800">{res.request.quantity}</span> • Mode:{' '}
                          <span className="font-medium text-emerald-700">{res.fulfillmentMode}</span>
                        </div>
                      </td>

                      {/* Schedule */}
                      <td className="py-4 px-5">
                        <div className="text-slate-800 font-medium">
                          {new Date(res.startAt).toLocaleDateString()} → {new Date(res.endAt).toLocaleDateString()}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1">
                          <MapPin className="h-3 w-3 text-slate-400" />
                          {res.location?.name || res.request.pickupLocation?.city || 'Main Facility'}
                        </div>
                      </td>

                      {/* Assigned Units */}
                      <td className="py-4 px-5">
                        {allocations.length === 0 ? (
                          <span className="text-slate-400 italic">Generic capacity pool</span>
                        ) : (
                          <div className="space-y-1">
                            {allocations.map((a) => (
                              <div key={a.id} className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-100 text-slate-800 font-mono text-[11px]">
                                <Tag className="h-3 w-3 text-emerald-600" />
                                {a.unit.assetTag}
                              </div>
                            ))}
                          </div>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-4 px-5">
                        {isReady ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-teal-50 text-teal-700 border border-teal-200">
                            <CheckCircle2 className="h-3 w-3" />
                            Ready for Handover
                          </span>
                        ) : isReserved ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CalendarCheck className="h-3 w-3" />
                            RESERVED
                          </span>
                        ) : res.status === 'ACTIVE' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                            <Package className="h-3 w-3" />
                            ACTIVE / OUT
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600">
                            {res.status}
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-5 text-right space-x-2">
                        {isReserved && (
                          <button
                            onClick={() => {
                              setMarkReadyRes(res)
                              setReadyNotes('')
                            }}
                            className="px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-bold text-[11px] shadow-sm transition inline-flex items-center gap-1"
                          >
                            <Check className="h-3 w-3" />
                            Mark Ready
                          </button>
                        )}

                        <button
                          onClick={() => {
                            setReassignRes(res)
                            setOldUnitId(allocations[0]?.unitId || '')
                            setNewUnitId('')
                            setReassignReason('')
                          }}
                          className="px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 font-semibold text-[11px] transition inline-flex items-center gap-1"
                          title="Substitute or reassign unit in case of inspection failure"
                        >
                          <Wrench className="h-3 w-3" />
                          Reassign
                        </button>

                        <button
                          onClick={() => setSelectedReservation(res)}
                          className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-[11px] transition inline-flex items-center gap-1"
                        >
                          <Eye className="h-3 w-3" />
                          Details & Slip
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Mark Ready for Handover */}
      {markReadyRes && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
                  <CheckCircle2 className="h-4 w-4" />
                </div>
                <h3 className="font-bold text-slate-900 text-base">Stage for Handover (Step 07 Prep)</h3>
              </div>
              <button onClick={() => setMarkReadyRes(null)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <p className="text-slate-600">
                Marking ready indicates equipment has been inspected, packaged with all standard accessories, and staged at the pickup counter.
              </p>

              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500">Booking:</span>
                  <span className="font-mono font-bold text-slate-800">{markReadyRes.bookingNo}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Customer:</span>
                  <span className="font-semibold text-slate-800">{markReadyRes.request.contactName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Asset:</span>
                  <span className="font-semibold text-slate-800">{markReadyRes.request.listing.name}</span>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Preparation & Staging Notes:
                </label>
                <textarea
                  rows={3}
                  value={readyNotes}
                  onChange={(e) => setReadyNotes(e.target.value)}
                  placeholder="e.g., Cleaned, tested battery at 98%, power adapter and sleeve packed in case #3."
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setMarkReadyRes(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={submittingReady}
                onClick={handleMarkReady}
                className="px-5 py-2.5 text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white rounded-xl shadow-sm transition disabled:opacity-50"
              >
                {submittingReady ? 'Staging...' : 'Confirm Ready for Handover'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Propose Reassignment */}
      {reassignRes && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Wrench className="h-4 w-4" />
                </div>
                <h3 className="font-bold text-slate-900 text-base">Reassign Equipment Unit</h3>
              </div>
              <button onClick={() => setReassignRes(null)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <p className="text-slate-600">
                If the allocated unit fails pre-handover inspection or requires calibration, reassign to another active unit belonging to this model.
              </p>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Current Allocated Unit ID:</label>
                <input
                  type="text"
                  value={oldUnitId}
                  onChange={(e) => setOldUnitId(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-mono bg-slate-50"
                  readOnly
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">New Unit ID to Commit:</label>
                <input
                  type="text"
                  value={newUnitId}
                  onChange={(e) => setNewUnitId(e.target.value)}
                  placeholder="Paste destination AssetUnit cuid..."
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-mono focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Reason for Reassignment:</label>
                <textarea
                  rows={2}
                  value={reassignReason}
                  onChange={(e) => setReassignReason(e.target.value)}
                  placeholder="e.g. Scratched lens during prep; replaced with identical backup unit."
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setReassignRes(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={submittingReassign}
                onClick={handleReallocate}
                className="px-5 py-2.5 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-sm transition disabled:opacity-50"
              >
                {submittingReassign ? 'Reassigning...' : 'Confirm Reassignment'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Drawer: Detailed Fulfillment Slip & Inspection Checklist */}
      {selectedReservation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-100 space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-slate-900 text-lg">Reservation & Handover Slip</h3>
                  <span className="font-mono text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    {selectedReservation.bookingNo}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Origin Request: {selectedReservation.request.requestNo} • Step 06 Committed
                </p>
              </div>
              <button onClick={() => setSelectedReservation(null)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Quick Cards */}
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="p-4 bg-slate-50 rounded-xl space-y-1.5">
                <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px] block">
                  Customer Information
                </span>
                <p className="font-bold text-slate-900 text-sm">{selectedReservation.request.contactName}</p>
                <p className="text-slate-600">{selectedReservation.request.contactPhone}</p>
                <p className="text-slate-500">{selectedReservation.request.contactEmail}</p>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl space-y-1.5">
                <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px] block">
                  Verified Payment & Security Deposit
                </span>
                <p className="font-bold text-slate-900 text-sm">
                  ${selectedReservation.request.paymentOrder?.totalDue?.toFixed(2)} USD (PAID)
                </p>
                <p className="text-emerald-700 font-medium">
                  Receipt: {selectedReservation.request.paymentOrder?.receipt?.receiptNo || 'Verified'}
                </p>
                <p className="text-[11px] text-indigo-600 font-semibold">
                  Deposit Held in Escrow: ${(selectedReservation.request.quoteSnapshot?.totalPayable ? 500 : 0).toFixed(2)}
                </p>
              </div>
            </div>

            {/* Handover Task & Checklist */}
            <div className="p-4 rounded-xl bg-teal-50/50 border border-teal-100 space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-teal-950 flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-teal-600" />
                  Warehouse Handover Task (Step 07 Preparation)
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-teal-100 text-teal-800 uppercase">
                  {selectedReservation.fulfillmentTask?.status || 'SCHEDULED'}
                </span>
              </div>
              <div className="text-slate-700 space-y-1 text-[11px]">
                <p>
                  <strong>Scheduled Handover Window:</strong>{' '}
                  {new Date(selectedReservation.startAt).toLocaleString()}
                </p>
                <p>
                  <strong>Staging Location:</strong>{' '}
                  {selectedReservation.location?.name || selectedReservation.request.pickupLocation?.city || 'Main Phnom Penh Hub'}
                </p>
                <p>
                  <strong>Assigned Staff:</strong>{' '}
                  {selectedReservation.fulfillmentTask?.assignedStaffName || 'Warehouse Lead'}
                </p>
              </div>

              <div className="bg-white p-3 rounded-lg border border-teal-100/80 space-y-1.5">
                <span className="font-bold text-slate-800 text-[11px] block">Mandatory Handover Checklist:</span>
                <ul className="list-disc list-inside space-y-1 text-slate-600 text-[11px]">
                  <li>Verify matching physical asset tag & serial number barcode</li>
                  <li>Perform functional inspection (power on, display, input check)</li>
                  <li>Bundle all cables, chargers, adapters, and carrying case</li>
                  <li>Record physical condition photos before renter handover</li>
                  <li>Collect renter signature and physical ID copy</li>
                </ul>
              </div>
            </div>

            {/* Equipment Unit Table */}
            <div className="space-y-2 text-xs">
              <span className="font-bold text-slate-800 block">Committed Physical Asset Unit:</span>
              <div className="border border-slate-200/80 rounded-xl overflow-hidden divide-y divide-slate-100">
                {selectedReservation.lines[0]?.unitAllocations.map((a) => (
                  <div key={a.id} className="p-3.5 flex items-center justify-between">
                    <div>
                      <div className="font-mono font-bold text-slate-900">{a.unit.assetTag}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        Serial: {a.unit.serialNumber || 'N/A'} • Condition: {a.unit.conditionGrade}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-bold text-[10px] border border-emerald-200">
                        {a.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Actions footer */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl transition"
              >
                <Printer className="h-3.5 w-3.5" />
                Print Slip
              </button>

              <button
                type="button"
                onClick={() => setSelectedReservation(null)}
                className="px-5 py-2 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
