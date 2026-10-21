'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import {
  Wrench,
  Plus,
  Search,
  RefreshCw,
  ExternalLink,
  Archive,
  RotateCcw,
  Calendar,
  Layers,
  MapPin,
  Clock,
  MoreVertical,
  SlidersHorizontal,
  CheckCircle2,
  AlertTriangle,
  FileText,
  User,
  ShieldCheck,
  Tag,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { toast } from 'sonner'

type ColumnKey =
  | 'code'
  | 'image'
  | 'description'
  | 'target'
  | 'scheduledBy'
  | 'date'
  | 'status'
  | 'location'
  | 'category'
  | 'condition'
  | 'createdDate'

interface ColumnConfig {
  key: ColumnKey
  label: string
  defaultVisible: boolean
}

const AVAILABLE_COLUMNS: ColumnConfig[] = [
  { key: 'code', label: 'Code', defaultVisible: true },
  { key: 'description', label: 'Description', defaultVisible: true },
  { key: 'target', label: 'Target', defaultVisible: true },
  { key: 'scheduledBy', label: 'Scheduled By', defaultVisible: true },
  { key: 'date', label: 'Scheduled Date', defaultVisible: true },
  { key: 'status', label: 'Status', defaultVisible: false },
  { key: 'image', label: 'Image', defaultVisible: false },
  { key: 'location', label: 'Location / Hub', defaultVisible: false },
  { key: 'category', label: 'Category', defaultVisible: false },
  { key: 'condition', label: 'Condition', defaultVisible: false },
  { key: 'createdDate', label: 'Registered Date', defaultVisible: false },
]

const DEFAULT_VISIBLE_COLUMNS: Record<ColumnKey, boolean> = {
  code: true,
  description: true,
  target: true,
  scheduledBy: true,
  date: true,
  status: false,
  image: false,
  location: false,
  category: false,
  condition: false,
  createdDate: false,
}

