import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(
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
        renter: {
          select: { id: true, name: true, email: true, phone: true, avatar: true, role: true, createdAt: true },
        },
        listing: {
          include: {
            category: true,
            brand: true,
            rentalPolicy: true,
            rates: { where: { isPrimary: true } },
            locationOptions: { include: { location: true } },
            units: {
              where: { baseStatus: 'ACTIVE' },
              include: {
                location: true,
                blockedIntervals: true,
                bookings: {
                  where: { status: { in: ['confirmed', 'paid', 'active'] } },
                },
                holdUnits: {
                  include: {
                    hold: true,
                  },
                },
              },
            },
          },
        },
        pickupLocation: true,
        returnLocation: true,
        quoteSnapshot: true,
        deliveryAddress: true,
        termsAcceptance: true,
        inventoryHold: {
          include: {
            units: {
              include: { unit: true },
            },
          },
        },
        approvalDecisions: {
          orderBy: { decidedAt: 'desc' },
        },
        changeProposals: {
          orderBy: { createdAt: 'desc' },
        },
        events: {
          orderBy: { createdAt: 'asc' },
        },
      },
    })

    if (!request) {
      return NextResponse.json({ error: 'Rental request not found' }, { status: 404 })
    }

    // Evaluate real-time stock and candidate unit assignment
    const start = new Date(request.startAt)
    const end = new Date(request.endAt)

    const candidateUnits: any[] = []
    const conflictedUnits: any[] = []

    for (const unit of request.listing.units) {
      // Check maintenance interval
      const blocked = unit.blockedIntervals.find((b) => start < b.endAt && end > b.startAt)
      if (blocked) {
        conflictedUnits.push({
          unitId: unit.id,
          assetTag: unit.assetTag,
          conflictType: 'MAINTENANCE',
          details: `Blocked for maintenance: ${blocked.reason}`,
        })
        continue
      }

      // Check active bookings
      const booking = unit.bookings.find((bk) => start < bk.endDate && end > bk.startDate)
      if (booking) {
        conflictedUnits.push({
          unitId: unit.id,
          assetTag: unit.assetTag,
          conflictType: 'BOOKING_RESERVED',
          details: `Reserved under booking ${booking.id}`,
        })
        continue
      }

      // Check other unexpired active holds
      const otherHold = unit.holdUnits.find((hu) => {
        if (hu.hold.id === request.inventoryHold?.id) return false
        if (hu.hold.status !== 'ACTIVE') return false
        if (new Date(hu.hold.expiresAt) < now) return false
        return start < hu.hold.endAt && end > hu.hold.startAt
      })
      if (otherHold) {
        conflictedUnits.push({
          unitId: unit.id,
          assetTag: unit.assetTag,
          conflictType: 'ACTIVE_HOLD',
          details: `Held by another request until ${new Date(otherHold.hold.expiresAt).toLocaleTimeString()}`,
        })
        continue
      }

      // Free and eligible
      candidateUnits.push({
        id: unit.id,
        assetTag: unit.assetTag,
        serialNumber: unit.serialNumber,
        conditionGrade: unit.conditionGrade,
        locationName: unit.location?.name || 'Main Hub',
      })
    }

    const availableCount = candidateUnits.length
    const hasConflict = availableCount < request.quantity

    return NextResponse.json({
      request,
      stockEvaluation: {
        totalActiveUnits: request.listing.units.length,
        availableCount,
        requestedQuantity: request.quantity,
        hasConflict,
        candidateUnits,
        conflictedUnits,
      },
    })
  } catch (error: any) {
    console.error('Error fetching admin request detail:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch admin request detail' },
      { status: 500 }
    )
  }
}
