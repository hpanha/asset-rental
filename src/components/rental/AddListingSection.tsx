'use client'

import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useQuery } from '@tanstack/react-query'
import { Loader2, ImageIcon, Check, ArrowLeft, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { useStore } from '@/lib/store'
import { CategoryIcon } from '@/lib/category-icons'

const PRESET_IMAGES = [
  'https://z-cdn.chatglm.cn/image-search-mcp/images-ppt/dcedff8c9d17.jpg',
  'https://z-cdn.chatglm.cn/image-search-mcp/images-ppt/8ac6ba23f4ea.jpg',
  'https://z-cdn.chatglm.cn/image-search-mcp/images-ppt/1099b550fcea.jpg',
  'https://z-cdn.chatglm.cn/image-search-mcp/images-ppt/ff9b5b0b7c35.jpg',
  'https://z-cdn.chatglm.cn/image-search-mcp/images-ppt/7ec30af692e1.jpg',
  'https://z-cdn.chatglm.cn/image-search-mcp/images-ppt/de8f4f0f1833.png',
  'https://z-cdn.chatglm.cn/image-search-mcp/images-ppt/8322fc1d9b47.jpg',
  'https://z-cdn.chatglm.cn/image-search-mcp/images-ppt/7c790d5b7aff.jpg',
  'https://z-cdn.chatglm.cn/image-search-mcp/images-ppt/306b92df64aa.jpg',
  'https://placehold.co/800x600/e2e8f0/64748b?text=Upload+Photo',
]

export function AddListingSection() {
  const { goDashboard, goHome } = useStore()
  const qc = useQueryClient()
  const { toast } = useToast()

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const r = await fetch('/api/categories')
      return r.json()
    },
  })

  const [form, setForm] = useState({
    title: '',
    description: '',
    categorySlug: '',
    location: '',
    city: '',
    pricePerDay: '',
    deposit: '',
  })
  const [images, setImages] = useState<string[]>([PRESET_IMAGES[0]])
  const [featureInput, setFeatureInput] = useState('')
  const [features, setFeatures] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)

  const update = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }))

  const togglePreset = (url: string) => {
    setImages((prev) =>
      prev.includes(url) ? prev.filter((u) => u !== url) : [...prev, url]
    )
  }

  const addFeature = () => {
    const v = featureInput.trim()
    if (v && !features.includes(v)) setFeatures((f) => [...f, v])
    setFeatureInput('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title || !form.description || !form.categorySlug || !form.location || !form.city || !form.pricePerDay) {
      toast({ title: 'Please fill all required fields', variant: 'destructive' })
      return
    }
    if (images.length === 0) {
      toast({ title: 'Add at least one image', variant: 'destructive' })
      return
    }
    setSubmitting(true)
    try {
      const r = await fetch('/api/assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          pricePerDay: Number(form.pricePerDay),
          deposit: Number(form.deposit) || 0,
          images,
          features,
        }),
      })
      if (!r.ok) throw new Error()
      await qc.invalidateQueries({ queryKey: ['me'] })
      await qc.invalidateQueries({ queryKey: ['assets'] })
      await qc.invalidateQueries({ queryKey: ['stats'] })
      await qc.invalidateQueries({ queryKey: ['categories'] })
      toast({
        title: 'Listing published!',
        description: 'Your asset is now live on RentHub.',
      })
      goDashboard()
    } catch {
      toast({ title: 'Failed to publish listing', variant: 'destructive' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <button
        onClick={goHome}
        className="mb-4 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to home
      </button>

      <div className="rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50 p-4">
        <div className="flex items-center gap-2 text-emerald-700">
          <Sparkles className="h-5 w-5" />
          <span className="font-semibold">List your asset and start earning</span>
        </div>
        <p className="mt-1 text-sm text-emerald-700/80">
          Fill in the details below. Your listing goes live instantly.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="mt-6 space-y-6">
        {/* Basics */}
        <section className="rounded-2xl border border-border bg-card p-5 sm:p-6">
          <h2 className="font-semibold">Basics</h2>
          <div className="mt-4 space-y-4">
            <div>
              <Label htmlFor="title">Title <span className="text-rose-500">*</span></Label>
              <Input
                id="title"
                value={form.title}
                onChange={(e) => update('title', e.target.value)}
                placeholder="e.g. Modern downtown apartment with view"
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="desc">Description <span className="text-rose-500">*</span></Label>
              <Textarea
                id="desc"
                value={form.description}
                onChange={(e) => update('description', e.target.value)}
                placeholder="Describe what makes your asset special…"
                rows={4}
                className="mt-1.5"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>Category <span className="text-rose-500">*</span></Label>
                <Select value={form.categorySlug} onValueChange={(v) => update('categorySlug', v)}>
                  <SelectTrigger className="mt-1.5">
                    <SelectValue placeholder="Choose a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c: any) => {
                      return (
                        <SelectItem key={c.id} value={c.slug}>
                          <span className="flex items-center gap-2">
                            <CategoryIcon name={c.icon} className="h-4 w-4" /> {c.name}
                          </span>
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="city">City <span className="text-rose-500">*</span></Label>
                <Input
                  id="city"
                  value={form.city}
                  onChange={(e) => update('city', e.target.value)}
                  placeholder="e.g. Metro City"
                  className="mt-1.5"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="location">Location / area <span className="text-rose-500">*</span></Label>
              <Input
                id="location"
                value={form.location}
                onChange={(e) => update('location', e.target.value)}
                placeholder="e.g. Downtown, Riverside District"
                className="mt-1.5"
              />
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section className="rounded-2xl border border-border bg-card p-5 sm:p-6">
          <h2 className="font-semibold">Pricing</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="price">Price per day ($)<span className="text-rose-500">*</span></Label>
              <Input
                id="price"
                type="number"
                min="1"
                value={form.pricePerDay}
                onChange={(e) => update('pricePerDay', e.target.value)}
                placeholder="e.g. 120"
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="deposit">Refundable deposit ($)</Label>
              <Input
                id="deposit"
                type="number"
                min="0"
                value={form.deposit}
                onChange={(e) => update('deposit', e.target.value)}
                placeholder="e.g. 300"
                className="mt-1.5"
              />
            </div>
          </div>
        </section>

        {/* Images */}
        <section className="rounded-2xl border border-border bg-card p-5 sm:p-6">
          <div className="flex items-center gap-2">
            <ImageIcon className="h-4 w-4 text-muted-foreground" />
            <h2 className="font-semibold">Photos</h2>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">Select preset photos to showcase your asset (tap to add/remove).</p>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
            {PRESET_IMAGES.map((url) => {
              const selected = images.includes(url)
              return (
                <button
                  type="button"
                  key={url}
                  onClick={() => togglePreset(url)}
                  className={`relative aspect-square overflow-hidden rounded-lg border-2 transition ${
                    selected ? 'border-emerald-500 ring-2 ring-emerald-200' : 'border-border hover:border-emerald-300'
                  }`}
                >
                  { }
                  <img src={url} alt="" className="h-full w-full object-cover" />
                  {selected && (
                    <span className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-white">
                      <Check className="h-3 w-3" />
                    </span>
                  )}
                </button>
              )
            })}
          </div>
          {images.length > 0 && (
            <p className="mt-3 text-xs text-muted-foreground">{images.length} photo{images.length > 1 ? 's' : ''} selected</p>
          )}
        </section>

        {/* Features */}
        <section className="rounded-2xl border border-border bg-card p-5 sm:p-6">
          <h2 className="font-semibold">Features & amenities</h2>
          <p className="mt-1 text-sm text-muted-foreground">Add what's included (e.g. Wi-Fi, Parking, Helmet).</p>
          <div className="mt-3 flex gap-2">
            <Input
              value={featureInput}
              onChange={(e) => setFeatureInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  addFeature()
                }
              }}
              placeholder="Type a feature and press Enter"
            />
            <Button type="button" variant="outline" onClick={addFeature}>Add</Button>
          </div>
          {features.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {features.map((f) => (
                <Badge key={f} variant="secondary" className="gap-1 pr-1.5">
                  {f}
                  <button
                    type="button"
                    onClick={() => setFeatures((arr) => arr.filter((x) => x !== f))}
                    className="ml-1 rounded-full px-1 text-muted-foreground hover:text-foreground"
                    aria-label={`Remove ${f}`}
                  >
                    ×
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </section>

        {/* Actions */}
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={goDashboard} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" disabled={submitting} className="gap-2 bg-emerald-600 text-white hover:bg-emerald-700">
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            Publish listing
          </Button>
        </div>
      </form>
    </div>
  )
}
