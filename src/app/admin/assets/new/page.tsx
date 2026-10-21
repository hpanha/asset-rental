'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery, useMutation } from '@tanstack/react-query'
import Link from 'next/link'
import {
  Package,
  Layers,
  DollarSign,
  Clock,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  Plus,
  Trash2,
  ShieldCheck,
  Eye,
  Info,
  Upload,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'

export default function NewAssetPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('general')

  // Form State
  const [formData, setFormData] = useState({
    // General
    code: '',
    name: '',
    slug: '',
    categoryId: '',
    brandId: '',
    model: '',
    shortDescription: '',
    description: '',
    trackingMode: 'SERIALIZED',
    // Specifications
    specifications: [
      { key: 'Brand Model', value: '' },
      { key: 'Condition Baseline', value: 'Tested & Certified' },
    ],
    // Media
    coverImage: '',
    galleryUrls: [] as string[],
    // Rates
    currency: 'USD',
    billingUnit: 'DAY',
    rateAmount: 25.00,
    // Policy
    securityDeposit: 100.00,
    minimumDuration: 1,
    minimumDurationUnit: 'DAY',
    lateFeeAmount: 30.00,
    preparationBufferMinutes: 120,
    returnBufferMinutes: 120,
    minAdvanceNoticeMinutes: 120,
    termsTemplate: 'Standard RentHub Equipment Rental Terms apply. Units must be returned in matching condition grade.',
    // Fulfillment
    allowDelivery: true,
    deliveryFee: 15.00,
    locationIds: [] as string[],
    // Initial Unit
    initialUnitTag: '',
    initialUnitSerial: '',
    initialUnitCondition: 'EXCELLENT',
    initialUnitCost: '',
    initialUnitNotes: '',
  })

  // Fetch Categories
  const { data: categories } = useQuery({
    queryKey: ['admin-categories'],
    queryFn: async () => {
      const res = await fetch('/api/admin/categories')
      if (!res.ok) throw new Error('Failed to fetch categories')
      return res.json()
    },
  })

  // Fetch Brands
  const { data: brands } = useQuery({
    queryKey: ['admin-brands'],
    queryFn: async () => {
      const res = await fetch('/api/admin/brands')
      if (!res.ok) throw new Error('Failed to fetch brands')
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

  // Auto-generate Code & Slug when Name changes if empty
  const handleNameChange = (name: string) => {
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '')
    const autoCode = name
      .split(' ')
      .slice(0, 3)
      .map((w) => w.slice(0, 3).toUpperCase())
      .join('-')

    setFormData((prev) => ({
      ...prev,
      name,
      slug: prev.slug === '' || prev.slug.startsWith('asset-') ? slug : prev.slug,
      code: prev.code === '' ? autoCode : prev.code,
    }))
  }

  // Create Mutation
  const createMutation = useMutation({
    mutationFn: async ({ shouldPublish }: { shouldPublish: boolean }) => {
      if (!formData.code.trim()) {
        throw new Error('Asset Code is required.')
      }
      if (!formData.name.trim()) {
        throw new Error('Public Asset Name is required.')
      }
      if (!formData.categoryId) {
        throw new Error('Please select a Category in the 1. General tab.')
      }

      // Build specifications JSON
      const specsObj: Record<string, string> = {}
      for (const item of formData.specifications) {
        if (item.key.trim() && item.value.trim()) {
          specsObj[item.key.trim()] = item.value.trim()
        }
      }

      // Filter gallery images
      const images = formData.galleryUrls.filter((u) => u && u.trim().length > 5)
      if (formData.coverImage && !images.includes(formData.coverImage)) {
        images.unshift(formData.coverImage)
      }

      // Build initial units array
      const units = []
      if (formData.initialUnitTag.trim()) {
        units.push({
          assetTag: formData.initialUnitTag.trim(),
          serialNumber: formData.initialUnitSerial.trim() || null,
          locationId: formData.locationIds[0] || locations?.[0]?.id,
          baseStatus: 'ACTIVE',
          conditionGrade: formData.initialUnitCondition,
          purchaseCost: formData.initialUnitCost ? Number(formData.initialUnitCost) : null,
          notes: formData.initialUnitNotes || null,
        })
      }

      const payload = {
        code: formData.code.trim().toUpperCase(),
        name: formData.name.trim(),
        slug: formData.slug.trim(),
        categoryId: formData.categoryId,
        brandId: formData.brandId || null,
        model: formData.model || null,
        shortDescription: formData.shortDescription.trim(),
        description: formData.description.trim(),
        specifications: specsObj,
        trackingMode: formData.trackingMode,
        coverImage: formData.coverImage.trim() || images[0] || 'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=800',
        images,
        allowDelivery: formData.allowDelivery,
        deliveryFee: Number(formData.deliveryFee) || 0,
        visibility: 'DRAFT',
        currency: formData.currency,
        billingUnit: formData.billingUnit,
        rateAmount: Number(formData.rateAmount) || 0,
        securityDeposit: Number(formData.securityDeposit) || 0,
        minimumDuration: Number(formData.minimumDuration) || 1,
        minimumDurationUnit: formData.minimumDurationUnit,
        lateFeeAmount: Number(formData.lateFeeAmount) || 0,
        preparationBufferMinutes: Number(formData.preparationBufferMinutes) || 120,
        returnBufferMinutes: Number(formData.returnBufferMinutes) || 120,
        minAdvanceNoticeMinutes: Number(formData.minAdvanceNoticeMinutes) || 120,
        termsTemplate: formData.termsTemplate,
        locationIds: formData.locationIds.length > 0 ? formData.locationIds : [locations?.[0]?.id],
        units,
      }

      const res = await fetch('/api/admin/assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to create asset')

      // If requested to publish immediately, call publish endpoint
      if (shouldPublish) {
        try {
          const pubRes = await fetch(`/api/admin/assets/${data.listing.id}/publish`, { method: 'POST' })
          const pubData = await pubRes.json()
          if (!pubRes.ok) {
            // Saved as draft, but publish criteria (e.g. units or short desc) failed
            return {
              listing: data.listing,
              published: false,
              publishError: pubData.validation?.errors?.[0] || pubData.error || 'Failed publication criteria',
            }
          }
          return { listing: data.listing, published: true }
        } catch {
          return { listing: data.listing, published: false, publishError: 'Could not validate for publication' }
        }
      }

      return { listing: data.listing, published: false }
    },
    onSuccess: (result, variables) => {
      if (variables.shouldPublish && !result.published) {
        toast.warning(
          `Asset saved as Draft! Note: ${result.publishError || 'Requires active physical unit & 10+ char description to publish.'}`,
          { duration: 8000 }
        )
      } else if (result.published) {
        toast.success('Asset created and published successfully!')
      } else {
        toast.success('Asset saved as Draft successfully!')
      }
      router.push(`/admin/assets/${result.listing.id}`)
    },
    onError: (err: any) => {
      toast.error(err.message || 'An error occurred')
    },
  })

  // Handle location checkbox
  const toggleLocation = (locId: string) => {
    setFormData((prev) => {
      const exists = prev.locationIds.includes(locId)
      return {
        ...prev,
        locationIds: exists
          ? prev.locationIds.filter((id) => id !== locId)
          : [...prev.locationIds, locId],
      }
    })
  }

  // Add Specification Row
  const addSpecRow = () => {
    setFormData((prev) => ({
      ...prev,
      specifications: [...prev.specifications, { key: '', value: '' }],
    }))
  }

  const removeSpecRow = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      specifications: prev.specifications.filter((_, i) => i !== index),
    }))
  }

  // File Upload Handling (< 1MB strictly)
  const coverInputRef = useRef<HTMLInputElement>(null)
  const galleryInputRef = useRef<HTMLInputElement>(null)
  const [uploadingCover, setUploadingCover] = useState(false)
  const [uploadingGallery, setUploadingGallery] = useState(false)

  const MAX_SIZE_BYTES = 1 * 1024 * 1024 // 1MB

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Clear input so same file can be re-selected if needed
    e.target.value = ''

    if (file.size > MAX_SIZE_BYTES) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(2)
      toast.error(`"${file.name}" is ${sizeMB}MB. File size must be strictly below 1MB!`)
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

      setFormData((prev) => ({ ...prev, coverImage: json.url }))
      toast.success('Cover image uploaded from file explorer!')
    } catch (err: any) {
      toast.error(err.message || 'Failed to upload cover image')
    } finally {
      setUploadingCover(false)
    }
  }

  const handleGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    // Clear input so same files can be re-selected if needed
    e.target.value = ''

    const validFiles: File[] = []
    const oversizedFiles: string[] = []

    for (const f of files) {
      if (f.size > MAX_SIZE_BYTES) {
        oversizedFiles.push(`"${f.name}" (${(f.size / (1024 * 1024)).toFixed(2)}MB)`)
      } else {
        validFiles.push(f)
      }
    }

    if (oversizedFiles.length > 0) {
      toast.error(`Exceeded 1MB limit: ${oversizedFiles.join(', ')}. Only files below 1MB are accepted.`)
    }

    if (validFiles.length === 0) return

    setUploadingGallery(true)
    try {
      const form = new FormData()
      for (const f of validFiles) {
        form.append('files', f)
      }

      const res = await fetch('/api/admin/upload', {
        method: 'POST',
        body: form,
      })

      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Upload failed')

      const newUrls = (json.urls || [json.url]).filter(Boolean)
      setFormData((prev) => ({
        ...prev,
        galleryUrls: [...prev.galleryUrls.filter((u) => u.trim().length > 0), ...newUrls],
      }))
      toast.success(`Uploaded ${newUrls.length} image${newUrls.length > 1 ? 's' : ''} from file explorer!`)
    } catch (err: any) {
      toast.error(err.message || 'Failed to upload gallery images')
    } finally {
      setUploadingGallery(false)
    }
  }

  return (
    <div className="p-6 max-w-5xl mx-auto w-full space-y-6">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/admin/assets">
            <Button variant="outline" size="icon" className="h-9 w-9">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              Create New Asset Listing
            </h1>
            <p className="text-xs text-muted-foreground">
              Screen 2 — Add/Edit Asset: Stepper form to configure rental listing, rates, buffers and inventory.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => createMutation.mutate({ shouldPublish: false })}
            disabled={createMutation.isPending || !formData.code || !formData.name}
            className="text-xs"
          >
            Save Draft
          </Button>
          <Button
            onClick={() => createMutation.mutate({ shouldPublish: true })}
            disabled={createMutation.isPending || !formData.code || !formData.name}
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm"
          >
            Validate & Publish
          </Button>
        </div>
      </div>

      {/* Form Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-white dark:bg-slate-900 border border-border p-1 rounded-xl grid grid-cols-6 h-auto">
          <TabsTrigger value="general" className="py-2 text-xs font-medium gap-1.5">
            <Package className="h-3.5 w-3.5" />
            1. General
          </TabsTrigger>
          <TabsTrigger value="media" className="py-2 text-xs font-medium gap-1.5">
            <ImageIcon className="h-3.5 w-3.5" />
            2. Media
          </TabsTrigger>
          <TabsTrigger value="units" className="py-2 text-xs font-medium gap-1.5">
            <Layers className="h-3.5 w-3.5" />
            3. Inventory Units
          </TabsTrigger>
          <TabsTrigger value="pricing" className="py-2 text-xs font-medium gap-1.5">
            <DollarSign className="h-3.5 w-3.5" />
            4. Rental Rates
          </TabsTrigger>
          <TabsTrigger value="availability" className="py-2 text-xs font-medium gap-1.5">
            <Clock className="h-3.5 w-3.5" />
            5. Availability & Rules
          </TabsTrigger>
          <TabsTrigger value="preview" className="py-2 text-xs font-medium gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5" />
            6. Readiness
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: General */}
        <TabsContent value="general" className="space-y-4">
          <Card className="border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Listing General Information</CardTitle>
              <CardDescription className="text-xs">
                Asset code, category, public title, and customer-facing specifications.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-foreground">
                    Asset Listing Code <span className="text-red-500">*</span>
                  </label>
                  <Input
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    placeholder="e.g. LAP-DELL-5440"
                    className="mt-1 font-mono uppercase"
                  />
                  <p className="text-[11px] text-muted-foreground mt-1">Unique internal catalog code.</p>
                </div>

                <div>
                  <label className="text-xs font-semibold text-foreground">
                    Public Asset Name <span className="text-red-500">*</span>
                  </label>
                  <Input
                    value={formData.name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    placeholder="e.g. Dell Latitude 5440 Business Laptop"
                    className="mt-1 font-medium"
                  />
                  <p className="text-[11px] text-muted-foreground mt-1">The title displayed to renters.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-semibold text-foreground">
                    Category <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.categoryId}
                    onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                    className="w-full h-9 px-3 text-xs rounded-md border border-input bg-background font-medium mt-1 focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">Select Category</option>
                    {categories?.map((cat: any) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.parent ? `${cat.parent.name} → ${cat.name}` : cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-foreground">Brand (Optional)</label>
                  <select
                    value={formData.brandId}
                    onChange={(e) => setFormData({ ...formData, brandId: e.target.value })}
                    className="w-full h-9 px-3 text-xs rounded-md border border-input bg-background font-medium mt-1 focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">Select Brand</option>
                    {brands?.map((b: any) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-foreground">Model Number</label>
                  <Input
                    value={formData.model}
                    onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                    placeholder="e.g. Latitude 5440"
                    className="mt-1 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground">
                  Short Description (Card Summary) <span className="text-red-500">*</span>
                </label>
                <Input
                  value={formData.shortDescription}
                  onChange={(e) => setFormData({ ...formData, shortDescription: e.target.value })}
                  placeholder="e.g. Intel Core i7, 32GB RAM, 512GB SSD, reliable for high-stakes remote conferences."
                  className="mt-1 text-xs"
                />
                <p className="text-[11px] text-muted-foreground mt-1">Brief summary displayed on catalog cards (minimum 10 characters required to publish).</p>
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground">Detailed Rich Description</label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Full specifications, ideal use cases, included accessories, and battery runtime..."
                  rows={4}
                  className="mt-1 text-xs"
                />
              </div>

              {/* Specifications Key-Value */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-foreground">
                    Public Technical Specifications (Key / Value)
                  </label>
                  <Button type="button" size="sm" variant="outline" onClick={addSpecRow} className="h-7 text-xs gap-1">
                    <Plus className="h-3 w-3" /> Add Spec
                  </Button>
                </div>
                <div className="space-y-2">
                  {formData.specifications.map((spec, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <Input
                        value={spec.key}
                        onChange={(e) => {
                          const updated = [...formData.specifications]
                          updated[idx].key = e.target.value
                          setFormData({ ...formData, specifications: updated })
                        }}
                        placeholder="e.g. RAM / Engine / Lens"
                        className="h-8 text-xs w-1/3"
                      />
                      <Input
                        value={spec.value}
                        onChange={(e) => {
                          const updated = [...formData.specifications]
                          updated[idx].value = e.target.value
                          setFormData({ ...formData, specifications: updated })
                        }}
                        placeholder="e.g. 32GB DDR5 / 286cc / 24-70mm GM II"
                        className="h-8 text-xs flex-1"
                      />
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        onClick={() => removeSpecRow(idx)}
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: Media */}
        <TabsContent value="media" className="space-y-4">
          <Card className="border-border">
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <ImageIcon className="h-4 w-4 text-emerald-600" />
                    Photos & Cover Media
                  </CardTitle>
                  <CardDescription className="text-xs mt-0.5">
                    Upload images from your file explorer. File size limit is strictly below 1MB per image.
                  </CardDescription>
                </div>
                <Badge variant="outline" className="text-xs gap-1 border-emerald-500/30 text-emerald-700 bg-emerald-50/50 w-fit">
                  <ShieldCheck className="h-3 w-3 text-emerald-600" />
                  Max 1MB / Image
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-6 text-sm">
              {/* Cover Photo Section */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    Cover Photo <span className="text-red-500">*</span>
                    <span className="text-[11px] font-normal text-muted-foreground">(Primary catalog thumbnail)</span>
                  </label>
                  {formData.coverImage && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setFormData((prev) => ({ ...prev, coverImage: '' }))}
                      className="h-6 px-2 text-[11px] text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-3 w-3 mr-1" /> Remove Cover
                    </Button>
                  )}
                </div>

                {/* Hidden File Input for Cover Photo */}
                <input
                  type="file"
                  ref={coverInputRef}
                  accept="image/*"
                  onChange={handleCoverUpload}
                  className="hidden"
                />

                {formData.coverImage ? (
                  <div className="relative group rounded-xl border border-border overflow-hidden bg-muted w-full max-w-md h-52">
                    <img
                      src={formData.coverImage}
                      alt="Cover Preview"
                      className="h-full w-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        onClick={() => coverInputRef.current?.click()}
                        disabled={uploadingCover}
                        className="text-xs h-8 gap-1.5 bg-white text-slate-800 hover:bg-slate-100"
                      >
                        <Upload className="h-3.5 w-3.5" />
                        Choose Different File
                      </Button>
                    </div>
                    <div className="absolute bottom-2 left-2">
                      <span className="bg-emerald-600/90 backdrop-blur-xs text-white text-[10px] font-semibold px-2 py-0.5 rounded-full shadow">
                        Cover Photo
                      </span>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => !uploadingCover && coverInputRef.current?.click()}
                    className="border-2 border-dashed border-border hover:border-emerald-500 rounded-xl p-8 text-center cursor-pointer transition-all bg-slate-50/50 hover:bg-emerald-50/20 max-w-md"
                  >
                    <div className="h-12 w-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-3 shadow-2xs">
                      {uploadingCover ? (
                        <div className="h-5 w-5 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Upload className="h-5 w-5" />
                      )}
                    </div>
                    <p className="font-semibold text-xs text-slate-800 dark:text-slate-200">
                      {uploadingCover ? 'Uploading cover photo...' : 'Choose Cover Image from File Explorer'}
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      Click to browse files on your computer
                    </p>
                    <p className="text-[10px] text-emerald-700 font-semibold mt-1">
                      PNG, JPG, WEBP, GIF — strictly below 1MB
                    </p>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="mt-3 text-xs h-8 border-emerald-300 text-emerald-700 hover:bg-emerald-50 pointer-events-none"
                    >
                      <Upload className="h-3 w-3 mr-1.5" />
                      Browse File Explorer
                    </Button>
                  </div>
                )}
              </div>

              {/* Additional Gallery Images Section */}
              <div className="pt-4 border-t border-border space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <label className="text-xs font-semibold text-foreground">
                      Additional Gallery Images
                    </label>
                    <p className="text-[11px] text-muted-foreground">
                      Select multiple images from file explorer. Each image must be below 1MB.
                    </p>
                  </div>

                  {/* Hidden File Input for Multiple Gallery Images */}
                  <input
                    type="file"
                    ref={galleryInputRef}
                    accept="image/*"
                    multiple
                    onChange={handleGalleryUpload}
                    className="hidden"
                  />

                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => galleryInputRef.current?.click()}
                    disabled={uploadingGallery}
                    className="h-8 text-xs gap-1.5 border-border shrink-0 hover:border-emerald-500 hover:text-emerald-700"
                  >
                    {uploadingGallery ? (
                      <div className="h-3.5 w-3.5 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Upload className="h-3.5 w-3.5 text-emerald-600" />
                    )}
                    Upload from File Explorer
                  </Button>
                </div>

                {/* Gallery Images Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 pt-2">
                  {formData.galleryUrls
                    .filter((u) => u && u.trim().length > 0)
                    .map((url, idx) => (
                      <div
                        key={idx}
                        className="group relative rounded-xl border border-border overflow-hidden bg-muted aspect-4/3"
                      >
                        <img
                          src={url}
                          alt={`Gallery photo ${idx + 1}`}
                          className="h-full w-full object-cover transition-transform group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1.5 p-2">
                          <button
                            type="button"
                            onClick={() => {
                              setFormData((prev) => ({
                                ...prev,
                                coverImage: url,
                              }))
                              toast.success('Set as primary cover photo!')
                            }}
                            className="text-[10px] text-white bg-black/70 hover:bg-black px-2 py-1 rounded font-medium"
                          >
                            Set as Cover
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setFormData((prev) => ({
                                ...prev,
                                galleryUrls: prev.galleryUrls.filter((_, i) => i !== idx),
                              }))
                            }}
                            className="text-[10px] text-red-200 bg-red-600/80 hover:bg-red-700 px-2 py-1 rounded font-medium flex items-center gap-1"
                          >
                            <Trash2 className="h-3 w-3" /> Remove
                          </button>
                        </div>
                        <div className="absolute top-1.5 left-1.5">
                          <span className="bg-black/60 backdrop-blur-xs text-white text-[9px] font-mono px-1.5 py-0.5 rounded">
                            #{idx + 1}
                          </span>
                        </div>
                      </div>
                    ))}

                  {/* Add Images Tile in Grid */}
                  <div
                    onClick={() => !uploadingGallery && galleryInputRef.current?.click()}
                    className="border-2 border-dashed border-border hover:border-emerald-500 rounded-xl aspect-4/3 flex flex-col items-center justify-center p-3 text-center cursor-pointer transition-all bg-slate-50/50 hover:bg-emerald-50/20"
                  >
                    {uploadingGallery ? (
                      <div className="h-6 w-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Plus className="h-6 w-6 text-muted-foreground" />
                    )}
                    <span className="text-[11px] font-medium text-slate-700 dark:text-slate-300 mt-1">
                      Add from Explorer
                    </span>
                    <span className="text-[9px] text-emerald-700 font-semibold mt-0.5">
                      Limit &lt; 1MB
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 3: Inventory Units */}
        <TabsContent value="units" className="space-y-4">
          <Card className="border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Physical Serialized Inventory</CardTitle>
              <CardDescription className="text-xs">
                Register the first physical unit. You can add more units after saving. At least one ACTIVE unit is required to publish.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/30 p-3 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-300 flex items-start gap-2">
                <Info className="h-4 w-4 shrink-0 mt-0.5" />
                <div>
                  <strong>Unit Traceability Standard:</strong> Every physical item has a unique company asset tag barcode/identifier (e.g. <code>TO-LAP-0001</code>). Purchase cost and internal notes are strictly private and never exposed to customers.
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-foreground">
                    Internal Asset Tag <span className="text-red-500">*</span>
                  </label>
                  <Input
                    value={formData.initialUnitTag}
                    onChange={(e) => setFormData({ ...formData, initialUnitTag: e.target.value.toUpperCase() })}
                    placeholder="e.g. TO-LAP-0001"
                    className="mt-1 font-mono uppercase text-xs"
                  />
                  <p className="text-[11px] text-muted-foreground mt-1">Unique barcode / asset label ID.</p>
                </div>

                <div>
                  <label className="text-xs font-semibold text-foreground">Manufacturer Serial Number</label>
                  <Input
                    value={formData.initialUnitSerial}
                    onChange={(e) => setFormData({ ...formData, initialUnitSerial: e.target.value })}
                    placeholder="e.g. SN-ABC-123456"
                    className="mt-1 font-mono text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-foreground">Condition Grade</label>
                  <select
                    value={formData.initialUnitCondition}
                    onChange={(e) => setFormData({ ...formData, initialUnitCondition: e.target.value })}
                    className="w-full h-9 px-3 text-xs rounded-md border border-input bg-background font-medium mt-1 focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="NEW">NEW — Factory Sealed / Brand New</option>
                    <option value="EXCELLENT">EXCELLENT — Pristine condition, no visible wear</option>
                    <option value="GOOD">GOOD — Minor cosmetic marks, 100% operational</option>
                    <option value="FAIR">FAIR — Noticeable cosmetic wear, fully functional</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-foreground">Purchase Cost ($ USD - Private)</label>
                  <Input
                    type="number"
                    value={formData.initialUnitCost}
                    onChange={(e) => setFormData({ ...formData, initialUnitCost: e.target.value })}
                    placeholder="e.g. 1200.00"
                    className="mt-1 text-xs"
                  />
                  <p className="text-[11px] text-muted-foreground mt-1">Staff-only accounting field.</p>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground">Initial Internal Notes</label>
                <Input
                  value={formData.initialUnitNotes}
                  onChange={(e) => setFormData({ ...formData, initialUnitNotes: e.target.value })}
                  placeholder="e.g. Battery health 99%, includes protective hard sleeve."
                  className="mt-1 text-xs"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 4: Pricing */}
        <TabsContent value="pricing" className="space-y-4">
          <Card className="border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Rental Pricing & Deposit</CardTitle>
              <CardDescription className="text-xs">
                Base charging rate, currency, security deposit, and late return policies.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-semibold text-foreground">
                    Base Rental Rate <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.rateAmount}
                    onChange={(e) => setFormData({ ...formData, rateAmount: Number(e.target.value) })}
                    className="mt-1 text-sm font-bold"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-foreground">Currency</label>
                  <select
                    value={formData.currency}
                    onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                    className="w-full h-9 px-3 text-xs rounded-md border border-input bg-background font-medium mt-1 focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="USD">USD ($)</option>
                    <option value="KHR">KHR (Riel)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-foreground">Billing Unit</label>
                  <select
                    value={formData.billingUnit}
                    onChange={(e) => setFormData({ ...formData, billingUnit: e.target.value })}
                    className="w-full h-9 px-3 text-xs rounded-md border border-input bg-background font-medium mt-1 focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="DAY">Per Day (Standard)</option>
                    <option value="HOUR">Per Hour</option>
                    <option value="WEEK">Per Week</option>
                    <option value="MONTH">Per Month</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-semibold text-foreground">Security Deposit ($)</label>
                  <Input
                    type="number"
                    value={formData.securityDeposit}
                    onChange={(e) => setFormData({ ...formData, securityDeposit: Number(e.target.value) })}
                    className="mt-1 text-xs"
                  />
                  <p className="text-[11px] text-muted-foreground mt-1">Refundable upon return inspection.</p>
                </div>

                <div>
                  <label className="text-xs font-semibold text-foreground">Late Return Fee ($/day)</label>
                  <Input
                    type="number"
                    value={formData.lateFeeAmount}
                    onChange={(e) => setFormData({ ...formData, lateFeeAmount: Number(e.target.value) })}
                    className="mt-1 text-xs"
                  />
                  <p className="text-[11px] text-muted-foreground mt-1">Assessed after 30m grace period.</p>
                </div>

                <div>
                  <label className="text-xs font-semibold text-foreground">Minimum Duration</label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      type="number"
                      value={formData.minimumDuration}
                      onChange={(e) => setFormData({ ...formData, minimumDuration: Number(e.target.value) })}
                      className="text-xs w-20"
                    />
                    <select
                      value={formData.minimumDurationUnit}
                      onChange={(e) => setFormData({ ...formData, minimumDurationUnit: e.target.value })}
                      className="flex-1 h-9 px-2 text-xs rounded-md border border-input bg-background"
                    >
                      <option value="DAY">Days</option>
                      <option value="HOUR">Hours</option>
                    </select>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 5: Availability & Fulfillment */}
        <TabsContent value="availability" className="space-y-4">
          <Card className="border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Fulfillment & Turnaround Buffers</CardTitle>
              <CardDescription className="text-xs">
                Turnaround padding prevents back-to-back overlap conflicts and gives staff time for cleaning and inspection.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-semibold text-foreground">Prep Buffer (Minutes)</label>
                  <Input
                    type="number"
                    value={formData.preparationBufferMinutes}
                    onChange={(e) => setFormData({ ...formData, preparationBufferMinutes: Number(e.target.value) })}
                    className="mt-1 text-xs"
                  />
                  <p className="text-[11px] text-muted-foreground mt-1">Time required before customer pickup.</p>
                </div>

                <div>
                  <label className="text-xs font-semibold text-foreground">Return Buffer (Minutes)</label>
                  <Input
                    type="number"
                    value={formData.returnBufferMinutes}
                    onChange={(e) => setFormData({ ...formData, returnBufferMinutes: Number(e.target.value) })}
                    className="mt-1 text-xs"
                  />
                  <p className="text-[11px] text-muted-foreground mt-1">Cleaning & check interval after dropoff.</p>
                </div>

                <div>
                  <label className="text-xs font-semibold text-foreground">Min Advance Lead Time (Min)</label>
                  <Input
                    type="number"
                    value={formData.minAdvanceNoticeMinutes}
                    onChange={(e) => setFormData({ ...formData, minAdvanceNoticeMinutes: Number(e.target.value) })}
                    className="mt-1 text-xs"
                  />
                  <p className="text-[11px] text-muted-foreground mt-1">Prevents impossible last-minute bookings.</p>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground mb-2 block">
                  Eligible Pickup & Return Locations
                </label>
                <div className="space-y-2">
                  {locations?.map((loc: any) => {
                    const checked = formData.locationIds.includes(loc.id)
                    return (
                      <label
                        key={loc.id}
                        className="flex items-center gap-2.5 p-2.5 rounded-lg border border-border hover:bg-muted/30 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleLocation(loc.id)}
                          className="rounded border-input text-emerald-600 focus:ring-emerald-500"
                        />
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-foreground">
                            {loc.name} ({loc.code})
                          </p>
                          <p className="text-[11px] text-muted-foreground truncate">{loc.address}, {loc.city}</p>
                        </div>
                      </label>
                    )
                  })}
                </div>
              </div>

              <div className="flex items-center gap-4 pt-2">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-medium">
                  <input
                    type="checkbox"
                    checked={formData.allowDelivery}
                    onChange={(e) => setFormData({ ...formData, allowDelivery: e.target.checked })}
                    className="rounded border-input text-emerald-600 focus:ring-emerald-500"
                  >
                  </input>
                  Enable Courier Delivery to Customer
                </label>

                {formData.allowDelivery && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Delivery Fee ($):</span>
                    <Input
                      type="number"
                      value={formData.deliveryFee}
                      onChange={(e) => setFormData({ ...formData, deliveryFee: Number(e.target.value) })}
                      className="w-24 h-8 text-xs"
                    />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 6: Readiness Checklist */}
        <TabsContent value="preview" className="space-y-4">
          <Card className="border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Step 01 Publication Readiness Checklist</CardTitle>
              <CardDescription className="text-xs">
                Real-time validation against the Step 01 Definition of Done before publishing to the customer catalog.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-xs">
              <div className="p-3 rounded-lg border border-border bg-slate-50 dark:bg-slate-800/40 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold">Unique Asset Code:</span>
                  <span className="font-mono text-emerald-600">{formData.code || 'None'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-semibold">Public Name:</span>
                  <span>{formData.name || 'None'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-semibold">Rental Rate:</span>
                  <span className="font-bold text-foreground">
                    {formData.currency} {formData.rateAmount} / {formData.billingUnit}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-semibold">Initial Physical Unit:</span>
                  <span className="font-mono">{formData.initialUnitTag || 'No tag specified'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-semibold">Cover Image:</span>
                  <span>{formData.coverImage ? 'Attached' : 'Missing'}</span>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-4">
                <Button
                  onClick={() => createMutation.mutate({ shouldPublish: false })}
                  disabled={createMutation.isPending || !formData.code || !formData.name}
                  variant="outline"
                  className="flex-1"
                >
                  Save as Draft
                </Button>
                <Button
                  onClick={() => createMutation.mutate({ shouldPublish: true })}
                  disabled={
                    createMutation.isPending ||
                    !formData.code ||
                    !formData.name ||
                    !formData.coverImage ||
                    !formData.initialUnitTag
                  }
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                >
                  Validate & Publish
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
