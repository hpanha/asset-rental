'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import {
  Package,
  Plus,
  Search,
  Filter,
  MoreVertical,
  CheckCircle2,
  AlertCircle,
  FileEdit,
  Eye,
  Copy,
  Archive,
  ArrowUpDown,
  RefreshCw,
  ExternalLink,
  Layers,
  Wrench,
  ShieldAlert,
  SlidersHorizontal,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
import type { PublishValidationResult } from '@/lib/types'

type ColumnKey =
  | 'code'
  | 'image'
  | 'description'
  | 'category'
  | 'unit'
  | 'rentalRate'
  | 'visibility'
  | 'createdBy'
  | 'createdDate'
  | 'lastUpdate'

interface ColumnConfig {
  key: ColumnKey
  label: string
  defaultVisible: boolean
}

const AVAILABLE_COLUMNS: ColumnConfig[] = [
  { key: 'code', label: 'Asset Code', defaultVisible: true },
  { key: 'image', label: 'Image', defaultVisible: false },
  { key: 'description', label: 'Description', defaultVisible: true },
  { key: 'category', label: 'Category', defaultVisible: true },
  { key: 'unit', label: 'Unit', defaultVisible: true },
  { key: 'rentalRate', label: 'Rental Rate', defaultVisible: true },
  { key: 'visibility', label: 'Visibility', defaultVisible: false },
  { key: 'createdBy', label: 'Create By', defaultVisible: false },
  { key: 'createdDate', label: 'Create Date', defaultVisible: false },
  { key: 'lastUpdate', label: 'Last Update', defaultVisible: false },
]

const DEFAULT_VISIBLE_COLUMNS: Record<ColumnKey, boolean> = {
  code: true,
  image: false,
  description: true,
  category: true,
  unit: true,
  rentalRate: true,
  visibility: false,
  createdBy: false,
  createdDate: false,
  lastUpdate: false,
}

