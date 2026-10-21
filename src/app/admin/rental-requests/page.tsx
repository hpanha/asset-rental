'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ClipboardCheck,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  XCircle,
  AlertTriangle,
  Calendar,
  Building2,
  Truck,
  ArrowRight,
  Shield,
  Eye,
  Check,
  X,
  Loader2,
  RefreshCw,
  Copy,
  ExternalLink,
  ChevronRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
import { toast } from 'sonner'

export default function AdminRentalRequestsPage() {
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState('PENDING_APPROVAL')
  const [searchTerm, setSearchTerm] = useState('')

  // Modal states
  const [approveTarget, setApproveTarget] = useState<any | null>(null)
  const [holdMinutes, setHoldMinutes] = useState('30')
  const [approvalNote, setApprovalNote] = useState('')

  const [rejectTarget, setRejectTarget] = useState<any | null>(null)
  const [reasonCode, setReasonCode] = useState('INVENTORY_UNAVAILABLE')
  const [publicReason, setPublicReason] = useState('')
  const [internalNotes, setInternalNotes] = useState('')

  const [copiedId, setCopiedId] = useState<string | null>(null)

  // Fetch admin rental requests
  const { data, isLoading, isRefetching, refetch } = useQuery({
    queryKey: ['admin-rental-requests', activeTab, searchTerm],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (activeTab !== 'ALL') params.set('status', activeTab)
      if (searchTerm) params.set('search', searchTerm)
      const res = await fetch(`/api/admin/rental-requests?${params.toString()}`)
      if (!res.ok) throw new Error('Failed to load requests queue')
      return res.json()
    },
    refetchInterval: 15000,
  })

  // Approve Mutation
  const approveMutation = useMutation({
    mutationFn: async ({ id, holdMinutes, note, version }: { id: string; holdMinutes: number; note: string; version: number }) => {
      const res = await fetch(`/api/admin/rental-requests/${id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          expected_version: version,
          hold_minutes: holdMinutes,
          approval_note: note,
          reviewer_name: 'Rental Operations Lead',
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to approve request')
      }
      return res.json()
    },
    onSuccess: (data) => {
      toast.success(`Request ${data.request_no} approved! Inventory hold active for ${holdMinutes} mins.`)
      setApproveTarget(null)
      queryClient.invalidateQueries({ queryKey: ['admin-rental-requests'] })
    },
    onError: (err: any) => {
      toast.error(err.message || 'Approval failed')
    },
  })

  // Reject Mutation
  const rejectMutation = useMutation({
    mutationFn: async ({
      id,
      code,
      publicMsg,
      internalMsg,
      version,
    }: {
      id: string
      code: string
      publicMsg: string
      internalMsg: string
      version: number
    }) => {
      const res = await fetch(`/api/admin/rental-requests/${id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          expected_version: version,
          reason_code: code,
          public_reason: publicMsg,
          internal_notes: internalMsg,
          reviewer_name: 'Rental Operations Lead',
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to reject request')
      }
      return res.json()
    },
    onSuccess: (data) => {
      toast.success(`Request ${data.request_no} rejected with reason logged.`)
      setRejectTarget(null)
      queryClient.invalidateQueries({ queryKey: ['admin-rental-requests'] })
    },
    onError: (err: any) => {
      toast.error(err.message || 'Rejection failed')
    },
  })

  const requests = data?.requests || []
  const counts = data?.counts || { pending: 0, approved: 0, rejected: 0, expired: 0, all: 0 }

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    toast.success('Copied request ID')
    setTimeout(() => setCopiedId(null), 2000)
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING_APPROVAL':
        return (
          <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-300">
            Pending Approval
          </Badge>
        )
      case 'APPROVED_AWAITING_PAYMENT':
        return (
          <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300">
            Approved (Holding)
          </Badge>
        )
      case 'CHANGE_REQUESTED':
        return (
          <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border-blue-300">
            Change Requested
          </Badge>
        )
      case 'REJECTED':
        return (
          <Badge className="bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border-rose-300">
            Rejected
          </Badge>
        )
      case 'PAYMENT_EXPIRED':
        return (
          <Badge variant="secondary" className="text-muted-foreground border-dashed">
            Hold Expired
          </Badge>
        )
      case 'CANCELLED_BY_RENTER':
        return (
          <Badge variant="secondary" className="text-muted-foreground">
            Cancelled by Renter
          </Badge>
        )
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-[#0d4a2e] text-white flex items-center justify-center shadow">
              <ClipboardCheck className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900">
                Rental Requests Approval Queue
              </h1>
              <p className="text-xs text-slate-500">
                Step 04: Review customer rental submissions, verify physical inventory holds, and authorize payment invitations.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isRefetching}
            className="text-xs gap-1.5 bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefetching ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* KPI Stats Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-white border-slate-200/80 shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500">Pending Review</p>
              <p className="text-2xl font-black text-amber-600 mt-0.5">{counts.pending}</p>
              <p className="text-[11px] text-slate-400 mt-0.5">SLA: 2–4 hours response</p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200/80 shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500">Approved & Holding</p>
              <p className="text-2xl font-black text-[#16a34a] mt-0.5">{counts.approved}</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Awaiting customer payment</p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200/80 shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500">Hold Expired</p>
              <p className="text-2xl font-black text-slate-600 mt-0.5">{counts.expired}</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Released back to pool</p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-slate-50 text-slate-600 flex items-center justify-center">
              <Clock className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200/80 shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500">Total Submissions</p>
              <p className="text-2xl font-black text-slate-900 mt-0.5">{counts.all}</p>
              <p className="text-[11px] text-slate-400 mt-0.5">All lifecycle statuses</p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
              <ClipboardCheck className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200/80 shadow-xs">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full sm:w-auto">
          <TabsList className="bg-slate-100/80 h-9 p-0.5">
            <TabsTrigger value="PENDING_APPROVAL" className="text-xs px-3">
              Pending ({counts.pending})
            </TabsTrigger>
            <TabsTrigger value="APPROVED_AWAITING_PAYMENT" className="text-xs px-3">
              Approved ({counts.approved})
            </TabsTrigger>
            <TabsTrigger value="REJECTED" className="text-xs px-3">
              Rejected ({counts.rejected})
            </TabsTrigger>
            <TabsTrigger value="ALL" className="text-xs px-3">
              All Requests ({counts.all})
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="relative w-full sm:w-72">
          <Search className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-3" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search request #, renter, asset..."
            className="pl-8 text-xs h-9 bg-slate-50 border-slate-200"
          />
        </div>
      </div>

      {/* Requests Queue Table / Cards */}
      {isLoading ? (
        <div className="py-24 flex flex-col items-center justify-center bg-white rounded-xl border border-slate-200">
          <Loader2 className="h-8 w-8 animate-spin text-[#16a34a] mb-2" />
          <p className="text-xs text-slate-500">Loading requests queue...</p>
        </div>
      ) : requests.length === 0 ? (
        <Card className="p-16 text-center border-dashed bg-white">
          <ClipboardCheck className="h-12 w-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800">No Rental Requests</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            {searchTerm
              ? `No requests matching "${searchTerm}".`
              : activeTab === 'PENDING_APPROVAL'
              ? 'Awesome! There are no pending requests awaiting review right now.'
              : `No requests with status "${activeTab}".`}
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {requests.map((item: any) => {
            const startDate = new Date(item.startAt).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
            })
            const endDate = new Date(item.endAt).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })

            const isPending = item.status === 'PENDING_APPROVAL'
            const stock = item.stockEvaluation

            return (
              <Card
                key={item.id}
                className="bg-white border-slate-200/90 shadow-xs hover:border-slate-300 hover:shadow-sm transition"
              >
                <div className="p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Left Column: Asset, Request #, and Renter */}
                  <div className="flex items-start gap-4 min-w-0 flex-1">
                    <div className="h-16 w-16 rounded-xl overflow-hidden bg-slate-100 border shrink-0">
                      <img
                        src={item.listing?.coverImage || 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=300&q=80'}
                        alt={item.listing?.name}
                        className="h-full w-full object-cover"
                      />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="font-mono text-xs font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded">
                          {item.requestNo}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">v{item.version}</span>
                        {getStatusBadge(item.status)}

                        {/* Stock Check Badge */}
                        {isPending && (
                          stock.hasConflict ? (
                            <Badge variant="destructive" className="text-[10px] gap-1 font-semibold">
                              <AlertTriangle className="h-3 w-3" />
                              Stock Conflict ({stock.availableCount}/{stock.requestedQuantity} free)
                            </Badge>
                          ) : (
                            <Badge className="bg-emerald-50 text-emerald-700 border-emerald-300 text-[10px] gap-1">
                              <CheckCircle2 className="h-3 w-3" />
                              Stock Available ({stock.availableCount} units)
                            </Badge>
                          )
                        )}

                        {stock.isUrgent && (
                          <Badge className="bg-amber-50 text-amber-700 border-amber-300 text-[10px] gap-1">
                            <Clock className="h-3 w-3" />
                            Urgent Pickup
                          </Badge>
                        )}
                      </div>

                      <h3 className="font-bold text-sm text-slate-900 truncate max-w-lg">
                        {item.listing?.name}
                      </h3>

                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-1">
                        <span>
                          Renter: <strong className="text-slate-800">{item.contactName}</strong> ({item.contactPhone})
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5 text-slate-400" />
                          {startDate} → {endDate} ({item.rentalDays}d)
                        </span>
                        <span>•</span>
                        <span>Qty: <strong className="text-slate-800">{item.quantity}</strong></span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          {item.fulfillment === 'PICKUP' ? (
                            <>
                              <Building2 className="h-3.5 w-3.5 text-slate-400" />
                              Pickup: {item.pickupLocation?.city || 'Hub'}
                            </>
                          ) : (
                            <>
                              <Truck className="h-3.5 w-3.5 text-slate-400" />
                              Delivery: {item.deliveryAddress?.city || 'Address'}
                            </>
                          )}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Commercial Quote & Action Controls */}
                  <div className="flex flex-row lg:flex-col items-center lg:items-end justify-between border-t lg:border-t-0 pt-3 lg:pt-0 border-slate-100 gap-3 shrink-0">
                    <div className="text-left lg:text-right">
                      <span className="text-[11px] text-slate-400 block">Total Estimated Quote:</span>
                      <span className="text-base font-black text-[#16a34a]">
                        ${item.quoteSnapshot?.totalPayable?.toFixed(2) || '0.00'}
                      </span>
                      <span className="text-[10px] text-slate-400 block">
                        Deposit: ${item.quoteSnapshot?.securityDeposit?.toFixed(2) || '0.00'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        asChild
                        variant="outline"
                        size="sm"
                        className="text-xs gap-1.5 bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                      >
                        <Link href={`/admin/rental-requests/${item.id}`}>
                          <Eye className="h-3.5 w-3.5" />
                          Review Detail
                        </Link>
                      </Button>

                      {isPending && (
                        <>
                          <Button
                            size="sm"
                            disabled={stock.hasConflict}
                            onClick={() => {
                              setApproveTarget(item)
                              setHoldMinutes('30')
                              setApprovalNote('')
                            }}
                            className="text-xs bg-[#16a34a] hover:bg-[#15803d] text-white font-semibold gap-1"
                          >
                            <Check className="h-3.5 w-3.5" />
                            Approve
                          </Button>

                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => {
                              setRejectTarget(item)
                              setReasonCode(stock.hasConflict ? 'INVENTORY_UNAVAILABLE' : 'POLICY_VIOLATION')
                              setPublicReason(
                                stock.hasConflict
                                  ? 'Selected equipment has conflicting reservations for the requested rental dates.'
                                  : ''
                              )
                              setInternalNotes('')
                            }}
                            className="text-xs gap-1"
                          >
                            <X className="h-3.5 w-3.5" />
                            Reject
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {/* Modal C: Approve Request & Hold */}
      <Dialog open={!!approveTarget} onOpenChange={(open) => !open && setApproveTarget(null)}>
        {approveTarget && (
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base font-bold text-slate-900">
                <CheckCircle2 className="h-5 w-5 text-[#16a34a]" />
                Approve Rental Request: {approveTarget.requestNo}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Approval reserves a temporary inventory hold and issues a payment invitation to the customer.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2 text-xs">
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500">Equipment:</span>
                  <span className="font-semibold text-slate-800">{approveTarget.listing?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Requested Quantity:</span>
                  <span className="font-semibold text-slate-800">{approveTarget.quantity} Unit(s)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Rental Period:</span>
                  <span className="font-semibold text-slate-800">{approveTarget.rentalDays} Day(s)</span>
                </div>
                <div className="flex justify-between pt-1 border-t border-slate-200">
                  <span className="text-slate-500">Total Payable upon Approval:</span>
                  <span className="font-bold text-[#16a34a] text-sm">
                    ${approveTarget.quoteSnapshot?.totalPayable?.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Hold Duration Configuration */}
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Payment Window & Inventory Hold Duration
                </label>
                <Select value={holdMinutes} onValueChange={setHoldMinutes}>
                  <SelectTrigger className="text-xs">
                    <SelectValue placeholder="Select hold duration" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="15">15 Minutes (High demand / Urgent pickup)</SelectItem>
                    <SelectItem value="30">30 Minutes (Standard policy)</SelectItem>
                    <SelectItem value="60">1 Hour (Enterprise / Weekend)</SelectItem>
                    <SelectItem value="120">2 Hours (Maximum permitted)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-slate-400 mt-1">
                  If the customer does not complete payment within this window, the hold automatically expires and units are freed.
                </p>
              </div>

              {/* Approval Note */}
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Customer Message / Approval Note (Optional)
                </label>
                <Textarea
                  value={approvalNote}
                  onChange={(e) => setApprovalNote(e.target.value)}
                  placeholder="e.g. Schedule verified. Pickup ready at Phnom Penh hub with charger and protective sleeve."
                  className="text-xs resize-none h-20"
                />
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button variant="outline" size="sm" onClick={() => setApproveTarget(null)} className="text-xs">
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={approveMutation.isPending}
                onClick={() =>
                  approveMutation.mutate({
                    id: approveTarget.id,
                    holdMinutes: parseInt(holdMinutes, 10),
                    note: approvalNote,
                    version: approveTarget.version,
                  })
                }
                className="text-xs bg-[#16a34a] hover:bg-[#15803d] text-white font-semibold"
              >
                {approveMutation.isPending ? 'Obtaining Hold...' : 'Confirm Approval & Hold'}
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>

      {/* Modal D: Reject Request */}
      <Dialog open={!!rejectTarget} onOpenChange={(open) => !open && setRejectTarget(null)}>
        {rejectTarget && (
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base font-bold text-destructive">
                <AlertTriangle className="h-5 w-5" />
                Reject Rental Request: {rejectTarget.requestNo}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                A structured rejection reason and public explanation will be recorded and visible to the customer.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2 text-xs">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Reason Code <span className="text-destructive">*</span>
                </label>
                <Select value={reasonCode} onValueChange={setReasonCode}>
                  <SelectTrigger className="text-xs">
                    <SelectValue placeholder="Select reason code" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="INVENTORY_UNAVAILABLE">No Stock / Inventory Unavailable</SelectItem>
                    <SelectItem value="MAINTENANCE_CONFLICT">Asset Under Scheduled Maintenance</SelectItem>
                    <SelectItem value="POLICY_VIOLATION">Rental Policy Violation (Notice/Duration)</SelectItem>
                    <SelectItem value="CUSTOMER_ELIGIBILITY">Customer Verification Criteria Unmet</SelectItem>
                    <SelectItem value="SCHEDULE_CONFLICT">Logistics / Hub Fulfillment Overcapacity</SelectItem>
                    <SelectItem value="OTHER">Other Custom Reason</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Public Explanation for Customer <span className="text-destructive">*</span>
                </label>
                <Textarea
                  value={publicReason}
                  onChange={(e) => setPublicReason(e.target.value)}
                  placeholder="Explain clearly why this request cannot be fulfilled and recommend alternative options..."
                  className="text-xs resize-none h-20"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Internal Administrative Notes (Private)
                </label>
                <Textarea
                  value={internalNotes}
                  onChange={(e) => setInternalNotes(e.target.value)}
                  placeholder="Private internal log for rental staff audit..."
                  className="text-xs resize-none h-16"
                />
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button variant="outline" size="sm" onClick={() => setRejectTarget(null)} className="text-xs">
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                disabled={rejectMutation.isPending || !publicReason.trim()}
                onClick={() =>
                  rejectMutation.mutate({
                    id: rejectTarget.id,
                    code: reasonCode,
                    publicMsg: publicReason,
                    internalMsg: internalNotes,
                    version: rejectTarget.version,
                  })
                }
                className="text-xs"
              >
                {rejectMutation.isPending ? 'Rejecting...' : 'Confirm Rejection'}
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </div>
  )
}
