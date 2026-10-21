'use client'

import React, { useState, useEffect, useMemo, useRef, Fragment } from 'react'
import Link from 'next/link'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  FolderTree,
  Plus,
  Search,
  Edit,
  Trash2,
  Folder,
  Layers,
  CheckCircle2,
  AlertTriangle,
  ArrowUpDown,
  RefreshCw,
  Info,
  SlidersHorizontal,
  ChevronDown,
  ChevronRight,
  GripVertical,
  ArrowUp,
  ArrowDown,
  Upload,
  Image as ImageIcon,
  Check,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
} from '@/components/ui/dropdown-menu'
import { toast } from 'sonner'

type ColumnKey =
  | 'code'
  | 'image'
  | 'description'
  | 'slug'
  | 'assignedAssets'
  | 'status'
  | 'order'
  | 'parent'
  | 'createdDate'

interface ColumnConfig {
  key: ColumnKey
  label: string
  defaultVisible: boolean
}

const AVAILABLE_COLUMNS: ColumnConfig[] = [
  { key: 'code', label: 'Category & Hierarchy', defaultVisible: true },
  { key: 'image', label: 'Image', defaultVisible: false },
  { key: 'description', label: 'Description', defaultVisible: true },
  { key: 'slug', label: 'Slug', defaultVisible: true },
  { key: 'assignedAssets', label: 'Assigned Assets', defaultVisible: true },
  { key: 'status', label: 'Status', defaultVisible: false },
  { key: 'order', label: 'Display Order', defaultVisible: false },
  { key: 'parent', label: 'Parent Category', defaultVisible: false },
  { key: 'createdDate', label: 'Created Date', defaultVisible: false },
]

const DEFAULT_VISIBLE_COLUMNS: Record<ColumnKey, boolean> = {
  code: true,
  image: false,
  description: true,
  slug: true,
  assignedAssets: true,
  status: false,
  order: false,
  parent: false,
  createdDate: false,
}

const MAX_IMAGE_SIZE_BYTES = 1 * 1024 * 1024 // 1MB

