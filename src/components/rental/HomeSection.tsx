'use client'

import { useState, useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Search, ArrowRight, Calendar, CreditCard, X, ChevronLeft, ChevronRight, ChevronDown, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { AssetCard } from './AssetCard'
import { useStore } from '@/lib/store'
import type { AssetWithRelations } from '@/lib/types'

export function HomeSection() {
  const storeSearch = useStore((s) => s.filters.q)
  const setStoreSearch = useStore((s) => s.setSearch)
  const [heroSearchInput, setHeroSearchInput] = useState(storeSearch)
  const categoryScrollRef = useRef<HTMLDivElement>(null)

  // Keep hero search input synchronized with global store
  useEffect(() => {
    setHeroSearchInput(storeSearch)
  }, [storeSearch])

  const handleHeroSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setStoreSearch(heroSearchInput.trim())
    document.getElementById('available-rentals-heading')?.scrollIntoView({ behavior: 'smooth' })
  }

  const scrollCategories = (direction: 'left' | 'right') => {
    if (categoryScrollRef.current) {
      categoryScrollRef.current.scrollBy({
        left: direction === 'left' ? -260 : 260,
        behavior: 'smooth',
      })
    }
  }

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
    queryKey: ['assets', 'featured', selectedCategory, storeSearch],
    queryFn: async () => {
      const params = new URLSearchParams()
      params.set('limit', '24')
      if (selectedCategory) params.set('category', selectedCategory)
      if (storeSearch) params.set('q', storeSearch)
      const r = await fetch(`/api/assets?${params.toString()}`)
      if (!r.ok) throw new Error('Failed to fetch assets')
      return r.json()
    },
  })

  const clearSearch = () => {
    setStoreSearch('')
  }

  const categoryList = Array.isArray(categories) ? categories : []
  const focusedCategoryObj = categoryList.find((c: any) => c.slug === selectedCategory)

  return (
    <div>
      {/* Hero: Full viewport screen on first open (no scroll needed) */}
      <section id="hero-image-section" className="relative w-full h-screen min-h-[640px] flex flex-col items-center justify-between overflow-hidden">
        {/* Softly blurred background layer */}
        <div className="absolute inset-0 z-0 overflow-hidden">
          <img
            src="/hero-rental-assets.jpg"
            alt="Asset Rental"
            className="h-full w-full object-cover object-center scale-105 filter blur-[3.5px] brightness-90 transition-all duration-700"
          />
          {/* Defocus overlay layer */}
          <div className="absolute inset-0 bg-slate-950/30 backdrop-blur-[1px]" />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-transparent to-slate-950/40" />
        </div>

        {/* Top spacer to balance the transparent header */}
        <div className="relative z-10 w-full pt-24 sm:pt-28" />

        {/* Center: Descriptive text overlaying background + Liquid Search Bar moved down */}
        <div className="relative z-10 w-full max-w-3xl px-4 flex flex-col items-center text-center my-auto">
          {/* Pill badge */}
          <span className="inline-flex items-center gap-2 rounded-full bg-purple-950/70 border border-purple-500/35 px-4 py-1.5 text-xs font-semibold text-purple-200 backdrop-blur-md shadow-lg shadow-purple-950/40">
            <Sparkles className="h-3.5 w-3.5 text-fuchsia-400" />
            <span>Discover & Rent Multi-Category Assets</span>
          </span>

          {/* Punchy Headline */}
          <h1 className="mt-4 text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-[1.12] drop-shadow-lg">
            Rent Anything On Demand.<br />
            <span className="bg-gradient-to-r from-purple-400 via-fuchsia-300 to-pink-400 bg-clip-text text-transparent">
              Villas, Supercars, Cameras & Tech.
            </span>
          </h1>

          {/* Descriptive Subtitle */}
          <p className="mt-4 max-w-xl text-sm sm:text-base text-slate-200/95 font-normal leading-relaxed drop-shadow-md">
            The modern marketplace to discover and book verified luxury villas, electric sports cars, cinema camera kits, drones, and workstation gear by the day from trusted local owners.
          </p>

          {/* Liquid Search Bar in the Hero */}
          <div id="hero-search-box" className="mt-7 w-full max-w-xl">
            <form onSubmit={handleHeroSearchSubmit} className="liquid-search-card !mt-0 w-full">
              <div className="relative flex items-center w-full">
                <Search className="h-4.5 w-4.5 text-purple-300 ml-1 mr-3 shrink-0 pointer-events-none" />
                <input
                  type="text"
                  value={heroSearchInput}
                  onChange={(e) => setHeroSearchInput(e.target.value)}
                  placeholder="Search villas, cameras, laptops, cars, equipment..."
                  className="flex-1 bg-transparent border-none outline-none text-white placeholder:text-white/50 text-sm sm:text-base font-normal tracking-wide focus:ring-0 focus:outline-none min-w-0"
                  autoComplete="off"
                  spellCheck="false"
                />
                {heroSearchInput && (
                  <button
                    type="button"
                    onClick={() => {
                      setHeroSearchInput('')
                      setStoreSearch('')
                    }}
                    className="text-white/50 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors mr-2 shrink-0"
                    title="Clear search"
                    aria-label="Clear search"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
                <button
                  type="submit"
                  className="liquid-submit-btn shrink-0"
                  title="Search asset"
                  aria-label="Search asset"
                >
                  <Search className="h-4 w-4 stroke-[2.5]" />
                  <span>Search</span>
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Scroll cue for smooth navigation to Available Rentals */}
        <button
          type="button"
          onClick={() => {
            document.getElementById('available-rentals-heading')?.scrollIntoView({ behavior: 'smooth' })
          }}
          className="relative z-20 mb-8 flex flex-col items-center gap-2 text-white/75 hover:text-white transition-all cursor-pointer group"
          aria-label="Explore available rentals"
        >
          <span className="text-[11px] font-bold tracking-widest uppercase text-white/70 group-hover:text-white transition-colors drop-shadow-md">
            Explore Rentals
          </span>
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 backdrop-blur-md border border-white/20 group-hover:border-purple-400/50 group-hover:bg-white/15 transition-all shadow-[0_0_15px_rgba(168,85,247,0.3)]">
            <ChevronDown className="h-4 w-4 animate-bounce text-purple-300 group-hover:text-purple-200" />
          </div>
        </button>
      </section>

      {/* Available Rentals Grid */}
      <section className="bg-slate-950 py-14 border-t border-slate-800/80 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <h2 id="available-rentals-heading" className="text-2xl font-bold tracking-tight sm:text-3xl text-white">Available rentals</h2>
                {focusedCategoryObj && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-950/80 text-purple-200 text-xs font-semibold px-3 py-1 border border-purple-500/40 shadow-sm">
                    <span>Category: <strong>{focusedCategoryObj.name}</strong></span>
                    <button
                      type="button"
                      onClick={() => setSelectedCategory(null)}
                      className="ml-1 text-purple-300 hover:text-white font-bold p-0.5 hover:bg-purple-800/60 rounded-full"
                      title="Click to unfocus category"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                )}
                {storeSearch && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-900 text-purple-200 text-xs font-semibold px-3 py-1 border border-purple-500/30 shadow-sm">
                    <span>Keyword: “{storeSearch}”</span>
                    <button
                      type="button"
                      onClick={clearSearch}
                      className="ml-1 hover:text-white font-bold p-0.5 hover:bg-slate-800 rounded-full"
                      title="Clear keyword filter"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                )}
              </div>
              <p className="mt-1 text-slate-400">
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
              className="hidden items-center gap-1 text-sm font-medium text-slate-400 cursor-default sm:flex"
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
              className="absolute -left-3 z-10 hidden h-8 w-8 items-center justify-center rounded-full border border-slate-800 bg-slate-900/95 shadow-md hover:bg-slate-800 sm:flex text-slate-300 hover:text-white transition-all shrink-0 cursor-pointer"
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
                    ? 'border-2 border-purple-500 bg-purple-950/80 text-purple-200 shadow-md ring-1 ring-purple-500/30'
                    : 'border border-slate-800/80 bg-slate-900/70 hover:border-purple-500/40 hover:bg-slate-800/80 text-slate-300 shadow-2xs'
                }`}
              >
                <span className={`text-sm font-semibold whitespace-nowrap ${!selectedCategory ? 'text-purple-300 font-bold' : 'text-slate-200'}`}>
                  All Rentals
                </span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${
                  !selectedCategory 
                    ? 'bg-purple-900/80 text-purple-200' 
                    : 'bg-slate-800 text-slate-400'
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
                        ? 'border-2 border-purple-500 bg-purple-950/80 text-purple-200 shadow-md ring-1 ring-purple-500/30'
                        : 'border border-slate-800/80 bg-slate-900/70 hover:border-purple-500/40 hover:bg-slate-800/80 text-slate-300 shadow-2xs'
                    }`}
                  >
                    <span className={`text-sm font-semibold whitespace-nowrap ${isFocused ? 'text-purple-300 font-bold' : 'text-slate-200'}`}>
                      {c.name}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${
                      isFocused 
                        ? 'bg-purple-900/80 text-purple-200' 
                        : 'bg-slate-800 text-slate-400'
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
              className="absolute -right-3 z-10 hidden h-8 w-8 items-center justify-center rounded-full border border-slate-800 bg-slate-900/95 shadow-md hover:bg-slate-800 sm:flex text-slate-300 hover:text-white transition-all shrink-0 cursor-pointer"
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
                className="mt-4 text-xs border-purple-500/40 text-purple-300 hover:bg-purple-950/50 hover:text-white"
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
      <section className="bg-slate-950 py-16 text-white border-t border-slate-900/80">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl text-white">How Asset Rental works</h2>
            <p className="mt-2 text-slate-400">Booking your next rental in three simple steps.</p>
          </div>

          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {[
              { icon: Search, title: '1. Discover', text: 'Browse thousands of assets across properties, vehicles, gear and more. Filter by location, price and category.' },
              { icon: Calendar, title: '2. Book', text: 'Pick your dates and confirm instantly. Secure deposits and free cancellation keep you protected.' },
              { icon: CreditCard, title: '3. Enjoy', text: 'Meet the owner, pick up your rental, and enjoy. Return it and leave a review to help the community.' },
            ].map((step) => (
              <div
                key={step.title}
                className="relative rounded-2xl border border-slate-800/90 bg-slate-900/60 p-6 shadow-xl shadow-purple-950/20 backdrop-blur-sm transition-all hover:border-purple-500/40 hover:-translate-y-1"
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-950/80 border border-purple-500/30 text-purple-400 shadow-md shadow-purple-950/40">
                  <step.icon className="h-6 w-6" />
                </span>
                <h3 className="mt-4 text-lg font-semibold text-slate-100">{step.title}</h3>
                <p className="mt-1.5 text-sm text-slate-400 leading-relaxed">{step.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA banner */}
      <section className="bg-slate-950 pb-20 pt-4">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-purple-950 via-purple-900/80 to-slate-950 border border-purple-500/30 px-6 py-12 sm:px-12 shadow-2xl shadow-purple-950/50">
            <div className="absolute -right-20 -bottom-20 h-64 w-64 rounded-full bg-purple-600/20 blur-3xl pointer-events-none" />
            <div className="relative z-10 flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
              <div>
                <h2 className="text-2xl font-bold text-white sm:text-3xl">Got an asset sitting idle?</h2>
                <p className="mt-2 max-w-xl text-purple-200/90 text-sm sm:text-base leading-relaxed">
                  Turn your spare room, electric car, camera equipment, or tech gear into steady income. List it in minutes.
                </p>
              </div>
              <Button
                onClick={useStore.getState().goAddListing}
                size="lg"
                className="bg-gradient-to-r from-purple-500 to-fuchsia-500 hover:from-purple-600 hover:to-fuchsia-600 text-white font-semibold shadow-lg shadow-purple-500/40 border border-purple-300/30 cursor-pointer transition-transform hover:scale-105"
              >
                Start earning
                <ArrowRight className="ml-1.5 h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
