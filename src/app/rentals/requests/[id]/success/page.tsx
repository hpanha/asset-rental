'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  CheckCircle2,
  Clock,
  Calendar,
  Shield,
  Truck,
  Building2,
  ArrowRight,
  AlertTriangle,
  Loader2,
  XCircle,
  Copy,
  Check,
  ClipboardList,
} from 'lucide-react'
import { Header } from '@/components/rental/Header'
import { Footer } from '@/components/rental/Footer'
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
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'

export default function RentalRequestSuccessPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const queryClient = useQueryClient()

  const [copied, setCopied] = useState(false)
  const [cancelModalOpen, setCancelModalOpen] = useState(false)
  const [cancelReason, setCancelReason] = useState('')

  const { data, isLoading, error } = useQuery({
    queryKey: ['rental-request', id],
    queryFn: async () => {
      const res = await fetch(`/api/me/rental-requests/${id}`)
      if (!res.ok) {
        throw new Error('Could not find rental request')
      }
      return res.json()
    },
  })

  const cancelMutation = useMutation({
    mutationFn: async (reason: string) => {
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
      setCancelModalOpen(false)
      queryClient.invalidateQueries({ queryKey: ['rental-request', id] })
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to cancel request')
    },
  })

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
        </div>
        <Footer />
      </div>
    )
  }

  if (error || !data?.request) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
          <XCircle className="h-12 w-12 text-destructive mb-3" />
          <h2 className="text-xl font-bold mb-1">Rental Request Not Found</h2>
          <p className="text-sm text-muted-foreground mb-6">
            The request you are looking for may not exist or belongs to another account.
          </p>
          <Button asChild className="bg-emerald-600 hover:bg-emerald-700">
            <Link href="/rentals/my-requests">View My Requests</Link>
          </Button>
        </div>
        <Footer />
      </div>
    )
  }

  const req = data.request
  const quote = req.quoteSnapshot

  const copyRequestNo = () => {
    navigator.clipboard.writeText(req.requestNo)
    setCopied(true)
    toast.success('Request Number copied to clipboard!')
    setTimeout(() => setCopied(false), 2000)
  }

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

  const isPending = req.status === 'PENDING_APPROVAL'

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-background flex flex-col">
      <Header />

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 py-10">
        {/* Success Hero Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 mb-4 shadow-sm">
            <CheckCircle2 className="w-9 h-9" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
            Rental Request Submitted!
          </h1>
          <p className="text-sm text-muted-foreground max-w-md mx-auto mt-2">
            Your rental request has been securely recorded and dispatched for administrative review.
          </p>

          <div className="inline-flex items-center gap-2 mt-4 px-3.5 py-1.5 rounded-full bg-muted border border-border">
            <span className="text-xs text-muted-foreground">Request No:</span>
            <span className="font-mono font-bold text-sm text-foreground">{req.requestNo}</span>
            <button
              onClick={copyRequestNo}
              className="text-muted-foreground hover:text-emerald-600 transition p-0.5"
              title="Copy request number"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
          </div>
        </div>

        {/* Status Callout Card */}
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 mb-8 flex items-start gap-3">
          <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="flex-1 text-xs text-amber-900 dark:text-amber-200 leading-relaxed">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-bold text-sm">Status:</span>
              <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300 font-semibold text-[11px]">
                {req.status === 'PENDING_APPROVAL' ? 'Pending Approval' : req.status}
              </Badge>
            </div>
            <p>
              This request is currently under review by our operations team (SLA: 2–4 business hours).
              <strong> No payment has been collected</strong> and equipment is not yet reserved. Once approved in Step 04, you will receive an invitation to settle the deposit and confirm your reservation.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Equipment & Schedule Summary */}
          <Card className="shadow-sm border-border">
            <CardHeader className="pb-3 border-b border-border/60">
              <CardTitle className="text-sm font-bold">Equipment & Rental Dates</CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-16 w-16 rounded-xl overflow-hidden bg-muted border shrink-0">
                  <img
                    src={req.listing?.coverImage || 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=300&q=80'}
                    alt={req.listing?.name}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] font-semibold text-emerald-600 uppercase">
                    {req.listing?.category?.name || 'Equipment'}
                  </span>
                  <h3 className="font-bold text-sm truncate">{req.listing?.name}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Quantity: <strong className="text-foreground">{req.quantity} unit(s)</strong>
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-muted/40 border border-border/60 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-emerald-600" />
                    Period:
                  </span>
                  <span className="font-semibold text-foreground">
                    {req.rentalDays} Day(s)
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Start Date:</span>
                  <span className="font-medium text-foreground">{startDateFormatted}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Return Date:</span>
                  <span className="font-medium text-foreground">{endDateFormatted}</span>
                </div>
                <div className="flex items-center justify-between pt-1 border-t border-border/60">
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    {req.fulfillment === 'PICKUP' ? (
                      <Building2 className="h-3.5 w-3.5 text-emerald-600" />
                    ) : (
                      <Truck className="h-3.5 w-3.5 text-emerald-600" />
                    )}
                    Fulfillment:
                  </span>
                  <span className="font-semibold text-foreground">
                    {req.fulfillment === 'PICKUP' ? 'Pickup at Hub' : 'Door Delivery'}
                  </span>
                </div>
                {req.fulfillment === 'PICKUP' && req.pickupLocation && (
                  <p className="text-[11px] text-muted-foreground pt-1">
                    Pickup Hub: <strong className="text-foreground">{req.pickupLocation.name}</strong> ({req.pickupLocation.city})
                  </p>
                )}
                {req.fulfillment === 'DELIVERY' && req.deliveryAddress && (
                  <p className="text-[11px] text-muted-foreground pt-1">
                    Delivery to: <strong className="text-foreground">{req.deliveryAddress.addressLine1}, {req.deliveryAddress.city}</strong>
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Indicative Commercial Snapshot */}
          <Card className="shadow-sm border-border">
            <CardHeader className="pb-3 border-b border-border/60">
              <CardTitle className="text-sm font-bold">Commercial Quote Snapshot</CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-2.5 text-xs">
              {quote ? (
                <>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Rental Subtotal:</span>
                    <span className="font-semibold text-foreground">
                      ${quote.rentalSubtotal.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground flex items-center gap-1">
                      Refundable Deposit <Shield className="h-3 w-3 text-emerald-600" />:
                    </span>
                    <span className="font-semibold text-foreground">
                      ${quote.securityDeposit.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Delivery Fee:</span>
                    <span className="font-semibold text-foreground">
                      ${quote.deliveryFee.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Estimated Taxes:</span>
                    <span className="font-semibold text-foreground">
                      ${quote.estimatedTax.toFixed(2)}
                    </span>
                  </div>
                  <div className="pt-2 border-t border-border flex justify-between items-baseline text-sm font-bold">
                    <span>Total Estimated Payable:</span>
                    <span className="text-emerald-600 text-lg">
                      ${quote.totalPayable.toFixed(2)}
                    </span>
                  </div>
                </>
              ) : (
                <p className="text-muted-foreground">Commercial quote details unavailable.</p>
              )}

              <div className="pt-3 border-t border-border/60 text-[11px] text-muted-foreground space-y-1">
                <p className="font-medium text-foreground">Contact & Renter Details:</p>
                <p>{req.contactName} • {req.contactPhone}</p>
                <p>{req.contactEmail}</p>
                {req.customerNotes && (
                  <p className="italic pt-1 text-[11px]">"{req.customerNotes}"</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* What Happens Next Roadmap Card */}
        <Card className="shadow-sm border-border mb-8 bg-emerald-50/20 dark:bg-emerald-950/10">
          <CardHeader className="pb-3 border-b border-border/60">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-emerald-600" />
              What Happens Next? (Operational SLA)
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs">
              <div className="p-3 rounded-lg bg-emerald-100/60 dark:bg-emerald-900/40 border border-emerald-200 dark:border-emerald-800">
                <span className="font-bold text-emerald-800 dark:text-emerald-300 block mb-1">
                  1. Request Submitted
                </span>
                <p className="text-muted-foreground text-[11px]">
                  Recorded with unique ID & locked pricing snapshot.
                </p>
              </div>

              <div className="p-3 rounded-lg bg-background border border-border">
                <span className="font-bold text-foreground block mb-1">
                  2. Admin Review
                </span>
                <p className="text-muted-foreground text-[11px]">
                  Team checks equipment condition & logistics window.
                </p>
              </div>

              <div className="p-3 rounded-lg bg-background border border-border">
                <span className="font-bold text-foreground block mb-1">
                  3. Payment (Step 05)
                </span>
                <p className="text-muted-foreground text-[11px]">
                  Authorize deposit & rental payment upon approval.
                </p>
              </div>

              <div className="p-3 rounded-lg bg-background border border-border">
                <span className="font-bold text-foreground block mb-1">
                  4. Handover (Step 07)
                </span>
                <p className="text-muted-foreground text-[11px]">
                  Collect equipment with checklist verification.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <Button asChild variant="outline" className="w-full sm:w-auto">
            <Link href="/rentals">Browse More Equipment</Link>
          </Button>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            {isPending && (
              <Button
                variant="destructive"
                onClick={() => setCancelModalOpen(true)}
                className="w-full sm:w-auto text-xs"
              >
                Cancel Request
              </Button>
            )}

            <Button asChild className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white font-semibold gap-2">
              <Link href="/rentals/my-requests">
                Go to My Requests
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </main>

      {/* Cancel Request Modal */}
      <Dialog open={cancelModalOpen} onOpenChange={setCancelModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive font-bold">
              <AlertTriangle className="h-5 w-5" />
              Cancel Rental Request?
            </DialogTitle>
            <DialogDescription className="text-xs">
              Are you sure you want to cancel request <strong>{req.requestNo}</strong>? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 py-2">
            <label className="text-xs font-semibold text-foreground">
              Reason for Cancellation (Optional)
            </label>
            <Textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="e.g. Schedule changed, selected wrong equipment, etc."
              className="text-xs resize-none h-20"
            />
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setCancelModalOpen(false)}>
              Keep Request
            </Button>
            <Button
              variant="destructive"
              disabled={cancelMutation.isPending}
              onClick={() => cancelMutation.mutate(cancelReason)}
            >
              {cancelMutation.isPending ? 'Cancelling...' : 'Confirm Cancellation'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  )
}