export default function AdminMaintenancePage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [selectedStatus, setSelectedStatus] = useState('all')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [visibleColumns, setVisibleColumns] = useState<Record<ColumnKey, boolean>>(DEFAULT_VISIBLE_COLUMNS)

  // Schedule Maintenance Dialog State
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false)
  const [scheduleForm, setScheduleForm] = useState({
    listingId: '',
    unitId: '',
    reason: '',
    startAt: '',
    endAt: '',
    notes: '',
  })

  // Load saved column preferences
  useEffect(() => {
    try {
      const saved = localStorage.getItem('admin_maintenance_columns_prefs')
      if (saved) {
        const parsed = JSON.parse(saved)
        setVisibleColumns((prev) => ({ ...prev, ...parsed }))
      }
    } catch {}
  }, [])

  const toggleColumn = (key: ColumnKey) => {
    setVisibleColumns((prev) => {
      const next = { ...prev, [key]: !prev[key] }
      try {
        localStorage.setItem('admin_maintenance_columns_prefs', JSON.stringify(next))
      } catch {}
      return next
    })
  }

  const resetColumns = () => {
    setVisibleColumns(DEFAULT_VISIBLE_COLUMNS)
    try {
      localStorage.setItem('admin_maintenance_columns_prefs', JSON.stringify(DEFAULT_VISIBLE_COLUMNS))
    } catch {}
  }

  // Fetch Maintenance Records
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin-maintenance', search, selectedStatus, selectedCategory],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (selectedStatus !== 'all') params.set('status', selectedStatus)
      if (selectedCategory !== 'all') params.set('categoryId', selectedCategory)

      const res = await fetch(`/api/admin/maintenance?${params.toString()}`)
      if (!res.ok) throw new Error('Failed to fetch maintenance records')
      return res.json()
    },
  })

  // Restore Mutation (Restore to Active)
  const restoreMutation = useMutation({
    mutationFn: async (item: any) => {
      const res = await fetch('/api/admin/maintenance/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          blockId: item.blockId,
          unitId: item.unitId,
          listingId: item.listingId,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to restore item')
      return json
    },
    onSuccess: (res) => {
      toast.success(res.message || 'Restored back to active inventory!')
      queryClient.invalidateQueries({ queryKey: ['admin-maintenance'] })
      queryClient.invalidateQueries({ queryKey: ['admin-assets'] })
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] })
    },
    onError: (err: any) => toast.error(err.message),
  })

  // Archive Mutation (Archive item / unit)
  const archiveMutation = useMutation({
    mutationFn: async (item: any) => {
      const res = await fetch('/api/admin/maintenance/archive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          blockId: item.blockId,
          unitId: item.unitId,
          listingId: item.listingId,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to archive item')
      return json
    },
    onSuccess: (res) => {
      toast.success(res.message || 'Item archived safely.')
      queryClient.invalidateQueries({ queryKey: ['admin-maintenance'] })
      queryClient.invalidateQueries({ queryKey: ['admin-assets'] })
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] })
    },
    onError: (err: any) => toast.error(err.message),
  })

  // Schedule New Maintenance Mutation
  const scheduleMutation = useMutation({
    mutationFn: async (payload: typeof scheduleForm) => {
      const res = await fetch('/api/admin/maintenance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to schedule maintenance')
      return json
    },
    onSuccess: (res) => {
      toast.success(res.message || 'Maintenance scheduled successfully!')
      setScheduleDialogOpen(false)
      setScheduleForm({
        listingId: '',
        unitId: '',
        reason: '',
        startAt: '',
        endAt: '',
        notes: '',
      })
      queryClient.invalidateQueries({ queryKey: ['admin-maintenance'] })
      queryClient.invalidateQueries({ queryKey: ['admin-assets'] })
    },
    onError: (err: any) => toast.error(err.message),
  })

  const items = data?.items || []
  const stats = data?.stats || { total: 0, maintenance: 0, scheduled: 0, archived: 0, completed: 0 }
  const categories = data?.categories || []
  const listings = data?.listings || []

  // Available units for the selected listing in the schedule modal
  const selectedListingUnits = useMemo(() => {
    if (!scheduleForm.listingId) return []
    const listing = listings.find((l: any) => l.id === scheduleForm.listingId)
    return listing?.units || []
  }, [scheduleForm.listingId, listings])

  const activeColCount = Object.values(visibleColumns).filter(Boolean).length + 1 // +1 for Action

  const formatDateDisplay = (startStr?: string, endStr?: string | null) => {
    if (!startStr) return '—'
    try {
      const s = new Date(startStr)
      const sFormatted = s.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
      if (!endStr) return sFormatted
      const e = new Date(endStr)
      const eFormatted = e.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
      return `${sFormatted} — ${eFormatted}`
    } catch {
      return startStr
    }
  }

  return (
    <div className="p-6 max-w-7xl mx-auto w-full space-y-6">
      {/* Top Title & Primary Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Maintenance & Blackout Schedule
            </h1>
            <Badge variant="secondary" className="font-semibold text-xs">
              {stats.total} Records
            </Badge>
            {stats.maintenance > 0 && (
              <Badge className="bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/60 dark:text-amber-400 font-semibold text-xs">
                {stats.maintenance} In Service
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Screen 4 — Calendar & Unavailability: Units under maintenance are safely excluded from customer date availability.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-1.5">
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </Button>
          <Button
            size="sm"
            onClick={() => {
              // Pre-fill dates default: today and 7 days later
              const today = new Date().toISOString().split('T')[0]
              const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
              setScheduleForm({
                listingId: listings[0]?.id || '',
                unitId: '',
                reason: '',
                startAt: today,
                endAt: nextWeek,
                notes: '',
              })
              setScheduleDialogOpen(true)
            }}
            className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-sm"
          >
            <Plus className="h-4 w-4" />
            Schedule Maintenance
          </Button>
        </div>
      </div>

      {/* Filter and Search Bar with Column Chooser (matching assets page) */}
      <div className="flex flex-col md:flex-row items-center gap-3 bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-border shadow-2xs">
        <div className="relative flex-1 w-full">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search code, description, target equipment, notes..."
            className="pl-9 h-9 text-xs"
          />
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-2 w-full md:w-auto flex-wrap sm:flex-nowrap">
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="h-9 px-3 text-xs rounded-md border border-input bg-background font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500 w-full sm:w-44"
          >
            <option value="all">All Statuses ({stats.total})</option>
            <option value="MAINTENANCE">Active Maintenance ({stats.maintenance})</option>
            <option value="SCHEDULED">Scheduled Blackout ({stats.scheduled})</option>
            <option value="ARCHIVED">Archived / Retired ({stats.archived})</option>
            <option value="COMPLETED">Completed ({stats.completed})</option>
          </select>

          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="h-9 px-3 text-xs rounded-md border border-input bg-background font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500 w-full sm:w-44"
          >
            <option value="all">All Categories</option>
            {categories.map((cat: any) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>

          {/* Column Chooser Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-9 gap-1.5 text-xs font-medium">
                <SlidersHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
                <span>Columns</span>
                <Badge
                  variant="secondary"
                  className="h-5 px-1.5 text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold ml-0.5"
                >
                  {Object.values(visibleColumns).filter(Boolean).length}
                </Badge>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 text-xs">
              <DropdownMenuLabel className="text-xs font-semibold flex items-center justify-between">
                <span>Manage Columns</span>
                <button
                  onClick={resetColumns}
                  className="text-[11px] font-normal text-emerald-600 hover:underline"
                >
                  Reset
                </button>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />

              {/* Fixed Column Note */}
              <div className="px-2 py-1.5 text-[11px] text-muted-foreground flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                <span>Action column is fixed</span>
              </div>
              <DropdownMenuSeparator />

              {AVAILABLE_COLUMNS.map((col) => (
                <DropdownMenuCheckboxItem
                  key={col.key}
                  checked={visibleColumns[col.key]}
                  onCheckedChange={() => toggleColumn(col.key)}
                  className="text-xs cursor-pointer"
                >
                  {col.label}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Main Table (matching assets page table layout) */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-border shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 font-semibold border-b border-border">
              <tr>
                {visibleColumns.code && <th className="py-2.5 px-3 whitespace-nowrap">Code</th>}
                {visibleColumns.image && <th className="py-2.5 px-3 whitespace-nowrap">Image</th>}
                {visibleColumns.description && <th className="py-2.5 px-3 min-w-[150px]">Description</th>}
                {visibleColumns.target && <th className="py-2.5 px-3 whitespace-nowrap">Target</th>}
                {visibleColumns.scheduledBy && <th className="py-2.5 px-3 whitespace-nowrap">Scheduled By</th>}
                {visibleColumns.date && <th className="py-2.5 px-3 whitespace-nowrap">Date</th>}
                {visibleColumns.status && <th className="py-2.5 px-3 whitespace-nowrap">Status</th>}
                {visibleColumns.location && <th className="py-2.5 px-3 whitespace-nowrap">Location</th>}
                {visibleColumns.category && <th className="py-2.5 px-3 whitespace-nowrap">Category</th>}
                {visibleColumns.condition && <th className="py-2.5 px-3 whitespace-nowrap">Condition</th>}
                {visibleColumns.createdDate && <th className="py-2.5 px-3 whitespace-nowrap">Registered</th>}
                <th className="py-2.5 px-3 text-right whitespace-nowrap">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr>
                  <td colSpan={activeColCount} className="py-12 text-center text-muted-foreground">
                    <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-emerald-600" />
                    Loading maintenance schedule...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={activeColCount} className="py-12 text-center">
                    <Wrench className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="font-semibold text-slate-800 dark:text-slate-200">No maintenance records found</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      All units are operational or no records match your search criteria.
                    </p>
                    <Button
                      size="sm"
                      onClick={() => setScheduleDialogOpen(true)}
                      className="mt-3 bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Schedule Maintenance
                    </Button>
                  </td>
                </tr>
              ) : (
                items.map((item: any) => {
                  const isArchived = item.status === 'ARCHIVED'
                  const isMaintenance = item.status === 'MAINTENANCE'
                  const isScheduled = item.status === 'SCHEDULED'

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition group"
                    >
                      {/* Code */}
                      {visibleColumns.code && (
                        <td className="py-3 px-3 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-200/60">
                              {item.code}
                            </span>
                            {!visibleColumns.status && (
                              <span
                                className={`inline-block h-2 w-2 rounded-full ${
                                  isMaintenance
                                    ? 'bg-amber-500'
                                    : isScheduled
                                    ? 'bg-blue-500'
                                    : isArchived
                                    ? 'bg-slate-400'
                                    : 'bg-emerald-500'
                                }`}
                                title={`Status: ${item.status}`}
                              />
                            )}
                          </div>
                        </td>
                      )}

                      {/* Image */}
                      {visibleColumns.image && (
                        <td className="py-3 px-3">
                          <div className="h-10 w-12 rounded bg-muted overflow-hidden shrink-0 border border-border">
                            {item.coverImage ? (
                              <img
                                src={item.coverImage}
                                alt={item.listingName}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-[10px] text-muted-foreground">
                                No Pic
                              </div>
                            )}
                          </div>
                        </td>
                      )}

                      {/* Description */}
                      {visibleColumns.description && (
                        <td className="py-3 px-3 min-w-[150px] max-w-xs">
                          <p className="font-semibold text-slate-900 dark:text-white line-clamp-1">
                            {item.description}
                          </p>
                          {item.notes && item.notes !== item.description && (
                            <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">
                              {item.notes}
                            </p>
                          )}
                        </td>
                      )}

                      {/* Target */}
                      {visibleColumns.target && (
                        <td className="py-3 px-3 whitespace-nowrap">
                          <div className="flex flex-col gap-0.5">
                            <div className="flex items-center gap-1.5">
                              <Badge
                                variant={item.targetType === 'UNIT' ? 'secondary' : 'outline'}
                                className="text-[10px] font-semibold uppercase tracking-wider py-0"
                              >
                                {item.target}
                              </Badge>
                              {item.conditionGrade && (
                                <span className="text-[10px] text-muted-foreground bg-slate-100 dark:bg-slate-800 px-1 py-0.2 rounded font-mono">
                                  {item.conditionGrade}
                                </span>
                              )}
                            </div>
                            <Link
                              href={`/admin/assets/${item.listingId}`}
                              className="font-medium text-[11px] text-slate-700 dark:text-slate-300 hover:text-emerald-600 hover:underline truncate max-w-[180px]"
                            >
                              {item.targetTitle}
                            </Link>
                          </div>
                        </td>
                      )}

                      {/* Scheduled By */}
                      {visibleColumns.scheduledBy && (
                        <td className="py-3 px-3 whitespace-nowrap text-xs text-slate-700 dark:text-slate-300 font-medium">
                          <span className="inline-flex items-center gap-1">
                            <User className="h-3 w-3 text-muted-foreground" />
                            {item.scheduledBy}
                          </span>
                        </td>
                      )}

                      {/* Date */}
                      {visibleColumns.date && (
                        <td className="py-3 px-3 whitespace-nowrap text-xs">
                          <span className="font-mono text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                            <Calendar className="h-3 w-3 text-muted-foreground" />
                            {formatDateDisplay(item.startAt, item.endAt)}
                          </span>
                        </td>
                      )}

                      {/* Status */}
                      {visibleColumns.status && (
                        <td className="py-3 px-3 whitespace-nowrap">
                          {isMaintenance && (
                            <Badge className="bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/60 dark:text-amber-400 gap-1 font-semibold text-[11px]">
                              <Wrench className="h-3 w-3 text-amber-600" />
                              In Maintenance
                            </Badge>
                          )}
                          {isScheduled && (
                            <Badge className="bg-blue-50 text-blue-700 border-blue-300 dark:bg-blue-950/60 dark:text-blue-400 gap-1 font-semibold text-[11px]">
                              <Clock className="h-3 w-3 text-blue-600" />
                              Scheduled Blackout
                            </Badge>
                          )}
                          {isArchived && (
                            <Badge variant="outline" className="text-muted-foreground border-border gap-1 font-medium text-[11px]">
                              <Archive className="h-3 w-3" />
                              Archived / Retired
                            </Badge>
                          )}
                          {item.status === 'COMPLETED' && (
                            <Badge className="bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-400 gap-1 font-semibold text-[11px]">
                              <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                              Completed
                            </Badge>
                          )}
                        </td>
                      )}

                      {/* Location */}
                      {visibleColumns.location && (
                        <td className="py-3 px-3 whitespace-nowrap text-xs text-muted-foreground">
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {item.locationName}
                          </span>
                        </td>
                      )}

                      {/* Category */}
                      {visibleColumns.category && (
                        <td className="py-3 px-3 whitespace-nowrap text-xs text-muted-foreground">
                          {item.categoryName}
                        </td>
                      )}

                      {/* Condition */}
                      {visibleColumns.condition && (
                        <td className="py-3 px-3 whitespace-nowrap text-xs">
                          {item.conditionGrade ? (
                            <Badge variant="outline" className="text-[10px] uppercase font-mono">
                              {item.conditionGrade}
                            </Badge>
                          ) : (
                            '—'
                          )}
                        </td>
                      )}

                      {/* Registered Date */}
                      {visibleColumns.createdDate && (
                        <td className="py-3 px-3 whitespace-nowrap text-xs text-muted-foreground">
                          {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : '—'}
                        </td>
                      )}

                      {/* Quick Action Column - Fixed */}
                      <td className="py-3 px-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Quick Action: Manage */}
                          <Link href={`/admin/assets/${item.listingId}`}>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 px-2.5 text-xs gap-1 font-medium hover:border-slate-400"
                              title="Manage equipment listing & units"
                            >
                              <ExternalLink className="h-3 w-3" />
                              Manage
                            </Button>
                          </Link>

                          {/* Quick Action: Restore (or Restore Back if archived) */}
                          {isArchived ? (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={restoreMutation.isPending}
                              onClick={() => restoreMutation.mutate(item)}
                              className="h-7 px-2.5 text-xs gap-1 font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300"
                              title="Restore archived item back to active inventory"
                            >
                              <RotateCcw className="h-3 w-3 text-blue-600" />
                              Restore Back
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={restoreMutation.isPending}
                              onClick={() => restoreMutation.mutate(item)}
                              className="h-7 px-2.5 text-xs gap-1 font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300"
                              title="Restore unit/interval back to operational active service"
                            >
                              <RotateCcw className="h-3 w-3 text-emerald-600" />
                              Restore
                            </Button>
                          )}

                          {/* More Options Dropdown */}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button size="icon" variant="ghost" className="h-7 w-7">
                                <MoreVertical className="h-3.5 w-3.5" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-52 text-xs">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>

                              <DropdownMenuItem asChild>
                                <Link href={`/admin/assets/${item.listingId}`} className="cursor-pointer">
                                  <ExternalLink className="h-3.5 w-3.5 mr-2" />
                                  Manage Asset & Units
                                </Link>
                              </DropdownMenuItem>

                              <DropdownMenuItem
                                onClick={() => restoreMutation.mutate(item)}
                                className="text-emerald-600 focus:text-emerald-700 cursor-pointer font-medium"
                              >
                                <RotateCcw className="h-3.5 w-3.5 mr-2 text-emerald-600" />
                                Restore to Active Service
                              </DropdownMenuItem>

                              <DropdownMenuSeparator />

                              {!isArchived ? (
                                <DropdownMenuItem
                                  onClick={() => archiveMutation.mutate(item)}
                                  className="text-amber-700 focus:text-amber-800 cursor-pointer"
                                >
                                  <Archive className="h-3.5 w-3.5 mr-2 text-amber-600" />
                                  Archive Unit
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem
                                  onClick={() => restoreMutation.mutate(item)}
                                  className="text-blue-600 focus:text-blue-700 cursor-pointer font-medium"
                                >
                                  <RotateCcw className="h-3.5 w-3.5 mr-2 text-blue-600" />
                                  Restore from Archive
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Schedule Maintenance Dialog */}
      <Dialog open={scheduleDialogOpen} onOpenChange={setScheduleDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wrench className="h-5 w-5 text-emerald-600" />
              Schedule Equipment Maintenance
            </DialogTitle>
            <DialogDescription className="text-xs">
              Block availability dates for technical service, sensor calibration, or repairs.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault()
              if (!scheduleForm.listingId) {
                toast.error('Please select an asset listing.')
                return
              }
              if (!scheduleForm.reason.trim()) {
                toast.error('Please enter a maintenance reason/description.')
                return
              }
              if (!scheduleForm.startAt || !scheduleForm.endAt) {
                toast.error('Please specify start and end dates.')
                return
              }
              scheduleMutation.mutate(scheduleForm)
            }}
            className="space-y-4 py-2 text-xs"
          >
            {/* Asset Listing Select */}
            <div className="space-y-1.5">
              <label className="font-semibold text-slate-800 dark:text-slate-200">
                Asset Listing <span className="text-destructive">*</span>
              </label>
              <select
                value={scheduleForm.listingId}
                onChange={(e) => {
                  setScheduleForm((prev) => ({
                    ...prev,
                    listingId: e.target.value,
                    unitId: '',
                  }))
                }}
                className="w-full h-9 px-3 rounded-md border border-input bg-background font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500"
                required
              >
                <option value="">Select an asset...</option>
                {listings.map((l: any) => (
                  <option key={l.id} value={l.id}>
                    {l.name} ({l.code})
                  </option>
                ))}
              </select>
            </div>

            {/* Target: Unit or Entire Listing */}
            <div className="space-y-1.5">
              <label className="font-semibold text-slate-800 dark:text-slate-200">
                Target Unit
              </label>
              <select
                value={scheduleForm.unitId}
                onChange={(e) => setScheduleForm((prev) => ({ ...prev, unitId: e.target.value }))}
                className="w-full h-9 px-3 rounded-md border border-input bg-background font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">Entire Listing (All Units Blocked)</option>
                {selectedListingUnits.map((u: any) => (
                  <option key={u.id} value={u.id}>
                    Unit {u.assetTag} {u.serialNumber ? `(${u.serialNumber})` : ''} — Status: {u.baseStatus}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-muted-foreground">
                Choosing a specific unit will mark only that physical item for service.
              </p>
            </div>

            {/* Reason / Description */}
            <div className="space-y-1.5">
              <label className="font-semibold text-slate-800 dark:text-slate-200">
                Description / Service Reason <span className="text-destructive">*</span>
              </label>
              <Input
                value={scheduleForm.reason}
                onChange={(e) => setScheduleForm((prev) => ({ ...prev, reason: e.target.value }))}
                placeholder="e.g. Lens sensor cleaning, annual inspection, keycap repair"
                className="h-9 text-xs"
                required
              />
            </div>

            {/* Dates: Start and End */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="font-semibold text-slate-800 dark:text-slate-200">
                  Start Date <span className="text-destructive">*</span>
                </label>
                <Input
                  type="date"
                  value={scheduleForm.startAt}
                  onChange={(e) => setScheduleForm((prev) => ({ ...prev, startAt: e.target.value }))}
                  className="h-9 text-xs"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className="font-semibold text-slate-800 dark:text-slate-200">
                  End Date <span className="text-destructive">*</span>
                </label>
                <Input
                  type="date"
                  value={scheduleForm.endAt}
                  onChange={(e) => setScheduleForm((prev) => ({ ...prev, endAt: e.target.value }))}
                  className="h-9 text-xs"
                  required
                />
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <label className="font-semibold text-slate-800 dark:text-slate-200">
                Staff Notes (Optional)
              </label>
              <Textarea
                value={scheduleForm.notes}
                onChange={(e) => setScheduleForm((prev) => ({ ...prev, notes: e.target.value }))}
                placeholder="Additional technician instructions or internal notes..."
                className="text-xs min-h-[70px]"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setScheduleDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={scheduleMutation.isPending}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {scheduleMutation.isPending ? 'Scheduling...' : 'Confirm Schedule'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
