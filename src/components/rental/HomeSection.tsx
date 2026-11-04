'use client'

import { useState, useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Search, ArrowRight, Shield, Calendar, CreditCard, Sparkles, Star, X, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { AssetCard } from './AssetCard'
import { useStore } from '@/lib/store'
import type { AssetWithRelations } from '@/lib/types'

export function HomeSection() {
  const [q, setQ] = useState('')
  const [appliedSearch, setAppliedSearch] = useState('')
  const categoryScrollRef = useRef<HTMLDivElement>(null)

  const scrollCategories = (direction: 'left' | 'right') => {
    if (categoryScrollRef.current) {
      categoryScrollRef.current.scrollBy({
        left: direction === 'left' ? -260 : 260,
        behavior: 'smooth',
      })
    }
  }

  // Debounce search input by 1.5 seconds: wait for user to stop typing before triggering search
  useEffect(() => {
    const trimmed = q.trim()
    if (trimmed === appliedSearch) return

    const timer = setTimeout(() => {
      setAppliedSearch(trimmed)
    }, 1500)

    return () => clearTimeout(timer)
  }, [q, appliedSearch])

  // Selected/focused category state with URL and localStorage persistence
  const [selectedCategory, setSelectedCategory] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      const urlCat = new URLSearchParams(window.location.search).get('category')
      if (urlCat) return urlCat
      const saved = localStorage.getItem('home_selected_category')
      if (saved) return saved
    }
    return null
  })

  // Synchronize selected category to URL search params and localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return
    const url = new URL(window.location.href)
    if (selectedCategory) {
      localStorage.setItem('home_selected_category', selectedCategory)
      url.searchParams.set('category', selectedCategory)
    } else {
      localStorage.removeItem('home_selected_category')
      url.searchParams.delete('category')
    }
    window.history.replaceState({}, '', url.toString())
  }, [selectedCategory])

  // Category toggle handler: focus if not selected, unfocus if already selected
  const handleCategoryToggle = (slug: string) => {
    setSelectedCategory((prev) => (prev === slug ? null : slug))
  }

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const r = await fetch('/api/categories')
      if (!r.ok) throw new Error('Failed to fetch categories')
      return r.json()
    },
  })

  // Query assets filtered by focused category and search keyword
  const { data: featured = [], isLoading: assetsLoading } = useQuery<AssetWithRelations[]>({
    queryKey: ['assets', 'featured', selectedCategory, appliedSearch],
    queryFn: async () => {
      const params = new URLSearchParams()
      params.set('limit', '24')
      if (selectedCategory) params.set('category', selectedCategory)
      if (appliedSearch) params.set('q', appliedSearch)
      const r = await fetch(`/api/assets?${params.toString()}`)
      if (!r.ok) throw new Error('Failed to fetch assets')
      return r.json()
    },
  })

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setAppliedSearch(q.trim())
  }

  const clearSearch = () => {
    setQ('')
    setAppliedSearch('')
  }

  const categoryList = Array.isArray(categories) ? categories : []
  const focusedCategoryObj = categoryList.find((c: any) => c.slug === selectedCategory)

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <img
            src="https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1600&q=80"
            alt=""
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-950/90 via-emerald-900/70 to-slate-900/50" />
        </div>

        <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-28 lg:py-32">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-sm font-medium text-white backdrop-blur">
              <Sparkles className="h-3.5 w-3.5 text-amber-300" />
              Over 10,000+ assets ready to rent
            </span>
            <h1 className="mt-5 text-4xl font-bold leading-tight tracking-tight text-white sm:text-5xl lg:text-6xl">
              Rent anything.<br />
              <span className="text-emerald-300">Own nothing.</span>
            </h1>
            <p className="mt-5 max-w-xl text-lg text-emerald-50/90">
              From beachfront villas to pro cameras and power tools — discover and book
              the gear you need, by the day, from trusted local owners.
            </p>

            <form
              onSubmit={submitSearch}
              className="mt-8 flex flex-col gap-2 rounded-2xl bg-white/95 p-2 shadow-xl backdrop-blur sm:flex-row sm:items-center"
            >
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search asset"
                  className="border-0 bg-transparent pl-10 pr-9 text-base shadow-none focus-visible:ring-0"
                />
                {q && (
                  <button
                    type="button"
                    onClick={clearSearch}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1 transition-colors"
                    title="Clear search"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              <Button type="submit" size="lg" className="gap-2 bg-emerald-600 text-white hover:bg-emerald-700">
                Search
                <ArrowRight className="h-4 w-4" />
              </Button>
            </form>

            <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-emerald-50/80">
              <span className="flex items-center gap-1.5"><Shield className="h-4 w-4" /> Secure deposits</span>
              <span className="flex items-center gap-1.5"><Calendar className="h-4 w-4" /> Free cancellation</span>
              <span className="flex items-center gap-1.5"><Star className="h-4 w-4" /> 4.8 avg rating</span>
            </div>
          </div>
        </div>
      </section>

      {/* Available Rentals Grid */}
      <section className="bg-muted/30 py-14">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Available rentals</h2>
                {focusedCategoryObj && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-xs font-semibold px-3 py-1 border border-emerald-500/30">
                    <span>Category: <strong>{focusedCategoryObj.name}</strong></span>
                    <button
                      type="button"
                      onClick={() => setSelectedCategory(null)}
                      className="ml-1 text-emerald-700 hover:text-emerald-950 dark:hover:text-white font-bold p-0.5 hover:bg-emerald-200/60 rounded-full"
                      title="Click to unfocus category"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                )}
                {appliedSearch && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-semibold px-3 py-1 border border-border">
                    <span>Keyword: “{appliedSearch}”</span>
                    <button
                      type="button"
                      onClick={clearSearch}
                      className="ml-1 hover:text-foreground font-bold p-0.5 hover:bg-slate-200 rounded-full"
                      title="Clear keyword filter"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                )}
              </div>
              <p className="mt-1 text-muted-foreground">
                {focusedCategoryObj
                  ? `Showing verified rentals in ${focusedCategoryObj.name}. Click category again to show all.`
                  : 'Top-rated and newly listed equipment ready to rent.'}
              </p>
            </div>
            {/* Normal stationary link */}
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault()
              }}
              className="hidden items-center gap-1 text-sm font-medium text-muted-foreground cursor-default sm:flex"
            >
              Explore all <ArrowRight className="h-4 w-4 opacity-50" />
            </button>
          </div>

          {/* Text-Only Category Cards Under Available Rentals - Single Scrollable Line */}
          <div className="relative mt-6 flex items-center">
            {/* Scroll Left Button */}
            <button
              type="button"
              onClick={() => scrollCategories('left')}
              className="absolute -left-3 z-10 hidden h-8 w-8 items-center justify-center rounded-full border border-border bg-background/95 shadow-md hover:bg-muted sm:flex text-muted-foreground hover:text-foreground transition-all shrink-0 cursor-pointer"
              title="Scroll left"
              aria-label="Scroll left"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            {/* Scrollable Container */}
            <div
              ref={categoryScrollRef}
              className="flex items-center gap-2.5 overflow-x-auto pb-2 pt-1 flex-nowrap scroll-smooth w-full px-1"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              {/* All Rentals Card */}
              <button
                type="button"
                onClick={() => setSelectedCategory(null)}
                className={`group shrink-0 flex items-center gap-2 rounded-xl px-4 py-2.5 text-left whitespace-nowrap transition-all ${
                  !selectedCategory
                    ? 'border-2 border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 shadow-sm ring-1 ring-emerald-500/20'
                    : 'border border-border/80 bg-card hover:border-emerald-300 hover:bg-slate-50/70 dark:hover:bg-slate-900/40 shadow-2xs'
                }`}
              >
                <span className={`text-sm font-semibold whitespace-nowrap ${!selectedCategory ? 'text-emerald-700 dark:text-emerald-400 font-bold' : 'text-foreground'}`}>
                  All Rentals
                </span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${
                  !selectedCategory 
                    ? 'bg-emerald-200/80 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300' 
                    : 'bg-muted text-muted-foreground'
                }`}>
                  All
                </span>
              </button>

              {/* Individual Category Cards */}
              {categories.map((c: any) => {
                const isFocused = selectedCategory === c.slug
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => handleCategoryToggle(c.slug)}
                    className={`group shrink-0 flex items-center gap-2 rounded-xl px-4 py-2.5 text-left whitespace-nowrap transition-all ${
                      isFocused
                        ? 'border-2 border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 shadow-sm ring-1 ring-emerald-500/20'
                        : 'border border-border/80 bg-card hover:border-emerald-300 hover:bg-slate-50/70 dark:hover:bg-slate-900/40 shadow-2xs'
                    }`}
                  >
                    <span className={`text-sm font-semibold whitespace-nowrap ${isFocused ? 'text-emerald-700 dark:text-emerald-400 font-bold' : 'text-foreground'}`}>
                      {c.name}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${
                      isFocused 
                        ? 'bg-emerald-200/80 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300' 
                        : 'bg-muted text-muted-foreground'
                    }`}>
                      {c.assetCount ?? 0}
                    </span>
                  </button>
                )
              })}
            </div>

            {/* Scroll Right Button */}
            <button
              type="button"
              onClick={() => scrollCategories('right')}
              className="absolute -right-3 z-10 hidden h-8 w-8 items-center justify-center rounded-full border border-border bg-background/95 shadow-md hover:bg-muted sm:flex text-muted-foreground hover:text-foreground transition-all shrink-0 cursor-pointer"
              title="Scroll right"
              aria-label="Scroll right"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {assetsLoading ? (
            <div className="py-20 text-center">
              <p className="text-sm font-medium text-muted-foreground animate-pulse">Loading rental assets…</p>
            </div>
          ) : featured.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center mt-8">
              <p className="text-base font-semibold text-foreground">No rentals found matching this filter</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                {focusedCategoryObj
                  ? `There are currently no published assets in ${focusedCategoryObj.name}. Click the category button above to unfocus.`
                  : 'Try searching for different keywords or browse other categories.'}
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedCategory(null)
                  clearSearch()
                }}
                className="mt-4 text-xs border-emerald-500/40 text-emerald-600 hover:bg-emerald-50"
              >
                Clear All Filters
              </Button>
            </div>
          ) : (
            <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {featured.map((a) => (
                <AssetCard key={a.id} asset={a} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">How Asset Rental works</h2>
          <p className="mt-2 text-muted-foreground">Booking your next rental in three simple steps.</p>
        </div>

        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {[
            { icon: Search, title: '1. Discover', text: 'Browse thousands of assets across properties, vehicles, gear and more. Filter by location, price and category.' },
            { icon: Calendar, title: '2. Book', text: 'Pick your dates and confirm instantly. Secure deposits and free cancellation keep you protected.' },
            { icon: CreditCard, title: '3. Enjoy', text: 'Meet the owner, pick up your rental, and enjoy. Return it and leave a review to help the community.' },
          ].map((step) => (
            <div key={step.title} className="relative rounded-2xl border border-border bg-card p-6">
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                <step.icon className="h-6 w-6" />
              </span>
              <h3 className="mt-4 text-lg font-semibold">{step.title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{step.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA banner */}
      <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6">
        <div className="overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-12 sm:px-12">
          <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-2xl font-bold text-white sm:text-3xl">Got an asset sitting idle?</h2>
              <p className="mt-2 max-w-xl text-emerald-50">
                Turn your spare room, second car, or unused gear into steady income. List it in minutes.
              </p>
            </div>
            <Button
              onClick={useStore.getState().goAddListing}
              size="lg"
              className="bg-white text-emerald-700 hover:bg-emerald-50"
            >
              Start earning
              <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </div>
      </section>
    </div>
  )
}