export default function AdminAssetsPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [selectedVisibility, setSelectedVisibility] = useState('all')
  const [visibleColumns, setVisibleColumns] = useState<Record<ColumnKey, boolean>>(DEFAULT_VISIBLE_COLUMNS)

  // Load saved column preferences from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('admin_assets_columns_prefs')
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
        localStorage.setItem('admin_assets_columns_prefs', JSON.stringify(next))
      } catch {}
      return next
    })
  }

  const resetColumns = () => {
    setVisibleColumns(DEFAULT_VISIBLE_COLUMNS)
    try {
      localStorage.setItem('admin_assets_columns_prefs', JSON.stringify(DEFAULT_VISIBLE_COLUMNS))
    } catch {}
  }

  const [validationModal, setValidationModal] = useState<{
    open: boolean
    assetName: string
    result: PublishValidationResult | null
    assetId: string
  }>({
    open: false,
    assetName: '',
    result: null,
    assetId: '',
  })

  // Fetch categories for filtering
  const { data: categories } = useQuery({
    queryKey: ['admin-categories'],
    queryFn: async () => {
      const res = await fetch('/api/admin/categories')
      if (!res.ok) throw new Error('Failed to fetch categories')
      return res.json()
    },
  })

  // Fetch assets list with filters
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin-assets', search, selectedCategory, selectedVisibility],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (selectedCategory !== 'all') params.set('categoryId', selectedCategory)
      if (selectedVisibility !== 'all') params.set('visibility', selectedVisibility)

      const res = await fetch(`/api/admin/assets?${params.toString()}`)
      if (!res.ok) throw new Error('Failed to fetch assets')
      return res.json()
    },
  })

  // Publish mutation
  const publishMutation = useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      const res = await fetch(`/api/admin/assets/${id}/publish`, { method: 'POST' })
      const json = await res.json()
      if (!res.ok) {
        throw { status: res.status, ...json }
      }
      return json
    },
    onSuccess: (data) => {
      toast.success(data.message || 'Asset published successfully!')
      queryClient.invalidateQueries({ queryKey: ['admin-assets'] })
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] })
      setValidationModal((prev) => ({ ...prev, open: false }))
    },
    onError: (err: any) => {
      if (err.validation) {
        setValidationModal({
          open: true,
          assetName: err.assetName || 'Asset Listing',
          result: err.validation,
          assetId: err.assetId || '',
        })
      } else {
        toast.error(err.error || 'Failed to publish asset')
      }
    },
  })

  // Unpublish mutation
  const unpublishMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/assets/${id}/unpublish`, { method: 'POST' })
      if (!res.ok) throw new Error('Failed to unpublish asset')
      return res.json()
    },
    onSuccess: (data) => {
      toast.success(data.message || 'Asset unpublished successfully')
      queryClient.invalidateQueries({ queryKey: ['admin-assets'] })
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] })
    },
    onError: (err: any) => toast.error(err.message),
  })

  // Duplicate mutation
  const duplicateMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/assets/${id}/duplicate`, { method: 'POST' })
      if (!res.ok) throw new Error('Failed to duplicate asset')
      return res.json()
    },
    onSuccess: (data) => {
      toast.success(data.message || 'Asset duplicated as Draft!')
      queryClient.invalidateQueries({ queryKey: ['admin-assets'] })
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] })
    },
    onError: (err: any) => toast.error(err.message),
  })

  // Archive mutation
  const archiveMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/assets/${id}/archive`, { method: 'POST' })
      if (!res.ok) throw new Error('Failed to archive asset')
      return res.json()
    },
    onSuccess: (data) => {
      toast.success(data.message || 'Asset archived safely')
      queryClient.invalidateQueries({ queryKey: ['admin-assets'] })
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] })
    },
    onError: (err: any) => toast.error(err.message),
  })

  const handlePublishClick = (asset: any) => {
    publishMutation.mutate({ id: asset.id })
  }

  const items = data?.items || []
  const activeColCount = Object.values(visibleColumns).filter(Boolean).length + 1 // +1 for Action

  return (
    <div className="p-6 max-w-7xl mx-auto w-full space-y-6">
      {/* Top Title & Primary Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Asset Catalog Management
            </h1>
            <Badge variant="secondary" className="font-semibold text-xs">
              {data?.pagination?.total ?? 0} Listings
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Screen 1 — Asset Catalog List: Configure, publish, duplicate and monitor equipment inventory.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-1.5">
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </Button>
          <Link href="/admin/assets/new">
            <Button size="sm" className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-sm">
              <Plus className="h-4 w-4" />
              Add Asset
            </Button>
          </Link>
        </div>
      </div>

      {/* Filter and Search Bar with Column Chooser */}
      <div className="flex flex-col md:flex-row items-center gap-3 bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-border shadow-2xs">
        <div className="relative flex-1 w-full">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search code, name, model, or description..."
            className="pl-9 h-9"
          />
        </div>

        {/* Category filter */}
        <div className="flex items-center gap-2 w-full md:w-auto flex-wrap sm:flex-nowrap">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="h-9 px-3 text-xs rounded-md border border-input bg-background font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500 w-full sm:w-44"
          >
            <option value="all">All Categories</option>
            {categories?.map((cat: any) => (
              <option key={cat.id} value={cat.id}>
                {cat.parent ? `— ${cat.name}` : cat.name}
              </option>
            ))}
          </select>

          {/* Visibility filter */}
          <select
            value={selectedVisibility}
            onChange={(e) => setSelectedVisibility(e.target.value)}
            className="h-9 px-3 text-xs rounded-md border border-input bg-background font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500 w-full sm:w-36"
          >
            <option value="all">All Statuses</option>
            <option value="PUBLISHED">Published</option>
            <option value="DRAFT">Draft</option>
            <option value="UNPUBLISHED">Unpublished</option>
            <option value="ARCHIVED">Archived</option>
          </select>

          {/* Column Chooser Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-9 px-3 gap-2 text-xs font-medium border-border w-full sm:w-auto shrink-0 bg-background hover:bg-accent"
              >
                <SlidersHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
                <span>Columns</span>
                <span className="rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200/50 px-1.5 py-0.2 text-[10px] font-semibold">
                  {Object.values(visibleColumns).filter(Boolean).length}
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 p-2 text-xs">
              <div className="flex items-center justify-between px-2 py-1.5 mb-1 border-b border-border">
                <span className="font-semibold text-slate-800 dark:text-slate-200">Toggle Columns</span>
                <button
                  type="button"
                  onClick={resetColumns}
                  className="text-[11px] text-emerald-600 hover:text-emerald-700 font-medium hover:underline cursor-pointer"
                >
                  Reset Default
                </button>
              </div>
              {AVAILABLE_COLUMNS.map((col) => (
                <DropdownMenuCheckboxItem
                  key={col.key}
                  checked={visibleColumns[col.key]}
                  onCheckedChange={() => toggleColumn(col.key)}
                  onSelect={(e) => e.preventDefault()}
                  className="cursor-pointer py-1.5"
                >
                  <span className="text-xs">{col.label}</span>
                  {col.defaultVisible && (
                    <span className="ml-auto text-[10px] text-muted-foreground bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                      Default
                    </span>
                  )}
                </DropdownMenuCheckboxItem>
              ))}
              <DropdownMenuSeparator className="my-1.5" />
              <div className="px-2 py-1 text-[11px] text-muted-foreground flex items-center justify-between">
                <span>Action column is fixed</span>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Asset Table */}
      <div className="rounded-xl border border-border bg-white dark:bg-slate-900 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-border text-xs uppercase text-muted-foreground font-semibold">
              <tr>
                {visibleColumns.code && <th className="py-3 px-4 whitespace-nowrap">Asset Code</th>}
                {visibleColumns.image && <th className="py-3 px-4 whitespace-nowrap">Image</th>}
                {visibleColumns.description && <th className="py-3 px-4">Description</th>}
                {visibleColumns.category && <th className="py-3 px-4 whitespace-nowrap">Category</th>}
                {visibleColumns.unit && <th className="py-3 px-4 whitespace-nowrap">Unit</th>}
                {visibleColumns.rentalRate && <th className="py-3 px-4 whitespace-nowrap">Rental Rate</th>}
                {visibleColumns.visibility && <th className="py-3 px-4 whitespace-nowrap">Visibility</th>}
                {visibleColumns.createdBy && <th className="py-3 px-4 whitespace-nowrap">Create By</th>}
                {visibleColumns.createdDate && <th className="py-3 px-4 whitespace-nowrap">Create Date</th>}
                {visibleColumns.lastUpdate && <th className="py-3 px-4 whitespace-nowrap">Last Update</th>}
                <th className="py-3 px-4 text-right whitespace-nowrap">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr>
                  <td colSpan={activeColCount} className="py-12 text-center text-muted-foreground">
                    <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-emerald-600" />
                    Loading catalog listings...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={activeColCount} className="py-12 text-center">
                    <Package className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="font-semibold text-slate-800 dark:text-slate-200">No assets found</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Try adjusting your search criteria or create a new asset listing.
                    </p>
                    <Link href="/admin/assets/new" className="mt-3 inline-block">
                      <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white mt-2">
                        <Plus className="h-4 w-4 mr-1" />
                        Create Asset
                      </Button>
                    </Link>
                  </td>
                </tr>
              ) : (
                items.map((asset: any) => {
                  return (
                    <tr key={asset.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
                      {/* Asset Code */}
                      {visibleColumns.code && (
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className="font-mono text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-200/60">
                            {asset.code}
                          </span>
                        </td>
                      )}

                      {/* Image */}
                      {visibleColumns.image && (
                        <td className="py-3.5 px-4">
                          <div className="h-12 w-14 rounded-lg bg-muted overflow-hidden shrink-0 border border-border">
                            {asset.coverImage ? (
                              <img
                                src={asset.coverImage}
                                alt={asset.name}
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
                        <td className="py-3.5 px-4 min-w-[220px] max-w-sm">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <Link
                              href={`/admin/assets/${asset.id}`}
                              className="font-semibold text-slate-900 dark:text-white hover:text-emerald-600 hover:underline truncate block"
                            >
                              {asset.name}
                            </Link>
                            {asset.model && (
                              <span className="text-[11px] text-muted-foreground bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                                {asset.model}
                              </span>
                            )}
                          </div>
                          {asset.shortDescription && (
                            <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                              {asset.shortDescription}
                            </p>
                          )}
                        </td>
                      )}

                      {/* Category */}
                      {visibleColumns.category && (
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="text-xs">
                            <p className="font-semibold text-foreground">
                              {asset.category?.name || 'Uncategorized'}
                            </p>
                            <p className="text-muted-foreground text-[11px] mt-0.5">
                              {asset.brand?.name || 'Generic / Unbranded'}
                            </p>
                          </div>
                        </td>
                      )}

                      {/* Unit */}
                      {visibleColumns.unit && (
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="flex flex-col gap-1 text-xs">
                            <div className="flex items-center gap-1.5 font-semibold">
                              <Layers className="h-3.5 w-3.5 text-muted-foreground" />
                              <span>{asset.totalUnits} Units</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-[11px]">
                              <span className="inline-flex items-center gap-1 text-emerald-600 font-medium">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                {asset.activeUnits} Active
                              </span>
                              {asset.maintenanceUnits > 0 && (
                                <span className="inline-flex items-center gap-1 text-amber-600 font-medium ml-1">
                                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                                  {asset.maintenanceUnits} Maint.
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                      )}

                      {/* Rental Rate */}
                      {visibleColumns.rentalRate && (
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {asset.primaryRate ? (
                            <div>
                              <span className="font-bold text-foreground">
                                {asset.primaryRate.currency === 'USD' ? '$' : 'KHR '}
                                {asset.primaryRate.amount.toFixed(2)}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {' '}/{asset.primaryRate.billingUnit.toLowerCase()}
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground italic">No rate</span>
                          )}
                        </td>
                      )}

                      {/* Visibility */}
                      {visibleColumns.visibility && (
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {asset.visibility === 'PUBLISHED' && (
                            <Badge className="bg-emerald-50 text-emerald-700 border-emerald-500/20 hover:bg-emerald-50 gap-1 font-semibold">
                              <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                              Published
                            </Badge>
                          )}
                          {asset.visibility === 'DRAFT' && (
                            <Badge className="bg-amber-50 text-amber-700 border-amber-500/20 hover:bg-amber-50 gap-1 font-semibold">
                              <FileEdit className="h-3 w-3 text-amber-600" />
                              Draft
                            </Badge>
                          )}
                          {asset.visibility === 'UNPUBLISHED' && (
                            <Badge variant="outline" className="text-slate-600 border-slate-300">
                              Unpublished
                            </Badge>
                          )}
                          {asset.visibility === 'ARCHIVED' && (
                            <Badge variant="outline" className="text-muted-foreground border-border">
                              Archived
                            </Badge>
                          )}
                        </td>
                      )}

                      {/* Created By */}
                      {visibleColumns.createdBy && (
                        <td className="py-3.5 px-4 whitespace-nowrap text-xs text-slate-700 dark:text-slate-300 font-medium">
                          {asset.createdBy || 'Admin'}
                        </td>
                      )}

                      {/* Create Date */}
                      {visibleColumns.createdDate && (
                        <td className="py-3.5 px-4 whitespace-nowrap text-xs text-muted-foreground">
                          {asset.createdAt ? new Date(asset.createdAt).toLocaleDateString() : '—'}
                        </td>
                      )}

                      {/* Last Update */}
                      {visibleColumns.lastUpdate && (
                        <td className="py-3.5 px-4 whitespace-nowrap text-xs text-muted-foreground">
                          {asset.updatedAt ? new Date(asset.updatedAt).toLocaleDateString() : '—'}
                        </td>
                      )}

                      {/* Action - Fixed */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="icon" variant="ghost" className="h-8 w-8">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48 text-xs">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem asChild>
                              <Link href={`/admin/assets/${asset.id}?edit=true`} className="cursor-pointer font-semibold text-emerald-700 dark:text-emerald-400">
                                <FileEdit className="h-3.5 w-3.5 mr-2 text-emerald-600" />
                                Edit Information
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link href={`/admin/assets/${asset.id}`} className="cursor-pointer">
                                <Layers className="h-3.5 w-3.5 mr-2" />
                                Manage Units & Blocks
                              </Link>
                            </DropdownMenuItem>

                            {asset.visibility !== 'PUBLISHED' ? (
                              <DropdownMenuItem
                                onClick={() => handlePublishClick(asset)}
                                className="text-emerald-600 focus:text-emerald-700 cursor-pointer font-medium"
                              >
                                <CheckCircle2 className="h-3.5 w-3.5 mr-2 text-emerald-600" />
                                Validate & Publish
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem
                                onClick={() => unpublishMutation.mutate(asset.id)}
                                className="cursor-pointer"
                              >
                                <AlertCircle className="h-3.5 w-3.5 mr-2 text-amber-600" />
                                Unpublish Listing
                              </DropdownMenuItem>
                            )}

                            <DropdownMenuItem
                              onClick={() => duplicateMutation.mutate(asset.id)}
                              className="cursor-pointer"
                            >
                              <Copy className="h-3.5 w-3.5 mr-2" />
                              Duplicate to Draft
                            </DropdownMenuItem>

                            <DropdownMenuSeparator />

                            {asset.visibility !== 'ARCHIVED' && (
                              <DropdownMenuItem
                                onClick={() => archiveMutation.mutate(asset.id)}
                                className="text-destructive focus:text-destructive cursor-pointer"
                              >
                                <Archive className="h-3.5 w-3.5 mr-2" />
                                Archive Asset
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Publication Validation Failure Checklist Modal */}
      <Dialog
        open={validationModal.open}
        onOpenChange={(open) => setValidationModal((prev) => ({ ...prev, open }))}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="h-10 w-10 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mb-2">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <DialogTitle>Publication Readiness Checklist</DialogTitle>
            <DialogDescription>
              {validationModal.assetName} cannot be published yet because it fails one or more required business rules for Step 01.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            {validationModal.result?.checks?.map((check, idx) => (
              <div
                key={idx}
                className={`p-3 rounded-lg border flex items-start gap-2.5 ${
                  check.passed
                    ? 'border-emerald-200 bg-emerald-50/60 dark:bg-emerald-950/20 text-emerald-900 dark:text-emerald-300'
                    : 'border-red-200 bg-red-50/60 dark:bg-red-950/20 text-red-900 dark:text-red-300'
                }`}
              >
                {check.passed ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
                )}
                <div>
                  <p className="font-semibold">{check.title}</p>
                  <p className="text-[11px] opacity-90 mt-0.5">{check.message}</p>
                </div>
              </div>
            ))}
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setValidationModal((prev) => ({ ...prev, open: false }))}
            >
              Close
            </Button>
            {validationModal.assetId && (
              <Link href={`/admin/assets/${validationModal.assetId}`}>
                <Button className="bg-emerald-600 hover:bg-emerald-700 text-white">
                  Fix Missing Fields
                </Button>
              </Link>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
