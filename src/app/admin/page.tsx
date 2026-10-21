'use client'

import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import {
  Package,
  CheckCircle2,
  Layers,
  Wrench,
  ArrowUpRight,
  Plus,
  FolderTree,
  History,
  TrendingUp,
} from 'lucide-react'
import { Button } from '@/components/ui/button'

/* ─── tiny helpers ─────────────────────────────── */
const BAR_DATA = [
  { day: 'Mon', h: 48 },
  { day: 'Tue', h: 72 },
  { day: 'Wed', h: 60 },
  { day: 'Thu', h: 38 },
  { day: 'Fri', h: 55 },
  { day: 'Sat', h: 30 },
  { day: 'Sun', h: 88 },
]

function BarChart() {
  const max = Math.max(...BAR_DATA.map((b) => b.h))
  return (
    <div className="flex items-end gap-2 h-36 w-full">
      {BAR_DATA.map((b) => {
        const pct = (b.h / max) * 100
        const isMax = b.h === max
        return (
          <div key={b.day} className="flex flex-col items-center gap-1 flex-1">
            {isMax && (
              <span className="text-[10px] font-bold text-white bg-[#0d4a2e] px-1.5 py-0.5 rounded-full">
                {b.h}%
              </span>
            )}
            <div className="w-full rounded-t-lg relative overflow-hidden" style={{ height: `${pct}%` }}>
              {/* hatched inactive bars */}
              {isMax ? (
                <div className="absolute inset-0 bg-[#0d4a2e] rounded-t-lg" />
              ) : (
                <div
                  className="absolute inset-0 rounded-t-lg"
                  style={{
                    background: `repeating-linear-gradient(
                      -45deg,
                      #d1fae5 0px,
                      #d1fae5 3px,
                      #f0fdf4 3px,
                      #f0fdf4 8px
                    )`,
                  }}
                />
              )}
            </div>
            <span className="text-[11px] text-slate-400">{b.day}</span>
          </div>
        )
      })}
    </div>
  )
}

