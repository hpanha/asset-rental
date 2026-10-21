'use client'

import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Search, SlidersHorizontal, X, MapPin } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { AssetCard } from './AssetCard'
import { CategoryIcon, getCategoryColor } from '@/lib/category-icons'
import { useStore } from '@/lib/store'
import type { AssetWithRelations } from '@/lib/types'

export function ExploreSection() {
  const { filters, setFilters, resetFilters } = useStore()

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const r = await fetch('/api/categories')
      return r.json()
    },
  })

  const queryString = useMemo(() => {
    const p = new URLSearchParams()
    if (filters.q) p.set('q', filters.q)
    if (filters.category) p.set('category', filters.category)
    if (filters.city) p.set('city', filters.city)
    if (filters.minPrice) p.set('minPrice', filters.minPrice)
    if (filters.maxPrice) p.set('maxPrice', filters.maxPrice)
    p.set('sort', filters.sort)
    return p.toString()
  }, [filters])

  const { data: assets = [], isLoading } = useQuery<AssetWithRelations[]>({
    queryKey: ['assets', queryString],
    queryFn: async () => {
      const r = await fetch(`/api/assets?${queryString}`)
      return r.json()
    },
  })

  const priceRange: [number, number] = [
    filters.minPrice ? Number(filters.minPrice) : 0,
    filters.maxPrice ? Number(filters.maxPrice) : 1500,
  ]

  const activeFilterCount =
    (filters.category ? 1 : 0) +
    (filters.city ? 1 : 0) +
    (filters.minPrice || filters.maxPrice ? 1 : 0) +
    (filters.q ? 1 : 0)

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Explore rentals</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {isLoading ? 'Searching…' : `${assets.length} ${assets.length === 1 ? 'asset' : 'assets'} available`}
          </p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={filters.q}
            onChange={(e) => setFilters({ q: e.target.value })}
            placeholder="Search keyword…"
            className="pl-9"
          />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
        {/* Filters sidebar */}
        <aside className="lg:sticky lg:top-20 lg:h-fit">
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
                <span className="font-semibold">Filters</span>
                {activeFilterCount > 0 && (
                  <Badge variant="secondary" className="ml-1">{activeFilterCount}</Badge>
                )}
              </div>
              {activeFilterCount > 0 && (
                <Button variant="ghost" size="sm" onClick={resetFilters} className="h-7 gap-1 text-xs">
                  <X className="h-3 w-3" /> Clear
                </Button>
              )}
            </div>

            <ScrollArea className="lg:max-h-[70vh]">
              <div className="space-y-5 pr-1">
                {/* Category */}
                <div>
                  <Label className="mb-2 block text-sm font-medium">Category</Label>
                  <div className="flex flex-col gap-1">
                    <button
                      onClick={() => setFilters({ category: null })}
                      className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm transition ${
                        !filters.category ? 'bg-emerald-50 text-emerald-700 font-medium' : 'hover:bg-muted'
                      }`}
                    >
                      All categories
                    </button>
                    {categories.map((c: any) => {
                      const color = getCategoryColor(c.color)
                      const active = filters.category === c.slug
                      return (
                        <button
                          key={c.id}
                          onClick={() => setFilters({ category: active ? null : c.slug })}
                          className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm transition ${
                            active ? 'bg-emerald-50 text-emerald-700 font-medium' : 'hover:bg-muted'
                          }`}
                        >
                          <span className="flex items-center gap-2.5">
                            <span className={`relative flex h-7 w-7 shrink-0 items-center justify-center rounded-lg overflow-hidden border border-border/50 ${color.bg} ${color.text}`}>
                              {c.imageUrl && c.imageUrl.trim() ? (
                                <img src={c.imageUrl} alt={c.name} className="h-full w-full object-cover" />
                              ) : (
                                <CategoryIcon name={c.icon} className="h-3.5 w-3.5" />
                              )}
                            </span>
                            <span className="text-left font-medium">{c.name}</span>
                          </span>
                          <span className="text-xs text-muted-foreground">{c.assetCount}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* City */}
                <div>
                  <Label className="mb-2 block text-sm font-medium">Location</Label>
                  <div className="relative">
                    <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={filters.city}
                      onChange={(e) => setFilters({ city: e.target.value })}
                      placeholder="City or area"
                      className="pl-9"
                    />
                  </div>
                </div>

                {/* Price */}
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <Label className="text-sm font-medium">Max price / day</Label>
                    <span className="text-sm font-semibold text-emerald-700">${priceRange[1]}</span>
                  </div>
                  <Slider
                    value={priceRange}
                    min={0}
                    max={1500}
                    step={10}
                    onValueChange={(v) => {
                      setFilters({ minPrice: v[0] > 0 ? String(v[0]) : '', maxPrice: v[1] >= 1500 ? '' : String(v[1]) })
                    }}
                    className="mt-3"
                  />
                  <div className="mt-2 flex justify-between text-xs text-muted-foreground">
                    <span>$0</span>
                    <span>$1500+</span>
                  </div>
                </div>

                {/* Sort */}
                <div>
                  <Label className="mb-2 block text-sm font-medium">Sort by</Label>
                  <Select value={filters.sort} onValueChange={(v) => setFilters({ sort: v as any })}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="popular">Most popular</SelectItem>
                      <SelectItem value="rating">Highest rated</SelectItem>
                      <SelectItem value="priceLow">Price: low to high</SelectItem>
                      <SelectItem value="priceHigh">Price: high to low</SelectItem>
                      <SelectItem value="newest">Newest</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </ScrollArea>
          </div>
        </aside>

        {/* Results */}
        <div>
          {isLoading ? (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="overflow-hidden rounded-2xl border border-border">
                  <Skeleton className="aspect-[4/3] w-full" />
                  <div className="space-y-3 p-4">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-1/2" />
                    <Skeleton className="h-6 w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : assets.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-20 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                <Search className="h-7 w-7 text-muted-foreground" />
              </div>
              <h3 className="mt-4 text-lg font-semibold">No assets found</h3>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Try adjusting your filters or search keywords to find what you're looking for.
              </p>
              <Button onClick={resetFilters} variant="outline" className="mt-4">Clear all filters</Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {assets.map((a) => (
                <AssetCard key={a.id} asset={a} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
