import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const now = new Date()

    const request = await db.rentalRequest.findFirst({
      where: {
        OR: [{ id }, { requestNo: id }],
      },
      include: {
        listing: {
          include: {
            units: {
              where: { baseStatus: 'ACTIVE' },
              include: {
                location: true,
                blockedIntervals: true,
                bookings: {
                  where: { status: { in: ['confirmed', 'paid', 'active'] } },
                },
                holdUnits: {
                  include: { hold: true },
                },
              },
            },
          },
        },
        inventoryHold: true,
      },
    })

    if (!request) {
      return NextResponse.json({ error: 'Rental request not found' }, { status: 404 })
    }

    const start = new Date(request.startAt)
    const end = new Date(request.endAt)

    const candidateUnits: any[] = []
    const conflicts: any[] = []

    for (const unit of request.listing.units) {
      const blocked = unit.blockedIntervals.find((b) => start < b.endAt && end > b.startAt)
      if (blocked) {
        conflicts.push({
          unitId: unit.id,
          assetTag: unit.assetTag,
          type: 'MAINTENANCE',
          reason: blocked.reason,
        })
        continue
      }

      const booking = unit.bookings.find((bk) => start < bk.endDate && end > bk.startDate)
      if (booking) {
        conflicts.push({
          unitId: unit.id,
          assetTag: unit.assetTag,
          type: 'BOOKING',
          reason: `Booked under ${booking.id}`,
        })
        continue
      }

      const otherHold = unit.holdUnits.find((hu) => {
        if (hu.hold.id === request.inventoryHold?.id) return false
        if (hu.hold.status !== 'ACTIVE') return false
        if (new Date(hu.hold.expiresAt) < now) return false
        return start < hu.hold.endAt && end > hu.hold.startAt
      })
      if (otherHold) {
        conflicts.push({
          unitId: unit.id,
          assetTag: unit.assetTag,
          type: 'HOLD',
          reason: `Held until ${new Date(otherHold.hold.expiresAt).toLocaleTimeString()}`,
        })
        continue
      }

      candidateUnits.push({
        id: unit.id,
        assetTag: unit.assetTag,
        serialNumber: unit.serialNumber,
        conditionGrade: unit.conditionGrade,
        locationName: unit.location?.name || 'Main Hub',
      })
    }

    return NextResponse.json({
      available: candidateUnits.length >= request.quantity,
      available_units_count: candidateUnits.length,
      requested_quantity: request.quantity,
      candidate_units: candidateUnits,
      conflicts,
      checked_at: now.toISOString(),
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to refresh availability' }, { status: 500 })
  }
}
