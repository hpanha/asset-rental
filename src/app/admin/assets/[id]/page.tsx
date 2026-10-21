'use client'

import { useState, useRef, useEffect } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import {
  Package,
  Layers,
  Wrench,
  History,
  Eye,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  Copy,
  ArrowLeft,
  Save,
  RotateCcw,
  Sparkles,
  MapPin,
  Calendar,
  Clock,
  ShieldAlert,
  Star,
  ExternalLink,
  FileEdit,
  Upload,
  Image as ImageIcon,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import type { AssetListingDetail, PublishValidationResult } from '@/lib/types'

export default function AssetDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const searchParams = useSearchParams()
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState('units')

  // Edit Listing Dialog state
  const [editInfoOpen, setEditInfoOpen] = useState(false)
  const [uploadingCover, setUploadingCover] = useState(false)
  const coverFileInputRef = useRef<HTMLInputElement>(null)

  const [editForm, setEditForm] = useState({
    name: '',
    code: '',
    slug: '',
    model: '',
    categoryId: '',
    brandId: '',
    shortDescription: '',
    description: '',
    coverImage: '',
    rateAmount: 0,
    currency: 'USD',
    billingUnit: 'DAY',
    securityDeposit: 0,
    minimumDuration: 1,
    minimumDurationUnit: 'DAY',
  })

  // Unit dialog state
  const [unitDialogOpen, setUnitDialogOpen] = useState(false)
  const [newUnit, setNewUnit] = useState({
    assetTag: '',
    serialNumber: '',
    locationId: '',
    baseStatus: 'ACTIVE',
    conditionGrade: 'EXCELLENT',
    accessories: '',
    purchaseCost: '',
    notes: '',
  })

  // Maintenance dialog state
  const [maintDialogOpen, setMaintDialogOpen] = useState(false)
  const [newMaint, setNewMaint] = useState({
    unitId: '',
    startAt: new Date().toISOString().split('T')[0],
    endAt: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
    reason: 'Scheduled Routine Inspection and Maintenance',
    notes: '',
  })

  // Fetch asset details
  const { data: asset, isLoading, refetch } = useQuery<AssetListingDetail>({
    queryKey: ['admin-asset', id],
    queryFn: async () => {
      const res = await fetch(`/api/admin/assets/${id}`)
      if (!res.ok) throw new Error('Failed to load asset details')
      return res.json()
    },
  })

  // Fetch Locations
  const { data: locations } = useQuery({
    queryKey: ['admin-locations'],
    queryFn: async () => {
      const res = await fetch('/api/admin/locations')
      if (!res.ok) throw new Error('Failed to fetch locations')
      return res.json()
    },
  })

  // Fetch Categories for Edit Dialog
  const { data: categories } = useQuery({
    queryKey: ['admin-categories'],
    queryFn: async () => {
      const res = await fetch('/api/admin/categories')
      if (!res.ok) throw new Error('Failed to fetch categories')
      return res.json()
    },
  })

  // Fetch Brands for Edit Dialog
  const { data: brands } = useQuery({
    queryKey: ['admin-brands'],
    queryFn: async () => {
      const res = await fetch('/api/admin/brands')
      if (!res.ok) return []
      return res.json()
    },
  })

  const openEditModal = () => {
    if (!asset) return
    const rate = asset.rates?.find((r) => r.isPrimary) || asset.rates?.[0]
    setEditForm({
      name: asset.name || '',
      code: asset.code || '',
      slug: asset.slug || '',
      model: asset.model || '',
      categoryId: asset.categoryId || '',
      brandId: asset.brandId || '',
      shortDescription: asset.shortDescription || '',
      description: asset.description || '',
      coverImage: asset.coverImage || '',
      rateAmount: rate ? Number(rate.rateAmount) : 0,
      currency: rate?.currency || 'USD',
      billingUnit: rate?.billingUnit || 'DAY',
      securityDeposit: asset.rentalPolicy?.securityDeposit ? Number(asset.rentalPolicy.securityDeposit) : 0,
      minimumDuration: asset.rentalPolicy?.minimumDuration || 1,
      minimumDurationUnit: asset.rentalPolicy?.minimumDurationUnit || 'DAY',
    })
    setEditInfoOpen(true)
  }

  useEffect(() => {
    if (searchParams.get('edit') === 'true' && asset) {
      openEditModal()
    }
  }, [searchParams, asset])

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 1024 * 1024) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(2)
      toast.error(`"${file.name}" is ${sizeMB}MB. File size must be strictly below 1MB!`)
      if (coverFileInputRef.current) coverFileInputRef.current.value = ''
      return
    }

    setUploadingCover(true)
    try {
      const form = new FormData()
      form.append('file', file)

      const res = await fetch('/api/admin/upload', {
        method: 'POST',
        body: form,
      })

      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Upload failed')

      setEditForm((prev) => ({ ...prev, coverImage: json.url }))
      toast.success('Cover image uploaded from file explorer!')
    } catch (err: any) {
      toast.error(err.message || 'Failed to upload cover image')
    } finally {
      setUploadingCover(false)
      if (coverFileInputRef.current) coverFileInputRef.current.value = ''
    }
  }

  const updateListingMutation = useMutation({
    mutationFn: async (payload: typeof editForm) => {
      const res = await fetch(`/api/admin/assets/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to update asset listing')
      return json
    },
    onSuccess: () => {
      toast.success('Asset information updated successfully!')
      setEditInfoOpen(false)
      refetch()
      queryClient.invalidateQueries({ queryKey: ['admin-assets'] })
      queryClient.invalidateQueries({ queryKey: ['rental-assets'] })
    },
    onError: (err: any) => toast.error(err.message),
  })

  // Publish Mutation
  const publishMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/admin/assets/${id}/publish`, { method: 'POST' })
      const json = await res.json()
      if (!res.ok) throw json
      return json
    },
    onSuccess: (data) => {
      toast.success(data.message || 'Asset published successfully!')
      refetch()
      queryClient.invalidateQueries({ queryKey: ['admin-assets'] })
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] })
    },
    onError: (err: any) => {
      if (err.validation?.errors?.length) {
        toast.error(`Cannot publish: ${err.validation.errors.join(', ')}`)
      } else {
        toast.error(err.error || 'Failed to publish')
      }
    },
  })

  // Unpublish Mutation
  const unpublishMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/admin/assets/${id}/unpublish`, { method: 'POST' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to unpublish')
      return json
    },
    onSuccess: (data) => {
      toast.success(data.message || 'Asset unpublished')
      refetch()
      queryClient.invalidateQueries({ queryKey: ['admin-assets'] })
    },
    onError: (err: any) => toast.error(err.message),
  })

  // Add Unit Mutation
  const addUnitMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch(`/api/admin/assets/${id}/units`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to add unit')
      return json
    },
    onSuccess: () => {
      toast.success('Physical unit registered successfully!')
      setUnitDialogOpen(false)
      setNewUnit({
        assetTag: '',
        serialNumber: '',
        locationId: '',
        baseStatus: 'ACTIVE',
        conditionGrade: 'EXCELLENT',
        accessories: '',
        purchaseCost: '',
        notes: '',
      })
      refetch()
    },
    onError: (err: any) => toast.error(err.message),
  })

  // Update Unit Status Mutation
  const updateUnitMutation = useMutation({
    mutationFn: async ({ unitId, data }: { unitId: string; data: any }) => {
      const res = await fetch(`/api/admin/assets/${id}/units/${unitId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to update unit')
      return json
    },
    onSuccess: () => {
      toast.success('Unit status updated')
      refetch()
    },
    onError: (err: any) => toast.error(err.message),
  })

  // Add Maintenance Block Mutation
  const addMaintMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch(`/api/admin/assets/${id}/blocks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to schedule maintenance')
      return json
    },
    onSuccess: () => {
      toast.success('Maintenance blackout scheduled successfully!')
      setMaintDialogOpen(false)
      refetch()
    },
    onError: (err: any) => toast.error(err.message),
  })

  // Remove Block Mutation
  const removeBlockMutation = useMutation({
    mutationFn: async (blockId: string) => {
      const res = await fetch(`/api/admin/assets/${id}/blocks?blockId=${blockId}`, {
        method: 'DELETE',
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to remove block')
      return json
    },
    onSuccess: () => {
      toast.success('Maintenance block cleared')
      refetch()
    },
    onError: (err: any) => toast.error(err.message),
  })

  if (isLoading) {
    return (
      <div className="p-12 text-center text-muted-foreground flex flex-col items-center justify-center">
        <Package className="h-8 w-8 animate-pulse text-emerald-600 mb-2" />
        <p className="font-semibold text-sm">Loading asset details & inventory units...</p>
      </div>
    )
  }

  if (!asset) {
    return (
      <div className="p-12 text-center">
        <AlertCircle className="h-8 w-8 text-destructive mx-auto mb-2" />
        <p className="font-bold text-lg">Asset Not Found</p>
        <Link href="/admin/assets" className="mt-3 inline-block">
          <Button variant="outline">Back to Catalog</Button>
        </Link>
      </div>
    )
  }

  const primaryRate = asset.rates?.find((r) => r.isPrimary) || asset.rates?.[0]
  const activeUnits = asset.units?.filter((u) => u.baseStatus === 'ACTIVE') || []
  const maintUnits = asset.units?.filter((u) => u.baseStatus === 'MAINTENANCE') || []

  return (
    <div className="p-6 max-w-6xl mx-auto w-full space-y-6">
      {/* Sticky Top Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-xl border border-border shadow-2xs">
        <div className="flex items-center gap-3">
          <Link href="/admin/assets">
            <Button variant="outline" size="icon" className="h-9 w-9">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950 px-2 py-0.5 rounded">
                {asset.code}
              </span>
              <Badge
                className={
                  asset.visibility === 'PUBLISHED'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-500/20'
                    : 'bg-amber-50 text-amber-700 border-amber-500/20'
                }
              >
                {asset.visibility}
              </Badge>
              <span className="text-xs text-muted-foreground">Version {asset.version}</span>
            </div>
            <h1 className="text-lg font-bold text-slate-900 dark:text-white truncate mt-1">
              {asset.name}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={openEditModal}
            className="text-xs gap-1.5 font-semibold border-emerald-500/40 text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950"
          >
            <FileEdit className="h-3.5 w-3.5 text-emerald-600" />
            Edit Information
          </Button>

          {asset.visibility === 'PUBLISHED' ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => unpublishMutation.mutate()}
              disabled={unpublishMutation.isPending}
              className="text-xs text-amber-600 hover:text-amber-700"
            >
              Unpublish
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={() => publishMutation.mutate()}
              disabled={publishMutation.isPending}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold gap-1.5 shadow-sm"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              Validate & Publish
            </Button>
          )}

          <Button
            size="sm"
            variant="outline"
            onClick={() => setActiveTab('preview')}
            className="text-xs gap-1.5"
          >
            <Eye className="h-3.5 w-3.5 text-emerald-600" />
            Public Preview
          </Button>
        </div>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-white dark:bg-slate-900 border border-border p-1 rounded-xl grid grid-cols-5 h-auto">
          <TabsTrigger value="units" className="py-2 text-xs font-semibold gap-1.5">
            <Layers className="h-3.5 w-3.5" />
            Physical Units ({asset.units.length})
          </TabsTrigger>
          <TabsTrigger value="overview" className="py-2 text-xs font-semibold gap-1.5">
            <Package className="h-3.5 w-3.5" />
            Specs & Rates
          </TabsTrigger>
          <TabsTrigger value="maintenance" className="py-2 text-xs font-semibold gap-1.5">
            <Wrench className="h-3.5 w-3.5" />
            Maintenance & Blocks ({asset.blockedIntervals.length})
          </TabsTrigger>
          <TabsTrigger value="audit" className="py-2 text-xs font-semibold gap-1.5">
            <History className="h-3.5 w-3.5" />
            Audit Trail ({asset.auditEvents.length})
          </TabsTrigger>
          <TabsTrigger value="preview" className="py-2 text-xs font-semibold gap-1.5">
            <Eye className="h-3.5 w-3.5" />
            Customer Preview
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Physical Units Management Drawer/Table (Screen 3) */}
        <TabsContent value="units" className="space-y-4">
          <Card className="border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <Layers className="h-4 w-4 text-emerald-600" />
                  Screen 3 — Serialized Physical Units Inventory
                </CardTitle>
                <CardDescription className="text-xs">
                  Individual trackable items for this model. {activeUnits.length} active rentable, {maintUnits.length} in maintenance.
                </CardDescription>
              </div>
              <Button
                size="sm"
                onClick={() => setUnitDialogOpen(true)}
                className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium"
              >
                <Plus className="h-3.5 w-3.5" />
                Register New Unit
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-border text-[11px] uppercase text-muted-foreground font-semibold">
                    <tr>
                      <th className="py-2.5 px-4">Asset Tag</th>
                      <th className="py-2.5 px-4">Serial Number</th>
                      <th className="py-2.5 px-4">Location</th>
                      <th className="py-2.5 px-4">Condition</th>
                      <th className="py-2.5 px-4">Operational Status</th>
                      <th className="py-2.5 px-4">Accessories & Notes</th>
                      <th className="py-2.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {asset.units.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-muted-foreground">
                          No physical units registered yet. Click &quot;Register New Unit&quot; to add stock.
                        </td>
                      </tr>
                    ) : (
                      asset.units.map((unit) => (
                        <tr key={unit.id} className="hover:bg-muted/40 transition">
                          <td className="py-3 px-4 font-mono font-bold text-foreground">
                            {unit.assetTag}
                          </td>
                          <td className="py-3 px-4 font-mono text-muted-foreground">
                            {unit.serialNumber || '—'}
                          </td>
                          <td className="py-3 px-4 text-muted-foreground">
                            {unit.location?.name || 'Central Warehouse'}
                          </td>
                          <td className="py-3 px-4">
                            <Badge variant="outline" className="text-[10px] uppercase font-semibold">
                              {unit.conditionGrade}
                            </Badge>
                          </td>
                          <td className="py-3 px-4">
                            {unit.baseStatus === 'ACTIVE' && (
                              <Badge className="bg-emerald-50 text-emerald-700 border-emerald-500/20 font-semibold gap-1 text-[10px]">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                ACTIVE
                              </Badge>
                            )}
                            {unit.baseStatus === 'MAINTENANCE' && (
                              <Badge className="bg-amber-50 text-amber-700 border-amber-500/20 font-semibold gap-1 text-[10px]">
                                <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                                MAINTENANCE
                              </Badge>
                            )}
                            {unit.baseStatus === 'RETIRED' && (
                              <Badge variant="secondary" className="text-[10px]">
                                RETIRED
                              </Badge>
                            )}
                          </td>
                          <td className="py-3 px-4 max-w-xs truncate text-muted-foreground">
                            {unit.accessories || unit.notes || '—'}
                          </td>
                          <td className="py-3 px-4 text-right space-x-1">
                            {unit.baseStatus === 'ACTIVE' ? (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  updateUnitMutation.mutate({
                                    unitId: unit.id,
                                    data: { baseStatus: 'MAINTENANCE', maintenanceReason: 'Sent for maintenance by admin' },
                                  })
                                }
                                className="h-7 text-[11px] text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                              >
                                Send to Maint.
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  updateUnitMutation.mutate({
                                    unitId: unit.id,
                                    data: { baseStatus: 'ACTIVE' },
                                  })
                                }
                                className="h-7 text-[11px] text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                              >
                                Restore to Active
                              </Button>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: Overview & Specs */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">Pricing & Financial Snapshot</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-xs">
                <div className="flex justify-between py-1 border-b border-border">
                  <span className="text-muted-foreground">Primary Rental Rate:</span>
                  <span className="font-bold text-foreground">
                    {primaryRate?.currency} {primaryRate?.rateAmount.toFixed(2)} / {primaryRate?.billingUnit.toLowerCase()}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-border">
                  <span className="text-muted-foreground">Security Deposit:</span>
                  <span className="font-semibold text-foreground">
                    ${asset.rentalPolicy?.securityDeposit.toFixed(2) || '0.00'}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-border">
                  <span className="text-muted-foreground">Late Return Fee:</span>
                  <span className="font-semibold text-foreground">
                    ${asset.rentalPolicy?.lateFeeAmount.toFixed(2) || '0.00'} / {asset.rentalPolicy?.lateFeeUnit}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-border">
                  <span className="text-muted-foreground">Turnaround Buffers:</span>
                  <span className="font-medium">
                    {asset.rentalPolicy?.preparationBufferMinutes}m prep / {asset.rentalPolicy?.returnBufferMinutes}m return
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-muted-foreground">Lead Time Notice:</span>
                  <span className="font-medium">{asset.rentalPolicy?.minAdvanceNoticeMinutes} mins advance</span>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">Technical Specifications</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-xs">
                {Object.entries(asset.specifications || {}).length > 0 ? (
                  Object.entries(asset.specifications).map(([k, v]) => (
                    <div key={k} className="flex justify-between py-1 border-b border-border/60">
                      <span className="font-medium text-muted-foreground">{k}:</span>
                      <span className="font-semibold text-foreground text-right">{v}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-muted-foreground italic">No specifications specified.</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tab 3: Maintenance & Blocks (Screen 4) */}
        <TabsContent value="maintenance" className="space-y-4">
          <Card className="border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <Wrench className="h-4 w-4 text-amber-600" />
                  Screen 4 — Maintenance Calendar & Unavailability Blocks
                </CardTitle>
                <CardDescription className="text-xs">
                  Blocked intervals remove individual physical units from availability calculation during Step 02 reservations.
                </CardDescription>
              </div>
              <Button
                size="sm"
                onClick={() => setMaintDialogOpen(true)}
                className="gap-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-medium"
              >
                <Plus className="h-3.5 w-3.5" />
                Schedule Maintenance
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-border text-[11px] uppercase text-muted-foreground font-semibold">
                    <tr>
                      <th className="py-2.5 px-4">Scope</th>
                      <th className="py-2.5 px-4">Start Date</th>
                      <th className="py-2.5 px-4">End Date</th>
                      <th className="py-2.5 px-4">Reason / Maintenance Type</th>
                      <th className="py-2.5 px-4">Scheduled By</th>
                      <th className="py-2.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {asset.blockedIntervals.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-muted-foreground">
                          No active or scheduled maintenance blocks for this asset.
                        </td>
                      </tr>
                    ) : (
                      asset.blockedIntervals.map((block) => (
                        <tr key={block.id} className="hover:bg-muted/40 transition">
                          <td className="py-3 px-4 font-mono font-semibold">
                            {block.unit ? (
                              <Badge variant="outline" className="text-[10px]">
                                Unit: {block.unit.assetTag}
                              </Badge>
                            ) : (
                              <Badge className="bg-amber-50 text-amber-700 border-amber-500/20 text-[10px]">
                                Entire Listing
                              </Badge>
                            )}
                          </td>
                          <td className="py-3 px-4 font-medium">
                            {new Date(block.startAt).toLocaleDateString()}
                          </td>
                          <td className="py-3 px-4 font-medium">
                            {new Date(block.endAt).toLocaleDateString()}
                          </td>
                          <td className="py-3 px-4 font-medium text-foreground">
                            {block.reason}
                          </td>
                          <td className="py-3 px-4 text-muted-foreground">
                            {block.createdBy || 'Admin'}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => removeBlockMutation.mutate(block.id)}
                              className="h-7 text-xs text-destructive hover:bg-destructive/10"
                            >
                              Remove Block
                            </Button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 4: Audit Trail */}
        <TabsContent value="audit" className="space-y-4">
          <Card className="border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <History className="h-4 w-4 text-emerald-600" />
                Asset Audit Trail
              </CardTitle>
              <CardDescription className="text-xs">
                Immutable chronological log of inventory additions, pricing updates, and publication lifecycle events.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border">
                {asset.auditEvents.map((evt) => (
                  <div key={evt.id} className="p-3 text-xs flex items-start justify-between hover:bg-muted/30 transition">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px] font-mono">
                          {evt.action}
                        </Badge>
                        <span className="font-semibold text-foreground">{evt.entityType}</span>
                        <span className="text-muted-foreground">by {evt.actorName}</span>
                      </div>
                      {evt.afterJson && (
                        <p className="font-mono text-[11px] text-muted-foreground bg-slate-100 dark:bg-slate-800 p-1.5 rounded max-w-xl truncate">
                          {evt.afterJson}
                        </p>
                      )}
                    </div>
                    <span className="text-[11px] text-muted-foreground shrink-0 ml-4">
                      {new Date(evt.createdAt).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 5: Customer Public Preview (Screen 5) */}
        <TabsContent value="preview" className="space-y-4">
          <Card className="border-border">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <Eye className="h-4 w-4 text-emerald-600" />
                  Screen 5 — Public Listing Customer Preview
                </CardTitle>
                <CardDescription className="text-xs">
                  This preview renders the public customer-facing view. Notice private serial numbers, internal notes, and purchase costs are completely hidden.
                </CardDescription>
              </div>
              <Badge className="bg-emerald-50 text-emerald-700 border-emerald-500/20">
                Customer View
              </Badge>
            </CardHeader>
            <CardContent className="p-6">
              <div className="max-w-4xl mx-auto border border-border rounded-2xl bg-card p-6 shadow-sm space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Photo Gallery Preview */}
                  <div className="space-y-3">
                    <div className="aspect-[4/3] rounded-xl overflow-hidden bg-muted border border-border">
                      <img
                        src={asset.coverImage}
                        alt={asset.name}
                        className="h-full w-full object-cover"
                      />
                    </div>
                    {asset.images?.length > 1 && (
                      <div className="flex gap-2 overflow-x-auto pb-1">
                        {asset.images.slice(0, 4).map((img, i) => (
                          <div key={i} className="h-16 w-20 rounded-lg overflow-hidden shrink-0 border border-border">
                            <img src={img} alt="Thumbnail" className="h-full w-full object-cover" />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Customer Information Column */}
                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs font-medium">
                          {asset.category.name}
                        </Badge>
                        {asset.brand && (
                          <Badge variant="secondary" className="text-xs">
                            {asset.brand.name}
                          </Badge>
                        )}
                      </div>
                      <h2 className="text-xl font-bold mt-2 text-foreground">{asset.name}</h2>
                      <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                        {asset.shortDescription}
                      </p>
                    </div>

                    <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-border flex items-baseline justify-between">
                      <div>
                        <span className="text-2xl font-bold text-foreground">
                          ${primaryRate?.rateAmount.toFixed(2)}
                        </span>
                        <span className="text-xs text-muted-foreground"> /{primaryRate?.billingUnit.toLowerCase()}</span>
                      </div>
                      <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-1 rounded-full">
                        {activeUnits.length} in stock
                      </span>
                    </div>

                    <div className="space-y-1 text-xs text-muted-foreground border-y border-border py-3">
                      <div className="flex justify-between">
                        <span>Security Deposit:</span>
                        <span className="font-semibold text-foreground">
                          ${asset.rentalPolicy?.securityDeposit.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Minimum Duration:</span>
                        <span className="font-semibold text-foreground">
                          {asset.rentalPolicy?.minimumDuration} {asset.rentalPolicy?.minimumDurationUnit.toLowerCase()}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Pickup Locations:</span>
                        <span className="font-semibold text-foreground">
                          {asset.locationOptions.map((o) => o.location.city).join(', ') || 'Phnom Penh'}
                        </span>
                      </div>
                    </div>

                    {/* Rent Now disabled indicator as per Spec 6 Screen 5 */}
                    <div className="pt-2">
                      <Button disabled className="w-full bg-emerald-600/50 text-white cursor-not-allowed">
                        Book / Request Rental (Enabled in Step 02)
                      </Button>
                      <p className="text-[10px] text-center text-muted-foreground mt-1.5">
                        Customer booking workflow will be activated in Step 02 (Rental Requests).
                      </p>
                    </div>
                  </div>
                </div>

                {/* Specs in Preview */}
                <div className="pt-4 border-t border-border">
                  <h3 className="font-semibold text-sm mb-3">Specifications</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {Object.entries(asset.specifications || {}).map(([k, v]) => (
                      <div key={k} className="p-2.5 rounded-lg border border-border bg-slate-50/50 dark:bg-slate-800/30 text-xs">
                        <span className="text-muted-foreground text-[10px] block font-medium">{k}</span>
                        <span className="font-semibold text-foreground mt-0.5 block">{v}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog: Register Physical Unit */}
      <Dialog open={unitDialogOpen} onOpenChange={setUnitDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Register Physical Inventory Unit</DialogTitle>
            <DialogDescription>
              Assign a new individual trackable unit to &quot;{asset.name}&quot;.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div>
              <label className="font-semibold text-foreground">
                Asset Tag Barcode / ID <span className="text-red-500">*</span>
              </label>
              <Input
                value={newUnit.assetTag}
                onChange={(e) => setNewUnit({ ...newUnit, assetTag: e.target.value.toUpperCase() })}
                placeholder="e.g. TO-LAP-0005"
                className="mt-1 font-mono uppercase text-xs"
              />
            </div>

            <div>
              <label className="font-semibold text-foreground">Serial Number (Optional)</label>
              <Input
                value={newUnit.serialNumber}
                onChange={(e) => setNewUnit({ ...newUnit, serialNumber: e.target.value })}
                placeholder="e.g. SN-DELL-998822"
                className="mt-1 font-mono text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-foreground">Location</label>
                <select
                  value={newUnit.locationId}
                  onChange={(e) => setNewUnit({ ...newUnit, locationId: e.target.value })}
                  className="w-full h-9 px-3 text-xs rounded-md border border-input bg-background font-medium mt-1"
                >
                  <option value="">Select Location</option>
                  {locations?.map((l: any) => (
                    <option key={l.id} value={l.id}>
                      {l.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold text-foreground">Condition Grade</label>
                <select
                  value={newUnit.conditionGrade}
                  onChange={(e) => setNewUnit({ ...newUnit, conditionGrade: e.target.value })}
                  className="w-full h-9 px-3 text-xs rounded-md border border-input bg-background font-medium mt-1"
                >
                  <option value="NEW">NEW</option>
                  <option value="EXCELLENT">EXCELLENT</option>
                  <option value="GOOD">GOOD</option>
                  <option value="FAIR">FAIR</option>
                </select>
              </div>
            </div>

            <div>
              <label className="font-semibold text-foreground">Accessories Checklist</label>
              <Input
                value={newUnit.accessories}
                onChange={(e) => setNewUnit({ ...newUnit, accessories: e.target.value })}
                placeholder="e.g. Charger, USB Cable, Padded Case"
                className="mt-1 text-xs"
              />
            </div>

            <div>
              <label className="font-semibold text-foreground">Purchase Cost ($ Private)</label>
              <Input
                type="number"
                value={newUnit.purchaseCost}
                onChange={(e) => setNewUnit({ ...newUnit, purchaseCost: e.target.value })}
                placeholder="e.g. 1150.00"
                className="mt-1 text-xs"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setUnitDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() =>
                addUnitMutation.mutate({
                  ...newUnit,
                  locationId: newUnit.locationId || locations?.[0]?.id,
                })
              }
              disabled={addUnitMutation.isPending || !newUnit.assetTag}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              Register Unit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Schedule Maintenance */}
      <Dialog open={maintDialogOpen} onOpenChange={setMaintDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Schedule Maintenance Blackout</DialogTitle>
            <DialogDescription>
              Block an individual physical unit or the entire listing from booking during service/inspection.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div>
              <label className="font-semibold text-foreground">Target Scope</label>
              <select
                value={newMaint.unitId}
                onChange={(e) => setNewMaint({ ...newMaint, unitId: e.target.value })}
                className="w-full h-9 px-3 text-xs rounded-md border border-input bg-background font-medium mt-1"
              >
                <option value="">Entire Listing (All Units)</option>
                {asset.units.map((u) => (
                  <option key={u.id} value={u.id}>
                    Unit {u.assetTag} ({u.conditionGrade})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-foreground">Start Date</label>
                <Input
                  type="date"
                  value={newMaint.startAt}
                  onChange={(e) => setNewMaint({ ...newMaint, startAt: e.target.value })}
                  className="mt-1 text-xs"
                />
              </div>
              <div>
                <label className="font-semibold text-foreground">End Date</label>
                <Input
                  type="date"
                  value={newMaint.endAt}
                  onChange={(e) => setNewMaint({ ...newMaint, endAt: e.target.value })}
                  className="mt-1 text-xs"
                />
              </div>
            </div>

            <div>
              <label className="font-semibold text-foreground">Maintenance Reason</label>
              <Input
                value={newMaint.reason}
                onChange={(e) => setNewMaint({ ...newMaint, reason: e.target.value })}
                placeholder="e.g. Annual sensor calibration, keycap replacement..."
                className="mt-1 text-xs"
              />
            </div>

            <div>
              <label className="font-semibold text-foreground">Internal Notes</label>
              <Textarea
                value={newMaint.notes}
                onChange={(e) => setNewMaint({ ...newMaint, notes: e.target.value })}
                placeholder="Contractor/technician details..."
                rows={2}
                className="mt-1 text-xs"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setMaintDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() =>
                addMaintMutation.mutate({
                  ...newMaint,
                  unitId: newMaint.unitId || null,
                })
              }
              disabled={addMaintMutation.isPending || !newMaint.reason}
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              Schedule Maintenance
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Edit Asset Information Dialog */}
      <Dialog open={editInfoOpen} onOpenChange={setEditInfoOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileEdit className="h-5 w-5 text-emerald-600" />
              Edit Asset Listing Information
            </DialogTitle>
            <DialogDescription className="text-xs">
              Modify product code, name, slug, media, rates, and rental policies for this model.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault()
              if (!editForm.name.trim() || !editForm.code.trim()) {
                toast.error('Asset Name and Code are required.')
                return
              }
              if (!editForm.slug.trim() || editForm.slug.trim().length < 3) {
                toast.error('Slug must be at least 3 characters long for web URLs.')
                return
              }
              if (!editForm.categoryId) {
                toast.error('Please assign a category.')
                return
              }
              updateListingMutation.mutate(editForm)
            }}
            className="space-y-4 py-2 text-xs"
          >
            {/* General Identification */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="font-semibold text-foreground">
                  Asset Name <span className="text-destructive">*</span>
                </label>
                <Input
                  value={editForm.name}
                  onChange={(e) => {
                    const newName = e.target.value
                    setEditForm((prev) => ({
                      ...prev,
                      name: newName,
                      slug:
                        prev.slug === '' || prev.slug.length < 3
                          ? newName
                              .toLowerCase()
                              .replace(/[^a-z0-9]+/g, '-')
                              .replace(/(^-|-$)+/g, '')
                          : prev.slug,
                    }))
                  }}
                  placeholder="e.g. Lenovo Legion 5 Gaming Laptop"
                  className="h-8 text-xs"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-foreground">
                  Asset Code <span className="text-destructive">*</span>
                </label>
                <Input
                  value={editForm.code}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, code: e.target.value }))}
                  placeholder="e.g. LAP-LEN-LEG5"
                  className="h-8 text-xs font-mono"
                  required
                />
              </div>
            </div>

            {/* Slug & Model */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="font-semibold text-foreground">
                  URL Slug <span className="text-destructive">*</span>
                </label>
                <Input
                  value={editForm.slug}
                  onChange={(e) =>
                    setEditForm((prev) => ({
                      ...prev,
                      slug: e.target.value
                        .toLowerCase()
                        .replace(/[^a-z0-9-]+/g, ''),
                    }))
                  }
                  placeholder="e.g. lenovo-legion-5"
                  className="h-8 text-xs font-mono"
                  required
                />
                <p className="text-[10px] text-muted-foreground">
                  Required &ge; 3 characters for customer URL: /rentals/{editForm.slug || '...'}
                </p>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-foreground">Model / Series</label>
                <Input
                  value={editForm.model}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, model: e.target.value }))}
                  placeholder="e.g. 15IAH7H / RTX 3060"
                  className="h-8 text-xs"
                />
              </div>
            </div>

            {/* Category & Brand */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="font-semibold text-foreground">
                  Category <span className="text-destructive">*</span>
                </label>
                <select
                  value={editForm.categoryId}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, categoryId: e.target.value }))}
                  className="w-full h-8 px-2.5 rounded-md border border-input bg-background text-xs font-medium focus:ring-2 focus:ring-emerald-500"
                  required
                >
                  <option value="">Select Category...</option>
                  {categories?.map((cat: any) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.parent ? `— ${cat.name}` : cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-foreground">Brand</label>
                <select
                  value={editForm.brandId}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, brandId: e.target.value }))}
                  className="w-full h-8 px-2.5 rounded-md border border-input bg-background text-xs font-medium focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">Generic / Unbranded</option>
                  {brands?.map((b: any) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Short Description */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="font-semibold text-foreground">
                  Short Description / Summary <span className="text-destructive">*</span>
                </label>
                <span className={`text-[10px] ${editForm.shortDescription.length < 10 ? 'text-rose-500 font-semibold' : 'text-muted-foreground'}`}>
                  {editForm.shortDescription.length} chars (min 10 required for publish)
                </span>
              </div>
              <Input
                value={editForm.shortDescription}
                onChange={(e) => setEditForm((prev) => ({ ...prev, shortDescription: e.target.value }))}
                placeholder="Brief customer summary (e.g. High-performance gaming laptop with 165Hz screen)"
                className="h-8 text-xs"
                required
              />
            </div>

            {/* Full Description */}
            <div className="space-y-1">
              <label className="font-semibold text-foreground">Full Description</label>
              <Textarea
                value={editForm.description}
                onChange={(e) => setEditForm((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Detailed specifications, usage instructions, package contents..."
                rows={3}
                className="text-xs min-h-[60px]"
              />
            </div>

            {/* Cover Image Upload (< 1MB) */}
            <div className="space-y-1.5 p-3 rounded-lg border border-border bg-slate-50 dark:bg-slate-800/40">
              <div className="flex items-center justify-between">
                <label className="font-semibold text-foreground flex items-center gap-1.5">
                  <ImageIcon className="h-3.5 w-3.5 text-emerald-600" />
                  Cover Photo <span className="text-destructive">*</span>
                </label>
                <span className="text-[10px] text-muted-foreground">Strictly under 1MB</span>
              </div>

              {/* Hidden file input */}
              <input
                ref={coverFileInputRef}
                type="file"
                accept="image/*"
                onChange={handleCoverUpload}
                className="hidden"
              />

              <div className="flex items-center gap-3">
                {editForm.coverImage ? (
                  <div className="relative h-16 w-20 rounded-lg overflow-hidden border border-border bg-muted shrink-0 group">
                    <img
                      src={editForm.coverImage}
                      alt="Cover Preview"
                      className="h-full w-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => setEditForm((prev) => ({ ...prev, coverImage: '' }))}
                      className="absolute inset-0 bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition text-[10px]"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <div className="h-16 w-20 rounded-lg border border-dashed border-border bg-muted flex flex-col items-center justify-center text-muted-foreground text-[10px] shrink-0">
                    <ImageIcon className="h-5 w-5 mb-0.5 opacity-60" />
                    <span>No Image</span>
                  </div>
                )}

                <div className="flex-1 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={uploadingCover}
                      onClick={() => coverFileInputRef.current?.click()}
                      className="h-7 text-xs gap-1.5 font-medium"
                    >
                      <Upload className="h-3.5 w-3.5 text-emerald-600" />
                      {uploadingCover ? 'Uploading...' : 'Choose from File Explorer'}
                    </Button>
                    {editForm.coverImage && (
                      <span className="text-[11px] text-emerald-600 font-medium flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" /> Ready
                      </span>
                    )}
                  </div>
                  <Input
                    value={editForm.coverImage}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, coverImage: e.target.value }))}
                    placeholder="Or paste external image URL..."
                    className="h-7 text-[11px]"
                  />
                </div>
              </div>
            </div>

            {/* Pricing & Deposit */}
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="font-semibold text-foreground">
                  Daily Rental Rate ($) <span className="text-destructive">*</span>
                </label>
                <Input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={editForm.rateAmount || ''}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, rateAmount: parseFloat(e.target.value) || 0 }))}
                  className="h-8 text-xs font-mono"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-foreground">Security Deposit ($)</label>
                <Input
                  type="number"
                  min="0"
                  step="1"
                  value={editForm.securityDeposit || ''}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, securityDeposit: parseFloat(e.target.value) || 0 }))}
                  className="h-8 text-xs font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-foreground">Min Duration (Days)</label>
                <Input
                  type="number"
                  min="1"
                  value={editForm.minimumDuration || 1}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, minimumDuration: parseInt(e.target.value, 10) || 1 }))}
                  className="h-8 text-xs"
                />
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setEditInfoOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={updateListingMutation.isPending}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
              >
                {updateListingMutation.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

