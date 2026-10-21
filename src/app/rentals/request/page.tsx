'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import {
  ArrowLeft,
  Calendar,
  Clock,
  Shield,
  Truck,
  Building2,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Info,
  DollarSign,
  Send,
  Loader2,
  FileText,
  User,
  Phone,
  Mail,
  MapPin,
  ExternalLink,
} from 'lucide-react'
import { Header } from '@/components/rental/Header'
import { Footer } from '@/components/rental/Footer'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useRentalSelectionStore } from '@/lib/rental-selection'
import { toast } from 'sonner'

export default function RentalRequestPage() {
  const router = useRouter()
  const { selection, clearSelection } = useRentalSelectionStore()
  const [mounted, setMounted] = useState(false)

  // Fetch logged in user details for prefilling
  const { data: meData, isLoading: isLoadingMe } = useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      const res = await fetch('/api/me')
      if (!res.ok) return null
      return res.json()
    },
  })

  // Form State
  const [contactName, setContactName] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [organizationName, setOrganizationName] = useState('')
  const [customerNotes, setCustomerNotes] = useState('')

  // Delivery details
  const [recipientName, setRecipientName] = useState('')
  const [recipientPhone, setRecipientPhone] = useState('')
  const [deliveryAddress1, setDeliveryAddress1] = useState('')
  const [deliveryAddress2, setDeliveryAddress2] = useState('')
  const [deliveryCity, setDeliveryCity] = useState('Phnom Penh')
  const [deliveryNotes, setDeliveryNotes] = useState('')

  // Terms modal & agreement
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [termsModalOpen, setTermsModalOpen] = useState(false)

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  // Idempotency key (stable per page load)
  const [idempotencyKey, setIdempotencyKey] = useState('')

  useEffect(() => {
    setMounted(true)
    setIdempotencyKey(`IDEM-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`)
  }, [])

  // Guard: if not authenticated, redirect to customer login
  useEffect(() => {
    if (mounted && !isLoadingMe && !meData?.user) {
      toast.info('Please sign in to complete your rental request.')
      router.push('/login?from=/rentals/request')
    }
  }, [mounted, isLoadingMe, meData, router])

  useEffect(() => {
    if (meData?.user) {
      if (!contactName && meData.user.name) setContactName(meData.user.name)
      if (!contactEmail && meData.user.email) setContactEmail(meData.user.email)
      if (!recipientName && meData.user.name) setRecipientName(meData.user.name)
    }
  }, [meData])


  if (!mounted) {
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

  // If no selection in store, show empty state prompt
  if (!selection) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 py-12 flex flex-col items-center justify-center">
          <Card className="max-w-lg w-full text-center p-8 border-dashed shadow-sm">
            <div className="w-16 h-16 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center mx-auto mb-4">
              <FileText className="w-8 h-8" />
            </div>
            <CardTitle className="text-xl font-bold mb-2">No Rental Selection Found</CardTitle>
            <CardDescription className="text-muted-foreground mb-6">
              You haven't selected an asset and rental period yet. Please browse our equipment catalog to configure your rental dates and quantity.
            </CardDescription>
            <div className="flex justify-center gap-3">
              <Button asChild className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold">
                <Link href="/rentals">Browse Available Equipment</Link>
              </Button>
            </div>
          </Card>
        </main>
        <Footer />
      </div>
    )
  }

  const startDateFormatted = new Date(selection.startAt).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
  const endDateFormatted = new Date(selection.endAt).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitError(null)

    if (!termsAccepted) {
      setSubmitError('Please accept the Terms of Service & Rental Agreement to submit your request.')
      toast.error('Terms acceptance is required')
      return
    }

    if (!contactName.trim() || !contactPhone.trim() || !contactEmail.trim()) {
      setSubmitError('Contact Name, Phone Number, and Email Address are mandatory.')
      toast.error('Missing required contact information')
      return
    }

    if (selection.fulfillment === 'DELIVERY') {
      if (!deliveryAddress1.trim() || !deliveryCity.trim()) {
        setSubmitError('Street Address and City are required for equipment delivery.')
        toast.error('Missing delivery address details')
        return
      }
    }

    setIsSubmitting(true)

    try {
      const payload = {
        listing_id: selection.listingId,
        start_at: selection.startAt,
        end_at: selection.endAt,
        quantity: selection.quantity,
        fulfillment: selection.fulfillment,
        pickup_location_id: selection.locationId || null,
        contact_name: contactName.trim(),
        contact_phone: contactPhone.trim(),
        contact_email: contactEmail.trim(),
        organization_name: organizationName ? organizationName.trim() : null,
        customer_notes: customerNotes ? customerNotes.trim() : null,
        quote_token: selection.quoteToken,
        terms_accepted: true,
        terms_version_id: 'rental-terms-2026.1',
        idempotency_key: idempotencyKey,
        delivery_address:
          selection.fulfillment === 'DELIVERY'
            ? {
                recipient_name: (recipientName || contactName).trim(),
                recipient_phone: (recipientPhone || contactPhone).trim(),
                address_line1: deliveryAddress1.trim(),
                address_line2: deliveryAddress2.trim() || null,
                city: deliveryCity.trim(),
                delivery_notes: deliveryNotes.trim() || null,
              }
            : null,
      }

      const res = await fetch('/api/me/rental-requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': idempotencyKey,
        },
        body: JSON.stringify(payload),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit rental request')
      }

      toast.success('Rental request submitted successfully!')
      clearSelection()
      router.push(`/rentals/requests/${data.request_id || data.request?.id}/success`)
    } catch (err: any) {
      console.error('Submission error:', err)
      setSubmitError(err.message || 'An error occurred during submission. Please try again.')
      toast.error(err.message || 'Submission failed')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-background flex flex-col">
      <Header />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-8">
        {/* Breadcrumb Navigation */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
          <Link href="/" className="hover:text-foreground transition">Home</Link>
          <span>/</span>
          <Link href="/rentals" className="hover:text-foreground transition">Rentals</Link>
          <span>/</span>
          <Link href={`/rentals/${selection.slug}`} className="hover:text-foreground transition truncate max-w-[200px]">
            {selection.name}
          </Link>
          <span>/</span>
          <span className="text-foreground font-semibold">Rental Request (Step 03)</span>
        </div>

        {/* Page Title & Context Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-3">
              Submit Rental Request
              <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400">
                Pending Approval
              </Badge>
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Provide your contact and fulfillment details. Equipment is held and confirmed only after admin approval.
            </p>
          </div>

          <Button variant="outline" asChild size="sm" className="gap-2 shrink-0">
            <Link href={`/rentals/${selection.slug}`}>
              <ArrowLeft className="h-4 w-4" />
              Modify Dates & Qty
            </Link>
          </Button>
        </div>

        {submitError && (
          <div className="mb-6 p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-start gap-3">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold">Submission Blocked</p>
              <p>{submitError}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left Column: Form Details (7 cols) */}
            <div className="lg:col-span-7 space-y-6">
              {/* 1. Asset & Schedule Summary */}
              <Card className="shadow-sm border-border">
                <CardHeader className="pb-3 border-b border-border/60">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base font-bold flex items-center gap-2">
                      <FileText className="h-4 w-4 text-emerald-600" />
                      1. Asset & Period Summary
                    </CardTitle>
                    <Link
                      href={`/rentals/${selection.slug}`}
                      className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 hover:underline flex items-center gap-1"
                    >
                      Edit Selection
                      <ExternalLink className="h-3 w-3" />
                    </Link>
                  </div>
                </CardHeader>
                <CardContent className="pt-4 space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="h-20 w-20 rounded-xl overflow-hidden bg-muted border shrink-0">
                      <img
                        src={selection.coverImage || 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=300&q=80'}
                        alt={selection.name}
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <Badge variant="secondary" className="text-[10px] font-semibold mb-1">
                        {selection.categoryName}
                      </Badge>
                      <h3 className="font-bold text-base truncate">{selection.name}</h3>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground mt-1">
                        <span>Quantity: <strong className="text-foreground">{selection.quantity} unit(s)</strong></span>
                        <span>•</span>
                        <span>Rate: <strong className="text-emerald-600 font-semibold">${selection.dailyRate}/day</strong></span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-border/60 bg-muted/30 p-3 rounded-lg text-xs">
                    <div className="flex items-start gap-2">
                      <Calendar className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="text-muted-foreground">Rental Duration:</span>
                        <p className="font-semibold text-foreground">
                          {selection.rentalDays} Day(s) ({startDateFormatted} → {endDateFormatted})
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <Clock className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="text-muted-foreground">Operating Timezone:</span>
                        <p className="font-semibold text-foreground">Asia/Phnom_Penh (GMT+7)</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 2. Fulfillment Details */}
              <Card className="shadow-sm border-border">
                <CardHeader className="pb-3 border-b border-border/60">
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    {selection.fulfillment === 'PICKUP' ? (
                      <Building2 className="h-4 w-4 text-emerald-600" />
                    ) : (
                      <Truck className="h-4 w-4 text-emerald-600" />
                    )}
                    2. Fulfillment Method ({selection.fulfillment})
                  </CardTitle>
                  <CardDescription>
                    {selection.fulfillment === 'PICKUP'
                      ? 'You will collect and return the equipment at our authorized branch hub.'
                      : 'Equipment will be delivered directly to your specified address.'}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-4 space-y-4">
                  {selection.fulfillment === 'PICKUP' ? (
                    <div className="p-4 rounded-xl bg-muted/40 border border-border flex items-start gap-3">
                      <MapPin className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                      <div>
                        <h4 className="text-sm font-semibold text-foreground">
                          {selection.locationName || 'Phnom Penh Logistics Hub'}
                        </h4>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Building 42, Norodom Blvd, Daun Penh, Phnom Penh
                        </p>
                        <p className="text-xs text-emerald-600 font-medium mt-1">
                          Collection Hours: Mon–Sun, 8:00 AM – 6:00 PM
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="text-xs font-semibold text-foreground mb-1 block">
                            Recipient Name <span className="text-destructive">*</span>
                          </label>
                          <Input
                            required
                            value={recipientName}
                            onChange={(e) => setRecipientName(e.target.value)}
                            placeholder="Full name of receiver"
                            className="text-sm"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-foreground mb-1 block">
                            Recipient Phone <span className="text-destructive">*</span>
                          </label>
                          <Input
                            required
                            value={recipientPhone}
                            onChange={(e) => setRecipientPhone(e.target.value)}
                            placeholder="+855 12 345 678"
                            className="text-sm"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-xs font-semibold text-foreground mb-1 block">
                          Street Address <span className="text-destructive">*</span>
                        </label>
                        <Input
                          required
                          value={deliveryAddress1}
                          onChange={(e) => setDeliveryAddress1(e.target.value)}
                          placeholder="e.g. #14, Street 240, Sangkat Chaktomuk"
                          className="text-sm"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="text-xs font-semibold text-foreground mb-1 block">
                            Apartment / Floor / Unit (Optional)
                          </label>
                          <Input
                            value={deliveryAddress2}
                            onChange={(e) => setDeliveryAddress2(e.target.value)}
                            placeholder="Floor 3, Room 302"
                            className="text-sm"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-foreground mb-1 block">
                            City / Province <span className="text-destructive">*</span>
                          </label>
                          <Input
                            required
                            value={deliveryCity}
                            onChange={(e) => setDeliveryCity(e.target.value)}
                            placeholder="Phnom Penh"
                            className="text-sm"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-xs font-semibold text-foreground mb-1 block">
                          Delivery Instructions / Landmarks (Optional)
                        </label>
                        <Input
                          value={deliveryNotes}
                          onChange={(e) => setDeliveryNotes(e.target.value)}
                          placeholder="e.g. Ring the bell at the green gate, near Wat Botum"
                          className="text-sm"
                        />
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* 3. Renter Contact Information */}
              <Card className="shadow-sm border-border">
                <CardHeader className="pb-3 border-b border-border/60">
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <User className="h-4 w-4 text-emerald-600" />
                    3. Renter Contact Details
                  </CardTitle>
                  <CardDescription>
                    Official contact information for agreement validation, SMS notifications, and return coordination.
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-4 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-semibold text-foreground mb-1 block">
                        Contact Person Name <span className="text-destructive">*</span>
                      </label>
                      <div className="relative">
                        <User className="w-4 h-4 text-muted-foreground absolute left-3 top-2.5" />
                        <Input
                          required
                          value={contactName}
                          onChange={(e) => setContactName(e.target.value)}
                          placeholder="e.g. Sophea Chan"
                          className="pl-9 text-sm"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-foreground mb-1 block">
                        Contact Phone Number <span className="text-destructive">*</span>
                      </label>
                      <div className="relative">
                        <Phone className="w-4 h-4 text-muted-foreground absolute left-3 top-2.5" />
                        <Input
                          required
                          value={contactPhone}
                          onChange={(e) => setContactPhone(e.target.value)}
                          placeholder="+855 12 345 678"
                          className="pl-9 text-sm"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-semibold text-foreground mb-1 block">
                        Email Address <span className="text-destructive">*</span>
                      </label>
                      <div className="relative">
                        <Mail className="w-4 h-4 text-muted-foreground absolute left-3 top-2.5" />
                        <Input
                          required
                          type="email"
                          value={contactEmail}
                          onChange={(e) => setContactEmail(e.target.value)}
                          placeholder="sophea@example.com"
                          className="pl-9 text-sm"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-foreground mb-1 block">
                        Organization / Production Name (Optional)
                      </label>
                      <div className="relative">
                        <Building2 className="w-4 h-4 text-muted-foreground absolute left-3 top-2.5" />
                        <Input
                          value={organizationName}
                          onChange={(e) => setOrganizationName(e.target.value)}
                          placeholder="e.g. Media Studio Co."
                          className="pl-9 text-sm"
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 4. Purpose & Special Instructions */}
              <Card className="shadow-sm border-border">
                <CardHeader className="pb-3 border-b border-border/60">
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <Info className="h-4 w-4 text-emerald-600" />
                    4. Rental Purpose & Special Instructions (Optional)
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4 space-y-2">
                  <Textarea
                    value={customerNotes}
                    onChange={(e) => setCustomerNotes(e.target.value.slice(0, 500))}
                    placeholder="Tell us about your project, equipment usage context, or any special accessory requests (e.g. specific cable adapters, battery chargers)..."
                    className="min-h-[90px] text-sm resize-none"
                  />
                  <div className="flex justify-between text-[11px] text-muted-foreground">
                    <span>Helps our team prepare and inspect equipment accessories.</span>
                    <span>{customerNotes.length}/500</span>
                  </div>
                </CardContent>
              </Card>

              {/* 5. Agreements & Terms */}
              <Card className="shadow-sm border-emerald-500/30 bg-emerald-50/20 dark:bg-emerald-950/10">
                <CardContent className="p-5">
                  <div className="flex items-start gap-3">
                    <Checkbox
                      id="terms"
                      checked={termsAccepted}
                      onCheckedChange={(checked) => setTermsAccepted(checked === true)}
                      className="mt-1 data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600"
                    />
                    <div className="text-xs text-muted-foreground leading-relaxed">
                      <label htmlFor="terms" className="font-medium text-foreground cursor-pointer select-none">
                        I acknowledge and agree to the{' '}
                        <button
                          type="button"
                          onClick={() => setTermsModalOpen(true)}
                          className="text-emerald-600 underline font-semibold hover:text-emerald-700 inline"
                        >
                          Rental Terms & Conditions
                        </button>{' '}
                        and Cancellation Policy.
                      </label>
                      <p className="mt-1">
                        I understand this submission creates a <strong>Pending Approval</strong> request. Equipment is not reserved and payment is not collected until approved by admin review.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right Column: Indicative Commercial Quote & Actions (5 cols) */}
            <div className="lg:col-span-5 space-y-6 lg:sticky lg:top-24">
              <Card className="shadow-md border-emerald-200 dark:border-emerald-800/50">
                <CardHeader className="pb-3 border-b border-border bg-emerald-50/40 dark:bg-emerald-950/20 rounded-t-xl">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base font-bold flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-emerald-600" />
                      Indicative Quote Summary
                    </CardTitle>
                    <Badge variant="secondary" className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300 text-[10px]">
                      Estimate
                    </Badge>
                  </div>
                  <CardDescription className="text-xs">
                    Server verified rate snapshot for {selection.rentalDays} day(s) × {selection.quantity} unit(s).
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-4 space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      Equipment Rental (${selection.dailyRate} × {selection.rentalDays}d × {selection.quantity}):
                    </span>
                    <span className="font-semibold text-foreground">
                      ${selection.breakdown.rentalSubtotal.toFixed(2)}
                    </span>
                  </div>

                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground flex items-center gap-1">
                      Refundable Security Deposit
                      <Shield className="h-3.5 w-3.5 text-emerald-600" />:
                    </span>
                    <span className="font-semibold text-foreground">
                      ${selection.breakdown.securityDeposit.toFixed(2)}
                    </span>
                  </div>

                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Delivery Fee:</span>
                    <span className="font-semibold text-foreground">
                      {selection.breakdown.deliveryFee > 0
                        ? `$${selection.breakdown.deliveryFee.toFixed(2)}`
                        : 'Free (Pickup)'}
                    </span>
                  </div>

                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Estimated Taxes & Processing:</span>
                    <span className="font-semibold text-foreground">$0.00</span>
                  </div>

                  <div className="pt-3 border-t border-border flex items-baseline justify-between">
                    <div>
                      <span className="text-sm font-bold text-foreground">Total Estimated Payable:</span>
                      <p className="text-[11px] text-muted-foreground">Payable upon admin approval</p>
                    </div>
                    <span className="text-2xl font-black text-emerald-600">
                      ${selection.breakdown.totalPayable.toFixed(2)}
                    </span>
                  </div>

                  {/* Contingent late fee notice */}
                  <div className="p-3 rounded-lg bg-muted/50 border border-border/80 text-[11px] text-muted-foreground space-y-1">
                    <p className="font-semibold text-foreground flex items-center gap-1.5">
                      <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                      Late Return Policy Notice:
                    </p>
                    <p>
                      Returns have a 30-minute grace window. Late returns beyond grace are assessed at $25.00/day.
                    </p>
                  </div>

                  {/* Submit Button */}
                  <Button
                    type="submit"
                    disabled={isSubmitting || !termsAccepted}
                    className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-base shadow-sm gap-2 transition-all mt-4"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        Submitting Request...
                      </>
                    ) : (
                      <>
                        <Send className="h-5 w-5" />
                        Submit Rental Request
                      </>
                    )}
                  </Button>

                  <p className="text-center text-[11px] text-muted-foreground mt-2">
                    🔒 Protected by idempotency key & server stock validation.
                  </p>
                </CardContent>
              </Card>

              {/* Step Roadmap */}
              <Card className="shadow-xs border-border bg-muted/20">
                <CardHeader className="p-4 pb-2">
                  <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    Next Lifecycle Steps
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-1 space-y-2 text-xs">
                  <div className="flex items-center gap-2 text-emerald-600 font-semibold">
                    <div className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center text-[10px]">
                      03
                    </div>
                    <span>Submit Request (Current Step)</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-[10px]">
                      04
                    </div>
                    <span>Admin Review & Approval SLA (2-4 hrs)</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-[10px]">
                      05
                    </div>
                    <span>Payment & Deposit Settlement</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-[10px]">
                      06
                    </div>
                    <span>Asset Unit Reservation & Handover</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </form>
      </main>

      {/* Terms of Service Dialog */}
      <Dialog open={termsModalOpen} onOpenChange={setTermsModalOpen}>
        <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-bold">
              <Shield className="h-5 w-5 text-emerald-600" />
              Asset Rental Agreement & Terms
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Version: rental-terms-2026.1 • Effective Date: January 1, 2026
            </DialogDescription>
          </DialogHeader>

          <div className="text-xs text-muted-foreground space-y-4 pt-2 leading-relaxed">
            <div>
              <h4 className="font-semibold text-foreground mb-1">1. Indicative Nature of Request</h4>
              <p>
                Submitting a rental request does not constitute a confirmed equipment booking. The request enters "PENDING_APPROVAL" status, during which our operations team verifies asset condition, scheduling buffers, and customer eligibility.
              </p>
            </div>

            <div>
              <h4 className="font-semibold text-foreground mb-1">2. Security Deposit & Damage Liability</h4>
              <p>
                A refundable security deposit is authorized upon approval in Step 05. The deposit is refunded in full upon return inspection in Step 10, minus any assessments for physical damage, missing components, or abnormal wear beyond fair use.
              </p>
            </div>

            <div>
              <h4 className="font-semibold text-foreground mb-1">3. Handover & Return Protocol</h4>
              <p>
                The renter agrees to inspect the asset at handover and sign the condition checklist. Equipment must be returned to the agreed location by the scheduled return time. A 30-minute grace window applies before late charges are calculated.
              </p>
            </div>

            <div>
              <h4 className="font-semibold text-foreground mb-1">4. Cancellation Rights</h4>
              <p>
                Renters may withdraw pending requests at any time prior to admin approval without penalty. Cancellations after payment and unit reservation in Step 06 are subject to cancellation fee policies.
              </p>
            </div>
          </div>

          <div className="pt-4 flex justify-end">
            <Button
              onClick={() => {
                setTermsAccepted(true)
                setTermsModalOpen(false)
              }}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs"
            >
              I Understand & Agree
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  )
}
