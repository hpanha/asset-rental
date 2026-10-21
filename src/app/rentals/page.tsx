'use client'

import { useState, useEffect, useTransition, Suspense } from 'react'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  Search,
  Filter,
  ArrowUpDown,
  Sparkles,
  MapPin,
  Star,
  CheckCircle2,
  X,
  Layers,
  ChevronRight,
  ShieldCheck,
  Compass,
  SlidersHorizontal,
  RefreshCw,
  Clock,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Header } from '@/components/rental/Header'
import { Footer } from '@/components/rental/Footer'
import { Providers } from '@/components/rental/Providers'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'

function RentalsContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [search, setSearch] = useState(searchParams.get('q') || '')
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category') || 'all')
  const [selectedBrand, setSelectedBrand] = useState(searchParams.get('brand') || 'all')
  const [selectedLocation, setSelectedLocation] = useState(searchParams.get('location') || 'all')
  const [sort, setSort] = useState(searchParams.get('sort') || 'recommended')
  const [minPrice, setMinPrice] = useState(searchParams.get('minPrice') || '')
  const [maxPrice, setMaxPrice] = useState(searchParams.get('maxPrice') || '')
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false)

  // Sync state to URL search params
  useEffect(() => {
    const params = new URLSearchParams()
    if (search.trim()) params.set('q', search.trim())
    if (selectedCategory && selectedCategory !== 'all') params.set('category', selectedCategory)
    if (selectedBrand && selectedBrand !== 'all') params.set('brand', selectedBrand)
    if (selectedLocation && selectedLocation !== 'all') params.set('location', selectedLocation)
    if (minPrice) params.set('minPrice', minPrice)
    if (maxPrice) params.set('maxPrice', maxPrice)
    if (sort && sort !== 'recommended') params.set('sort', sort)

    const newQuery = params.toString()
    const targetUrl = newQuery ? `/rentals?${newQuery}` : '/rentals'
    router.replace(targetUrl, { scroll: false })
  }, [search, selectedCategory, selectedBrand, selectedLocation, sort, minPrice, maxPrice, router])

  // Fetch Categories
  const { data: categories } = useQuery({
    queryKey: ['admin-categories'],
    queryFn: async () => {
      const res = await fetch('/api/admin/categories')
      if (!res.ok) throw new Error('Failed to fetch categories')
      return res.json()
    },
  })

  // Fetch Brands
  const { data: brands } = useQuery({
    queryKey: ['admin-brands'],
    queryFn: async () => {
      const res = await fetch('/api/admin/brands')
      if (!res.ok) throw new Error('Failed to fetch brands')
      return res.json()
    },
  })

  // Fetch Locations
  const { data: locations } = useQuery({
    queryKey: ['admin-locations'],
    queryFn: async () => {
      const res = await fetch('/api/admin/locations')
      if (!res.ok) throw new Error('Failed to fetch locations')
      return res.json()
    },
  })

  // Fetch Published Rental Catalog
  const { data: catalogData, isLoading, refetch } = useQuery({
    queryKey: ['rental-assets', search, selectedCategory, selectedBrand, selectedLocation, sort, minPrice, maxPrice],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (selectedCategory !== 'all') params.set('category', selectedCategory)
      if (selectedBrand !== 'all') params.set('brand', selectedBrand)
      if (selectedLocation !== 'all') params.set('location', selectedLocation)
      if (minPrice) params.set('minPrice', minPrice)
      if (maxPrice) params.set('maxPrice', maxPrice)
      if (sort) params.set('sort', sort)

      const res = await fetch(`/api/rental-assets?${params.toString()}`)
      if (!res.ok) throw new Error('Failed to fetch rental catalog')
      return res.json()
    },
  })

  const resetFilters = () => {
    setSearch('')
    setSelectedCategory('all')
    setSelectedBrand('all')
    setSelectedLocation('all')
    setMinPrice('')
    setMaxPrice('')
    setSort('recommended')
  }

  const items = catalogData?.items || []

  return (
    <div className="flex min-h-screen flex-col bg-slate-50/50 dark:bg-slate-950 font-sans">
      <Header />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-8 space-y-6">
        {/* Top Hero / Breadcrumb Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-border">
          <div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <Link href="/" className="hover:text-emerald-600">Home</Link>
              <span>/</span>
              <span className="text-foreground font-semibold">Rent Equipment</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Rent Commercial & Production Equipment
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Browse enterprise-ready laptops, cinema camera kits, drones, and mobility assets in Cambodia.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <Badge variant="outline" className="px-3 py-1 bg-white dark:bg-slate-900 border-border text-xs gap-1.5 shadow-2xs">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>{catalogData?.pagination?.total ?? items.length} Published Models</span>
            </Badge>

            <Link href="/admin">
              <Button size="sm" variant="outline" className="gap-1.5 text-xs border-emerald-500/30 text-emerald-700 dark:text-emerald-400">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                Admin Portal
              </Button>
            </Link>
          </div>
        </div>

        {/* Search and Quick Filters Bar */}
        <div className="flex flex-col sm:flex-row items-center gap-3 bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-border shadow-xs">
          <div className="relative flex-1 w-full">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search cameras, laptops, drones, tools, or model names..."
              className="pl-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-800/60 border-transparent focus-visible:bg-background text-sm"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {/* Sort Select */}
            <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800/60 px-3 py-1.5 rounded-xl border border-transparent text-xs w-full sm:w-auto">
              <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                className="bg-transparent font-medium text-foreground focus:outline-none cursor-pointer w-full"
              >
                <option value="recommended">Recommended</option>
                <option value="priceLow">Price: Low to High</option>
                <option value="priceHigh">Price: High to Low</option>
                <option value="rating">Highest Rated</option>
                <option value="newest">Newest Added</option>
              </select>
            </div>

            {/* Mobile Filter Button */}
            <Sheet open={mobileFilterOpen} onOpenChange={setMobileFilterOpen}>
              <SheetTrigger asChild>
                <Button size="icon" variant="outline" className="h-10 w-10 sm:hidden shrink-0 rounded-xl">
                  <SlidersHorizontal className="h-4 w-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-80">
                <SheetHeader>
                  <SheetTitle className="text-base font-bold">Filters & Refinements</SheetTitle>
                </SheetHeader>
                <div className="py-4 space-y-4 text-xs">
                  {/* Category */}
                  <div>
                    <label className="font-semibold block mb-1.5">Category</label>
                    <select
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      className="w-full h-9 px-3 rounded-lg border border-input bg-background font-medium"
                    >
                      <option value="all">All Categories</option>
                      {categories?.map((c: any) => (
                        <option key={c.id} value={c.slug}>
                          {c.parent ? `— ${c.name}` : c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Brand */}
                  <div>
                    <label className="font-semibold block mb-1.5">Brand</label>
                    <select
                      value={selectedBrand}
                      onChange={(e) => setSelectedBrand(e.target.value)}
                      className="w-full h-9 px-3 rounded-lg border border-input bg-background font-medium"
                    >
                      <option value="all">All Brands</option>
                      {brands?.map((b: any) => (
                        <option key={b.id} value={b.slug}>
                          {b.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Location */}
                  <div>
                    <label className="font-semibold block mb-1.5">Pickup Location</label>
                    <select
                      value={selectedLocation}
                      onChange={(e) => setSelectedLocation(e.target.value)}
                      className="w-full h-9 px-3 rounded-lg border border-input bg-background font-medium"
                    >
                      <option value="all">All Locations</option>
                      {locations?.map((loc: any) => (
                        <option key={loc.id} value={loc.city}>
                          {loc.city} ({loc.name})
                        </option>
                      ))}
                    </select>
                  </div>

                  <Button onClick={() => setMobileFilterOpen(false)} className="w-full bg-emerald-600 text-white mt-4">
                    Apply Filters
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>

        {/* Horizontal Category Quick Filter Bar */}
        <div className="flex items-center gap-2.5 overflow-x-auto pb-1 -mt-2 scrollbar-none">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`flex shrink-0 items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition border ${
              selectedCategory === 'all'
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-border hover:border-emerald-300'
            }`}
          >
            <span>All Equipment</span>
          </button>
          {categories?.map((cat: any) => {
            const active = selectedCategory === cat.slug || selectedCategory === cat.id
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(active ? 'all' : cat.slug)}
                className={`flex shrink-0 items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium transition border ${
                  active
                    ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border-emerald-500 font-semibold shadow-xs'
                    : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-border hover:border-emerald-400/60'
                }`}
              >
                {cat.imageUrl && cat.imageUrl.trim() ? (
                  <img
                    src={cat.imageUrl}
                    alt={cat.name}
                    className="h-5 w-5 rounded-md object-cover shrink-0 border border-border/50"
                  />
                ) : (
                  <span className="h-5 w-5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center shrink-0 text-[10px] font-bold">
                    {cat.name.charAt(0)}
                  </span>
                )}
                <span>{cat.name}</span>
                {cat._count?.listings > 0 && (
                  <span className="text-[10px] text-muted-foreground ml-0.5">
                    ({cat._count.listings})
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* Content Layout: Filter Sidebar + Products Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-start">
          {/* Desktop Filter Sidebar */}
          <aside className="hidden md:block space-y-5 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-border shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <span className="font-bold text-sm text-foreground flex items-center gap-1.5">
                <SlidersHorizontal className="h-4 w-4 text-emerald-600" />
                Filters
              </span>
              {(selectedCategory !== 'all' || selectedBrand !== 'all' || selectedLocation !== 'all' || search || minPrice || maxPrice) && (
                <button
                  onClick={resetFilters}
                  className="text-xs text-emerald-600 hover:text-emerald-700 font-medium cursor-pointer"
                >
                  Reset all
                </button>
              )}
            </div>

            {/* Categories list */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
                Category
              </label>
              <div className="space-y-1">
                <button
                  onClick={() => setSelectedCategory('all')}
                  className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium transition ${
                    selectedCategory === 'all'
                      ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 font-semibold'
                      : 'text-muted-foreground hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  All Categories
                </button>
                {categories?.map((cat: any) => {
                  const active = selectedCategory === cat.slug || selectedCategory === cat.id
                  return (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedCategory(cat.slug)}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition ${
                        active
                          ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 font-semibold'
                          : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        {cat.imageUrl && cat.imageUrl.trim() ? (
                          <img
                            src={cat.imageUrl}
                            alt={cat.name}
                            className="h-5 w-5 rounded-md object-cover shrink-0 border border-slate-200 dark:border-slate-700"
                          />
                        ) : null}
                        <span className="truncate">{cat.parent ? `↳ ${cat.name}` : cat.name}</span>
                      </div>
                      <span className="text-[10px] text-muted-foreground font-mono">
                        {cat._count?.listings ?? ''}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Location selector */}
            <div className="space-y-2 pt-3 border-t border-border">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
                Pickup City Hub
              </label>
              <select
                value={selectedLocation}
                onChange={(e) => setSelectedLocation(e.target.value)}
                className="w-full h-9 px-2.5 rounded-lg border border-input bg-background text-xs font-medium focus:ring-2 focus:ring-emerald-500"
              >
                <option value="all">All Available Hubs</option>
                {locations?.map((loc: any) => (
                  <option key={loc.id} value={loc.city}>
                    {loc.city} ({loc.code})
                  </option>
                ))}
              </select>
            </div>

            {/* Brand selector */}
            <div className="space-y-2 pt-3 border-t border-border">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
                Equipment Brand
              </label>
              <select
                value={selectedBrand}
                onChange={(e) => setSelectedBrand(e.target.value)}
                className="w-full h-9 px-2.5 rounded-lg border border-input bg-background text-xs font-medium focus:ring-2 focus:ring-emerald-500"
              >
                <option value="all">All Brands</option>
                {brands?.map((b: any) => (
                  <option key={b.id} value={b.slug}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Price Range */}
            <div className="space-y-2 pt-3 border-t border-border">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
                Price Per Day ($ USD)
              </label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  placeholder="Min"
                  value={minPrice}
                  onChange={(e) => setMinPrice(e.target.value)}
                  className="h-8 text-xs"
                />
                <span className="text-muted-foreground text-xs">—</span>
                <Input
                  type="number"
                  placeholder="Max"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
            </div>
          </aside>

          {/* Asset Products Grid */}
          <div className="md:col-span-3 space-y-4">
            {isLoading ? (
              <div className="py-20 text-center flex flex-col items-center justify-center">
                <RefreshCw className="h-8 w-8 animate-spin text-emerald-600 mb-3" />
                <p className="font-semibold text-sm text-foreground">Loading rental catalog...</p>
                <p className="text-xs text-muted-foreground mt-1">Retrieving verified available equipment listings</p>
              </div>
            ) : items.length === 0 ? (
              <div className="py-16 text-center bg-white dark:bg-slate-900 rounded-2xl border border-border p-8 shadow-xs">
                <Compass className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <h3 className="font-bold text-base text-foreground">No equipment matches your filters</h3>
                <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                  Try adjusting keywords, clearing city hubs or price constraints to discover rentable assets.
                </p>
                <Button onClick={resetFilters} variant="outline" size="sm" className="mt-4 text-xs">
                  Reset All Filters
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {items.map((item: any) => {
                  return (
                    <Link
                      key={item.id}
                      href={`/rentals/${item.slug}`}
                      className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-white dark:bg-slate-900 transition-all hover:shadow-lg hover:-translate-y-1 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      {/* Image Preview Container */}
                      <div className="relative aspect-[4/3] overflow-hidden bg-slate-100 dark:bg-slate-800">
                        <img
                          src={item.coverImage}
                          alt={item.name}
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                          loading="lazy"
                        />

                        {/* Category Chip */}
                        <div className="absolute left-3 top-3">
                          <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold bg-white/90 dark:bg-slate-900/90 text-slate-800 dark:text-slate-200 backdrop-blur shadow-2xs">
                            {item.category?.imageUrl && item.category.imageUrl.trim() ? (
                              <img src={item.category.imageUrl} alt="" className="h-3.5 w-3.5 rounded-full object-cover" />
                            ) : null}
                            {item.category?.name}
                          </span>
                        </div>

                        {/* Top Rated Badge */}
                        {item.rating >= 4.8 && (
                          <div className="absolute right-3 top-3">
                            <Badge className="bg-amber-500 text-white border-0 shadow-2xs font-semibold text-[10px]">
                              <Star className="mr-1 h-3 w-3 fill-current" />
                              Top Rated
                            </Badge>
                          </div>
                        )}

                        {/* Stock Counter Pill */}
                        <div className="absolute bottom-2.5 left-3">
                          <span
                            className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-bold backdrop-blur shadow-2xs ${
                              item.availableUnitsCount > 0
                                ? 'bg-emerald-600/90 text-white'
                                : 'bg-rose-600/90 text-white'
                            }`}
                          >
                            <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
                            {item.availableUnitsCount > 0
                              ? `${item.availableUnitsCount} available`
                              : 'Temporarily booked'}
                          </span>
                        </div>
                      </div>

                      {/* Card Body */}
                      <div className="flex flex-1 flex-col gap-2 p-4">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="font-mono text-[10px] uppercase font-semibold text-emerald-600 dark:text-emerald-400">
                              {item.code}
                            </span>
                            <h3 className="line-clamp-1 font-bold text-sm text-foreground group-hover:text-emerald-600 transition">
                              {item.name}
                            </h3>
                          </div>
                          {item.reviewCount > 0 && (
                            <div className="flex shrink-0 items-center gap-1 text-xs">
                              <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                              <span className="font-semibold">{item.rating.toFixed(1)}</span>
                            </div>
                          )}
                        </div>

                        <p className="line-clamp-2 text-xs text-muted-foreground leading-relaxed">
                          {item.shortDescription}
                        </p>

                        {/* Location Pin */}
                        <div className="flex items-center gap-1 text-[11px] text-muted-foreground mt-0.5">
                          <MapPin className="h-3 w-3 text-emerald-600 shrink-0" />
                          <span className="truncate">
                            {item.locations?.map((l: any) => l.city).join(', ') || 'Phnom Penh'}
                          </span>
                        </div>

                        {/* Pricing & Footer Action */}
                        <div className="mt-auto flex items-end justify-between pt-3 border-t border-border/60">
                          <div>
                            <span className="text-xs text-muted-foreground">From </span>
                            <span className="text-lg font-extrabold text-foreground">
                              ${item.primaryRate.amount.toFixed(2)}
                            </span>
                            <span className="text-xs text-muted-foreground"> /day</span>
                          </div>

                          <span className="text-xs font-semibold text-emerald-600 flex items-center gap-0.5 group-hover:translate-x-1 transition-transform">
                            View details <ChevronRight className="h-3.5 w-3.5" />
                          </span>
                        </div>
                      </div>
                    </Link>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}

export default function RentalsPage() {
  return (
    <Providers>
      <Suspense fallback={<div className="p-12 text-center text-sm font-semibold">Loading catalog...</div>}>
        <RentalsContent />
      </Suspense>
    </Providers>
  )
}
