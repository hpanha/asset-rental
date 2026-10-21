import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await req.json().catch(() => ({}))
    const {
      expected_version,
      approval_note,
      internal_notes,
      hold_minutes = 30,
      reviewer_name = 'Rental Manager',
      provisional_unit_ids,
    } = body

    const now = new Date()

    const result = await db.$transaction(async (tx) => {
      // 1. Fetch request with optimistic version check
      const request = await tx.rentalRequest.findFirst({
        where: {
          OR: [{ id }, { requestNo: id }],
        },
        include: {
          listing: {
            include: {
              units: {
                where: { baseStatus: 'ACTIVE' },
                include: {
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
        },
      })

      if (!request) {
        throw new Error('NOT_FOUND: Rental request not found')
      }

      // Check customer cancellation edge case
      if (request.status === 'CANCELLED_BY_RENTER') {
        throw new Error('CONFLICT: Customer cancelled this rental request during review.')
      }

      if (request.status !== 'PENDING_APPROVAL') {
        throw new Error(`CONFLICT: Request is currently in "${request.status}". Only PENDING_APPROVAL requests can be approved.`)
      }

      // Concurrency check
      if (expected_version !== undefined && expected_version !== null) {
        if (request.version !== expected_version) {
          throw new Error('STALE_VERSION: Request was modified by another reviewer. Please refresh and review latest state.')
        }
      }

      // 2. Real-time Stock / Hold Verification
      const start = new Date(request.startAt)
      const end = new Date(request.endAt)

      const availableUnits = request.listing.units.filter((unit) => {
        // Maintenance overlap check
        const inBlocked = unit.blockedIntervals.some((b) => start < b.endAt && end > b.startAt)
        if (inBlocked) return false

        // Booked overlap check
        const inBooking = unit.bookings.some((bk) => start < bk.endDate && end > bk.startDate)
        if (inBooking) return false

        // Other active unexpired holds check
        const inHold = unit.holdUnits.some((hu) => {
          if (hu.hold.status !== 'ACTIVE') return false
          if (new Date(hu.hold.expiresAt) < now) return false
          return start < hu.hold.endAt && end > hu.hold.startAt
        })
        if (inHold) return false

        return true
      })

      if (availableUnits.length < request.quantity) {
        throw new Error(`INVENTORY_CONFLICT: Only ${availableUnits.length} active unit(s) available for the requested period, but ${request.quantity} requested.`)
      }

      // Select units to hold
      let selectedUnits: typeof availableUnits = []
      if (Array.isArray(provisional_unit_ids) && provisional_unit_ids.length > 0) {
        selectedUnits = availableUnits.filter((u) => provisional_unit_ids.includes(u.id))
      }
      if (selectedUnits.length < request.quantity) {
        selectedUnits = availableUnits.slice(0, request.quantity)
      }

      // 3. Calculate Hold Expiry (bounded between 15 and 120 minutes)
      const safeHoldMinutes = Math.min(120, Math.max(15, parseInt(hold_minutes, 10) || 30))
      const expiresAt = new Date(now.getTime() + safeHoldMinutes * 60 * 1000)

      // 4. Create or replace inventory hold
      // First release any previous hold if existing
      await tx.rentalInventoryHold.deleteMany({
        where: { requestId: request.id },
      })

      const hold = await tx.rentalInventoryHold.create({
        data: {
          requestId: request.id,
          listingId: request.listingId,
          quantity: request.quantity,
          startAt: start,
          endAt: end,
          expiresAt,
          status: 'ACTIVE',
          createdBy: reviewer_name,
        },
      })

      // Link held units
      for (const unit of selectedUnits) {
        await tx.rentalHoldUnit.create({
          data: {
            holdId: hold.id,
            unitId: unit.id,
          },
        })
      }

      // 5. Create Approval Decision Record
      await tx.rentalApprovalDecision.create({
        data: {
          requestId: request.id,
          reviewerId: 'admin-01',
          reviewerName: reviewer_name,
          decision: 'APPROVE',
          reasonCode: 'APPROVED_STANDARD',
          publicReason: approval_note || 'Request approved. Inventory held pending customer payment.',
          internalNotes: internal_notes || null,
          requestVersion: request.version,
        },
      })

      // 6. Update Rental Request status and increment version
      const updatedRequest = await tx.rentalRequest.update({
        where: { id: request.id },
        data: {
          status: 'APPROVED_AWAITING_PAYMENT',
          paymentDueAt: expiresAt,
          version: request.version + 1,
        },
      })

      // 7. Record Audit Event
      await tx.rentalRequestEvent.create({
        data: {
          requestId: request.id,
          actorId: 'admin-01',
          actorName: reviewer_name,
          actorType: 'ADMIN',
          action: 'APPROVE',
          fromStatus: 'PENDING_APPROVAL',
          toStatus: 'APPROVED_AWAITING_PAYMENT',
          reason: approval_note || `Approved by ${reviewer_name} with ${safeHoldMinutes}-minute hold`,
        },
      })

      return {
        request: updatedRequest,
        hold,
        heldUnitsCount: selectedUnits.length,
        expiresAt,
      }
    })

    return NextResponse.json({
      success: true,
      request_id: result.request.id,
      request_no: result.request.requestNo,
      status: result.request.status,
      version: result.request.version,
      payment_due_at: result.expiresAt,
      held_units_count: result.heldUnitsCount,
      message: 'Rental request approved and inventory hold successfully acquired.',
    })
  } catch (error: any) {
    const msg = error.message || 'Failed to approve rental request'
    console.error('Error approving rental request:', msg)

    const statusCode = msg.startsWith('NOT_FOUND')
      ? 404
      : msg.startsWith('CONFLICT') || msg.startsWith('STALE_VERSION') || msg.startsWith('INVENTORY_CONFLICT')
      ? 409
      : 400

    return NextResponse.json({ error: msg }, { status: statusCode })
  }
}
