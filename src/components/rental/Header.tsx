'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { LayoutGrid, LogIn, LogOut, Shield, ClipboardList, Search, X, Sparkles } from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useStore } from '@/lib/store'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

export function Header() {
  const router = useRouter()
  const pathname = usePathname()
  const queryClient = useQueryClient()
  const { goHome, view } = useStore()

  const isHome = pathname === '/' && (!view || view === 'home')

  const [isScrolled, setIsScrolled] = useState(false)

  // Listen for scroll position to transition header ONLY when the hero image section is nearly disappeared
  useEffect(() => {
    if (!isHome) {
      setIsScrolled(true)
      return
    }

    const checkScroll = () => {
      const heroEl = document.getElementById('hero-image-section')
      if (heroEl) {
        const rect = heroEl.getBoundingClientRect()
        // When bottom of hero section is within 160px of the viewport top,
        // the hero image section has nearly disappeared.
        setIsScrolled(rect.bottom <= 160)
      } else {
        const threshold = window.innerHeight * 0.75
        setIsScrolled(window.scrollY >= threshold)
      }
    }

    window.addEventListener('scroll', checkScroll, { passive: true })
    window.addEventListener('resize', checkScroll, { passive: true })
    checkScroll()
    return () => {
      window.removeEventListener('scroll', checkScroll)
      window.removeEventListener('resize', checkScroll)
    }
  }, [isHome])

  const searchQuery = useStore((s) => s.filters.q)
  const setSearch = useStore((s) => s.setSearch)
  const [searchValue, setSearchValue] = useState(searchQuery)

  // Keep local search input in sync with global store
  useEffect(() => {
    setSearchValue(searchQuery)
  }, [searchQuery])

  // Debounce search update to store
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchValue.trim() !== searchQuery) {
        setSearch(searchValue.trim())
      }
    }, 400)
    return () => clearTimeout(timer)
  }, [searchValue, searchQuery, setSearch])

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setSearch(searchValue.trim())
    if (isHome) {
      document.getElementById('available-rentals-heading')?.scrollIntoView({ behavior: 'smooth' })
    } else {
      router.push(`/rentals?q=${encodeURIComponent(searchValue.trim())}`)
    }
  }

  const { data: me, refetch } = useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      const r = await fetch('/api/me')
      if (r.status === 401) {
        const body = await r.json().catch(() => ({}))
        if (body?.error === 'SESSION_EXPIRED') {
          toast.error('Your session has expired. Please sign in again.')
        }
        return null
      }
      if (!r.ok) return null
      return r.json()
    },
  })

  const isAuthenticated = !!me?.user

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      toast.success('Signed out successfully.')
      await queryClient.invalidateQueries({ queryKey: ['me'] })
      await refetch()
      router.push('/')
      router.refresh()
    } catch {
      toast.error('Failed to log out.')
    }
  }

  // Header search bar and small purple info bar show ONLY when the hero is nearly gone (or on non-home pages)
  const showHeaderSearch = !isHome || isScrolled
  const showSmallPurpleInfo = !isHome || isScrolled

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 w-full transition-all duration-300 ${
        isHome && !isScrolled
          ? 'bg-transparent border-none'
          : 'bg-slate-950/95 backdrop-blur-xl border-b border-purple-500/25 shadow-xl shadow-purple-950/50 text-white'
      }`}
    >
      {/* Small Purple Header with Information (appears ONLY when hero image section nearly disappears) */}
      <div
        className={`w-full overflow-hidden transition-all duration-300 ease-out bg-gradient-to-r from-purple-950 via-purple-900/90 to-slate-950 text-purple-200 border-b border-purple-500/20 ${
          showSmallPurpleInfo ? 'max-h-12 py-1.5 opacity-100' : 'max-h-0 py-0 opacity-0 pointer-events-none'
        }`}
      >
        <div className="flex items-center justify-between px-4 sm:px-8 lg:px-12 w-full text-[11px] font-medium">
          <div className="flex items-center gap-2 sm:gap-4 overflow-hidden">
            <span className="inline-flex items-center gap-1.5 text-purple-300 font-semibold shrink-0">
              <Sparkles className="h-3 w-3 text-fuchsia-400 animate-pulse" />
              <span>10,000+ Verified Assets</span>
            </span>
            <span className="hidden sm:inline text-purple-400/40">•</span>
            <span className="hidden sm:inline text-purple-200/80 truncate">Instant Booking & 100% Insured Deposits</span>
            <span className="hidden md:inline text-purple-400/40">•</span>
            <span className="hidden md:inline text-purple-300/90 font-medium">Villas, Supercars, Cinema Gear & Tech</span>
          </div>
          <div className="flex items-center gap-3 shrink-0 text-purple-300 text-[11px]">
            <span className="hidden lg:inline text-purple-300/80">⭐ 4.9/5 Owner Rating</span>
            <span className="hidden lg:inline text-purple-400/40">•</span>
            <span className="text-purple-300 font-medium">⚡ Verified Support</span>
          </div>
        </div>
      </div>

      {/* Main Header Row: Logo on Left, Search Bar in Center, Sign In on Right */}
      <div className="flex h-18 sm:h-20 w-full items-center justify-between px-4 sm:px-8 lg:px-12 gap-3 sm:gap-6">
        {/* Left: Logo */}
        <button
          onClick={goHome}
          className="flex shrink-0 items-center gap-2.5 sm:gap-3 transition-opacity hover:opacity-90 cursor-pointer"
        >
          <img
            src="/app-logo.png"
            alt="Asset Rental"
            className="h-10 w-10 sm:h-12 sm:w-12 object-contain drop-shadow-[0_0_15px_rgba(168,85,247,0.45)]"
          />
          <span className="hidden md:inline-block text-xl sm:text-2xl font-extrabold tracking-tight text-white drop-shadow-md">
            Asset <span className="bg-gradient-to-r from-purple-400 via-fuchsia-400 to-pink-400 bg-clip-text text-transparent">Rental</span>
          </span>
        </button>

        {/* Center: Search Bar in the middle (ONLY appears when hero is nearly disappeared) */}
        <div
          className={`flex-1 max-w-lg mx-2 sm:mx-6 flex justify-center transition-all duration-300 ease-out ${
            showHeaderSearch
              ? 'opacity-100 pointer-events-auto scale-100 translate-y-0'
              : 'opacity-0 pointer-events-none scale-95 -translate-y-3'
          }`}
        >
          <form onSubmit={handleSearchSubmit} className="liquid-search-card !mt-0 w-full">
            <div className="relative flex items-center w-full">
              <Search className="h-4 w-4 sm:h-4.5 sm:w-4.5 text-purple-300 ml-1 mr-2 sm:mr-3 shrink-0 pointer-events-none" />
              <input
                type="text"
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                placeholder="Search villas, cameras, laptops, cars..."
                className="flex-1 bg-transparent border-none outline-none text-white placeholder:text-white/50 text-xs sm:text-sm font-normal tracking-wide focus:ring-0 focus:outline-none min-w-0"
                autoComplete="off"
                spellCheck="false"
              />
              {searchValue && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchValue('')
                    setSearch('')
                  }}
                  className="text-white/50 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors mr-1 sm:mr-2 shrink-0"
                  title="Clear search"
                  aria-label="Clear search"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
              <button
                type="submit"
                className="liquid-submit-btn shrink-0"
                title="Search asset"
                aria-label="Search asset"
              >
                <Search className="h-3.5 w-3.5 stroke-[2.5]" />
                <span className="hidden sm:inline">Search</span>
              </button>
            </div>
          </form>
        </div>

        {/* Right Corner: Glass Purple Login Button or User Menu */}
        <div className="flex shrink-0 items-center">
          {isAuthenticated ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="rounded-full ring-offset-background transition focus:outline-none focus:ring-2 focus:ring-purple-400 cursor-pointer"
                  aria-label="Account menu"
                >
                  <Avatar className="h-10 w-10 sm:h-11 sm:w-11 border-2 border-purple-400/50 ring-2 ring-purple-500/30 shadow-[0_0_15px_rgba(168,85,247,0.4)]">
                    {me?.user?.avatar ? (
                      <img src={me.user.avatar} alt={me.user.name} className="h-full w-full object-cover" />
                    ) : (
                      <AvatarFallback className="bg-gradient-to-br from-purple-600 to-fuchsia-600 text-white text-sm font-semibold">
                        {(me?.user?.name || 'U').charAt(0)}
                      </AvatarFallback>
                    )}
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 bg-slate-900 border-slate-800 text-white shadow-xl">
                <DropdownMenuLabel>
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{me.user.name}</p>
                    <p className="text-xs leading-none text-slate-400">{me.user.email}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-slate-800" />
                <DropdownMenuItem asChild>
                  <Link href="/rentals/my-requests" className="cursor-pointer hover:bg-slate-800">
                    <ClipboardList className="mr-2 h-4 w-4 text-purple-400" />
                    <span>My Requests</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/rentals/active" className="cursor-pointer hover:bg-slate-800">
                    <LayoutGrid className="mr-2 h-4 w-4 text-purple-400" />
                    <span>Active Rentals</span>
                  </Link>
                </DropdownMenuItem>
                {me?.user?.role === 'admin' && (
                  <DropdownMenuItem asChild>
                    <Link href="/admin" className="cursor-pointer font-medium text-purple-400 hover:bg-slate-800">
                      <Shield className="mr-2 h-4 w-4 text-purple-400" />
                      <span>Admin Console</span>
                    </Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator className="bg-slate-800" />
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="cursor-pointer text-red-400 focus:text-red-400 hover:bg-slate-800"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sign Out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Link
              href="/login"
              className="glass-purple-btn"
              title="Sign In"
              aria-label="Sign In"
            >
              <div className="sign">
                <LogIn className="h-5 w-5" />
              </div>
              <div className="text">Sign In</div>
            </Link>
          )}
        </div>
      </div>
    </header>
  )
}
