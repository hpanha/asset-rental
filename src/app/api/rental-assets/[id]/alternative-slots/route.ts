import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { searchParams } = new URL(req.url)
    const startAtStr = searchParams.get('startAt')
    const endAtStr = searchParams.get('endAt')
    const quantity = Math.max(1, parseInt(searchParams.get('quantity') || '1', 10))

    const startDate = startAtStr ? new Date(startAtStr) : new Date(Date.now() + 86400000)
    const endDate = endAtStr ? new Date(endAtStr) : new Date(startDate.getTime() + 2 * 86400000)

    const listing = await db.assetListing.findFirst({
      where: {
        OR: [{ id }, { slug: id }],
        visibility: 'PUBLISHED',
      },
      include: {
        blockedIntervals: {
          where: { unitId: null },
        },
        units: {
          where: { baseStatus: 'ACTIVE' },
          include: {
            blockedIntervals: true,
            bookings: {
              where: { status: { in: ['confirmed', 'paid', 'active'] } },
            },
            location: true,
          },
        },
        locationOptions: { include: { location: true } },
      },
    })

    if (!listing) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 })
    }

    const durationDays = Math.max(1, Math.round((endDate.getTime() - startDate.getTime()) / 86400000))

    // Check alternate dates: +1 day, +3 days, +7 days
    const shifts = [1, 2, 3, 7, 14]
    const suggestedSlots: any[] = []

    for (const offsetDays of shifts) {
      const altStart = new Date(startDate.getTime() + offsetDays * 86400000)
      const altEnd = new Date(altStart.getTime() + durationDays * 86400000)

      // Check if entire listing is blocked during alternate slot
      const isListingBlocked = (listing.blockedIntervals || []).some((b) => {
        const bStart = new Date(b.startAt)
        const bEnd = new Date(b.endAt)
        return altStart < bEnd && bStart < altEnd
      })
      if (isListingBlocked) continue

      const freeUnits = listing.units.filter((u) => {
        const hasBlock = u.blockedIntervals.some((b) => {
          const bStart = new Date(b.startAt)
          const bEnd = new Date(b.endAt)
          return altStart < bEnd && bStart < altEnd
        })
        if (hasBlock) return false

        const hasBooking = (u.bookings || []).some((bk) => {
          const bkStart = new Date(bk.startDate)
          const bkEnd = new Date(bk.endDate)
          return altStart < bkEnd && bkStart < altEnd
        })
        return !hasBooking
      })

      if (freeUnits.length >= quantity) {
        suggestedSlots.push({
          start_at: altStart.toISOString(),
          end_at: altEnd.toISOString(),
          available_units: freeUnits.length,
          label: `${offsetDays === 1 ? 'Tomorrow' : `In ${offsetDays} days`} (${altStart.toLocaleDateString()} - ${altEnd.toLocaleDateString()})`,
        })
        if (suggestedSlots.length >= 3) break
      }
    }

    return NextResponse.json({
      listing_id: listing.id,
      suggested_slots: suggestedSlots,
      alternative_locations: listing.locationOptions.map((opt) => opt.location),
    })
  } catch (error: any) {
    console.error('Error finding alternative slots:', error)
    return NextResponse.json({ error: error.message || 'Failed to find alternative slots' }, { status: 500 })
  }
}
