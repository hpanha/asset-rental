'use client'

import Link from 'next/link'
import { LayoutGrid, Mail, Phone, MapPin } from 'lucide-react'
import { useStore } from '@/lib/store'

export function Footer() {
  const { goHome, goDashboard, goAddListing } = useStore()
  const year = new Date().getFullYear()

  return (
    <footer className="mt-auto border-t border-border bg-muted/30">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <div className="grid gap-8 md:grid-cols-4">
          <div className="md:col-span-1">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-white">
                <LayoutGrid className="h-4 w-4" />
              </div>
              <span className="text-base font-bold">Asset <span className="text-emerald-600">Rental</span></span>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              Rent anything, anywhere. The marketplace for properties, vehicles, gear and more.
            </p>
          </div>

          <div>
            <h4 className="text-sm font-semibold">Explore</h4>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li><button onClick={goHome} className="hover:text-emerald-600">Home</button></li>
              <li><Link href="/rentals" className="hover:text-emerald-600">Browse assets</Link></li>
              <li><button onClick={goDashboard} className="hover:text-emerald-600">My dashboard</button></li>
              <li><button onClick={goAddListing} className="hover:text-emerald-600">List your asset</button></li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold">Categories</h4>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li><Link href="/rentals?category=cameras" className="hover:text-emerald-600">Cameras</Link></li>
              <li><Link href="/rentals?category=drones" className="hover:text-emerald-600">Drones</Link></li>
              <li><Link href="/rentals?category=laptops-workstations" className="hover:text-emerald-600">Laptops</Link></li>
              <li><Link href="/rentals?category=tools-equipment" className="hover:text-emerald-600">Tools</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold">Contact</h4>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li className="flex items-center gap-2"><Mail className="h-4 w-4" /> hello@renthub.app</li>
              <li className="flex items-center gap-2"><Phone className="h-4 w-4" /> +1 (555) 010-2025</li>
              <li className="flex items-center gap-2"><MapPin className="h-4 w-4" /> Metro City</li>
            </ul>
          </div>
        </div>

        <div className="mt-8 flex flex-col items-center justify-between gap-3 border-t border-border pt-6 text-xs text-muted-foreground sm:flex-row">
          <p>© {year} Asset Rental. Demo marketplace built with Next.js.</p>
          <p>Privacy · Terms · Cookies</p>
        </div>
      </div>
    </footer>
  )
}
