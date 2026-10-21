import { create } from 'zustand'

export type View = 'home' | 'explore' | 'dashboard' | 'add-listing'

export interface Filters {
  category: string | null // slug
  city: string
  minPrice: string
  maxPrice: string
  sort: 'popular' | 'priceLow' | 'priceHigh' | 'rating' | 'newest'
  q: string
}

interface AppState {
  view: View
  selectedAssetId: string | null
  detailOpen: boolean
  filters: Filters
  // navigation
  goHome: () => void
  goExplore: () => void
  goDashboard: () => void
  goAddListing: () => void
  openAsset: (id: string) => void
  closeAsset: () => void
  setFilters: (f: Partial<Filters>) => void
  resetFilters: () => void
  setCategory: (slug: string | null) => void
  setSearch: (q: string) => void
}

const defaultFilters: Filters = {
  category: null,
  city: '',
  minPrice: '',
  maxPrice: '',
  sort: 'popular',
  q: '',
}

export const useStore = create<AppState>((set) => ({
  view: 'home',
  selectedAssetId: null,
  detailOpen: false,
  filters: { ...defaultFilters },
  goHome: () => set({ view: 'home' }),
  goExplore: () => set({ view: 'home' }),
  goDashboard: () => set({ view: 'dashboard' }),
  goAddListing: () => set({ view: 'add-listing' }),
  openAsset: (id) => set({ selectedAssetId: id, detailOpen: true }),
  closeAsset: () => set({ detailOpen: false }),
  setFilters: (f) => set((s) => ({ filters: { ...s.filters, ...f } })),
  resetFilters: () => set({ filters: { ...defaultFilters } }),
  setCategory: (slug) =>
    set((s) => ({ filters: { ...s.filters, category: slug }, view: 'home' })),
  setSearch: (q) => set((s) => ({ filters: { ...s.filters, q }, view: 'home' })),
}))
