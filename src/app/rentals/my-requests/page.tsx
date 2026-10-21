'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ClipboardList,
  Calendar,
  Clock,
  Shield,
  Truck,
  Building2,
  DollarSign,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Eye,
  Loader2,
  ArrowRight,
  Filter,
  PlusCircle,
  History,
  LogIn,
} from 'lucide-react'
import { Header } from '@/components/rental/Header'
import { Footer } from '@/components/rental/Footer'
import { Button } from '@/components/ui/button'
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
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'

export default function MyRequestsPage() {
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState('ALL')
  const [selectedRequest, setSelectedRequest] = useState<any | null>(null)
  const [cancelModalRequest, setCancelModalRequest] = useState<any | null>(null)
  const [cancelReason, setCancelReason] = useState('')

  const { data: meData } = useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      const res = await fetch('/api/me')
      if (!res.ok) return null
      return res.json()
    },
  })

  const { data, isLoading, error } = useQuery({
    queryKey: ['my-rental-requests', activeTab],
    queryFn: async () => {
      const url =
        activeTab === 'ALL'
          ? '/api/me/rental-requests'
          : `/api/me/rental-requests?status=${activeTab}`
      const res = await fetch(url)
      if (!res.ok) throw new Error('Failed to fetch rental requests')
      return res.json()
    },
    enabled: !!meData?.user,
  })

  const cancelMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const res = await fetch(`/api/me/rental-requests/${id}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to cancel request')
      }
      return res.json()
    },
    onSuccess: () => {
      toast.success('Rental request cancelled successfully.')
      setCancelModalRequest(null)
      setSelectedRequest(null)
      queryClient.invalidateQueries({ queryKey: ['my-rental-requests'] })
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to cancel request')
    },
  })

  const acceptProposalMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/me/rental-requests/${id}/accept-proposal`, {
        method: 'POST',
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to accept proposal')
      }
      return res.json()
    },
    onSuccess: () => {
      toast.success('Changes accepted! Request updated.')
      queryClient.invalidateQueries({ queryKey: ['my-rental-requests'] })
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to accept proposal')
    },
  })

  const declineProposalMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/me/rental-requests/${id}/decline-proposal`, {
        method: 'POST',
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to decline proposal')
      }
      return res.json()
    },
    onSuccess: () => {
      toast.success('Proposal declined. Request cancelled.')
      queryClient.invalidateQueries({ queryKey: ['my-rental-requests'] })
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to decline proposal')
    },
  })

  const requests = data?.requests || []

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
            Approved (Awaiting Payment)
          </Badge>
        )
      case 'CHANGE_REQUESTED':
        return (
          <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border-blue-300">
            Changes Proposed
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
      case 'RESERVED':
        return (
          <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300">
            Booking Confirmed
          </Badge>
        )
      case 'ACTIVE':
        return (
          <Badge className="bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300 border-green-300 font-semibold animate-pulse">
            Active Rental
          </Badge>
        )
      case 'RETURN_SCHEDULED':
        return (
          <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border-blue-300">
            Return Scheduled
          </Badge>
        )
      case 'RETURN_RECEIVED_AWAITING_INSPECTION':
        return (
          <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border-purple-300">
            Returned (Inspecting)
          </Badge>
        )
      case 'SETTLEMENT_PENDING':
        return (
          <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-300">
            Settlement Pending
          </Badge>
        )
      case 'COMPLETED':
        return (
          <Badge className="bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-200 border-slate-300">
            Rental Completed
          </Badge>
        )
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-background flex flex-col">
      <Header />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-8">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-3">
              <ClipboardList className="h-7 w-7 text-emerald-600" />
              My Rental Requests
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Track your equipment rental submissions, view commercial snapshots, and monitor approval timelines.
            </p>
          </div>

          <Button asChild className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold gap-2 self-start sm:self-auto">
            <Link href="/rentals">
              <PlusCircle className="h-4 w-4" />
              Browse Equipment
            </Link>
          </Button>
        </div>

        {/* Filter Tabs */}
        <div className="mb-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid grid-cols-2 sm:grid-cols-4 max-w-2xl h-auto p-1 bg-muted/80">
              <TabsTrigger value="ALL" className="text-xs py-2">
                All Requests
              </TabsTrigger>
              <TabsTrigger value="PENDING_APPROVAL" className="text-xs py-2">
                Pending Approval
              </TabsTrigger>
              <TabsTrigger value="APPROVED_AWAITING_PAYMENT" className="text-xs py-2">
                Approved
              </TabsTrigger>
              <TabsTrigger value="CANCELLED_BY_RENTER" className="text-xs py-2">
                Cancelled
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Content List */}
        {!meData?.user ? (
          <Card className="p-12 text-center border-dashed">
            <LogIn className="h-12 w-12 text-emerald-600/70 mx-auto mb-3" />
            <CardTitle className="text-base font-bold mb-1">Sign In to View Your Requests</CardTitle>
            <CardDescription className="text-xs text-muted-foreground mb-6 max-w-sm mx-auto">
              Please sign in with your customer account to track your rental requests, review admin approvals, and proceed to payment.
            </CardDescription>
            <Button asChild className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold gap-1.5">
              <Link href="/login?from=/rentals/my-requests">
                <LogIn className="h-4 w-4" />
                Sign In to Account
              </Link>
            </Button>
          </Card>
        ) : isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-600 mb-2" />
            <p className="text-xs text-muted-foreground">Loading rental requests...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center bg-card rounded-xl border border-destructive/20 text-destructive">
            <AlertCircle className="h-8 w-8 mx-auto mb-2" />
            <p className="font-semibold text-sm">Failed to load rental requests</p>
          </div>
        ) : requests.length === 0 ? (
          <Card className="p-12 text-center border-dashed">
            <ClipboardList className="h-12 w-12 text-muted-foreground/40 mx-auto mb-3" />
            <CardTitle className="text-base font-bold mb-1">No Rental Requests Found</CardTitle>
            <CardDescription className="text-xs text-muted-foreground mb-6">
              {activeTab === 'ALL'
                ? 'You have not submitted any equipment rental requests yet.'
                : `No requests found matching status "${activeTab}".`}
            </CardDescription>
            <Button asChild variant="outline" className="text-xs">
              <Link href="/rentals">Explore Equipment Catalog</Link>
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {requests.map((item: any) => {
              const startDate = new Date(item.startAt).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })
              const endDate = new Date(item.endAt).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })
              const isPending = item.status === 'PENDING_APPROVAL'
              const isApproved = item.status === 'APPROVED_AWAITING_PAYMENT'

              return (
                <Card
                  key={item.id}
                  className="shadow-xs hover:shadow-md transition border-border overflow-hidden"
                >
                  <div className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    {/* Left: Asset info */}
                    <div className="flex items-start gap-4">
                      <div className="h-18 w-18 sm:h-20 sm:w-20 rounded-xl overflow-hidden bg-muted border shrink-0">
                        <img
                          src={
                            item.listing?.coverImage ||
                            'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=300&q=80'
                          }
                          alt={item.listing?.name}
                          className="h-full w-full object-cover"
                        />
                      </div>

                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className="font-mono text-xs font-bold text-foreground">
                            {item.requestNo}
                          </span>
                          {getStatusBadge(item.status)}
                          <span className="text-[11px] text-muted-foreground">
                            Submitted on {new Date(item.submittedAt).toLocaleDateString()}
                          </span>
                        </div>

                        <h3 className="font-bold text-base text-foreground truncate max-w-md">
                          {item.listing?.name}
                        </h3>

                        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground mt-1.5">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5 text-emerald-600" />
                            {startDate} → {endDate} ({item.rentalDays}d)
                          </span>
                          <span>•</span>
                          <span>Quantity: <strong className="text-foreground">{item.quantity}</strong></span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            {item.fulfillment === 'PICKUP' ? (
                              <>
                                <Building2 className="h-3.5 w-3.5 text-emerald-600" />
                                Pickup: {item.pickupLocation?.city || 'Hub'}
                              </>
                            ) : (
                              <>
                                <Truck className="h-3.5 w-3.5 text-emerald-600" />
                                Delivery
                              </>
                            )}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Right: Quote & Actions */}
                    <div className="flex flex-row md:flex-col items-center md:items-end justify-between border-t md:border-t-0 pt-3 md:pt-0 border-border gap-2">
                      <div className="text-left md:text-right">
                        <span className="text-[11px] text-muted-foreground block">
                          Total Estimate:
                        </span>
                        <span className="text-lg font-black text-emerald-600">
                          ${item.quoteSnapshot?.totalPayable?.toFixed(2) || '0.00'}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedRequest(item)}
                          className="text-xs gap-1.5"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          Details
                        </Button>

                        {isPending && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setCancelModalRequest(item)
                              setCancelReason('')
                            }}
                            className="text-xs text-destructive hover:bg-destructive/10"
                          >
                            Cancel
                          </Button>
                        )}

                        {item.status === 'CHANGE_REQUESTED' && item.changeProposals?.[0] && (
                          <div className="flex items-center gap-1.5">
                            <Button
                              size="sm"
                              onClick={() => acceptProposalMutation.mutate(item.id)}
                              disabled={acceptProposalMutation.isPending}
                              className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                            >
                              Accept Changes
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => declineProposalMutation.mutate(item.id)}
                              disabled={declineProposalMutation.isPending}
                              className="text-xs text-destructive border-destructive/30"
                            >
                              Decline
                            </Button>
                          </div>
                        )}

                        {isApproved && (
                          <Link
                            href={`/rentals/requests/${item.id}/payment`}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold transition shadow-sm"
                          >
                            Pay & Reserve
                            <ArrowRight className="h-3.5 w-3.5" />
                          </Link>
                        )}

                        {item.status === 'PAYMENT_PENDING_VERIFICATION' && (
                          <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
                            {item.paymentOrder?.attempts?.[0]?.method === 'CASH'
                              ? 'Awaiting Cash at Counter'
                              : 'Awaiting Wire Review'}
                          </span>
                        )}

                        {(item.status === 'RESERVED' || item.status === 'PAYMENT_CONFIRMED' || item.status === 'READY_FOR_HANDOVER') && (
                          <Link
                            href={`/rentals/bookings/${item.id}`}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-[#0d4a2e] hover:bg-[#0b3d25] text-white font-bold transition shadow-sm"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                            Booking Confirmed
                          </Link>
                        )}

                        {['ACTIVE', 'RETURN_SCHEDULED', 'RETURN_RECEIVED_AWAITING_INSPECTION', 'SETTLEMENT_PENDING', 'SETTLED'].includes(item.status) && (
                          <Link
                            href="/rentals/active"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition shadow-sm"
                          >
                            <Clock className="h-3.5 w-3.5 text-emerald-200" />
                            Active Rental Portal
                          </Link>
                        )}

                        {item.status === 'COMPLETED' && (
                          <Link
                            href="/rentals/active"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-slate-800 hover:bg-slate-900 text-white font-bold transition shadow-sm"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                            Completed Archive
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
        )}
      </main>

      {/* Request Details Dialog */}
      <Dialog open={!!selectedRequest} onOpenChange={(open) => !open && setSelectedRequest(null)}>
        {selectedRequest && (
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader className="border-b pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <DialogTitle className="text-lg font-bold flex items-center gap-2">
                    Request Details: {selectedRequest.requestNo}
                  </DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                    Submitted on {new Date(selectedRequest.submittedAt).toLocaleString()}
                  </DialogDescription>
                </div>
                {getStatusBadge(selectedRequest.status)}
              </div>
            </DialogHeader>

            <div className="space-y-4 py-2 text-xs">
              {/* Asset & Fulfillment snapshot */}
              <div className="p-3.5 rounded-xl bg-muted/40 border border-border flex items-center gap-4">
                <div className="h-16 w-16 rounded-lg overflow-hidden bg-muted border shrink-0">
                  <img
                    src={selectedRequest.listing?.coverImage}
                    alt={selectedRequest.listing?.name}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-foreground">
                    {selectedRequest.listing?.name}
                  </h4>
                  <p className="text-muted-foreground mt-0.5">
                    Rental Duration: <strong>{selectedRequest.rentalDays} Day(s)</strong> • Quantity: <strong>{selectedRequest.quantity} Unit(s)</strong>
                  </p>
                  <p className="text-muted-foreground mt-0.5">
                    Fulfillment: <strong>{selectedRequest.fulfillment}</strong>
                    {selectedRequest.fulfillment === 'PICKUP' && selectedRequest.pickupLocation
                      ? ` (${selectedRequest.pickupLocation.name})`
                      : ''}
                  </p>
                </div>
              </div>

              {/* Commercial Quote Snapshot */}
              <div>
                <h4 className="font-bold text-foreground mb-2 flex items-center gap-1.5">
                  <DollarSign className="h-4 w-4 text-emerald-600" />
                  Locked Commercial Snapshot
                </h4>
                <div className="p-3 rounded-lg border border-border bg-card space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Rental Subtotal:</span>
                    <span className="font-semibold text-foreground">
                      ${selectedRequest.quoteSnapshot?.rentalSubtotal?.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Security Deposit (Refundable):</span>
                    <span className="font-semibold text-foreground">
                      ${selectedRequest.quoteSnapshot?.securityDeposit?.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Delivery Fee:</span>
                    <span className="font-semibold text-foreground">
                      ${selectedRequest.quoteSnapshot?.deliveryFee?.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between pt-1.5 border-t border-border font-bold text-sm">
                    <span>Total Estimated Payable:</span>
                    <span className="text-emerald-600">
                      ${selectedRequest.quoteSnapshot?.totalPayable?.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Contact Information */}
              <div>
                <h4 className="font-bold text-foreground mb-2">Renter & Contact Info</h4>
                <div className="p-3 rounded-lg border border-border bg-card space-y-1 text-muted-foreground">
                  <p>Contact: <strong className="text-foreground">{selectedRequest.contactName}</strong></p>
                  <p>Phone: <strong className="text-foreground">{selectedRequest.contactPhone}</strong></p>
                  <p>Email: <strong className="text-foreground">{selectedRequest.contactEmail}</strong></p>
                  {selectedRequest.organizationName && (
                    <p>Organization: <strong className="text-foreground">{selectedRequest.organizationName}</strong></p>
                  )}
                  {selectedRequest.customerNotes && (
                    <p className="italic pt-1">Notes: "{selectedRequest.customerNotes}"</p>
                  )}
                </div>
              </div>

              {/* Audit Event Timeline */}
              {selectedRequest.events && selectedRequest.events.length > 0 && (
                <div>
                  <h4 className="font-bold text-foreground mb-2 flex items-center gap-1.5">
                    <History className="h-4 w-4 text-emerald-600" />
                    Lifecycle & Audit Timeline
                  </h4>
                  <div className="space-y-2 border-l-2 border-emerald-500/30 pl-3 ml-2">
                    {selectedRequest.events.map((ev: any) => (
                      <div key={ev.id} className="relative">
                        <div className="absolute -left-[19px] top-1 w-2.5 h-2.5 rounded-full bg-emerald-500" />
                        <div className="text-[11px]">
                          <span className="font-semibold text-foreground">{ev.action}</span> •{' '}
                          <span className="text-muted-foreground">
                            {new Date(ev.createdAt).toLocaleString()}
                          </span>
                          <p className="text-muted-foreground mt-0.5">{ev.reason || `Status changed to ${ev.toStatus}`}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <DialogFooter className="gap-2 border-t pt-3">
              {selectedRequest.status === 'PENDING_APPROVAL' && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    setCancelModalRequest(selectedRequest)
                    setCancelReason('')
                  }}
                  className="text-xs"
                >
                  Cancel Request
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedRequest(null)}
                className="text-xs"
              >
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>

      {/* Cancel Modal */}
      <Dialog open={!!cancelModalRequest} onOpenChange={(open) => !open && setCancelModalRequest(null)}>
        {cancelModalRequest && (
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-destructive font-bold">
                <AlertTriangle className="h-5 w-5" />
                Cancel Rental Request?
              </DialogTitle>
              <DialogDescription className="text-xs">
                Are you sure you want to cancel request <strong>{cancelModalRequest.requestNo}</strong>?
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-2 py-2">
              <label className="text-xs font-semibold text-foreground">
                Reason for Cancellation (Optional)
              </label>
              <Textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="e.g. Changed schedule, selected wrong dates..."
                className="text-xs resize-none h-20"
              />
            </div>

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setCancelModalRequest(null)}>
                Keep Request
              </Button>
              <Button
                variant="destructive"
                disabled={cancelMutation.isPending}
                onClick={() =>
                  cancelMutation.mutate({
                    id: cancelModalRequest.id,
                    reason: cancelReason,
                  })
                }
              >
                {cancelMutation.isPending ? 'Cancelling...' : 'Confirm Cancellation'}
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>

      <Footer />
    </div>
  )
}