/* ─── status badge ─────────────────────────────── */
function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    published:  'bg-emerald-100 text-emerald-700',
    draft:      'bg-yellow-100  text-yellow-700',
    maintenance:'bg-red-100     text-red-600',
    active:     'bg-blue-100    text-blue-700',
  }
  return (
    <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${map[status] ?? 'bg-slate-100 text-slate-500'}`}>
      {status}
    </span>
  )
}

/* ─── page ─────────────────────────────────────── */
export default function AdminDashboardPage() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const res = await fetch('/api/admin/stats')
      if (!res.ok) throw new Error('Failed to fetch stats')
      return res.json()
    },
    refetchInterval: 10000,
  })

  const kpis = [
    {
      label: 'Total Listings',
      value: isLoading ? '—' : stats?.listings?.total ?? 0,
      sub: 'Increased from last month',
      dark: true,
    },
    {
      label: 'Published',
      value: isLoading ? '—' : stats?.listings?.published ?? 0,
      sub: 'Active in catalog',
      dark: false,
    },
    {
      label: 'Physical Units',
      value: isLoading ? '—' : stats?.units?.total ?? 0,
      sub: `${stats?.units?.active ?? 0} active`,
      dark: false,
    },
    {
      label: 'In Maintenance',
      value: isLoading ? '—' : stats?.units?.maintenance ?? 0,
      sub: 'Excluded from rentals',
      dark: false,
    },
  ]

  return (
    <div className="px-6 pb-10 max-w-5xl mx-auto w-full">
      {/* Page heading */}
      <div className="mb-6">
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Dashboard</h1>
        <p className="text-sm text-slate-400 mt-1">Manage inventory, assets, and rental operations.</p>
      </div>

      {/* ── KPI row ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {kpis.map((k) => (
          <div
            key={k.label}
            className={`rounded-2xl p-5 flex flex-col gap-3 ${
              k.dark
                ? 'bg-[#0d4a2e] text-white'
                : 'bg-white text-slate-800'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className={`text-xs font-semibold uppercase tracking-wide ${k.dark ? 'text-white/60' : 'text-slate-400'}`}>
                {k.label}
              </span>
              <div className={`h-7 w-7 rounded-full flex items-center justify-center ${k.dark ? 'bg-white/10' : 'bg-slate-100'}`}>
                <ArrowUpRight className={`h-3.5 w-3.5 ${k.dark ? 'text-white' : 'text-slate-400'}`} />
              </div>
            </div>
            <p className={`text-4xl font-extrabold leading-none ${k.dark ? 'text-white' : 'text-slate-900'}`}>
              {k.value}
            </p>
            <p className={`text-[11px] flex items-center gap-1 ${k.dark ? 'text-white/60' : 'text-slate-400'}`}>
              <TrendingUp className="h-3 w-3" />
              {k.sub}
            </p>
          </div>
        ))}
      </div>

      {/* ── Main grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Analytics card — 2 cols */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-slate-900">Asset Analytics</h2>
            <span className="text-[11px] text-slate-400">This week</span>
          </div>
          <BarChart />
        </div>

        {/* Quick Actions — 1 col */}
        <div className="bg-white rounded-2xl p-5 shadow-xs flex flex-col gap-3">
          <h2 className="text-base font-bold text-slate-900">Quick Actions</h2>
          <Link href="/admin/assets/new">
            <Button className="w-full gap-2 bg-[#0d4a2e] hover:bg-[#0b3d25] text-white font-semibold rounded-xl">
              <Plus className="h-4 w-4" />
              Add New Asset
            </Button>
          </Link>
          {[
            { href: '/admin/assets', label: 'Asset Catalog', icon: Package, color: 'bg-blue-50 text-blue-600' },
            { href: '/admin/categories', label: 'Categories', icon: FolderTree, color: 'bg-emerald-50 text-emerald-600' },
            { href: '/admin/maintenance', label: 'Maintenance', icon: Wrench, color: 'bg-amber-50 text-amber-600' },
          ].map((item) => (
            <Link key={item.href} href={item.href}>
              <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-slate-100 hover:border-emerald-200 hover:bg-[#f6fdf8] transition group">
                <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${item.color}`}>
                  <item.icon className="h-4 w-4" />
                </div>
                <span className="text-sm font-medium text-slate-700 group-hover:text-[#0d4a2e]">{item.label}</span>
                <ArrowUpRight className="h-3.5 w-3.5 ml-auto text-slate-300 group-hover:text-[#16a34a]" />
              </div>
            </Link>
          ))}
        </div>

        {/* Recent Audit Trail — full width */}
        <div className="lg:col-span-3 bg-white rounded-2xl shadow-xs overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <History className="h-4 w-4 text-[#16a34a]" />
              <h2 className="text-base font-bold text-slate-900">Recent Activity</h2>
            </div>
            <Link href="/admin/audit" className="text-xs font-medium text-[#16a34a] hover:underline">
              View all
            </Link>
          </div>
          <div className="divide-y divide-slate-50">
            {stats?.recentAuditEvents?.length > 0 ? (
              stats.recentAuditEvents.map((evt: any) => (
                <div key={evt.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50 transition">
                  <div className="h-9 w-9 rounded-full bg-[#eaf6ee] text-[#16a34a] flex items-center justify-center shrink-0">
                    <CheckCircle2 className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">{evt.action}</p>
                    <p className="text-xs text-slate-400 truncate">
                      {evt.listing
                        ? `${evt.listing.code} — ${evt.listing.name}`
                        : `${evt.entityType} #${evt.entityId?.slice(0, 8)}`}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <StatusBadge status={evt.action?.toLowerCase().includes('publish') ? 'published' : 'active'} />
                    <p className="text-[10px] text-slate-400 mt-1">
                      {new Date(evt.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="px-5 py-8 text-center text-sm text-slate-400">
                No recent audit events recorded.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

