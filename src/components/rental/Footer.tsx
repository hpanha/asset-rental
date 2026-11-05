'use client'

import Link from 'next/link'
import { Mail, Phone, MapPin } from 'lucide-react'
import { useStore } from '@/lib/store'

export function Footer() {
  const { goHome, goDashboard, goAddListing } = useStore()
  const year = new Date().getFullYear()

  return (
    <footer className="mt-auto border-t border-slate-900 bg-slate-950 text-slate-400">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <div className="grid gap-8 md:grid-cols-4">
          <div className="md:col-span-1">
            <div className="flex items-center gap-2.5">
              <img src="/app-logo.png" alt="Asset Rental" className="h-9 w-9 object-contain rounded-xl drop-shadow-[0_0_10px_rgba(168,85,247,0.4)]" />
              <span className="text-base font-bold text-white">Asset <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">Rental</span></span>
            </div>
            <p className="mt-3 text-sm text-slate-400">
              Rent anything, anywhere. The marketplace for properties, vehicles, gear and more.
            </p>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-slate-200">Explore</h4>
            <ul className="mt-3 space-y-2 text-sm text-slate-400">
              <li><button onClick={goHome} className="hover:text-purple-400 transition-colors">Home</button></li>
              <li><Link href="/rentals" className="hover:text-purple-400 transition-colors">Browse assets</Link></li>
              <li><button onClick={goDashboard} className="hover:text-purple-400 transition-colors">My dashboard</button></li>
              <li><button onClick={goAddListing} className="hover:text-purple-400 transition-colors">List your asset</button></li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-slate-200">Categories</h4>
            <ul className="mt-3 space-y-2 text-sm text-slate-400">
              <li><Link href="/rentals?category=cameras" className="hover:text-purple-400 transition-colors">Cameras</Link></li>
              <li><Link href="/rentals?category=drones" className="hover:text-purple-400 transition-colors">Drones</Link></li>
              <li><Link href="/rentals?category=laptops-workstations" className="hover:text-purple-400 transition-colors">Laptops</Link></li>
              <li><Link href="/rentals?category=tools-equipment" className="hover:text-purple-400 transition-colors">Tools</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-slate-200">Contact</h4>
            <ul className="mt-3 space-y-2 text-sm text-slate-400">
              <li className="flex items-center gap-2"><Mail className="h-4 w-4 text-purple-400" /> hello@renthub.app</li>
              <li className="flex items-center gap-2"><Phone className="h-4 w-4 text-purple-400" /> +1 (555) 010-2025</li>
              <li className="flex items-center gap-2"><MapPin className="h-4 w-4 text-purple-400" /> Metro City</li>
            </ul>
          </div>
        </div>

        <div className="mt-8 flex flex-col items-center justify-between gap-3 border-t border-slate-900 pt-6 text-xs text-slate-500 sm:flex-row">
          <p>© {year} Asset Rental. Built with Next.js & Tailwind CSS.</p>
          <p>Privacy · Terms · Cookies</p>
        </div>
      </div>
    </footer>
  )
}
