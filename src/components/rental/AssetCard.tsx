'use client'

import Link from 'next/link'
import { Star, MapPin } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { CategoryIcon, getCategoryColor } from '@/lib/category-icons'
import type { AssetWithRelations } from '@/lib/types'

export function AssetCard({ asset }: { asset: AssetWithRelations }) {
  const color = getCategoryColor(asset.category.color)
  const rawImg = asset.images?.[0]
  const img = rawImg && rawImg.includes('images.unsplash.com')
    ? rawImg.replace(/w=\d+/, 'w=600').replace(/q=\d+/, 'q=75')
    : rawImg
  const targetHref = `/rentals/${(asset as any).slug || asset.id}`

  return (
    <Link
      href={targetHref}
      className="group flex flex-col text-left overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-900/70 transition-all hover:border-purple-500/50 hover:shadow-xl hover:shadow-purple-950/30 hover:-translate-y-1 focus:outline-none focus:ring-2 focus:ring-purple-500"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-slate-950">
        {img ? (
          <img
            src={img}
            alt={asset.title}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
            decoding="async"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-slate-500">
            <CategoryIcon name={asset.category.icon} className="h-10 w-10" />
          </div>
        )}
        <div className="absolute left-3 top-3">
          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${color.bg} ${color.text} backdrop-blur shadow-sm`}>
            {asset.category.imageUrl && asset.category.imageUrl.trim() ? (
              <img src={asset.category.imageUrl} alt="" className="h-3.5 w-3.5 rounded-full object-cover" />
            ) : (
              <CategoryIcon name={asset.category.icon} className="h-3.5 w-3.5" />
            )}
            {asset.category.name}
          </span>
        </div>
        {asset.rating >= 4.8 && (
          <div className="absolute right-3 top-3">
            <Badge className="bg-amber-500/95 text-white border-0 hover:bg-amber-500 shadow-md">
              <Star className="mr-1 h-3 w-3 fill-current" />
              Top rated
            </Badge>
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="line-clamp-1 font-semibold leading-tight text-slate-100 group-hover:text-purple-300 transition-colors">{asset.title}</h3>
          <div className="flex shrink-0 items-center gap-1 text-sm">
            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
            <span className="font-medium text-slate-200">{asset.rating.toFixed(1)}</span>
            <span className="text-slate-400">({asset.reviewCount})</span>
          </div>
        </div>
        <p className="line-clamp-2 text-sm text-slate-400">{asset.description}</p>
        <div className="flex items-center gap-1 text-xs text-slate-400">
          <MapPin className="h-3.5 w-3.5 text-purple-400" />
          <span className="line-clamp-1">{asset.location}</span>
        </div>
        <div className="mt-auto flex items-end justify-between pt-2">
          <div>
            <span className="text-lg font-bold text-white">
              ${asset.pricePerDay}
            </span>
            <span className="text-sm text-slate-400"> /day</span>
          </div>
          <span className="text-xs text-purple-400 font-semibold opacity-0 transition-opacity group-hover:opacity-100">
            View details →
          </span>
        </div>
      </div>
    </Link>
  )
}
