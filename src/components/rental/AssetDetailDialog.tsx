'use client'

import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Star, MapPin, Shield, Calendar as CalendarIcon, User, ChevronLeft, ChevronRight, Loader2, CheckCircle2 } from 'lucide-react'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Calendar } from '@/components/ui/calendar'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { useToast } from '@/hooks/use-toast'
import { CategoryIcon, getCategoryColor } from '@/lib/category-icons'
import { useStore } from '@/lib/store'
import { format, differenceInCalendarDays, isBefore, isSameDay, addDays } from 'date-fns'
import type { AssetWithRelations, ReviewWithUser } from '@/lib/types'

type Detail = AssetWithRelations & { reviews: ReviewWithUser[] }

export function AssetDetailDialog() {
  const { selectedAssetId, detailOpen, closeAsset, goDashboard } = useStore()
  const qc = useQueryClient()
  const { toast } = useToast()

  const [activeImg, setActiveImg] = useState(0)
  const [range, setRange] = useState<{ from?: Date; to?: Date }>({})
  const [booking, setBooking] = useState(false)
  const [reviewRating, setReviewRating] = useState(5)
  const [reviewText, setReviewText] = useState('')
  const [submittingReview, setSubmittingReview] = useState(false)

  const { data: asset, isLoading } = useQuery<Detail>({
    queryKey: ['asset', selectedAssetId],
    queryFn: async () => {
      const r = await fetch(`/api/assets/${selectedAssetId}`)
      return r.json()
    },
    enabled: !!selectedAssetId && detailOpen,
  })

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      closeAsset()
      setActiveImg(0)
      setRange({})
    }
  }

  const days = range.from && range.to ? Math.max(1, differenceInCalendarDays(range.to, range.from)) : 0
  const subtotal = asset ? days * asset.pricePerDay : 0
  const serviceFee = asset ? Math.round(subtotal * 0.08) : 0
  const total = subtotal + serviceFee

  const handleBook = async () => {
    if (!asset || !range.from || !range.to) return
    setBooking(true)
    try {
      const r = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assetId: asset.id,
          startDate: range.from.toISOString(),
          endDate: range.to.toISOString(),
        }),
      })
      if (r.status === 401) {
        toast({ title: 'Please sign in', description: 'You need to sign in to request or book this asset.' })
        window.location.href = '/login'
        return
      }
      if (!r.ok) throw new Error('Booking failed')
      toast({
        title: 'Booking confirmed!',
        description: `${asset.title} · ${days} day${days > 1 ? 's' : ''} · $${total}`,
      })
      qc.invalidateQueries({ queryKey: ['bookings'] })
      qc.invalidateQueries({ queryKey: ['stats'] })
      closeAsset()
      setRange({})
      goDashboard()
    } catch {
      toast({ title: 'Booking failed', description: 'Please try again.', variant: 'destructive' })
    } finally {
      setBooking(false)
    }
  }

  const handleSubmitReview = async () => {
    if (!asset || !reviewText.trim()) return
    setSubmittingReview(true)
    try {
      const r = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assetId: asset.id, rating: reviewRating, comment: reviewText.trim() }),
      })
      if (!r.ok) throw new Error('Review failed')
      await qc.invalidateQueries({ queryKey: ['asset', asset.id] })
      setReviewText('')
      setReviewRating(5)
      toast({ title: 'Review posted!', description: 'Thanks for your feedback.' })
    } catch {
      toast({ title: 'Could not post review', variant: 'destructive' })
    } finally {
      setSubmittingReview(false)
    }
  }

  return (
    <Dialog open={detailOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[92vh] w-full max-w-5xl gap-0 overflow-hidden p-0 sm:rounded-2xl">
        <DialogTitle className="sr-only">Asset details</DialogTitle>
        {isLoading || !asset ? (
          <div className="flex h-[60vh] items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="max-h-[92vh] overflow-y-auto">
            {/* Gallery */}
            <div className="relative aspect-[16/10] w-full bg-muted sm:aspect-[16/8]">
              { }
              <img
                src={asset.images[activeImg] || asset.images[0]}
                alt={asset.title}
                className="h-full w-full object-cover"
              />
              {asset.images.length > 1 && (
                <>
                  <button
                    onClick={() => setActiveImg((i) => (i - 1 + asset.images.length) % asset.images.length)}
                    className="absolute left-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 shadow hover:bg-white"
                    aria-label="Previous image"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => setActiveImg((i) => (i + 1) % asset.images.length)}
                    className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 shadow hover:bg-white"
                    aria-label="Next image"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                  <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
                    {asset.images.map((_, i) => (
                      <span
                        key={i}
                        className={`h-1.5 rounded-full transition-all ${i === activeImg ? 'w-6 bg-white' : 'w-1.5 bg-white/60'}`}
                      />
                    ))}
                  </div>
                </>
              )}
              <div className="absolute left-4 top-4">
                <CategoryBadge icon={asset.category.icon} name={asset.category.name} color={asset.category.color} />
              </div>
            </div>

            <div className="grid gap-8 p-5 sm:p-6 lg:grid-cols-[1fr_360px]">
              {/* Left: details */}
              <div>
                <h1 className="text-2xl font-bold tracking-tight">{asset.title}</h1>
                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                  <span className="flex items-center gap-1 font-medium">
                    <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                    {asset.rating.toFixed(1)}
                    <span className="text-muted-foreground">({asset.reviewCount} reviews)</span>
                  </span>
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <MapPin className="h-4 w-4" /> {asset.location}
                  </span>
                </div>

                <Separator className="my-5" />

                {/* Owner */}
                <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/30 p-4">
                  <Avatar className="h-12 w-12">
                    {asset.owner.avatar ? (
                       
                      <img src={asset.owner.avatar} alt={asset.owner.name} className="h-full w-full object-cover" />
                    ) : (
                      <AvatarFallback><User className="h-5 w-5" /></AvatarFallback>
                    )}
                  </Avatar>
                  <div>
                    <p className="text-sm text-muted-foreground">Hosted by</p>
                    <p className="font-semibold">{asset.owner.name}</p>
                  </div>
                  <Badge variant="secondary" className="ml-auto gap-1">
                    <CheckCircle2 className="h-3 w-3 text-emerald-600" /> Verified
                  </Badge>
                </div>

                {/* Description */}
                <div className="mt-5">
                  <h2 className="font-semibold">About this rental</h2>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{asset.description}</p>
                </div>

                {/* Features */}
                {asset.features.length > 0 && (
                  <div className="mt-5">
                    <h2 className="font-semibold">What's included</h2>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {asset.features.map((f) => (
                        <Badge key={f} variant="outline" className="gap-1 font-normal">
                          <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                          {f}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Reviews */}
                <div className="mt-6">
                  <h2 className="font-semibold">
                    Reviews <span className="text-muted-foreground">({asset.reviews.length})</span>
                  </h2>
                  <div className="mt-3 space-y-3">
                    {asset.reviews.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No reviews yet. Be the first!</p>
                    ) : (
                      asset.reviews.map((rev) => (
                        <div key={rev.id} className="rounded-xl border border-border p-4">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              {rev.user.avatar ? (
                                 
                                <img src={rev.user.avatar} alt={rev.user.name} className="h-full w-full object-cover" />
                              ) : (
                                <AvatarFallback className="text-xs">{rev.user.name.charAt(0)}</AvatarFallback>
                              )}
                            </Avatar>
                            <div>
                              <p className="text-sm font-medium">{rev.user.name}</p>
                              <div className="flex items-center gap-0.5">
                                {Array.from({ length: 5 }).map((_, i) => (
                                  <Star
                                    key={i}
                                    className={`h-3 w-3 ${i < Math.round(rev.rating) ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/30'}`}
                                  />
                                ))}
                                <span className="ml-1.5 text-xs text-muted-foreground">
                                  {format(new Date(rev.createdAt), 'MMM d, yyyy')}
                                </span>
                              </div>
                            </div>
                          </div>
                          <p className="mt-2 text-sm text-muted-foreground">{rev.comment}</p>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Add review */}
                  <div className="mt-4 rounded-xl border border-border p-4">
                    <h3 className="text-sm font-semibold">Leave a review</h3>
                    <div className="mt-2 flex items-center gap-1">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <button
                          key={i}
                          onClick={() => setReviewRating(i + 1)}
                          aria-label={`${i + 1} stars`}
                        >
                          <Star className={`h-6 w-6 transition ${i < reviewRating ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/30 hover:text-amber-300'}`} />
                        </button>
                      ))}
                    </div>
                    <Textarea
                      value={reviewText}
                      onChange={(e) => setReviewText(e.target.value)}
                      placeholder="Share your experience…"
                      className="mt-2"
                      rows={3}
                    />
                    <Button
                      size="sm"
                      onClick={handleSubmitReview}
                      disabled={!reviewText.trim() || submittingReview}
                      className="mt-2 bg-emerald-600 text-white hover:bg-emerald-700"
                    >
                      {submittingReview ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null}
                      Post review
                    </Button>
                  </div>
                </div>
              </div>

              {/* Right: booking card */}
              <div className="lg:sticky lg:top-0 lg:h-fit">
                <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                  <div className="flex items-baseline justify-between">
                    <div>
                      <span className="text-2xl font-bold">${asset.pricePerDay}</span>
                      <span className="text-sm text-muted-foreground"> /day</span>
                    </div>
                    <span className="flex items-center gap-1 text-sm">
                      <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                      {asset.rating.toFixed(1)}
                    </span>
                  </div>

                  <div className="mt-4">
                    <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                      <CalendarIcon className="h-4 w-4 text-muted-foreground" /> Select dates
                    </div>
                    <Calendar
                      mode="range"
                      selected={range as any}
                      onSelect={(r: any) => setRange(r || {})}
                      numberOfMonths={1}
                      disabled={(d) => isBefore(d, addDays(new Date(), -1))}
                      className="rounded-lg border"
                    />
                  </div>

                  {days > 0 && (
                    <div className="mt-4 space-y-2 rounded-lg bg-muted/40 p-3 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">${asset.pricePerDay} × {days} day{days > 1 ? 's' : ''}</span>
                        <span>${subtotal}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Service fee (8%)</span>
                        <span>${serviceFee}</span>
                      </div>
                      <Separator />
                      <div className="flex justify-between font-semibold">
                        <span>Total</span>
                        <span>${total}</span>
                      </div>
                    </div>
                  )}

                  <Button
                    onClick={handleBook}
                    disabled={!range.from || !range.to || booking}
                    className="mt-4 w-full gap-2 bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
                  >
                    {booking ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    {range.from && range.to ? `Reserve · $${total}` : 'Select dates to reserve'}
                  </Button>

                  <div className="mt-3 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
                    <Shield className="h-3.5 w-3.5 text-emerald-600" />
                    Free cancellation up to 48h before · ${asset.deposit} refundable deposit
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

function CategoryBadge({ icon, name, color }: { icon: string; name: string; color: string | null }) {
  const c = getCategoryColor(color)
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium ${c.bg} ${c.text} backdrop-blur`}>
      <CategoryIcon name={icon} className="h-3.5 w-3.5" />
      {name}
    </span>
  )
}
