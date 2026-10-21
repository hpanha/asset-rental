'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface RentalSelection {
  listingId: string
  slug: string
  name: string
  coverImage: string
  categoryName: string
  startAt: string
  endAt: string
  rentalDays: number
  quantity: number
  fulfillment: 'PICKUP' | 'DELIVERY'
  locationId?: string
  locationName?: string
  dailyRate: number
  currency: string
  quoteToken: string
  breakdown: {
    rentalSubtotal: number
    securityDeposit: number
    deliveryFee: number
    totalPayable: number
  }
}

interface RentalSelectionState {
  selection: RentalSelection | null
  setSelection: (selection: RentalSelection) => void
  clearSelection: () => void
}

export const useRentalSelectionStore = create<RentalSelectionState>()(
  persist(
    (set) => ({
      selection: null,
      setSelection: (selection) => set({ selection }),
      clearSelection: () => set({ selection: null }),
    }),
    {
      name: 'renthub-rental-selection',
    }
  )
)
