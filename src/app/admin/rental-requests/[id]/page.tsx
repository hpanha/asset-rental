'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft,
  Calendar,
  Clock,
  Shield,
  Truck,
  Building2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  AlertCircle,
  DollarSign,
  User,
  Phone,
  Mail,
  MapPin,
  RefreshCw,
  History,
  Check,
  X,
  Loader2,
  FileText,
  Boxes,
  Send,
  Layers,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'

export default function AdminRentalRequestDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const queryClient = useQueryClient()

  // Selected candidate units for provisional hold
  const [selectedUnitIds, setSelectedUnitIds] = useState<string[]>([])

  // Modal states
  const [approveOpen, setApproveOpen] = useState(false)
  const [holdMinutes, setHoldMinutes] = useState('30')
  const [approvalNote, setApprovalNote] = useState('')

  const [rejectOpen, setRejectOpen] = useState(false)
  const [reasonCode, setReasonCode] = useState('INVENTORY_UNAVAILABLE')
  const [publicReason, setPublicReason] = useState('')
  const [internalNotes, setInternalNotes] = useState('')

  const [proposeOpen, setProposeOpen] = useState(false)
  const [proposedStart, setProposedStart] = useState('')
  const [proposedEnd, setProposedEnd] = useState('')
  const [proposedQty, setProposedQty] = useState('1')
  const [proposeReason, setProposeReason] = useState('')

  // Fetch detailed request & real-time stock evaluation
  const { data, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: ['admin-request-detail', id],
    queryFn: async () => {
      const res = await fetch(`/api/admin/rental-requests/${id}`)
      if (!res.ok) throw new Error('Failed to load request detail')
      return res.json()
    },
    refetchInterval: 10000,
  })

  // Refresh stock check mutation
  const refreshStockMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/admin/rental-requests/${id}/availability-refresh`, {
        method: 'POST',
      })
      if (!res.ok) throw new Error('Stock check failed')
      return res.json()
    },
    onSuccess: () => {
      toast.success('Live inventory availability refreshed.')
      queryClient.invalidateQueries({ queryKey: ['admin-request-detail', id] })
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to refresh stock')
    },
  })

  // Approve Mutation
  const approveMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/admin/rental-requests/${id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          expected_version: req.version,
          hold_minutes: parseInt(holdMinutes, 10),
          approval_note: approvalNote,
          reviewer_name: 'Rental Operations Lead',
          provisional_unit_ids: selectedUnitIds,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to approve request')
      }
      return res.json()
    },
    onSuccess: (resData) => {
      toast.success(`Request ${resData.request_no} approved! Inventory hold active.`)
      setApproveOpen(false)
      queryClient.invalidateQueries({ queryKey: ['admin-request-detail', id] })
      queryClient.invalidateQueries({ queryKey: ['admin-rental-requests'] })
    },
    onError: (err: any) => {
      toast.error(err.message || 'Approval failed')
    },
  })

  // Reject Mutation
  const rejectMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/admin/rental-requests/${id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          expected_version: req.version,
          reason_code: reasonCode,
          public_reason: publicReason,
          internal_notes: internalNotes,
          reviewer_name: 'Rental Operations Lead',
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to reject request')
      }
      return res.json()
    },
    onSuccess: (resData) => {
      toast.success(`Request ${resData.request_no} rejected.`)
      setRejectOpen(false)
      queryClient.invalidateQueries({ queryKey: ['admin-request-detail', id] })
      queryClient.invalidateQueries({ queryKey: ['admin-rental-requests'] })
    },
    onError: (err: any) => {
      toast.error(err.message || 'Rejection failed')
    },
  })

  // Propose Changes Mutation
  const proposeMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/admin/rental-requests/${id}/propose-changes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          proposed_start_at: proposedStart || null,
          proposed_end_at: proposedEnd || null,
          proposed_quantity: proposedQty ? parseInt(proposedQty, 10) : null,
          reason: proposeReason,
          reviewer_name: 'Rental Operations Lead',
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to propose changes')
      }
      return res.json()
    },
    onSuccess: () => {
      toast.success('Change proposal sent to renter for approval.')
      setProposeOpen(false)
      queryClient.invalidateQueries({ queryKey: ['admin-request-detail', id] })
      queryClient.invalidateQueries({ queryKey: ['admin-rental-requests'] })
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to send proposal')
    },
  })

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-[#16a34a] mb-2" />
        <p className="text-xs text-slate-500">Loading rental request details...</p>
      </div>
    )
  }

  if (error || !data?.request) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
        <XCircle className="h-12 w-12 text-destructive mb-3" />
        <h2 className="text-lg font-bold text-slate-900">Rental Request Not Found</h2>
        <p className="text-xs text-slate-500 mb-6">
          The requested record could not be found or has been purged.
        </p>
        <Button asChild variant="outline" size="sm">
          <Link href="/admin/rental-requests">Back to Approval Queue</Link>
        </Button>
      </div>
    )
  }

  const req = data.request
  const stock = data.stockEvaluation
  const quote = req.quoteSnapshot
  const isPending = req.status === 'PENDING_APPROVAL'

  const startDateFormatted = new Date(req.startAt).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
  const endDateFormatted = new Date(req.endAt).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <Link href="/admin" className="hover:text-slate-900">Admin</Link>
        <span>/</span>
        <Link href="/admin/rental-requests" className="hover:text-slate-900">Rental Requests</Link>
        <span>/</span>
        <span className="font-mono text-slate-900 font-semibold">{req.requestNo}</span>
      </div>

      {/* Main Request Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200/90 shadow-xs">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="font-mono text-base font-extrabold text-slate-900">
              {req.requestNo}
            </span>
            <span className="font-mono text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
              Version {req.version}
            </span>
            <Badge
              className={
                req.status === 'PENDING_APPROVAL'
                  ? 'bg-amber-100 text-amber-800 border-amber-300'
                  : req.status === 'APPROVED_AWAITING_PAYMENT'
                  ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                  : req.status === 'REJECTED'
                  ? 'bg-rose-100 text-rose-800 border-rose-300'
                  : 'bg-slate-100 text-slate-600'
              }
            >
              {req.status}
            </Badge>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Submitted by <strong className="text-slate-800">{req.contactName}</strong> ({req.contactEmail} • {req.contactPhone}) on {new Date(req.submittedAt).toLocaleString()}
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refreshStockMutation.mutate()}
            disabled={refreshStockMutation.isPending}
            className="text-xs gap-1.5 bg-white border-slate-200 text-slate-700"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshStockMutation.isPending ? 'animate-spin' : ''}`} />
            Refresh Stock
          </Button>
          <Button asChild variant="outline" size="sm" className="text-xs gap-1.5">
            <Link href="/admin/rental-requests">
              <ArrowLeft className="h-3.5 w-3.5" />
              Queue
            </Link>
          </Button>
        </div>
      </div>

      {/* 2-Column Inspection Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (7 cols): Asset, Schedule, Physical Units Check */}
        <div className="lg:col-span-7 space-y-6">
          {/* 1. Asset & Specification Card */}
          <Card className="bg-white border-slate-200/90 shadow-xs">
            <CardHeader className="pb-3 border-b border-slate-100">
              <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-900">
                <Boxes className="h-4 w-4 text-[#16a34a]" />
                Equipment & Requested Specifications
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <div className="flex items-start gap-4">
                <div className="h-20 w-20 rounded-xl overflow-hidden bg-slate-100 border shrink-0">
                  <img
                    src={req.listing?.coverImage || 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=300&q=80'}
                    alt={req.listing?.name}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <Badge variant="secondary" className="text-[10px] font-semibold mb-1">
                    {req.listing?.category?.name || 'Equipment'}
                  </Badge>
                  <h3 className="font-bold text-base text-slate-900 truncate">
                    {req.listing?.name}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Asset Code: <strong className="font-mono text-slate-700">{req.listing?.code}</strong>
                  </p>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-1.5">
                    <span>Requested: <strong className="text-slate-900 font-bold">{req.quantity} unit(s)</strong></span>
                    <span>•</span>
                    <span>Tracking: <strong className="text-slate-700">{req.listing?.trackingMode || 'SERIALIZED'}</strong></span>
                  </div>
                </div>
              </div>

              {/* Rental Schedule & Fulfillment */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-slate-100 text-xs">
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
                  <span className="text-slate-500 flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-[#16a34a]" />
                    Rental Interval:
                  </span>
                  <p className="font-bold text-slate-800">
                    {req.rentalDays} Day(s) ({startDateFormatted} → {endDateFormatted})
                  </p>
                  <p className="text-[11px] text-slate-400">Timezone: Asia/Phnom_Penh (GMT+7)</p>
                </div>

                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
                  <span className="text-slate-500 flex items-center gap-1.5">
                    {req.fulfillment === 'PICKUP' ? (
                      <Building2 className="h-3.5 w-3.5 text-[#16a34a]" />
                    ) : (
                      <Truck className="h-3.5 w-3.5 text-[#16a34a]" />
                    )}
                    Fulfillment Method:
                  </span>
                  <p className="font-bold text-slate-800">
                    {req.fulfillment === 'PICKUP' ? 'Self Pickup at Hub' : 'Door Delivery'}
                  </p>
                  {req.fulfillment === 'PICKUP' && req.pickupLocation ? (
                    <p className="text-[11px] text-slate-500 truncate">{req.pickupLocation.name} ({req.pickupLocation.city})</p>
                  ) : req.deliveryAddress ? (
                    <p className="text-[11px] text-slate-500 truncate">{req.deliveryAddress.addressLine1}, {req.deliveryAddress.city}</p>
                  ) : null}
                </div>
              </div>

              {/* Customer Notes */}
              {req.customerNotes && (
                <div className="p-3 rounded-lg bg-amber-50/60 border border-amber-200/80 text-xs space-y-1">
                  <span className="font-semibold text-amber-900 flex items-center gap-1.5">
                    <FileText className="h-3.5 w-3.5 text-amber-600" />
                    Customer Usage Notes & Special Instructions:
                  </span>
                  <p className="text-amber-800 italic">"{req.customerNotes}"</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 2. Real-Time Physical Inventory Check */}
          <Card className="bg-white border-slate-200/90 shadow-xs">
            <CardHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-900">
                  <Shield className="h-4 w-4 text-[#16a34a]" />
                  Real-Time Physical Unit Availability
                </CardTitle>
                <CardDescription className="text-xs">
                  Physical serial units check against maintenance blocks, reservations, and active holds.
                </CardDescription>
              </div>

              {stock.hasConflict ? (
                <Badge variant="destructive" className="text-xs gap-1 font-semibold">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  Stock Conflict
                </Badge>
              ) : (
                <Badge className="bg-emerald-50 text-emerald-700 border-emerald-300 text-xs gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Available ({stock.availableCount}/{stock.requestedQuantity})
                </Badge>
              )}
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              {/* Candidate free units table */}
              <div>
                <h4 className="text-xs font-bold text-slate-800 mb-2">
                  Eligible Free Units ({stock.candidateUnits.length} available)
                </h4>
                {stock.candidateUnits.length === 0 ? (
                  <p className="text-xs text-rose-600 bg-rose-50 p-3 rounded-lg border border-rose-200">
                    No physical units are currently free during this date range! Approval will be blocked until alternate dates or units are selected.
                  </p>
                ) : (
                  <div className="border border-slate-200 rounded-lg overflow-hidden text-xs">
                    <table className="w-full text-left">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
                        <tr>
                          <th className="p-2.5">Provisional Hold</th>
                          <th className="p-2.5">Asset Tag</th>
                          <th className="p-2.5">Serial Number</th>
                          <th className="p-2.5">Condition</th>
                          <th className="p-2.5">Current Hub</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {stock.candidateUnits.map((u: any) => {
                          const isChecked = selectedUnitIds.includes(u.id)
                          return (
                            <tr key={u.id} className="hover:bg-slate-50/80">
                              <td className="p-2.5">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setSelectedUnitIds([...selectedUnitIds, u.id])
                                    } else {
                                      setSelectedUnitIds(selectedUnitIds.filter((id) => id !== u.id))
                                    }
                                  }}
                                  className="rounded border-slate-300 text-[#16a34a] focus:ring-[#16a34a]"
                                />
                              </td>
                              <td className="p-2.5 font-mono font-bold text-slate-800">{u.assetTag}</td>
                              <td className="p-2.5 font-mono text-slate-600">{u.serialNumber || 'N/A'}</td>
                              <td className="p-2.5">
                                <Badge variant="outline" className="text-[10px]">
                                  {u.conditionGrade}
                                </Badge>
                              </td>
                              <td className="p-2.5 text-slate-600">{u.locationName}</td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
                <p className="text-[11px] text-slate-400 mt-1.5">
                  Provisional unit selection reserves these serial units during the hold. Final physical handover confirmation occurs in Step 06/07.
                </p>
              </div>

              {/* Conflicted units list if any */}
              {stock.conflictedUnits.length > 0 && (
                <div className="pt-3 border-t border-slate-100">
                  <h4 className="text-xs font-bold text-rose-800 mb-1 flex items-center gap-1.5">
                    <AlertTriangle className="h-3.5 w-3.5 text-rose-600" />
                    Unavailable Units ({stock.conflictedUnits.length})
                  </h4>
                  <div className="space-y-1.5">
                    {stock.conflictedUnits.map((cu: any) => (
                      <div
                        key={cu.unitId}
                        className="p-2 rounded bg-rose-50/60 border border-rose-200 text-[11px] flex items-center justify-between"
                      >
                        <span className="font-mono font-bold text-slate-800">{cu.assetTag}</span>
                        <span className="text-rose-700 font-medium">{cu.details}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column (5 cols): Commercial Snapshot, Customer Identity, Hold Status */}
        <div className="lg:col-span-5 space-y-6">
          {/* 1. Commercial Quote Snapshot */}
          <Card className="bg-white border-slate-200/90 shadow-xs">
            <CardHeader className="pb-3 border-b border-slate-100">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-900">
                  <DollarSign className="h-4 w-4 text-[#16a34a]" />
                  Commercial Quote Snapshot
                </CardTitle>
                <Badge variant="outline" className="text-[10px]">
                  Locked at Step 03
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-4 space-y-2.5 text-xs">
              {quote ? (
                <>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Unit Daily Rate:</span>
                    <span className="font-semibold text-slate-800">${quote.unitRate.toFixed(2)}/day</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">
                      Rental Subtotal ({quote.rentalDays}d × {quote.quantity}):
                    </span>
                    <span className="font-semibold text-slate-800">${quote.rentalSubtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 flex items-center gap-1">
                      Security Deposit (Refundable) <Shield className="h-3 w-3 text-[#16a34a]" />:
                    </span>
                    <span className="font-semibold text-slate-800">${quote.securityDeposit.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Delivery Fee:</span>
                    <span className="font-semibold text-slate-800">
                      {quote.deliveryFee > 0 ? `$${quote.deliveryFee.toFixed(2)}` : 'Free (Pickup)'}
                    </span>
                  </div>
                  <div className="pt-2 border-t border-slate-200 flex justify-between items-baseline text-sm font-bold">
                    <span className="text-slate-900">Total Payable:</span>
                    <span className="text-[#16a34a] text-lg">${quote.totalPayable.toFixed(2)}</span>
                  </div>
                </>
              ) : (
                <p className="text-slate-400">Quote snapshot missing</p>
              )}
            </CardContent>
          </Card>

          {/* 2. Customer Identity & Legal Consent */}
          <Card className="bg-white border-slate-200/90 shadow-xs">
            <CardHeader className="pb-3 border-b border-slate-100">
              <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-900">
                <User className="h-4 w-4 text-[#16a34a]" />
                Customer Identity & Consent
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-2.5 text-xs text-slate-600">
              <div className="flex justify-between">
                <span className="text-slate-500">Account User:</span>
                <span className="font-semibold text-slate-800">{req.renter?.name || req.contactName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Email Address:</span>
                <span className="font-semibold text-slate-800">{req.contactEmail}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Phone Number:</span>
                <span className="font-semibold text-slate-800">{req.contactPhone}</span>
              </div>
              {req.organizationName && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Organization:</span>
                  <span className="font-semibold text-slate-800">{req.organizationName}</span>
                </div>
              )}
              <div className="pt-2 border-t border-slate-100 flex justify-between">
                <span className="text-slate-500">Terms Agreement:</span>
                <span className="text-[#16a34a] font-semibold flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  {req.termsAcceptance?.termsVersionId || 'rental-terms-2026.1'}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* 3. Active Inventory Hold Status (if approved) */}
          {req.inventoryHold && (
            <Card className="bg-emerald-50/40 border-emerald-300 shadow-xs">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-bold text-emerald-900 flex items-center gap-2">
                  <Clock className="h-4 w-4 text-[#16a34a]" />
                  Active Inventory Hold
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs space-y-2 text-emerald-800">
                <div className="flex justify-between">
                  <span>Hold Status:</span>
                  <Badge className="bg-emerald-200 text-emerald-900 border-emerald-300">
                    {req.inventoryHold.status}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span>Payment Due By:</span>
                  <span className="font-mono font-bold">
                    {new Date(req.inventoryHold.expiresAt).toLocaleTimeString()}
                  </span>
                </div>
                {req.inventoryHold.units?.length > 0 && (
                  <div className="pt-2 border-t border-emerald-200">
                    <span className="block font-semibold mb-1">Provisionally Held Units:</span>
                    <div className="flex flex-wrap gap-1">
                      {req.inventoryHold.units.map((hu: any) => (
                        <span
                          key={hu.id}
                          className="font-mono text-[10px] bg-white text-emerald-800 px-1.5 py-0.5 rounded border border-emerald-200"
                        >
                          {hu.unit?.assetTag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Lifecycle Event Timeline */}
      <Card className="bg-white border-slate-200/90 shadow-xs">
        <CardHeader className="pb-3 border-b border-slate-100">
          <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-900">
            <History className="h-4 w-4 text-[#16a34a]" />
            Request Lifecycle & Audit Timeline
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="space-y-3 border-l-2 border-[#16a34a]/30 pl-4 ml-2">
            {req.events?.map((ev: any) => (
              <div key={ev.id} className="relative text-xs">
                <div className="absolute -left-[22px] top-1 w-2.5 h-2.5 rounded-full bg-[#16a34a]" />
                <div className="flex items-center gap-2 font-bold text-slate-800">
                  <span>{ev.action}</span>
                  <Badge variant="outline" className="text-[10px] py-0 px-1.5">
                    {ev.actorType}: {ev.actorName}
                  </Badge>
                  <span className="text-[11px] font-normal text-slate-400">
                    {new Date(ev.createdAt).toLocaleString()}
                  </span>
                </div>
                <p className="text-slate-600 mt-0.5">{ev.reason || `Transitioned to ${ev.toStatus}`}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Sticky Bottom Action Bar */}
      {isPending && (
        <div className="sticky bottom-4 z-20 bg-white/95 backdrop-blur p-4 rounded-xl border border-slate-200 shadow-md flex items-center justify-between gap-4">
          <div className="text-xs text-slate-600">
            <span>Decision for Request </span>
            <strong className="font-mono text-slate-900">{req.requestNo}</strong>:
            {stock.hasConflict ? (
              <span className="text-rose-600 font-semibold ml-2">
                (Approval blocked: Stock Conflict detected)
              </span>
            ) : (
              <span className="text-[#16a34a] font-semibold ml-2">
                (Ready: {stock.availableCount} units in stock)
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setProposedStart(req.startAt.split('T')[0])
                setProposedEnd(req.endAt.split('T')[0])
                setProposedQty(req.quantity.toString())
                setProposeReason('')
                setProposeOpen(true)
              }}
              className="text-xs border-slate-300"
            >
              Propose Changes
            </Button>

            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                setReasonCode(stock.hasConflict ? 'INVENTORY_UNAVAILABLE' : 'POLICY_VIOLATION')
                setPublicReason(
                  stock.hasConflict
                    ? 'Selected equipment is fully booked for the requested interval.'
                    : ''
                )
                setInternalNotes('')
                setRejectOpen(true)
              }}
              className="text-xs"
            >
              Reject Request
            </Button>

            <Button
              size="sm"
              disabled={stock.hasConflict}
              onClick={() => {
                setHoldMinutes('30')
                setApprovalNote('')
                setApproveOpen(true)
              }}
              className="text-xs bg-[#16a34a] hover:bg-[#15803d] text-white font-semibold gap-1.5"
            >
              <Check className="h-4 w-4" />
              Approve & Obtain Hold
            </Button>
          </div>
        </div>
      )}

      {/* Approve Modal */}
      <Dialog open={approveOpen} onOpenChange={setApproveOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-[#16a34a]" />
              Confirm Rental Approval
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Acquires a transaction-safe stock hold for {req.quantity} unit(s).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Temporary Hold & Payment Deadline
              </label>
              <Select value={holdMinutes} onValueChange={setHoldMinutes}>
                <SelectTrigger className="text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="15">15 Minutes</SelectItem>
                  <SelectItem value="30">30 Minutes (Recommended)</SelectItem>
                  <SelectItem value="60">1 Hour</SelectItem>
                  <SelectItem value="120">2 Hours</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Approval Note to Customer
              </label>
              <Textarea
                value={approvalNote}
                onChange={(e) => setApprovalNote(e.target.value)}
                placeholder="e.g. Schedule verified. Pickup ready at hub."
                className="text-xs resize-none h-20"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setApproveOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={approveMutation.isPending}
              onClick={() => approveMutation.mutate()}
              className="bg-[#16a34a] hover:bg-[#15803d] text-white text-xs font-semibold"
            >
              {approveMutation.isPending ? 'Obtaining Hold...' : 'Authorize Approval'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Modal */}
      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-destructive flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Confirm Rejection
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Reason Code <span className="text-destructive">*</span>
              </label>
              <Select value={reasonCode} onValueChange={setReasonCode}>
                <SelectTrigger className="text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="INVENTORY_UNAVAILABLE">No Stock / Inventory Unavailable</SelectItem>
                  <SelectItem value="MAINTENANCE_CONFLICT">Asset Under Scheduled Maintenance</SelectItem>
                  <SelectItem value="POLICY_VIOLATION">Rental Policy Violation</SelectItem>
                  <SelectItem value="CUSTOMER_ELIGIBILITY">Verification Criteria Unmet</SelectItem>
                  <SelectItem value="OTHER">Other Custom Reason</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Public Explanation for Customer <span className="text-destructive">*</span>
              </label>
              <Textarea
                value={publicReason}
                onChange={(e) => setPublicReason(e.target.value)}
                placeholder="Reason displayed to the customer in their portal..."
                className="text-xs resize-none h-20"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Internal Private Staff Notes
              </label>
              <Textarea
                value={internalNotes}
                onChange={(e) => setInternalNotes(e.target.value)}
                placeholder="Staff notes..."
                className="text-xs resize-none h-16"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setRejectOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={rejectMutation.isPending || !publicReason.trim()}
              onClick={() => rejectMutation.mutate()}
              className="text-xs"
            >
              {rejectMutation.isPending ? 'Rejecting...' : 'Confirm Rejection'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Propose Changes Modal */}
      <Dialog open={proposeOpen} onOpenChange={setProposeOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <RefreshCw className="h-4 w-4 text-blue-600" />
              Propose Schedule / Quantity Changes
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Offer alternative dates or available units. The renter must explicitly accept before payment.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Proposed Start</label>
                <Input
                  type="date"
                  value={proposedStart}
                  onChange={(e) => setProposedStart(e.target.value)}
                  className="text-xs h-9"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Proposed End</label>
                <Input
                  type="date"
                  value={proposedEnd}
                  onChange={(e) => setProposedEnd(e.target.value)}
                  className="text-xs h-9"
                />
              </div>
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Proposed Quantity</label>
              <Input
                type="number"
                min="1"
                value={proposedQty}
                onChange={(e) => setProposedQty(e.target.value)}
                className="text-xs h-9"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Reason & Explanation for Proposal <span className="text-destructive">*</span>
              </label>
              <Textarea
                value={proposeReason}
                onChange={(e) => setProposeReason(e.target.value)}
                placeholder="e.g. Requested dates overlap with maintenance. Proposing +2 days when 2 units become free."
                className="text-xs resize-none h-20"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setProposeOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={proposeMutation.isPending || !proposeReason.trim()}
              onClick={() => proposeMutation.mutate()}
              className="text-xs bg-blue-600 hover:bg-blue-700 text-white font-semibold"
            >
              {proposeMutation.isPending ? 'Submitting...' : 'Dispatch Proposal'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