export default function AdminCategoriesPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<any | null>(null)
  const [isReordering, setIsReordering] = useState(false)
  const [collapsedParents, setCollapsedParents] = useState<Record<string, boolean>>({})
  const [visibleColumns, setVisibleColumns] = useState<Record<ColumnKey, boolean>>(DEFAULT_VISIBLE_COLUMNS)

  // Dragging state
  const [draggedItem, setDraggedItem] = useState<{
    type: 'parent' | 'child'
    id: string
    parentId?: string
    index: number
  } | null>(null)

  // Image Upload state for dialog
  const imageInputRef = useRef<HTMLInputElement>(null)
  const [uploadingImage, setUploadingImage] = useState(false)

  // Load saved column preferences
  useEffect(() => {
    try {
      const saved = localStorage.getItem('admin_categories_columns_prefs')
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
        localStorage.setItem('admin_categories_columns_prefs', JSON.stringify(next))
      } catch {}
      return next
    })
  }

  const resetColumns = () => {
    setVisibleColumns(DEFAULT_VISIBLE_COLUMNS)
    try {
      localStorage.setItem('admin_categories_columns_prefs', JSON.stringify(DEFAULT_VISIBLE_COLUMNS))
    } catch {}
  }

  const [deleteProtectionModal, setDeleteProtectionModal] = useState<{
    open: boolean
    categoryName: string
    assetCount: number
  }>({
    open: false,
    categoryName: '',
    assetCount: 0,
  })

  // Form State (removed theme color & manual display order)
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    parentId: '',
    shortDescription: '',
    description: '',
    imageUrl: '',
    status: 'ACTIVE',
  })

  // Fetch categories
  const { data: categories, isLoading, refetch } = useQuery({
    queryKey: ['admin-categories', search, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (statusFilter !== 'all') params.set('status', statusFilter)
      const res = await fetch(`/api/admin/categories?${params.toString()}`)
      if (!res.ok) throw new Error('Failed to fetch categories')
      return res.json()
    },
  })

  // Build hierarchical category tree (Parents with nested Children)
  const parentCategories = useMemo(() => {
    if (!categories || !Array.isArray(categories)) return []

    // 1. Separate top-level categories from subcategories
    const parents = categories.filter((c: any) => !c.parentId)
    parents.sort((a: any, b: any) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0))

    return parents.map((parent: any) => {
      const children = categories.filter((c: any) => c.parentId === parent.id)
      children.sort((a: any, b: any) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0))
      return {
        ...parent,
        children,
      }
    })
  }, [categories])

  // Tree state for local drag-and-drop reordering
  const [treeData, setTreeData] = useState<any[]>([])

  useEffect(() => {
    setTreeData(parentCategories)
  }, [parentCategories])

  // Auto slug generator
  const handleNameChange = (name: string) => {
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '')
    setFormData((prev) => ({
      ...prev,
      name,
      slug: prev.slug === '' || !editingCategory ? slug : prev.slug,
    }))
  }

  // Open Create Dialog
  const openCreateDialog = () => {
    setEditingCategory(null)
    setFormData({
      name: '',
      slug: '',
      parentId: '',
      shortDescription: '',
      description: '',
      imageUrl: '',
      status: 'ACTIVE',
    })
    setDialogOpen(true)
  }

  // Open Edit Dialog
  const openEditDialog = (cat: any) => {
    setEditingCategory(cat)
    setFormData({
      name: cat.name,
      slug: cat.slug,
      parentId: cat.parentId || '',
      shortDescription: cat.shortDescription || '',
      description: cat.description || '',
      imageUrl: cat.imageUrl || '',
      status: cat.status,
    })
    setDialogOpen(true)
  }

  // Save (Create or Update) Mutation
  const saveMutation = useMutation({
    mutationFn: async (payload: any) => {
      const url = editingCategory
        ? `/api/admin/categories/${editingCategory.id}`
        : '/api/admin/categories'
      const method = editingCategory ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to save category')
      return json
    },
    onSuccess: () => {
      toast.success(editingCategory ? 'Category updated' : 'Category created successfully')
      setDialogOpen(false)
      refetch()
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] })
    },
    onError: (err: any) => toast.error(err.message),
  })

  // Reorder Mutation (Bulk updates displayOrder in database)
  const reorderMutation = useMutation({
    mutationFn: async (updatedTree: any[]) => {
      const items: { id: string; displayOrder: number }[] = []
      updatedTree.forEach((parent, pIdx) => {
        items.push({ id: parent.id, displayOrder: pIdx + 1 })
        parent.children.forEach((child: any, cIdx: number) => {
          items.push({ id: child.id, displayOrder: cIdx + 1 })
        })
      })

      const res = await fetch('/api/admin/categories/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to update order')
      return json
    },
    onSuccess: () => {
      toast.success('Category order updated successfully!')
      refetch()
    },
    onError: (err: any) => toast.error(err.message),
  })

  // Delete Mutation with Protection
  const deleteMutation = useMutation({
    mutationFn: async (cat: any) => {
      const res = await fetch(`/api/admin/categories/${cat.id}`, { method: 'DELETE' })
      const json = await res.json()
      if (!res.ok) {
        throw { status: res.status, ...json, categoryName: cat.name }
      }
      return json
    },
    onSuccess: () => {
      toast.success('Category deleted successfully')
      refetch()
    },
    onError: (err: any) => {
      if (err.assetCount > 0) {
        setDeleteProtectionModal({
          open: true,
          categoryName: err.categoryName || 'This category',
          assetCount: err.assetCount,
        })
      } else {
        toast.error(err.error || 'Failed to delete category')
      }
    },
  })

  // Handle Image Upload from File Explorer (< 1MB)
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''

    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(2)
      toast.error(`"${file.name}" is ${sizeMB}MB. Image size must be strictly below 1MB!`)
      return
    }

    setUploadingImage(true)
    try {
      const form = new FormData()
      form.append('file', file)
      const res = await fetch('/api/admin/upload', {
        method: 'POST',
        body: form,
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Upload failed')

      setFormData((prev) => ({ ...prev, imageUrl: json.url }))
      toast.success('Category image uploaded from file explorer!')
    } catch (err: any) {
      toast.error(err.message || 'Failed to upload category image')
    } finally {
      setUploadingImage(false)
    }
  }

  // Toggle Collapse/Expand for parent category
  const toggleParentCollapse = (parentId: string) => {
    setCollapsedParents((prev) => ({
      ...prev,
      [parentId]: !prev[parentId],
    }))
  }

  // Drag-and-drop Handlers
  const handleDragStart = (
    e: React.DragEvent,
    item: { type: 'parent' | 'child'; id: string; parentId?: string; index: number }
  ) => {
    setDraggedItem(item)
    e.dataTransfer.setData('text/plain', item.id)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (
    e: React.DragEvent,
    targetType: 'parent' | 'child',
    targetParentId?: string
  ) => {
    if (!draggedItem) return

    // Subcategory can NEVER be dragged outside its own parent category
    if (draggedItem.type === 'child') {
      if (targetType !== 'child' || targetParentId !== draggedItem.parentId) {
        return
      }
    }

    // Parent can only be reordered among other parents
    if (draggedItem.type === 'parent') {
      if (targetType !== 'parent') {
        return
      }
    }

    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDrop = (
    e: React.DragEvent,
    target: { type: 'parent' | 'child'; id: string; parentId?: string; index: number }
  ) => {
    e.preventDefault()
    if (!draggedItem || draggedItem.id === target.id) {
      setDraggedItem(null)
      return
    }

    if (draggedItem.type === 'parent' && target.type === 'parent') {
      const newTree = [...treeData]
      const [moved] = newTree.splice(draggedItem.index, 1)
      newTree.splice(target.index, 0, moved)
      setTreeData(newTree)
      reorderMutation.mutate(newTree)
    } else if (
      draggedItem.type === 'child' &&
      target.type === 'child' &&
      draggedItem.parentId === target.parentId
    ) {
      const newTree = treeData.map((parent) => {
        if (parent.id === draggedItem.parentId) {
          const newChildren = [...parent.children]
          const [moved] = newChildren.splice(draggedItem.index, 1)
          newChildren.splice(target.index, 0, moved)
          return { ...parent, children: newChildren }
        }
        return parent
      })
      setTreeData(newTree)
      reorderMutation.mutate(newTree)
    }

    setDraggedItem(null)
  }

  // Quick arrow button reorder helpers
  const moveParent = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1
    if (targetIndex < 0 || targetIndex >= treeData.length) return
    const newTree = [...treeData]
    const [moved] = newTree.splice(index, 1)
    newTree.splice(targetIndex, 0, moved)
    setTreeData(newTree)
    reorderMutation.mutate(newTree)
  }

  const moveChild = (parentId: string, index: number, direction: 'up' | 'down') => {
    const parent = treeData.find((p) => p.id === parentId)
    if (!parent) return
    const targetIndex = direction === 'up' ? index - 1 : index + 1
    if (targetIndex < 0 || targetIndex >= parent.children.length) return

    const newTree = treeData.map((p) => {
      if (p.id === parentId) {
        const newChildren = [...p.children]
        const [moved] = newChildren.splice(index, 1)
        newChildren.splice(targetIndex, 0, moved)
        return { ...p, children: newChildren }
      }
      return p
    })
    setTreeData(newTree)
    reorderMutation.mutate(newTree)
  }

  const activeColCount = Object.values(visibleColumns).filter(Boolean).length + 1 // +1 for Action

  return (
    <div className="p-6 max-w-7xl mx-auto w-full space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Category Module Management
            </h1>
            <Badge variant="secondary" className="font-semibold text-xs">
              {categories?.length ?? 0} Categories
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Organize assets into parent categories and collapsible subcategories with drag-and-drop reordering.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-1.5">
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </Button>
          <Button
            size="sm"
            onClick={openCreateDialog}
            className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-sm"
          >
            <Plus className="h-4 w-4" />
            Create Category
          </Button>
        </div>
      </div>

      {/* Filter, Search, Reorder & Column Chooser Bar */}
      <div className="flex flex-col md:flex-row items-center gap-3 bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-border shadow-2xs">
        <div className="relative flex-1 w-full">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search category name, slug or description..."
            className="pl-9 h-9"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto flex-wrap sm:flex-nowrap">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-9 px-3 text-xs rounded-md border border-input bg-background font-medium text-foreground focus:ring-2 focus:ring-emerald-500 w-full sm:w-36"
          >
            <option value="all">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>

          {/* Reorder Button */}
          <Button
            type="button"
            size="sm"
            variant={isReordering ? 'default' : 'outline'}
            onClick={() => setIsReordering((prev) => !prev)}
            className={`h-9 px-3 gap-1.5 text-xs font-medium border-border w-full sm:w-auto shrink-0 transition-all ${
              isReordering
                ? 'bg-[#0d4a2e] hover:bg-[#0b3d25] text-white shadow-sm'
                : 'bg-background hover:bg-accent'
            }`}
          >
            {isReordering ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-400" />
                <span>Done Reordering</span>
              </>
            ) : (
              <>
                <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
                <span>Reorder</span>
              </>
            )}
          </Button>

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

      {/* Reorder Mode Guidance Banner */}
      {isReordering && (
        <div className="bg-[#eaf6ee] dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 p-3.5 rounded-xl flex items-center justify-between text-xs text-[#0d4a2e] dark:text-emerald-300">
          <div className="flex items-center gap-2.5">
            <div className="h-6 w-6 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
              <GripVertical className="h-3.5 w-3.5" />
            </div>
            <span>
              <strong>Reorder Mode Active:</strong> Drag and drop rows using the handles, or click the up/down arrows. Subcategories are constrained within their parent category.
            </span>
          </div>
          <Button
            size="sm"
            onClick={() => setIsReordering(false)}
            className="h-7 px-3 text-xs bg-[#0d4a2e] hover:bg-[#0b3d25] text-white shrink-0 ml-2"
          >
            Done
          </Button>
        </div>
      )}

      {/* Categories Hierarchical Table */}
      <div className="rounded-xl border border-border bg-white dark:bg-slate-900 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-border text-xs uppercase text-muted-foreground font-semibold">
              <tr>
                {visibleColumns.code && <th className="py-3 px-4">Category Name & Hierarchy</th>}
                {visibleColumns.image && <th className="py-3 px-4 whitespace-nowrap">Image</th>}
                {visibleColumns.description && <th className="py-3 px-4">Description</th>}
                {visibleColumns.slug && <th className="py-3 px-4 whitespace-nowrap">Slug</th>}
                {visibleColumns.assignedAssets && <th className="py-3 px-4 whitespace-nowrap">Assigned Assets</th>}
                {visibleColumns.status && <th className="py-3 px-4 whitespace-nowrap">Status</th>}
                {visibleColumns.order && <th className="py-3 px-4 whitespace-nowrap">Order</th>}
                {visibleColumns.parent && <th className="py-3 px-4 whitespace-nowrap">Parent</th>}
                {visibleColumns.createdDate && <th className="py-3 px-4 whitespace-nowrap">Created Date</th>}
                <th className="py-3 px-4 text-right whitespace-nowrap">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr>
                  <td colSpan={activeColCount} className="py-12 text-center text-muted-foreground">
                    <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-emerald-600" />
                    Loading categories...
                  </td>
                </tr>
              ) : treeData.length === 0 ? (
                <tr>
                  <td colSpan={activeColCount} className="py-12 text-center text-muted-foreground">
                    No categories found. Click &quot;Create Category&quot; to begin.
                  </td>
                </tr>
              ) : (
                treeData.map((parent: any, pIdx: number) => {
                  const hasChildren = parent.children && parent.children.length > 0
                  const isCollapsed = !!collapsedParents[parent.id]

                  return (
                    <Fragment key={parent.id}>
                      {/* Parent Category Row */}
                      <tr
                        draggable={isReordering}
                        onDragStart={(e) => handleDragStart(e, { type: 'parent', id: parent.id, index: pIdx })}
                        onDragOver={(e) => handleDragOver(e, 'parent')}
                        onDrop={(e) => handleDrop(e, { type: 'parent', id: parent.id, index: pIdx })}
                        className={`transition-colors ${
                          isReordering ? 'cursor-grab active:cursor-grabbing hover:bg-emerald-50/40' : 'hover:bg-slate-50/80 dark:hover:bg-slate-800/40'
                        }`}
                      >
                        {/* Column: Category Name & Hierarchy */}
                        {visibleColumns.code && (
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              {/* Reorder drag handle & arrow controls */}
                              {isReordering && (
                                <div className="flex items-center gap-0.5 mr-1 text-slate-400">
                                  <GripVertical className="h-4 w-4 cursor-grab text-slate-400 hover:text-slate-700" />
                                  <div className="flex flex-col">
                                    <button
                                      type="button"
                                      disabled={pIdx === 0}
                                      onClick={() => moveParent(pIdx, 'up')}
                                      className="h-3.5 w-3.5 text-slate-400 hover:text-emerald-600 disabled:opacity-20 cursor-pointer"
                                    >
                                      <ArrowUp className="h-3 w-3" />
                                    </button>
                                    <button
                                      type="button"
                                      disabled={pIdx === treeData.length - 1}
                                      onClick={() => moveParent(pIdx, 'down')}
                                      className="h-3.5 w-3.5 text-slate-400 hover:text-emerald-600 disabled:opacity-20 cursor-pointer"
                                    >
                                      <ArrowDown className="h-3 w-3" />
                                    </button>
                                  </div>
                                </div>
                              )}

                              {/* Collapse / Expand Toggle Button for Parents */}
                              {hasChildren ? (
                                <button
                                  type="button"
                                  onClick={() => toggleParentCollapse(parent.id)}
                                  className="h-6 w-6 rounded-md flex items-center justify-center text-slate-400 hover:text-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                                  title={isCollapsed ? 'Expand subcategories' : 'Collapse subcategories'}
                                >
                                  {isCollapsed ? (
                                    <ChevronRight className="h-4 w-4" />
                                  ) : (
                                    <ChevronDown className="h-4 w-4" />
                                  )}
                                </button>
                              ) : (
                                <div className="w-6 shrink-0" />
                              )}

                              {/* Category Icon / Thumbnail */}
                              <div className="h-8 w-8 rounded-lg overflow-hidden shrink-0 border border-border bg-emerald-50 dark:bg-emerald-950/60 flex items-center justify-center">
                                {parent.imageUrl ? (
                                  <img
                                    src={parent.imageUrl}
                                    alt={parent.name}
                                    className="h-full w-full object-cover"
                                  />
                                ) : (
                                  <Folder className="h-4 w-4 text-emerald-600" />
                                )}
                              </div>

                              <div>
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="font-semibold text-foreground text-sm">
                                    {parent.name}
                                  </span>
                                  {hasChildren && (
                                    <span className="text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-1.5 py-0.5 rounded-full">
                                      {parent.children.length} sub
                                    </span>
                                  )}
                                </div>
                                {parent.shortDescription && (
                                  <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                                    {parent.shortDescription}
                                  </p>
                                )}
                              </div>
                            </div>
                          </td>
                        )}

                        {/* Column: Image */}
                        {visibleColumns.image && (
                          <td className="py-3 px-4">
                            <div className="h-10 w-12 rounded-lg bg-muted overflow-hidden shrink-0 border border-border">
                              {parent.imageUrl ? (
                                <img
                                  src={parent.imageUrl}
                                  alt={parent.name}
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

                        {/* Column: Description */}
                        {visibleColumns.description && (
                          <td className="py-3 px-4 text-xs text-muted-foreground max-w-xs">
                            <p className="line-clamp-2">
                              {parent.shortDescription || parent.description || '—'}
                            </p>
                          </td>
                        )}

                        {/* Column: Slug */}
                        {visibleColumns.slug && (
                          <td className="py-3 px-4 font-mono text-xs text-muted-foreground whitespace-nowrap">
                            {parent.slug}
                          </td>
                        )}

                        {/* Column: Assigned Assets */}
                        {visibleColumns.assignedAssets && (
                          <td className="py-3 px-4 whitespace-nowrap">
                            <Badge variant="outline" className="text-xs font-semibold">
                              {parent._count?.listings ?? 0} Assets
                            </Badge>
                          </td>
                        )}

                        {/* Column: Status */}
                        {visibleColumns.status && (
                          <td className="py-3 px-4 whitespace-nowrap">
                            {parent.status === 'ACTIVE' ? (
                              <Badge className="bg-emerald-50 text-emerald-700 border-emerald-500/20 hover:bg-emerald-50 gap-1 text-[11px] font-semibold">
                                <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                                Active
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="text-[11px]">
                                Inactive
                              </Badge>
                            )}
                          </td>
                        )}

                        {/* Column: Order */}
                        {visibleColumns.order && (
                          <td className="py-3 px-4 font-mono text-xs text-muted-foreground whitespace-nowrap">
                            {pIdx + 1}
                          </td>
                        )}

                        {/* Column: Parent */}
                        {visibleColumns.parent && (
                          <td className="py-3 px-4 text-xs text-muted-foreground whitespace-nowrap font-medium">
                            Top Level
                          </td>
                        )}

                        {/* Column: Created Date */}
                        {visibleColumns.createdDate && (
                          <td className="py-3 px-4 text-xs text-muted-foreground whitespace-nowrap">
                            {parent.createdAt ? new Date(parent.createdAt).toLocaleDateString() : '—'}
                          </td>
                        )}

                        {/* Action - Fixed */}
                        <td className="py-3 px-4 text-right space-x-1 whitespace-nowrap">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => openEditDialog(parent)}
                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => deleteMutation.mutate(parent)}
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>

                      {/* Child Subcategories Rows (Rendered under parent, collapsible) */}
                      {!isCollapsed &&
                        parent.children.map((child: any, cIdx: number) => (
                          <tr
                            key={child.id}
                            draggable={isReordering}
                            onDragStart={(e) =>
                              handleDragStart(e, {
                                type: 'child',
                                id: child.id,
                                parentId: parent.id,
                                index: cIdx,
                              })
                            }
                            onDragOver={(e) => handleDragOver(e, 'child', parent.id)}
                            onDrop={(e) =>
                              handleDrop(e, {
                                type: 'child',
                                id: child.id,
                                parentId: parent.id,
                                index: cIdx,
                              })
                            }
                            className={`bg-slate-50/50 dark:bg-slate-800/20 transition-colors ${
                              isReordering
                                ? 'cursor-grab active:cursor-grabbing hover:bg-emerald-50/30'
                                : 'hover:bg-slate-100/60 dark:hover:bg-slate-800/40'
                            }`}
                          >
                            {/* Column: Category Name & Hierarchy (Indented) */}
                            {visibleColumns.code && (
                              <td className="py-2.5 px-4">
                                <div className="flex items-center gap-2 pl-6 sm:pl-8">
                                  {/* Child Reorder Controls */}
                                  {isReordering && (
                                    <div className="flex items-center gap-0.5 mr-1 text-slate-400">
                                      <GripVertical className="h-3.5 w-3.5 cursor-grab text-slate-400 hover:text-slate-700" />
                                      <div className="flex flex-col">
                                        <button
                                          type="button"
                                          disabled={cIdx === 0}
                                          onClick={() => moveChild(parent.id, cIdx, 'up')}
                                          className="h-3 w-3 text-slate-400 hover:text-emerald-600 disabled:opacity-20 cursor-pointer"
                                        >
                                          <ArrowUp className="h-2.5 w-2.5" />
                                        </button>
                                        <button
                                          type="button"
                                          disabled={cIdx === parent.children.length - 1}
                                          onClick={() => moveChild(parent.id, cIdx, 'down')}
                                          className="h-3 w-3 text-slate-400 hover:text-emerald-600 disabled:opacity-20 cursor-pointer"
                                        >
                                          <ArrowDown className="h-2.5 w-2.5" />
                                        </button>
                                      </div>
                                    </div>
                                  )}

                                  {/* Subcategory connector */}
                                  <span className="text-muted-foreground font-mono text-xs">↳</span>

                                  {/* Thumbnail */}
                                  <div className="h-7 w-7 rounded-lg overflow-hidden shrink-0 border border-border bg-muted flex items-center justify-center">
                                    {child.imageUrl ? (
                                      <img
                                        src={child.imageUrl}
                                        alt={child.name}
                                        className="h-full w-full object-cover"
                                      />
                                    ) : (
                                      <Folder className="h-3.5 w-3.5 text-muted-foreground" />
                                    )}
                                  </div>

                                  <div>
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span className="font-medium text-foreground text-xs">
                                        {child.name}
                                      </span>
                                      <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.2 rounded">
                                        sub of {parent.name}
                                      </span>
                                    </div>
                                    {child.shortDescription && (
                                      <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">
                                        {child.shortDescription}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </td>
                            )}

                            {/* Column: Image */}
                            {visibleColumns.image && (
                              <td className="py-2.5 px-4">
                                <div className="h-8 w-10 rounded-lg bg-muted overflow-hidden shrink-0 border border-border">
                                  {child.imageUrl ? (
                                    <img
                                      src={child.imageUrl}
                                      alt={child.name}
                                      className="h-full w-full object-cover"
                                    />
                                  ) : (
                                    <div className="flex h-full w-full items-center justify-center text-[9px] text-muted-foreground">
                                      No Pic
                                    </div>
                                  )}
                                </div>
                              </td>
                            )}

                            {/* Column: Description */}
                            {visibleColumns.description && (
                              <td className="py-2.5 px-4 text-xs text-muted-foreground max-w-xs">
                                <p className="line-clamp-2">
                                  {child.shortDescription || child.description || '—'}
                                </p>
                              </td>
                            )}

                            {/* Column: Slug */}
                            {visibleColumns.slug && (
                              <td className="py-2.5 px-4 font-mono text-xs text-muted-foreground whitespace-nowrap">
                                {child.slug}
                              </td>
                            )}

                            {/* Column: Assigned Assets */}
                            {visibleColumns.assignedAssets && (
                              <td className="py-2.5 px-4 whitespace-nowrap">
                                <Badge variant="outline" className="text-[11px] font-semibold">
                                  {child._count?.listings ?? 0} Assets
                                </Badge>
                              </td>
                            )}

                            {/* Column: Status */}
                            {visibleColumns.status && (
                              <td className="py-2.5 px-4 whitespace-nowrap">
                                {child.status === 'ACTIVE' ? (
                                  <Badge className="bg-emerald-50 text-emerald-700 border-emerald-500/20 hover:bg-emerald-50 gap-1 text-[10px] font-semibold">
                                    <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                                    Active
                                  </Badge>
                                ) : (
                                  <Badge variant="secondary" className="text-[10px]">
                                    Inactive
                                  </Badge>
                                )}
                              </td>
                            )}

                            {/* Column: Order */}
                            {visibleColumns.order && (
                              <td className="py-2.5 px-4 font-mono text-xs text-muted-foreground whitespace-nowrap">
                                {cIdx + 1}
                              </td>
                            )}

                            {/* Column: Parent */}
                            {visibleColumns.parent && (
                              <td className="py-2.5 px-4 text-xs text-muted-foreground whitespace-nowrap font-medium">
                                {parent.name}
                              </td>
                            )}

                            {/* Column: Created Date */}
                            {visibleColumns.createdDate && (
                              <td className="py-2.5 px-4 text-xs text-muted-foreground whitespace-nowrap">
                                {child.createdAt ? new Date(child.createdAt).toLocaleDateString() : '—'}
                              </td>
                            )}

                            {/* Action - Fixed */}
                            <td className="py-2.5 px-4 text-right space-x-1 whitespace-nowrap">
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => openEditDialog(child)}
                                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                              >
                                <Edit className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => deleteMutation.mutate(child)}
                                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                    </Fragment>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create / Edit Category Modal */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingCategory ? 'Edit Category' : 'Create Asset Category'}</DialogTitle>
            <DialogDescription>
              Categories organize equipment for public customer discovery and filter navigation.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 py-2 text-xs">
            {/* Category Name */}
            <div>
              <label className="font-semibold text-foreground">
                Category Name <span className="text-red-500">*</span>
              </label>
              <Input
                value={formData.name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="e.g. Cinema Cameras"
                className="mt-1 text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* Slug */}
              <div>
                <label className="font-semibold text-foreground">
                  Slug (URL-friendly) <span className="text-red-500">*</span>
                </label>
                <Input
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  placeholder="cinema-cameras"
                  className="mt-1 font-mono text-xs"
                />
              </div>

              {/* Parent Category */}
              <div>
                <label className="font-semibold text-foreground">Parent Category</label>
                <select
                  value={formData.parentId}
                  onChange={(e) => setFormData({ ...formData, parentId: e.target.value })}
                  className="w-full h-9 px-3 text-xs rounded-md border border-input bg-background font-medium mt-1"
                >
                  <option value="">Top Level Category</option>
                  {categories
                    ?.filter((c: any) => !c.parentId && (!editingCategory || c.id !== editingCategory.id))
                    .map((c: any) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                </select>
              </div>
            </div>

            {/* Category Image Upload from File Explorer (< 1MB) */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="font-semibold text-foreground flex items-center gap-1.5">
                  Category Image
                  <span className="text-[10px] text-muted-foreground font-normal">(Optional thumbnail, max 1MB)</span>
                </label>
                {formData.imageUrl && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setFormData((prev) => ({ ...prev, imageUrl: '' }))}
                    className="h-6 px-2 text-[11px] text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-3 w-3 mr-1" /> Remove
                  </Button>
                )}
              </div>

              <input
                type="file"
                ref={imageInputRef}
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />

              {formData.imageUrl ? (
                <div className="relative group rounded-xl border border-border overflow-hidden bg-muted h-32 w-full max-w-xs">
                  <img
                    src={formData.imageUrl}
                    alt="Category Preview"
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={() => imageInputRef.current?.click()}
                      disabled={uploadingImage}
                      className="text-xs h-7 gap-1 bg-white text-slate-800"
                    >
                      <Upload className="h-3 w-3" />
                      Change File
                    </Button>
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => !uploadingImage && imageInputRef.current?.click()}
                  className="border-2 border-dashed border-border hover:border-emerald-500 rounded-xl p-4 text-center cursor-pointer transition-all bg-slate-50/50 hover:bg-emerald-50/20"
                >
                  <div className="h-9 w-9 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-2">
                    {uploadingImage ? (
                      <div className="h-4 w-4 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Upload className="h-4 w-4" />
                    )}
                  </div>
                  <p className="font-semibold text-xs text-slate-800 dark:text-slate-200">
                    {uploadingImage ? 'Uploading image...' : 'Choose Category Image from File Explorer'}
                  </p>
                  <p className="text-[10px] text-emerald-700 font-semibold mt-0.5">
                    Click to browse files (strictly below 1MB)
                  </p>
                </div>
              )}
            </div>

            {/* Short Description */}
            <div>
              <label className="font-semibold text-foreground">Short Description (Max 200 chars)</label>
              <Input
                value={formData.shortDescription}
                onChange={(e) => setFormData({ ...formData, shortDescription: e.target.value })}
                placeholder="e.g. Cinema-grade 4K/8K cameras and professional prime lenses."
                className="mt-1 text-xs"
              />
            </div>

            {/* Full Description */}
            <div>
              <label className="font-semibold text-foreground">Full Description (Optional)</label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="SEO and detail page overview..."
                rows={2}
                className="mt-1 text-xs"
              />
            </div>

            {/* Status (Theme color and display order removed) */}
            <div>
              <label className="font-semibold text-foreground">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full h-9 px-3 text-xs rounded-md border border-input bg-background font-medium mt-1"
              >
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => saveMutation.mutate(formData)}
              disabled={saveMutation.isPending || !formData.name || !formData.slug}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
            >
              {editingCategory ? 'Save Changes' : 'Create Category'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Protection Modal */}
      <AlertDialog
        open={deleteProtectionModal.open}
        onOpenChange={(open) => setDeleteProtectionModal((prev) => ({ ...prev, open }))}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="h-10 w-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center mb-2">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <AlertDialogTitle>Category Delete Protection</AlertDialogTitle>
            <AlertDialogDescription className="text-xs leading-relaxed space-y-2">
              <p>
                <strong>{deleteProtectionModal.categoryName}</strong> currently has{' '}
                <strong>{deleteProtectionModal.assetCount} asset(s)</strong> assigned to it.
              </p>
              <p>
                Under Section 13 Delete Protection rules, a category with assigned assets cannot be deleted to avoid orphan records and catalog disruption.
              </p>
              <p className="font-semibold text-foreground">
                Please reassign or move these assets to another category before deleting this category.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Understood</AlertDialogCancel>
            <Link href="/admin/assets">
              <Button variant="outline" className="text-xs">
                View Assigned Assets
              </Button>
            </Link>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
