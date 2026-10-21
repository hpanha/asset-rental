'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  CalendarDays,
  Wallet,
  Package,
  TrendingUp,
  XCircle,
  Loader2,
  Plus,
  MapPin,
  Clock,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'
import { useStore } from '@/lib/store'
import { CategoryIcon } from '@/lib/category-icons'
import { format, isAfter } from 'date-fns'
import type { BookingWithAsset, AssetWithRelations } from '@/lib/types'

export function DashboardSection() {
  const { goAddListing, openAsset } = useStore()
  const qc = useQueryClient()
  const { toast } = useToast()

  const { data: stats } = useQuery({
    queryKey: ['stats'],
    queryFn: async () => {
      const r = await fetch('/api/stats')
      return r.json()
    },
  })

  const { data: me } = useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      const r = await fetch('/api/me')
      return r.json()
    },
  })

  const { data: bookings = [] } = useQuery<BookingWithAsset[]>({
    queryKey: ['bookings'],
    queryFn: async () => {
      const r = await fetch('/api/bookings')
      return r.json()
    },
  })

  const cancelBooking = async (id: string) => {
    try {
      const r = await fetch(`/api/bookings/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'cancelled' }),
      })
      if (!r.ok) throw new Error()
      toast({ title: 'Booking cancelled', description: 'Your reservation has been cancelled.' })
      qc.invalidateQueries({ queryKey: ['bookings'] })
      qc.invalidateQueries({ queryKey: ['stats'] })
    } catch {
      toast({ title: 'Failed to cancel', variant: 'destructive' })
    }
  }

  const listings: AssetWithRelations[] = me?.listings || []
  const upcoming = bookings.filter((b) => b.status === 'confirmed' && isAfter(new Date(b.endDate), new Date()))
  const past = bookings.filter((b) => !isAfter(new Date(b.endDate), new Date()) || b.status === 'cancelled')

  const statCards = [
    { label: 'Total bookings', value: stats?.totalBookings ?? 0, icon: CalendarDays, color: 'bg-emerald-50 text-emerald-600' },
    { label: 'Upcoming trips', value: stats?.upcomingBookings ?? 0, icon: Clock, color: 'bg-amber-50 text-amber-600' },
    { label: 'My listings', value: stats?.activeListings ?? 0, icon: Package, color: 'bg-rose-50 text-rose-600' },
    { label: 'Total spent', value: `$${stats?.totalSpent ?? 0}`, icon: Wallet, color: 'bg-violet-50 text-violet-600' },
  ]

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">My dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Welcome back, {me?.user?.name || 'there'} 👋
          </p>
        </div>
        <Button onClick={goAddListing} className="gap-2 bg-emerald-600 text-white hover:bg-emerald-700">
          <Plus className="h-4 w-4" /> List a new asset
        </Button>
      </div>

      {/* Stats */}
      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {statCards.map((s) => (
          <div key={s.label} className="rounded-2xl border border-border bg-card p-5">
            <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${s.color}`}>
              <s.icon className="h-5 w-5" />
            </span>
            <p className="mt-3 text-2xl font-bold">{s.value}</p>
            <p className="text-sm text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="bookings" className="mt-8">
        <TabsList>
          <TabsTrigger value="bookings">My bookings ({bookings.length})</TabsTrigger>
          <TabsTrigger value="listings">My listings ({listings.length})</TabsTrigger>
        </TabsList>

        {/* Bookings */}
        <TabsContent value="bookings" className="mt-5">
          {bookings.length === 0 ? (
            <EmptyState
              icon={CalendarDays}
              title="No bookings yet"
              text="Browse the marketplace and reserve your first rental."
              actionLabel="Explore rentals"
              onAction={() => useStore.getState().goExplore()}
            />
          ) : (
            <div className="space-y-6">
              {upcoming.length > 0 && (
                <BookingGroup title="Upcoming" bookings={upcoming} onCancel={cancelBooking} onOpen={openAsset} />
              )}
              {past.length > 0 && (
                <BookingGroup title="History" bookings={past} onCancel={cancelBooking} onOpen={openAsset} />
              )}
            </div>
          )}
        </TabsContent>

        {/* Listings */}
        <TabsContent value="listings" className="mt-5">
          {listings.length === 0 ? (
            <EmptyState
              icon={Package}
              title="You haven't listed anything yet"
              text="Turn your idle assets into income — list a property, vehicle, or gear in minutes."
              actionLabel="List your first asset"
              onAction={goAddListing}
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {listings.map((a) => {
                return (
                  <div key={a.id} className="overflow-hidden rounded-2xl border border-border bg-card">
                    <div className="relative aspect-[4/3] bg-muted">
                      { }
                      <img src={a.images[0]} alt={a.title} className="h-full w-full object-cover" />
                      <Badge className="absolute right-2 top-2 bg-emerald-600 text-white hover:bg-emerald-600">
                        Active
                      </Badge>
                    </div>
                    <div className="p-4">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <CategoryIcon name={a.category.icon} className="h-3.5 w-3.5" /> {a.category.name}
                      </div>
                      <h3 className="mt-1 line-clamp-1 font-semibold">{a.title}</h3>
                      <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3" /> {a.location}
                      </p>
                      <div className="mt-3 flex items-center justify-between">
                        <span className="font-bold">${a.pricePerDay}<span className="text-xs font-normal text-muted-foreground">/day</span></span>
                        <Button size="sm" variant="outline" onClick={() => openAsset(a.id)}>View</Button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

function BookingGroup({
  title,
  bookings,
  onCancel,
  onOpen,
}: {
  title: string
  bookings: BookingWithAsset[]
  onCancel: (id: string) => void
  onOpen: (id: string) => void
}) {
  return (
    <div>
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">{title}</h3>
      <div className="space-y-3">
        {bookings.map((b) => {
          const start = new Date(b.startDate)
          const end = new Date(b.endDate)
          const cancelled = b.status === 'cancelled'
          return (
            <div key={b.id} className={`flex flex-col gap-4 rounded-2xl border border-border bg-card p-4 sm:flex-row sm:items-center ${cancelled ? 'opacity-60' : ''}`}>
              <div className="relative h-24 w-full shrink-0 overflow-hidden rounded-xl bg-muted sm:h-20 sm:w-28">
                { }
                <img src={b.asset.images[0]} alt={b.asset.title} className="h-full w-full object-cover" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <CategoryIcon name={b.asset.category.icon} className="h-3.5 w-3.5" /> {b.asset.category.name}
                  </span>
                  <StatusBadge status={b.status} />
                </div>
                <button
                  onClick={() => onOpen(b.asset.id)}
                  className="mt-1 block truncate text-left font-semibold hover:text-emerald-600"
                >
                  {b.asset.title}
                </button>
                <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                  <MapPin className="h-3 w-3" /> {b.asset.city} · Hosted by {b.asset.owner.name}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  <CalendarDays className="mr-1 inline h-3 w-3" />
                  {format(start, 'MMM d')} – {format(end, 'MMM d, yyyy')}
                </p>
              </div>
              <div className="flex shrink-0 flex-col items-start gap-2 sm:items-end">
                <span className="text-lg font-bold">${b.totalPrice}</span>
                {b.status === 'confirmed' && !cancelled && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onCancel(b.id)}
                    className="gap-1 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                  >
                    <XCircle className="h-4 w-4" /> Cancel
                  </Button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    confirmed: { label: 'Confirmed', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    pending: { label: 'Pending', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
    cancelled: { label: 'Cancelled', cls: 'bg-rose-50 text-rose-700 border-rose-200' },
    completed: { label: 'Completed', cls: 'bg-muted text-muted-foreground' },
  }
  const s = map[status] || map.pending
  return <Badge variant="outline" className={s.cls}>{s.label}</Badge>
}

function EmptyState({
  icon: Icon,
  title,
  text,
  actionLabel,
  onAction,
}: {
  icon: any
  title: string
  text: string
  actionLabel: string
  onAction: () => void
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-16 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
        <Icon className="h-7 w-7 text-muted-foreground" />
      </div>
      <h3 className="mt-4 text-lg font-semibold">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">{text}</p>
      <Button onClick={onAction} className="mt-4 gap-2 bg-emerald-600 text-white hover:bg-emerald-700">
        <TrendingUp className="h-4 w-4" /> {actionLabel}
      </Button>
    </div>
  )
}
