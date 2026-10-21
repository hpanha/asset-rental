'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  CreditCard,
  QrCode,
  Building2,
  Shield,
  Clock,
  Calendar,
  Truck,
  ArrowRight,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Lock,
  Loader2,
  Copy,
  Check,
  ArrowLeft,
  DollarSign,
  FileText,
  Banknote,
} from 'lucide-react'
import { Header } from '@/components/rental/Header'
import { Footer } from '@/components/rental/Footer'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'

export default function RentalPaymentCheckoutPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const queryClient = useQueryClient()

  const [paymentMethod, setPaymentMethod] = useState<'CARD' | 'KHQR' | 'BANK_TRANSFER' | 'CASH'>('CARD')
  const [bankRef, setBankRef] = useState('')
  const [cashNote, setCashNote] = useState('')
  const [idempotencyKey, setIdempotencyKey] = useState('')
  const [copiedBank, setCopiedBank] = useState(false)

  // Card form state
  const [cardNumber, setCardNumber] = useState('4242 •••• •••• 4242')
  const [cardExpiry, setCardExpiry] = useState('12/28')
  const [cardCvc, setCardCvc] = useState('•••')
  const [cardName, setCardName] = useState('Sophea Chan')

  useEffect(() => {
    setIdempotencyKey(`PAY-IDEM-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`)
  }, [])

  // Fetch Payment Summary
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['payment-summary', id],
    queryFn: async () => {
      const res = await fetch(`/api/me/rental-requests/${id}/payment-summary`)
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to load payment checkout summary')
      }
      return res.json()
    },
    refetchInterval: 10000,
  })

  // Payment Attempt Mutation
  const paymentMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/me/rental-requests/${id}/payment-attempts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': idempotencyKey,
        },
        body: JSON.stringify({
          method: paymentMethod,
          bank_transfer_reference: paymentMethod === 'BANK_TRANSFER' ? bankRef : undefined,
          cash_notes: paymentMethod === 'CASH' ? cashNote : undefined,
          idempotency_key: idempotencyKey,
        }),
      })

      const resData = await res.json()
      if (!res.ok) {
        throw new Error(resData.error || 'Payment failed')
      }
      return resData
    },
    onSuccess: (resData) => {
      if (resData.status === 'PAID') {
        toast.success('Payment captured! Rental confirmed.')
        router.push(`/rentals/requests/${id}/receipt`)
      } else if (resData.payment_method === 'CASH' || paymentMethod === 'CASH') {
        toast.success('Cash payment registered! Your equipment hold is preserved.')
        router.push('/rentals/my-requests')
      } else {
        toast.success('Bank transfer proof submitted for review.')
        router.push('/rentals/my-requests')
      }
    },
    onError: (err: any) => {
      toast.error(err.message || 'Payment execution failed')
    },
  })

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <div className="flex-1 flex flex-col items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-600 mb-2" />
          <p className="text-xs text-muted-foreground">Loading payment checkout...</p>
        </div>
        <Footer />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <main className="flex-1 max-w-lg mx-auto w-full px-4 py-16 text-center">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-3" />
          <h2 className="text-xl font-bold mb-1">Cannot Initialize Checkout</h2>
          <p className="text-sm text-muted-foreground mb-6">
            {error ? (error as any).message : 'Unable to load payment details.'}
          </p>
          <Button asChild className="bg-emerald-600 hover:bg-emerald-700">
            <Link href="/rentals/my-requests">Return to My Requests</Link>
          </Button>
        </main>
        <Footer />
      </div>
    )
  }

  // If already paid, redirect to receipt
  if (data.status === 'PAYMENT_CONFIRMED') {
    router.push(`/rentals/requests/${id}/receipt`)
    return null
  }

  const isHoldExpired = data.is_hold_expired || !data.is_payable
  const remainingMinutes = Math.floor(data.remaining_seconds / 60)
  const remainingSecs = data.remaining_seconds % 60
  const breakdown = data.commercial_breakdown
  const asset = data.asset

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-background flex flex-col">
      <Header />

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-8">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-6">
          <Link href="/rentals/my-requests" className="hover:text-foreground flex items-center gap-1">
            <ArrowLeft className="h-3 w-3" />
            My Requests
          </Link>
          <span>/</span>
          <span className="font-mono font-semibold text-foreground">{data.request_no}</span>
          <span>/</span>
          <span className="text-emerald-600 font-semibold">Payment & Deposit (Step 05)</span>
        </div>

        {/* Hold Expiration / Deadline Timer Banner */}
        {isHoldExpired ? (
          <div className="mb-6 p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-sm">Inventory Hold Window Elapsed</p>
              <p className="mt-0.5">
                The payment deadline for this approval has passed. The temporary equipment hold was released back to the general inventory pool. Please submit a new request or contact support to request reapproval.
              </p>
              <Button asChild size="sm" variant="outline" className="mt-3 text-xs">
                <Link href="/rentals/my-requests">Back to My Requests</Link>
              </Button>
            </div>
          </div>
        ) : (
          <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-900 dark:text-emerald-200 text-xs flex items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <Clock className="h-5 w-5 text-emerald-600 shrink-0" />
              <div>
                <p className="font-bold text-sm">Inventory Hold Active</p>
                <p className="text-[11px] text-muted-foreground">
                  Equipment units are held exclusively for your booking until the payment window expires.
                </p>
              </div>
            </div>
            <div className="text-right shrink-0">
              <span className="text-[10px] text-muted-foreground uppercase font-semibold block">Time Remaining:</span>
              <span className="font-mono text-base font-black text-emerald-600">
                {remainingMinutes}:{remainingSecs.toString().padStart(2, '0')}
              </span>
            </div>
          </div>
        )}

        {/* 2-Column Checkout Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column (7 cols): Payment Breakdown & Methods */}
          <div className="lg:col-span-7 space-y-6">
            {/* 1. Itemized Financial Breakdown */}
            <Card className="shadow-sm border-border">
              <CardHeader className="pb-3 border-b border-border/60">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-emerald-600" />
                  Itemized Charges & Security Deposit
                </CardTitle>
                <CardDescription className="text-xs">
                  Separating rental service fee from refundable liability deposit.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4 space-y-3 text-xs">
                {/* Section A: Rental Charges */}
                <div className="space-y-2">
                  <span className="font-bold text-foreground text-xs block">
                    1. Rental & Fulfillment Fees
                  </span>
                  <div className="flex justify-between text-muted-foreground pl-2">
                    <span>
                      Equipment Usage (${breakdown.unit_rate}/day × {asset.rental_days}d × {asset.quantity} unit):
                    </span>
                    <span className="font-semibold text-foreground">
                      ${breakdown.rental_charges.rental_subtotal.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between text-muted-foreground pl-2">
                    <span>Fulfillment Delivery Fee:</span>
                    <span className="font-semibold text-foreground">
                      {breakdown.rental_charges.delivery_fee > 0
                        ? `$${breakdown.rental_charges.delivery_fee.toFixed(2)}`
                        : 'Free (Pickup Hub)'}
                    </span>
                  </div>
                  <div className="flex justify-between text-muted-foreground pl-2">
                    <span>Estimated Regional Taxes:</span>
                    <span className="font-semibold text-foreground">$0.00</span>
                  </div>
                  <div className="flex justify-between font-medium text-foreground pt-1 border-t border-border/40 pl-2">
                    <span>Subtotal Rental Charges:</span>
                    <span>${breakdown.rental_charges.subtotal_due.toFixed(2)}</span>
                  </div>
                </div>

                {/* Section B: Refundable Security Deposit */}
                <div className="pt-2 border-t border-border/60 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-foreground text-xs flex items-center gap-1.5">
                      2. Refundable Security Deposit
                      <Shield className="h-3.5 w-3.5 text-emerald-600" />
                    </span>
                    <span className="font-bold text-foreground">
                      ${breakdown.refundable_deposit.amount.toFixed(2)}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground bg-muted/40 p-2.5 rounded-lg border border-border/60">
                    {breakdown.refundable_deposit.terms_note}
                  </p>
                </div>

                {/* Total */}
                <div className="pt-3 border-t border-border flex items-baseline justify-between">
                  <div>
                    <span className="text-sm font-extrabold text-foreground">Total Due Now:</span>
                    <p className="text-[11px] text-muted-foreground">Currency: {breakdown.currency} (Fixed)</p>
                  </div>
                  <span className="text-2xl font-black text-emerald-600">
                    ${breakdown.total_due.toFixed(2)}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* 2. Payment Method Selector */}
            <Card className="shadow-sm border-border">
              <CardHeader className="pb-3 border-b border-border/60">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-emerald-600" />
                  Select Payment Method
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                <RadioGroup
                  value={paymentMethod}
                  onValueChange={(val: any) => setPaymentMethod(val)}
                  className="space-y-3"
                >
                  {/* Card Option */}
                  <div
                    onClick={() => setPaymentMethod('CARD')}
                    className={`p-3.5 rounded-xl border cursor-pointer transition flex items-start gap-3 ${
                      paymentMethod === 'CARD'
                        ? 'border-emerald-600 bg-emerald-50/20 dark:bg-emerald-950/20'
                        : 'border-border hover:bg-muted/30'
                    }`}
                  >
                    <RadioGroupItem value="CARD" id="pay-card" className="mt-0.5 text-emerald-600" />
                    <div className="flex-1 text-xs">
                      <Label htmlFor="pay-card" className="font-bold text-foreground cursor-pointer flex items-center justify-between">
                        <span>Credit / Debit Card (Instant)</span>
                        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                          <span className="bg-muted px-1.5 py-0.5 rounded font-mono">VISA</span>
                          <span className="bg-muted px-1.5 py-0.5 rounded font-mono">MC</span>
                        </div>
                      </Label>
                      <p className="text-muted-foreground mt-0.5">
                        Instant capture & automated digital receipt generation.
                      </p>

                      {paymentMethod === 'CARD' && (
                        <div className="mt-3 pt-3 border-t border-border space-y-3">
                          <div>
                            <label className="text-[11px] font-semibold text-foreground block mb-1">
                              Cardholder Name
                            </label>
                            <Input
                              value={cardName}
                              onChange={(e) => setCardName(e.target.value)}
                              className="text-xs h-8"
                            />
                          </div>
                          <div>
                            <label className="text-[11px] font-semibold text-foreground block mb-1">
                              Card Number
                            </label>
                            <Input
                              value={cardNumber}
                              onChange={(e) => setCardNumber(e.target.value)}
                              className="text-xs h-8 font-mono"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-[11px] font-semibold text-foreground block mb-1">
                                Expiration
                              </label>
                              <Input
                                value={cardExpiry}
                                onChange={(e) => setCardExpiry(e.target.value)}
                                className="text-xs h-8 font-mono"
                              />
                            </div>
                            <div>
                              <label className="text-[11px] font-semibold text-foreground block mb-1">
                                CVC / CVV
                              </label>
                              <Input
                                value={cardCvc}
                                onChange={(e) => setCardCvc(e.target.value)}
                                className="text-xs h-8 font-mono"
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* KHQR Option */}
                  <div
                    onClick={() => setPaymentMethod('KHQR')}
                    className={`p-3.5 rounded-xl border cursor-pointer transition flex items-start gap-3 ${
                      paymentMethod === 'KHQR'
                        ? 'border-emerald-600 bg-emerald-50/20 dark:bg-emerald-950/20'
                        : 'border-border hover:bg-muted/30'
                    }`}
                  >
                    <RadioGroupItem value="KHQR" id="pay-khqr" className="mt-0.5 text-emerald-600" />
                    <div className="flex-1 text-xs">
                      <Label htmlFor="pay-khqr" className="font-bold text-foreground cursor-pointer flex items-center justify-between">
                        <span>Bakong KHQR / ABA PAY</span>
                        <Badge variant="outline" className="text-[9px] bg-red-50 text-red-700 border-red-200">
                          KHQR
                        </Badge>
                      </Label>
                      <p className="text-muted-foreground mt-0.5">
                        Scan QR code with ABA Mobile, Bakong, or any Cambodian banking app.
                      </p>

                      {paymentMethod === 'KHQR' && (
                        <div className="mt-3 pt-3 border-t border-border flex flex-col items-center p-3 bg-white dark:bg-slate-900 rounded-lg">
                          <div className="w-36 h-36 bg-slate-100 dark:bg-slate-800 rounded-lg border flex items-center justify-center p-2 mb-2">
                            <QrCode className="w-28 h-28 text-slate-800 dark:text-slate-200" />
                          </div>
                          <span className="font-mono font-bold text-xs text-foreground">
                            Scan to Pay ${breakdown.total_due.toFixed(2)}
                          </span>
                          <span className="text-[10px] text-muted-foreground mt-0.5">
                            Merchant: RentHub Enterprise Co., Ltd.
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Bank Wire Option */}
                  <div
                    onClick={() => setPaymentMethod('BANK_TRANSFER')}
                    className={`p-3.5 rounded-xl border cursor-pointer transition flex items-start gap-3 ${
                      paymentMethod === 'BANK_TRANSFER'
                        ? 'border-emerald-600 bg-emerald-50/20 dark:bg-emerald-950/20'
                        : 'border-border hover:bg-muted/30'
                    }`}
                  >
                    <RadioGroupItem value="BANK_TRANSFER" id="pay-bank" className="mt-0.5 text-emerald-600" />
                    <div className="flex-1 text-xs">
                      <Label htmlFor="pay-bank" className="font-bold text-foreground cursor-pointer">
                        Direct Bank Wire Transfer (Manual Verification)
                      </Label>
                      <p className="text-muted-foreground mt-0.5">
                        Transfer to our corporate account and provide the reference number.
                      </p>

                      {paymentMethod === 'BANK_TRANSFER' && (
                        <div className="mt-3 pt-3 border-t border-border space-y-3">
                          <div className="p-2.5 rounded bg-muted/50 border text-[11px] space-y-1">
                            <p className="font-semibold text-foreground">ABA Bank (USD):</p>
                            <div className="flex items-center justify-between font-mono">
                              <span>001 888 999 001 (RentHub Ltd)</span>
                              <button
                                type="button"
                                onClick={() => {
                                  navigator.clipboard.writeText('001888999001')
                                  setCopiedBank(true)
                                  setTimeout(() => setCopiedBank(false), 2000)
                                }}
                                className="text-emerald-600 hover:underline flex items-center gap-1"
                              >
                                {copiedBank ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                                Copy
                              </button>
                            </div>
                          </div>

                          <div>
                            <label className="text-[11px] font-semibold text-foreground block mb-1">
                              Bank Transaction / Reference ID <span className="text-destructive">*</span>
                            </label>
                            <Input
                              required
                              value={bankRef}
                              onChange={(e) => setBankRef(e.target.value)}
                              placeholder="e.g. ABA-TXN-12345678"
                              className="text-xs h-8 font-mono"
                            />
                            <p className="text-[10px] text-muted-foreground mt-1">
                              Our finance team reconciles the bank feed and verifies within 15 minutes.
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Cash on Pickup Option */}
                  <div
                    onClick={() => setPaymentMethod('CASH')}
                    className={`p-3.5 rounded-xl border cursor-pointer transition flex items-start gap-3 ${
                      paymentMethod === 'CASH'
                        ? 'border-emerald-600 bg-emerald-50/20 dark:bg-emerald-950/20'
                        : 'border-border hover:bg-muted/30'
                    }`}
                  >
                    <RadioGroupItem value="CASH" id="pay-cash" className="mt-0.5 text-emerald-600" />
                    <div className="flex-1 text-xs">
                      <Label htmlFor="pay-cash" className="font-bold text-foreground cursor-pointer flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <Banknote className="h-4 w-4 text-emerald-600" />
                          Pay by Cash (At Counter / On Pickup)
                        </span>
                        <Badge variant="outline" className="text-[9px] bg-emerald-50 text-emerald-700 border-emerald-200">
                          Cash at Counter
                        </Badge>
                      </Label>
                      <p className="text-muted-foreground mt-0.5">
                        Pay in cash upon equipment pickup at the logistics warehouse or service desk.
                      </p>

                      {paymentMethod === 'CASH' && (
                        <div className="mt-3 pt-3 border-t border-border space-y-3">
                          <div className="p-2.5 rounded bg-emerald-50/60 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-[11px] space-y-1.5">
                            <div className="flex justify-between items-center text-foreground font-semibold">
                              <span>Rental Charges & Fees:</span>
                              <span>${breakdown.rental_charges.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between items-center text-emerald-700 dark:text-emerald-300 font-semibold">
                              <span>Refundable Security Deposit (Cash Escrow):</span>
                              <span>${breakdown.security_deposit.toFixed(2)}</span>
                            </div>
                            <div className="border-t border-emerald-200 dark:border-emerald-800 pt-1 flex justify-between items-center font-bold text-xs text-foreground">
                              <span>Total Cash to Prepare:</span>
                              <span className="text-emerald-600 text-sm font-extrabold">${breakdown.total_due.toFixed(2)} USD</span>
                            </div>
                            <p className="text-[10px] text-muted-foreground pt-1 border-t border-dashed border-emerald-200 dark:border-emerald-800">
                              * A physical official receipt and deposit voucher will be signed and provided by the counter staff when cash is received.
                            </p>
                          </div>

                          <div>
                            <label className="text-[11px] font-semibold text-foreground block mb-1">
                              Pickup / Cash Notes (Optional)
                            </label>
                            <Input
                              value={cashNote}
                              onChange={(e) => setCashNote(e.target.value)}
                              placeholder="e.g. Will bring exact cash to Central Logistics Hub at 10:00 AM"
                              className="text-xs h-8"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </RadioGroup>

                {/* Submit Action */}
                <Button
                  onClick={() => paymentMutation.mutate()}
                  disabled={
                    isHoldExpired ||
                    paymentMutation.isPending ||
                    (paymentMethod === 'BANK_TRANSFER' && !bankRef.trim())
                  }
                  className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-base shadow-sm gap-2 transition-all mt-4"
                >
                  {paymentMutation.isPending ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Processing Request...
                    </>
                  ) : paymentMethod === 'CASH' ? (
                    <>
                      <Banknote className="h-4 w-4" />
                      Confirm Cash on Pickup (${breakdown.total_due.toFixed(2)})
                    </>
                  ) : (
                    <>
                      <Lock className="h-4 w-4" />
                      Authorize & Pay ${breakdown.total_due.toFixed(2)}
                    </>
                  )}
                </Button>

                <p className="text-center text-[11px] text-muted-foreground flex items-center justify-center gap-1">
                  <Shield className="h-3.5 w-3.5 text-emerald-600" />
                  Encrypted 256-bit TLS connection. Idempotent payment tokenization.
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Right Column (5 cols): Equipment Summary & Terms */}
          <div className="lg:col-span-5 space-y-6">
            {/* Asset Summary */}
            <Card className="shadow-sm border-border">
              <CardHeader className="pb-3 border-b border-border/60">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <FileText className="h-4 w-4 text-emerald-600" />
                  Equipment Reservation Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-3 text-xs">
                <div className="flex items-center gap-3">
                  <div className="h-16 w-16 rounded-xl overflow-hidden bg-muted border shrink-0">
                    <img
                      src={asset.cover_image || 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=300&q=80'}
                      alt={asset.name}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="font-bold text-sm text-foreground truncate">{asset.name}</h4>
                    <p className="text-muted-foreground font-mono text-[11px] mt-0.5">{asset.code}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Quantity: <strong className="text-foreground">{asset.quantity} unit(s)</strong>
                    </p>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-muted/40 border border-border/60 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5 text-emerald-600" />
                      Rental Duration:
                    </span>
                    <span className="font-semibold text-foreground">{asset.rental_days} Day(s)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground flex items-center gap-1">
                      {asset.fulfillment === 'PICKUP' ? (
                        <Building2 className="h-3.5 w-3.5 text-emerald-600" />
                      ) : (
                        <Truck className="h-3.5 w-3.5 text-emerald-600" />
                      )}
                      Fulfillment:
                    </span>
                    <span className="font-semibold text-foreground">
                      {asset.fulfillment} ({asset.location_city})
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Deposit Terms & Liability Policy */}
            <Card className="shadow-xs border-emerald-500/20 bg-emerald-50/20 dark:bg-emerald-950/10">
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-xs font-bold text-emerald-900 dark:text-emerald-300 flex items-center gap-1.5">
                  <Shield className="h-4 w-4 text-emerald-600" />
                  Refundable Deposit Liability Rules
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-1 space-y-2 text-xs text-muted-foreground leading-relaxed">
                <p>
                  • The security deposit is held in a dedicated customer escrow ledger and does not form part of RentHub operational revenue.
                </p>
                <p>
                  • Upon physical return inspection in Step 10, the full deposit balance is promptly refunded minus any documented physical damages or late turnaround fees.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
