'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Package,
  FolderTree,
  MapPin,
  Wrench,
  History,
  Settings,
  HelpCircle,
  LogOut,
  ExternalLink,
  Boxes,
  ChevronDown,
  ChevronRight,
  LayoutGrid,
  ClipboardCheck,
  CreditCard,
  CalendarCheck,
} from 'lucide-react'
import { Toaster } from 'sonner'
import { Providers } from '@/components/rental/Providers'

const assetSubLinks = [
  { href: '/admin/assets',      label: 'Asset Catalog', icon: Package },
  { href: '/admin/categories',  label: 'Categories',    icon: FolderTree },
  { href: '/admin/maintenance', label: 'Maintenance',   icon: Wrench },
]

const generalLinks = [
  { href: '/admin/audit', label: 'Audit Trail', icon: History },
  { href: '#',            label: 'Settings',    icon: Settings },
  { href: '#',            label: 'Help',        icon: HelpCircle },
  { href: '/',            label: 'Back to Site',icon: LogOut },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  // auto-open if currently inside any asset sub-route
  const assetGroupActive = assetSubLinks.some((l) => pathname.startsWith(l.href))
  const [assetOpen, setAssetOpen] = useState(assetGroupActive)

  const isActive = (href: string, exact = false) => {
    if (href === '#') return false
    if (exact) return pathname === href
    return pathname.startsWith(href)
  }

  // Login page renders without the sidebar shell
  if (pathname === '/admin/login') {
    return (
      <Providers>
        {children}
        <Toaster position="top-right" richColors />
      </Providers>
    )
  }

  return (
    <Providers>
      <div className="flex h-screen overflow-hidden bg-[#f0f2f5] font-sans">
        {/* Sidebar */}
        <aside className="w-[230px] shrink-0 flex flex-col bg-white shadow-sm overflow-hidden border-r border-slate-100">
          {/* Logo */}
          <div className="px-5 pt-6 pb-4">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-[#0d4a2e] text-white flex items-center justify-center shadow">
                <Boxes className="h-4 w-4" />
              </div>
              <span className="text-[15px] font-bold tracking-tight text-slate-800">
                Asset <span className="text-[#16a34a]">Rental</span>
              </span>
            </div>
          </div>

          {/* MENU section */}
          <div className="mt-1 w-full">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 px-5 mb-2">Menu</p>
            <nav className="w-full">

              {/* Dashboard */}
              <Link
                href="/admin"
                className={`w-full flex items-center gap-3 px-5 py-2.5 text-sm font-medium transition-all focus:outline-none ${
                  isActive('/admin', true)
                    ? 'bg-[#eaf6ee] text-[#0d4a2e] font-semibold'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800 focus:bg-slate-50'
                }`}
              >
                <LayoutDashboard
                  className={`h-[17px] w-[17px] shrink-0 ${
                    isActive('/admin', true) ? 'text-[#16a34a]' : 'text-slate-400'
                  }`}
                />
                Dashboard
              </Link>

              {/* Asset Management — collapsible group */}
              <div className="w-full">
                <button
                  type="button"
                  onClick={() => setAssetOpen((o) => !o)}
                  className={`w-full flex items-center gap-3 px-5 py-2.5 text-sm font-medium transition-all focus:outline-none ${
                    assetGroupActive
                      ? 'bg-[#eaf6ee] text-[#0d4a2e] font-semibold'
                      : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800 focus:bg-slate-50'
                  }`}
                >
                  <LayoutGrid
                    className={`h-[17px] w-[17px] shrink-0 ${
                      assetGroupActive ? 'text-[#16a34a]' : 'text-slate-400'
                    }`}
                  />
                  <span className="flex-1 text-left">Asset Management</span>
                  {assetOpen
                    ? <ChevronDown className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                    : <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                  }
                </button>

                {/* Sub-items */}
                <div
                  className={`overflow-hidden transition-all duration-200 ${
                    assetOpen ? 'max-h-48 opacity-100' : 'max-h-0 opacity-0'
                  }`}
                >
                  <div className="w-full py-0.5">
                    {assetSubLinks.map(({ href, label, icon: Icon }) => {
                      const active = isActive(href)
                      return (
                        <Link
                          key={href}
                          href={href}
                          className={`w-full flex items-center gap-2.5 pl-10 pr-5 py-2 text-[13px] font-medium transition-all focus:outline-none ${
                            active
                              ? 'bg-[#eaf6ee] text-[#0d4a2e] font-semibold'
                              : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800 focus:bg-slate-50'
                          }`}
                        >
                          <Icon
                            className={`h-3.5 w-3.5 shrink-0 ${
                              active ? 'text-[#16a34a]' : 'text-slate-400'
                            }`}
                          />
                          {label}
                        </Link>
                      )
                    })}
                  </div>
                </div>
              </div>

              {/* Locations — standalone */}
              <Link
                href="/admin/locations"
                className={`w-full flex items-center gap-3 px-5 py-2.5 text-sm font-medium transition-all focus:outline-none ${
                  isActive('/admin/locations')
                    ? 'bg-[#eaf6ee] text-[#0d4a2e] font-semibold'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800 focus:bg-slate-50'
                }`}
              >
                <MapPin
                  className={`h-[17px] w-[17px] shrink-0 ${
                    isActive('/admin/locations') ? 'text-[#16a34a]' : 'text-slate-400'
                  }`}
                />
                Locations
              </Link>

              {/* Rental Requests — Step 04 Admin Approval Queue */}
              <Link
                href="/admin/rental-requests"
                className={`w-full flex items-center gap-3 px-5 py-2.5 text-sm font-medium transition-all focus:outline-none ${
                  isActive('/admin/rental-requests')
                    ? 'bg-[#eaf6ee] text-[#0d4a2e] font-semibold'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800 focus:bg-slate-50'
                }`}
              >
                <ClipboardCheck
                  className={`h-[17px] w-[17px] shrink-0 ${
                    isActive('/admin/rental-requests') ? 'text-[#16a34a]' : 'text-slate-400'
                  }`}
                />
                Rental Requests
              </Link>

              {/* Payments & Deposits — Step 05 Finance Center */}
              <Link
                href="/admin/payments"
                className={`w-full flex items-center gap-3 px-5 py-2.5 text-sm font-medium transition-all focus:outline-none ${
                  isActive('/admin/payments')
                    ? 'bg-[#eaf6ee] text-[#0d4a2e] font-semibold'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800 focus:bg-slate-50'
                }`}
              >
                <CreditCard
                  className={`h-[17px] w-[17px] shrink-0 ${
                    isActive('/admin/payments') ? 'text-[#16a34a]' : 'text-slate-400'
                  }`}
                />
                Payments & Deposits
              </Link>

              {/* Reservations & Fulfillment — Step 06 */}
              <Link
                href="/admin/reservations"
                className={`w-full flex items-center gap-3 px-5 py-2.5 text-sm font-medium transition-all focus:outline-none ${
                  isActive('/admin/reservations')
                    ? 'bg-[#eaf6ee] text-[#0d4a2e] font-semibold'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800 focus:bg-slate-50'
                }`}
              >
                <CalendarCheck
                  className={`h-[17px] w-[17px] shrink-0 ${
                    isActive('/admin/reservations') ? 'text-[#16a34a]' : 'text-slate-400'
                  }`}
                />
                Reservations & Fulfillment
              </Link>

              {/* Operations Lifecycle — Steps 07 to 11 Handover, Return & Closeout */}
              <Link
                href="/admin/operations"
                className={`w-full flex items-center gap-3 px-5 py-2.5 text-sm font-medium transition-all focus:outline-none ${
                  isActive('/admin/operations')
                    ? 'bg-[#eaf6ee] text-[#0d4a2e] font-semibold'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800 focus:bg-slate-50'
                }`}
              >
                <Boxes
                  className={`h-[17px] w-[17px] shrink-0 ${
                    isActive('/admin/operations') ? 'text-[#16a34a]' : 'text-slate-400'
                  }`}
                />
                Rental Operations (7–11)
              </Link>

            </nav>
          </div>

          {/* GENERAL section */}
          <div className="mt-5 w-full">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 px-5 mb-2">General</p>
            <nav className="w-full">
              {generalLinks.map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  className="w-full flex items-center gap-3 px-5 py-2.5 text-sm font-medium text-slate-500 hover:bg-slate-50 hover:text-slate-800 focus:outline-none focus:bg-slate-50 transition-all"
                >
                  <Icon className="h-[17px] w-[17px] shrink-0 text-slate-400" />
                  {label}
                </Link>
              ))}
            </nav>
          </div>

          {/* Spacer */}
          <div className="flex-1" />
        </aside>

        {/* Main area */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Top bar */}
          <div className="flex items-center justify-between gap-3 px-6 py-3 border-b border-slate-100 bg-white shrink-0">
            {/* Customer Portal button */}
            <Link
              href="/"
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#0d4a2e] text-white text-xs font-bold hover:bg-[#0b3d25] transition shadow-sm"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Customer Portal
            </Link>

            {/* User profile */}
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-full bg-[#0d4a2e] text-white flex items-center justify-center text-xs font-bold shadow">
                VC
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800 leading-none">Vannak Chen</p>
                <p className="text-[11px] text-slate-400 mt-0.5">vannak@renthub.io</p>
              </div>
            </div>
          </div>

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto">
            {children}
          </div>
        </div>
      </div>
      <Toaster position="top-right" richColors />
    </Providers>
  )
}
