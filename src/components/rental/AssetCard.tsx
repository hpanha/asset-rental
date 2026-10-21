'use client'

import Link from 'next/link'
import { Star, MapPin } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { CategoryIcon, getCategoryColor } from '@/lib/category-icons'
import type { AssetWithRelations } from '@/lib/types'

export function AssetCard({ asset }: { asset: AssetWithRelations }) {
  const color = getCategoryColor(asset.category.color)
  const img = asset.images?.[0]
  const targetHref = `/rentals/${(asset as any).slug || asset.id}`

  return (
    <Link
      href={targetHref}
      className="group flex flex-col text-left overflow-hidden rounded-2xl border border-border bg-card transition-all hover:shadow-lg hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-emerald-500"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
        {img ? (
          <img
            src={img}
            alt={asset.title}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted-foreground">
            <CategoryIcon name={asset.category.icon} className="h-10 w-10" />
          </div>
        )}
        <div className="absolute left-3 top-3">
          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${color.bg} ${color.text} backdrop-blur`}>
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
            <Badge className="bg-amber-500/95 text-white border-0 hover:bg-amber-500">
              <Star className="mr-1 h-3 w-3 fill-current" />
              Top rated
            </Badge>
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="line-clamp-1 font-semibold leading-tight">{asset.title}</h3>
          <div className="flex shrink-0 items-center gap-1 text-sm">
            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
            <span className="font-medium">{asset.rating.toFixed(1)}</span>
            <span className="text-muted-foreground">({asset.reviewCount})</span>
          </div>
        </div>
        <p className="line-clamp-2 text-sm text-muted-foreground">{asset.description}</p>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <MapPin className="h-3.5 w-3.5 text-emerald-600" />
          <span className="line-clamp-1">{asset.location}</span>
        </div>
        <div className="mt-auto flex items-end justify-between pt-2">
          <div>
            <span className="text-lg font-bold text-foreground">
              ${asset.pricePerDay}
            </span>
            <span className="text-sm text-muted-foreground"> /day</span>
          </div>
          <span className="text-xs text-emerald-600 font-medium opacity-0 transition-opacity group-hover:opacity-100">
            View details →
          </span>
        </div>
      </div>
    </Link>
  )
}
