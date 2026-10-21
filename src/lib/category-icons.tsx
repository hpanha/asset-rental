import {
  Home,
  Car,
  Sailboat,
  Camera,
  Wrench,
  Building2,
  PartyPopper,
  type LucideIcon,
} from 'lucide-react'

const ICONS: Record<string, LucideIcon> = {
  Home,
  Car,
  Sailboat,
  Camera,
  Wrench,
  Building2,
  PartyPopper,
}

export function getCategoryIcon(name: string): LucideIcon {
  return ICONS[name] ?? Home
}

export function CategoryIcon({ name, className }: { name: string; className?: string }) {
  const Icon = ICONS[name] ?? Home
  return <Icon className={className} />
}

const COLORS: Record<string, { bg: string; text: string; ring: string }> = {
  emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600', ring: 'ring-emerald-100' },
  amber: { bg: 'bg-amber-50', text: 'text-amber-600', ring: 'ring-amber-100' },
  teal: { bg: 'bg-teal-50', text: 'text-teal-600', ring: 'ring-teal-100' },
  rose: { bg: 'bg-rose-50', text: 'text-rose-600', ring: 'ring-rose-100' },
  orange: { bg: 'bg-orange-50', text: 'text-orange-600', ring: 'ring-orange-100' },
  violet: { bg: 'bg-violet-50', text: 'text-violet-600', ring: 'ring-violet-100' },
  pink: { bg: 'bg-pink-50', text: 'text-pink-600', ring: 'ring-pink-100' },
}

export function getCategoryColor(color: string | null | undefined) {
  return COLORS[color || 'emerald'] ?? COLORS.emerald
}
