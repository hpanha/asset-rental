'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { LayoutGrid, Menu, X, Compass, ClipboardList, LogIn, LogOut, User, Shield } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetClose,
} from '@/components/ui/sheet'
import { useStore } from '@/lib/store'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

export function Header() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { goHome } = useStore()
  const [mobileOpen, setMobileOpen] = useState(false)

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

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/80 bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        {/* Logo */}
        <button onClick={goHome} className="flex shrink-0 items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-sm">
            <LayoutGrid className="h-5 w-5" />
          </div>
          <span className="text-lg font-bold tracking-tight">
            Asset <span className="text-emerald-600">Rental</span>
          </span>
        </button>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-3 md:flex">
          <Link
            href="/rentals"
            className="text-sm font-medium text-muted-foreground hover:text-emerald-600 transition px-3 py-1.5 rounded-lg hover:bg-muted"
          >
            Browse Assets
          </Link>

          {isAuthenticated ? (
            <>
              <Link
                href="/rentals/my-requests"
                className="text-sm font-medium text-muted-foreground hover:text-emerald-600 transition px-3 py-1.5 rounded-lg hover:bg-muted"
              >
                My Requests
              </Link>
              <Link
                href="/rentals/active"
                className="text-sm font-medium text-muted-foreground hover:text-emerald-600 transition px-3 py-1.5 rounded-lg hover:bg-muted"
              >
                Active Rentals
              </Link>

              {/* Account Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className="ml-1 rounded-full ring-offset-background transition focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                    aria-label="Account menu"
                  >
                    <Avatar className="h-9 w-9 border-2 border-background ring-1 ring-border">
                      {me?.user?.avatar ? (
                        <img src={me.user.avatar} alt={me.user.name} className="h-full w-full object-cover" />
                      ) : (
                        <AvatarFallback className="bg-emerald-100 text-emerald-700 text-sm font-semibold">
                          {(me?.user?.name || 'U').charAt(0)}
                        </AvatarFallback>
                      )}
                    </Avatar>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">{me.user.name}</p>
                      <p className="text-xs leading-none text-muted-foreground">{me.user.email}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/rentals/my-requests" className="cursor-pointer">
                      <ClipboardList className="mr-2 h-4 w-4 text-emerald-600" />
                      <span>My Requests</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/rentals/active" className="cursor-pointer">
                      <LayoutGrid className="mr-2 h-4 w-4 text-emerald-600" />
                      <span>Active Rentals</span>
                    </Link>
                  </DropdownMenuItem>
                  {me?.user?.role === 'admin' && (
                    <DropdownMenuItem asChild>
                      <Link href="/admin" className="cursor-pointer font-medium text-emerald-700">
                        <Shield className="mr-2 h-4 w-4 text-emerald-600" />
                        <span>Admin Console</span>
                      </Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleLogout}
                    className="cursor-pointer text-destructive focus:text-destructive"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Sign Out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white transition shadow-sm"
            >
              <LogIn className="h-3.5 w-3.5" />
              Sign In
            </Link>
          )}
        </nav>

        {/* Mobile */}
        <div className="flex items-center gap-2 md:hidden">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button size="icon" variant="ghost" aria-label="Menu">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72">
              <div className="flex flex-col gap-2 pt-6">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-lg font-bold">Menu</span>
                  <SheetClose asChild>
                    <Button size="icon" variant="ghost"><X className="h-4 w-4" /></Button>
                  </SheetClose>
                </div>

                <Link
                  href="/rentals"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 text-sm font-medium rounded-lg hover:bg-muted text-foreground"
                >
                  <Compass className="h-4 w-4 text-emerald-600" />
                  Browse Assets Catalog
                </Link>

                {isAuthenticated ? (
                  <>
                    <Link
                      href="/rentals/my-requests"
                      onClick={() => setMobileOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 text-sm font-medium rounded-lg hover:bg-muted text-foreground"
                    >
                      <ClipboardList className="h-4 w-4 text-emerald-600" />
                      My Requests
                    </Link>

                    <Link
                      href="/rentals/active"
                      onClick={() => setMobileOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 text-sm font-medium rounded-lg hover:bg-muted text-foreground"
                    >
                      <LayoutGrid className="h-4 w-4 text-emerald-600" />
                      Active Rentals
                    </Link>

                    <div className="mt-4 flex items-center gap-3 rounded-xl border p-3">
                      <Avatar className="h-10 w-10">
                        {me?.user?.avatar ? (
                          <img src={me.user.avatar} alt={me.user.name} className="h-full w-full object-cover" />
                        ) : (
                          <AvatarFallback className="bg-emerald-100 text-emerald-700">
                            {(me?.user?.name || 'U').charAt(0)}
                          </AvatarFallback>
                        )}
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{me.user.name}</p>
                        <p className="truncate text-xs text-muted-foreground">{me.user.email}</p>
                      </div>
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setMobileOpen(false)
                        handleLogout()
                      }}
                      className="mt-2 w-full text-xs text-destructive border-destructive/20 hover:bg-destructive/10"
                    >
                      <LogOut className="mr-1.5 h-3.5 w-3.5" />
                      Sign Out
                    </Button>
                  </>
                ) : (
                  <div className="mt-4 pt-4 border-t border-border">
                    <Button
                      asChild
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold gap-2"
                      onClick={() => setMobileOpen(false)}
                    >
                      <Link href="/login">
                        <LogIn className="h-4 w-4" />
                        Sign In to Account
                      </Link>
                    </Button>
                  </div>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  )
}
