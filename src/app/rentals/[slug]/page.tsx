'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQuery, useMutation } from '@tanstack/react-query'
import Link from 'next/link'
import {
  Star,
  MapPin,
  Calendar,
  Clock,
  Shield,
  Layers,
  ChevronRight,
  ArrowLeft,
  Truck,
  Building2,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Info,
  DollarSign,
  Share2,
  Heart,
  HelpCircle,
  Sparkles,
  ExternalLink,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
import { Header } from '@/components/rental/Header'
import { Footer } from '@/components/rental/Footer'
import { Providers } from '@/components/rental/Providers'
import { useRentalSelectionStore } from '@/lib/rental-selection'
import { toast } from 'sonner'

export default function RentalDetailPage() {
  const { slug } = useParams<{ slug: string }>()
  const router = useRouter()
  const setRentalSelection = useRentalSelectionStore((s) => s.setSelection)

  // Active gallery index
  const [activeImageIndex, setActiveImageIndex] = useState(0)

  // Booking & Selection Form State
  const tomorrow = new Date(Date.now() + 86400000)
  const defaultEnd = new Date(Date.now() + 3 * 86400000)

  const [startDateStr, setStartDateStr] = useState(tomorrow.toISOString().split('T')[0])
  const [endDateStr, setEndDateStr] = useState(defaultEnd.toISOString().split('T')[0])
  const [quantity, setQuantity] = useState(1)
  const [fulfillment, setFulfillment] = useState<'PICKUP' | 'DELIVERY'>('PICKUP')
  const [selectedLocationId, setSelectedLocationId] = useState<string>('')
  const [selectionSuccessModal, setSelectionSuccessModal] = useState(false)

  // User auth state
  const { data: meData } = useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      const res = await fetch('/api/me')
      if (!res.ok) return null
      return res.json()
    },
  })

  // Fetch asset details
  const { data: asset, isLoading, error } = useQuery({
    queryKey: ['rental-detail', slug],
    queryFn: async () => {
      const res = await fetch(`/api/rental-assets/${slug}`)
      if (!res.ok) throw new Error('Failed to load asset details')
      return res.json()
    },
  })

  // Set default location once loaded
  useEffect(() => {
    if (asset?.locations?.length > 0 && !selectedLocationId) {
      setSelectedLocationId(asset.locations[0].id)
    }
  }, [asset, selectedLocationId])

  // Real-time Availability Check Query
  const { data: availability, isFetching: checkingAvailability } = useQuery({
    queryKey: ['availability-check', asset?.id, selectedLocationId, startDateStr, endDateStr, quantity],
    queryFn: async () => {
      if (!asset?.id || !startDateStr || !endDateStr) return null
      const res = await fetch(`/api/rental-assets/${asset.id}/availability-check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location_id: selectedLocationId,
          start_at: `${startDateStr}T09:00:00+07:00`,
          end_at: `${endDateStr}T18:00:00+07:00`,
          quantity,
        }),
      })
      return res.json()
    },
    enabled: !!asset?.id && !!startDateStr && !!endDateStr,
    refetchOnWindowFocus: false,
  })

  // Real-time Quote Preview Query
  const { data: quote, isFetching: calculatingQuote } = useQuery({
    queryKey: ['quote-preview', asset?.id, selectedLocationId, startDateStr, endDateStr, quantity, fulfillment],
    queryFn: async () => {
      if (!asset?.id || !startDateStr || !endDateStr) return null
      const res = await fetch(`/api/rental-assets/${asset.id}/quote-preview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location_id: selectedLocationId,
          start_at: `${startDateStr}T09:00:00+07:00`,
          end_at: `${endDateStr}T18:00:00+07:00`,
          quantity,
          fulfillment,
        }),
      })
      if (!res.ok) return null
      return res.json()
    },
    enabled: !!asset?.id && !!startDateStr && !!endDateStr && availability?.available === true,
    refetchOnWindowFocus: false,
  })

  // Alternative Slots Query (only when unavailable)
  const { data: alternativeSlots } = useQuery({
    queryKey: ['alternative-slots', asset?.id, startDateStr, endDateStr, quantity],
    queryFn: async () => {
      if (!asset?.id || !startDateStr || !endDateStr) return null
      const res = await fetch(
        `/api/rental-assets/${asset.id}/alternative-slots?startAt=${startDateStr}T09:00:00Z&endAt=${endDateStr}T18:00:00Z&quantity=${quantity}`
      )
      if (!res.ok) return null
      return res.json()
    },
    enabled: !!asset?.id && availability?.available === false,
  })

  const handleApplyAlternativeSlot = (slot: any) => {
    setStartDateStr(slot.start_at.split('T')[0])
    setEndDateStr(slot.end_at.split('T')[0])
    toast.success('Applied alternate dates!')
  }

  // Handle Request Rental click (Step 02 -> Step 03 Handoff)
  const handleRequestRental = () => {
    if (!asset || !quote || !availability?.available) return

    const selectionPayload = {
      listingId: asset.id,
      slug: asset.slug,
      name: asset.name,
      coverImage: asset.coverImage,
      categoryName: asset.category.name,
      startAt: `${startDateStr}T09:00:00+07:00`,
      endAt: `${endDateStr}T18:00:00+07:00`,
      rentalDays: quote.rental_days,
      quantity,
      fulfillment,
      locationId: selectedLocationId,
      locationName: asset.locations.find((l: any) => l.id === selectedLocationId)?.name || 'Phnom Penh Hub',
      dailyRate: quote.rate_amount,
      currency: quote.currency,
      quoteToken: quote.quote_token,
      breakdown: {
        rentalSubtotal: quote.breakdown.rental_subtotal,
        securityDeposit: quote.breakdown.security_deposit,
        deliveryFee: quote.breakdown.delivery_fee,
        totalPayable: quote.breakdown.total_estimated_payable,
      },
    }

    setRentalSelection(selectionPayload)

    // Check if user is logged in
    if (!meData?.user) {
      toast.info('Please sign in to proceed with your rental request.')
      router.push(`/login?from=/rentals/request`)
      return
    }

    setSelectionSuccessModal(true)
  }


  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
          <Header />
          <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-20 text-center flex flex-col items-center justify-center">
            <Layers className="h-8 w-8 animate-spin text-emerald-600 mb-3" />
            <p className="font-semibold text-sm">Loading equipment specifications & stock...</p>
          </main>
          <Footer />
        </div>
    )
  }

  if (error || !asset) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
          <Header />
          <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-20 text-center">
            <AlertCircle className="h-10 w-10 text-destructive mx-auto mb-3" />
            <h2 className="text-xl font-bold text-foreground">Equipment Not Found or Unpublished</h2>
            <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
              This rental model may have been archived, unpublished by operations, or does not exist.
            </p>
            <Link href="/rentals" className="mt-4 inline-block">
              <Button variant="outline" size="sm">
                Back to Equipment Catalog
              </Button>
            </Link>
          </main>
          <Footer />
        </div>
    )
  }

  const galleryImages = asset.images && asset.images.length > 0 ? asset.images : [asset.coverImage]

  return (
    <div className="flex min-h-screen flex-col bg-slate-50/50 dark:bg-slate-950 font-sans">
        <Header />

        <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-6 space-y-6">
          {/* Breadcrumbs */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Link href="/" className="hover:text-emerald-600">Home</Link>
            <span>/</span>
            <Link href="/rentals" className="hover:text-emerald-600">Rentals</Link>
            <span>/</span>
            <Link href={`/rentals?category=${asset.category.slug}`} className="hover:text-emerald-600">
              {asset.category.name}
            </Link>
            <span>/</span>
            <span className="text-foreground font-semibold truncate max-w-xs">{asset.name}</span>
          </div>

          {/* Main Grid: Left Column (Gallery, Specs, Details) + Right Column (Sticky Selection Card) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left 7 Columns */}
            <div className="lg:col-span-7 space-y-8">
              {/* Photo Gallery */}
              <div className="space-y-3">
                <div className="aspect-[16/10] sm:aspect-[16/9] rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-800 border border-border shadow-xs relative">
                  <img
                    src={galleryImages[activeImageIndex]}
                    alt={asset.name}
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute left-3 top-3">
                    <Badge className="bg-white/90 dark:bg-slate-900/90 text-slate-900 dark:text-white border-border shadow-2xs font-semibold text-xs backdrop-blur">
                      {asset.category.name}
                    </Badge>
                  </div>
                </div>

                {/* Thumbnails row */}
                {galleryImages.length > 1 && (
                  <div className="flex gap-2.5 overflow-x-auto pb-1">
                    {galleryImages.map((img: string, idx: number) => (
                      <button
                        key={idx}
                        onClick={() => setActiveImageIndex(idx)}
                        className={`h-16 w-20 sm:h-20 sm:w-24 rounded-xl overflow-hidden shrink-0 border-2 transition ${
                          activeImageIndex === idx
                            ? 'border-emerald-600 ring-2 ring-emerald-500/20'
                            : 'border-border opacity-70 hover:opacity-100'
                        }`}
                      >
                        <img src={img} alt={`Thumb ${idx + 1}`} className="h-full w-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Title, Brand, Code & Summary */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950 px-2 py-0.5 rounded">
                    {asset.code}
                  </span>
                  {asset.brand && (
                    <Badge variant="secondary" className="font-medium text-xs">
                      {asset.brand.name}
                    </Badge>
                  )}
                  {asset.model && (
                    <span className="text-xs text-muted-foreground">Model: {asset.model}</span>
                  )}
                </div>

                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                  {asset.name}
                </h1>

                <div className="flex items-center gap-4 text-xs text-muted-foreground pt-1">
                  {asset.reviewCount > 0 && (
                    <div className="flex items-center gap-1 font-semibold text-foreground">
                      <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                      <span>{asset.rating.toFixed(1)}</span>
                      <span className="text-muted-foreground font-normal">({asset.reviewCount} verified reviews)</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5 text-emerald-600" />
                    <span>{asset.locations.map((l: any) => l.city).join(', ') || 'Phnom Penh'}</span>
                  </div>
                </div>

                <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed pt-2">
                  {asset.description || asset.shortDescription}
                </p>
              </div>

              {/* Inclusions Checklist */}
              {asset.inclusions?.length > 0 && (
                <Card className="border-border shadow-xs">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      Standard Package Inclusions
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Accessories and protection provided with every rental handover.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      {asset.inclusions.map((inc: string, i: number) => (
                        <div key={i} className="flex items-center gap-2 text-slate-800 dark:text-slate-200">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
                          <span>{inc}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Specifications Table */}
              <Card className="border-border shadow-xs">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-emerald-600" />
                    Technical Specifications
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y divide-border">
                    {Object.entries(asset.specifications || {}).map(([key, val]) => (
                      <div key={key} className="flex flex-col sm:flex-row sm:items-center justify-between py-2.5 px-4 text-xs gap-1">
                        <span className="font-medium text-muted-foreground w-1/3">{key}</span>
                        <span className="font-semibold text-foreground text-left sm:text-right flex-1">{String(val)}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Rental Rules & Policies */}
              <Card className="border-border shadow-xs">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <Shield className="h-4 w-4 text-emerald-600" />
                    Rental Policies & Protection Terms
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-xs text-slate-700 dark:text-slate-300">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-border">
                      <p className="font-bold text-foreground">Refundable Security Deposit</p>
                      <p className="text-muted-foreground mt-0.5">
                        ${asset.rentalPolicy?.securityDeposit.toFixed(2) || '0.00'} collected prior to handover; refunded upon inspection.
                      </p>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-border">
                      <p className="font-bold text-foreground">Minimum Duration</p>
                      <p className="text-muted-foreground mt-0.5">
                        {asset.rentalPolicy?.minimumDuration} {asset.rentalPolicy?.minimumDurationUnit.toLowerCase()}(s) minimum rental commitment.
                      </p>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-border">
                      <p className="font-bold text-foreground">Turnaround Buffers</p>
                      <p className="text-muted-foreground mt-0.5">
                        {asset.rentalPolicy?.preparationBufferMinutes || 120}m prep buffer and {asset.rentalPolicy?.returnBufferMinutes || 120}m return turnaround.
                      </p>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-border">
                      <p className="font-bold text-foreground">Late Return Fee</p>
                      <p className="text-muted-foreground mt-0.5">
                        ${asset.rentalPolicy?.lateFeeAmount || 25}/{asset.rentalPolicy?.lateFeeUnit || 'DAY'} after {asset.rentalPolicy?.lateGraceMinutes || 30} mins grace.
                      </p>
                    </div>
                  </div>

                  <p className="text-muted-foreground text-[11px] leading-relaxed pt-1">
                    {asset.rentalPolicy?.termsTemplate || 'Customer is responsible for safe handling and returns in matching condition grade.'}
                  </p>
                </CardContent>
              </Card>

              {/* Customer Reviews */}
              {asset.reviews?.length > 0 && (
                <div className="space-y-3 pt-2">
                  <h3 className="font-bold text-sm text-foreground">Customer Reviews ({asset.reviews.length})</h3>
                  <div className="space-y-3">
                    {asset.reviews.map((rev: any) => (
                      <div key={rev.id} className="p-3.5 rounded-xl border border-border bg-white dark:bg-slate-900 text-xs space-y-1.5 shadow-2xs">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="h-6 w-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-[10px]">
                              {rev.user?.name?.charAt(0) || 'U'}
                            </div>
                            <span className="font-semibold text-foreground">{rev.user?.name || 'Verified Renter'}</span>
                          </div>
                          <div className="flex items-center gap-0.5 text-amber-400">
                            {Array.from({ length: Math.round(rev.rating) }).map((_, i) => (
                              <Star key={i} className="h-3 w-3 fill-current" />
                            ))}
                          </div>
                        </div>
                        <p className="text-muted-foreground leading-relaxed">{rev.comment}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right 5 Columns: Sticky Availability & Selection Card */}
            <div className="lg:col-span-5 sticky top-20 space-y-4">
              <Card className="border-border bg-white dark:bg-slate-900 shadow-md rounded-2xl overflow-hidden">
                <CardHeader className="pb-4 bg-slate-50/80 dark:bg-slate-800/40 border-b border-border">
                  <div className="flex items-baseline justify-between">
                    <div>
                      <span className="text-xs text-muted-foreground font-medium">Rental Rate</span>
                      <div className="flex items-baseline gap-1 mt-0.5">
                        <span className="text-3xl font-extrabold text-foreground">
                          ${asset.primaryRate.amount.toFixed(2)}
                        </span>
                        <span className="text-xs font-semibold text-muted-foreground">
                          /{asset.primaryRate.billingUnit.toLowerCase()}
                        </span>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-[11px] text-muted-foreground">Inventory Pool</span>
                      <div className="flex items-center gap-1.5 justify-end mt-0.5">
                        <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-xs font-bold text-emerald-600">
                          {asset.availableUnitsCount} available
                        </span>
                      </div>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="p-5 space-y-4 text-xs">
                  {/* Fulfillment Choice */}
                  <div>
                    <label className="font-bold text-foreground block mb-1.5">Fulfillment Method</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setFulfillment('PICKUP')}
                        className={`flex items-center justify-center gap-1.5 p-2 rounded-xl border text-xs font-semibold transition ${
                          fulfillment === 'PICKUP'
                            ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 ring-1 ring-emerald-500'
                            : 'border-border text-slate-700 dark:text-slate-300 hover:bg-muted'
                        }`}
                      >
                        <Building2 className="h-3.5 w-3.5" />
                        Pickup at Hub
                      </button>

                      {asset.allowDelivery && (
                        <button
                          type="button"
                          onClick={() => setFulfillment('DELIVERY')}
                          className={`flex items-center justify-center gap-1.5 p-2 rounded-xl border text-xs font-semibold transition ${
                            fulfillment === 'DELIVERY'
                              ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 ring-1 ring-emerald-500'
                              : 'border-border text-slate-700 dark:text-slate-300 hover:bg-muted'
                          }`}
                        >
                          <Truck className="h-3.5 w-3.5" />
                          Delivery (+${asset.deliveryFee})
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Location Selector (when pickup is chosen) */}
                  {fulfillment === 'PICKUP' && asset.locations?.length > 0 && (
                    <div>
                      <label className="font-bold text-foreground block mb-1.5">Pickup & Return Location</label>
                      <select
                        value={selectedLocationId}
                        onChange={(e) => setSelectedLocationId(e.target.value)}
                        className="w-full h-9 px-3 rounded-xl border border-input bg-background font-medium text-xs focus:ring-2 focus:ring-emerald-500"
                      >
                        {asset.locations.map((loc: any) => (
                          <option key={loc.id} value={loc.id}>
                            {loc.name} ({loc.city})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Dates Selection */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="font-bold text-foreground">Rental Window</label>
                      <span className="text-[11px] text-muted-foreground font-mono">Asia/Phnom_Penh</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-[10px] text-muted-foreground block mb-1">Pickup Date</span>
                        <Input
                          type="date"
                          value={startDateStr}
                          onChange={(e) => setStartDateStr(e.target.value)}
                          className="h-9 text-xs rounded-xl"
                        />
                      </div>
                      <div>
                        <span className="text-[10px] text-muted-foreground block mb-1">Return Date</span>
                        <Input
                          type="date"
                          value={endDateStr}
                          onChange={(e) => setEndDateStr(e.target.value)}
                          className="h-9 text-xs rounded-xl"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Quantity Stepper */}
                  <div>
                    <label className="font-bold text-foreground block mb-1.5">Equipment Quantity</label>
                    <div className="flex items-center gap-3">
                      <Button
                        type="button"
                        size="icon"
                        variant="outline"
                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                        disabled={quantity <= 1}
                        className="h-8 w-8 rounded-lg"
                      >
                        -
                      </Button>
                      <span className="font-extrabold text-sm w-8 text-center">{quantity}</span>
                      <Button
                        type="button"
                        size="icon"
                        variant="outline"
                        onClick={() => setQuantity(quantity + 1)}
                        disabled={quantity >= asset.totalUnits}
                        className="h-8 w-8 rounded-lg"
                      >
                        +
                      </Button>
                      <span className="text-muted-foreground text-[11px]">
                        unit(s) requested (max {asset.totalUnits})
                      </span>
                    </div>
                  </div>

                  {/* Availability Feedback Card */}
                  <div className="pt-2">
                    {checkingAvailability ? (
                      <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs flex items-center gap-2 text-muted-foreground">
                        <Clock className="h-4 w-4 animate-spin text-emerald-600" />
                        <span>Verifying real-time inventory and turnaround buffers...</span>
                      </div>
                    ) : availability?.available ? (
                      <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-bold">Available for Requested Period</p>
                          <p className="text-[11px] opacity-90 mt-0.5">
                            {availability.available_quantity} unit(s) eligible after {availability.rental_days} day(s) duration check.
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 text-xs flex items-start gap-2">
                          <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                          <div>
                            <p className="font-bold">Dates Unavailable</p>
                            <p className="text-[11px] opacity-90 mt-0.5">
                              {availability?.message || 'Selected dates overlap with maintenance blackouts or prior bookings.'}
                            </p>
                          </div>
                        </div>

                        {/* Alternate slot suggestions */}
                        {alternativeSlots?.suggested_slots?.length > 0 && (
                          <div className="p-3 rounded-xl border border-border bg-slate-50 dark:bg-slate-800/60 space-y-2">
                            <span className="font-semibold text-[11px] text-foreground flex items-center gap-1">
                              <Sparkles className="h-3 w-3 text-emerald-600" />
                              Suggested Alternative Openings:
                            </span>
                            <div className="space-y-1">
                              {alternativeSlots.suggested_slots.map((alt: any, i: number) => (
                                <button
                                  key={i}
                                  type="button"
                                  onClick={() => handleApplyAlternativeSlot(alt)}
                                  className="w-full text-left p-1.5 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-950 text-[11px] flex items-center justify-between font-medium text-emerald-700 dark:text-emerald-400 transition"
                                >
                                  <span>{alt.label}</span>
                                  <span className="underline text-[10px]">Select</span>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Indicative Itemized Quote Breakdown */}
                  {quote && availability?.available && (
                    <div className="p-3.5 rounded-xl border border-border bg-slate-50 dark:bg-slate-800/60 space-y-2 text-xs">
                      <div className="flex justify-between text-muted-foreground">
                        <span>
                          Rental Fee (${quote.rate_amount} × {quote.rental_days}d × {quantity}):
                        </span>
                        <span className="font-semibold text-foreground">
                          ${quote.breakdown.rental_subtotal.toFixed(2)}
                        </span>
                      </div>

                      <div className="flex justify-between text-muted-foreground">
                        <span>Refundable Security Deposit:</span>
                        <span className="font-semibold text-foreground">
                          ${quote.breakdown.security_deposit.toFixed(2)}
                        </span>
                      </div>

                      {fulfillment === 'DELIVERY' && (
                        <div className="flex justify-between text-muted-foreground">
                          <span>Courier Delivery Fee:</span>
                          <span className="font-semibold text-foreground">
                            ${quote.breakdown.delivery_fee.toFixed(2)}
                          </span>
                        </div>
                      )}

                      <div className="pt-2 border-t border-border flex justify-between text-sm font-bold text-foreground">
                        <span>Total Estimated Initial Payable:</span>
                        <span className="text-emerald-600 text-base">
                          ${quote.breakdown.total_estimated_payable.toFixed(2)}
                        </span>
                      </div>

                      <p className="text-[10px] text-muted-foreground leading-normal italic pt-1">
                        *Indicative quote valid for 15 mins (Token: {quote.quote_token}). Final commitment and payment capture will be processed in Step 03 & 05.
                      </p>
                    </div>
                  )}

                  {/* Primary CTA: Request Rental */}
                  <Button
                    onClick={handleRequestRental}
                    disabled={!availability?.available || checkingAvailability || !quote}
                    className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md rounded-xl transition"
                  >
                    Request Rental
                  </Button>
                </CardContent>
              </Card>

              {/* Company Guarantee Pill */}
              <div className="p-3.5 rounded-xl border border-border bg-white dark:bg-slate-900 text-xs text-muted-foreground flex items-center gap-2.5">
                <Shield className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>
                  <strong>Asset Rental Guarantee:</strong> All equipment is bench-tested, sanitised and certified before customer handover.
                </span>
              </div>
            </div>
          </div>

          {/* Similar Recommended Assets */}
          {asset.similarAssets?.length > 0 && (
            <div className="pt-8 border-t border-border space-y-4">
              <h2 className="text-lg font-bold text-foreground">Similar Equipment in {asset.category.name}</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {asset.similarAssets.map((sim: any) => (
                  <Link
                    key={sim.id}
                    href={`/rentals/${sim.slug}`}
                    className="p-3 rounded-xl border border-border bg-white dark:bg-slate-900 hover:border-emerald-500/50 hover:shadow-sm transition flex items-center gap-3"
                  >
                    <div className="h-14 w-16 rounded-lg overflow-hidden bg-muted shrink-0">
                      <img src={sim.coverImage} alt={sim.name} className="h-full w-full object-cover" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-foreground truncate">{sim.name}</p>
                      <p className="text-xs text-emerald-600 font-extrabold mt-0.5">
                        ${sim.rateAmount.toFixed(2)} <span className="text-[10px] text-muted-foreground font-normal">/day</span>
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </main>

        <Footer />

        {/* Step 02 Selection Complete -> Ready for Step 03 Handoff Modal */}
        <Dialog open={selectionSuccessModal} onOpenChange={setSelectionSuccessModal}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <div className="h-10 w-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mb-2">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <DialogTitle>Step 02 Selection Validated!</DialogTitle>
              <DialogDescription>
                Your equipment selection, date interval, and server quote token are ready for Step 03 (Submit Rental Request).
              </DialogDescription>
            </DialogHeader>

            {quote && (
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-border space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Selected Item:</span>
                  <span className="font-bold text-foreground">{asset.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Rental Window:</span>
                  <span className="font-semibold text-foreground">
                    {startDateStr} to {endDateStr} ({quote.rental_days} days)
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Quantity:</span>
                  <span className="font-semibold text-foreground">{quantity} unit(s)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Fulfillment:</span>
                  <span className="font-semibold text-foreground">{fulfillment}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Server Quote Token:</span>
                  <span className="font-mono text-emerald-600 text-[11px]">{quote.quote_token}</span>
                </div>
                <div className="pt-2 border-t border-border flex justify-between font-bold text-sm">
                  <span>Estimated Total:</span>
                  <span className="text-emerald-600">
                    ${quote.breakdown.total_estimated_payable.toFixed(2)}
                  </span>
                </div>
              </div>
            )}

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setSelectionSuccessModal(false)}>
                Modify Selection
              </Button>
              <Button
                onClick={() => {
                  setSelectionSuccessModal(false)
                  if (!meData?.user) {
                    router.push('/login?from=/rentals/request')
                  } else {
                    router.push('/rentals/request')
                  }
                }}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
              >
                Proceed to Request Form
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
  )
}
