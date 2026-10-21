import { db } from '@/lib/db'

export interface FinalizeActor {
  id?: string
  name?: string
  role?: string
}

export async function finalizeBookingReservation(
  requestId: string,
  actor: FinalizeActor = { id: 'SYSTEM', name: 'Reservation Engine', role: 'SYSTEM' }
) {
  const now = new Date()

  // 1. Fetch request with relations
  const request = await db.rentalRequest.findUnique({
    where: { id: requestId },
    include: {
      listing: {
        include: {
          units: true,
          locationOptions: true,
        },
      },
      quoteSnapshot: true,
      inventoryHold: {
        include: {
          units: {
            include: { unit: true },
          },
        },
      },
      paymentOrder: {
        include: { receipt: true },
      },
      pickupLocation: true,
      deliveryAddress: true,
      reservation: {
        include: {
          lines: {
            include: {
              unitAllocations: {
                include: { unit: true },
              },
              poolAllocations: true,
            },
          },
          fulfillmentTask: true,
        },
      },
    },
  })

  if (!request) {
    throw new Error('NOT_FOUND: Rental request not found')
  }

  // Idempotency: If already has a confirmed reservation, return it safely (C02)
  if (request.reservation) {
    return {
      is_duplicate: true,
      booking_no: request.reservation.bookingNo,
      reservation: request.reservation,
      message: 'Booking reservation already committed.',
    }
  }

  // Validation: Payment must be verified (C06)
  if (!request.paymentOrder || request.paymentOrder.paymentStatus !== 'PAID') {
    throw new Error('PAYMENT_UNVERIFIED: Request does not have a verified settled payment.')
  }

  // Validation: Inventory hold must exist and unexpired (C04)
  const hold = request.inventoryHold
  if (!hold || hold.status === 'EXPIRED' || new Date(hold.expiresAt) <= now) {
    // Record late payment / hold expired reconciliation exception
    await db.rentalRequestEvent.create({
      data: {
        requestId: request.id,
        actorId: actor.id || 'SYSTEM',
        actorName: actor.name || 'System',
        actorType: 'SYSTEM',
        action: 'HOLD_EXPIRED_RESERVATION_BLOCKED',
        fromStatus: request.status,
        toStatus: request.status,
        reason: 'Payment confirmed but inventory hold expired before reservation commitment. Requires manual reconciliation.',
      },
    })
    throw new Error('HOLD_EXPIRED: Inventory hold expired before reservation confirmation. Stock cannot be overcommitted.')
  }

  const startAt = new Date(request.startAt)
  const endAt = new Date(request.endAt)
  const isSerialized = request.listing.trackingMode !== 'QUANTITY'

  // Determine eligible units to commit
  const eligibleUnitIds: string[] = []

  if (isSerialized) {
    // Check if provisional units from hold are still free
    const provisionalUnits = hold.units.map((u) => u.unit)
    
    for (const unit of provisionalUnits) {
      if (unit.baseStatus !== 'ACTIVE') continue

      // Check conflict with committed allocations
      const conflictingAllocation = await db.rentalUnitAllocation.findFirst({
        where: {
          unitId: unit.id,
          status: 'COMMITTED',
          OR: [
            { startAt: { lte: startAt }, endAt: { gte: startAt } },
            { startAt: { lte: endAt }, endAt: { gte: endAt } },
            { startAt: { gte: startAt }, endAt: { lte: endAt } },
          ],
        },
      })
      if (!conflictingAllocation) {
        eligibleUnitIds.push(unit.id)
      }
    }

    // If provisional units were insufficient or maintenance intervened, search other active units
    if (eligibleUnitIds.length < request.quantity) {
      const allActiveUnits = await db.assetUnit.findMany({
        where: {
          listingId: request.listingId,
          baseStatus: 'ACTIVE',
        },
      })

      for (const unit of allActiveUnits) {
        if (eligibleUnitIds.includes(unit.id)) continue
        if (eligibleUnitIds.length >= request.quantity) break

        const hasConflict = await db.rentalUnitAllocation.findFirst({
          where: {
            unitId: unit.id,
            status: 'COMMITTED',
            OR: [
              { startAt: { lte: startAt }, endAt: { gte: startAt } },
              { startAt: { lte: endAt }, endAt: { gte: endAt } },
              { startAt: { gte: startAt }, endAt: { lte: endAt } },
            ],
          },
        })

        const hasMaintenance = await db.assetBlockedInterval.findFirst({
          where: {
            unitId: unit.id,
            OR: [
              { startAt: { lte: startAt }, endAt: { gte: startAt } },
              { startAt: { lte: endAt }, endAt: { gte: endAt } },
              { startAt: { gte: startAt }, endAt: { lte: endAt } },
            ],
          },
        })

        if (!hasConflict && !hasMaintenance) {
          eligibleUnitIds.push(unit.id)
        }
      }
    }

    if (eligibleUnitIds.length < request.quantity) {
      throw new Error(`INSUFFICIENT_STOCK: Could not allocate ${request.quantity} physical unit(s) without collision. Flagged for review.`)
    }
  }

  // 2. Perform Atomic Reservation Transaction
  const currentYear = new Date().getFullYear()

  const reservation = await db.$transaction(async (tx) => {
    // Generate Booking Number (e.g. BK-2026-000001)
    const count = await tx.rentalReservation.count()
    const bookingNo = `BK-${currentYear}-${(count + 1).toString().padStart(6, '0')}`

    const locationId = request.pickupLocationId || request.listing.locationOptions[0]?.locationId || null

    // Create Reservation
    const newReservation = await tx.rentalReservation.create({
      data: {
        bookingNo,
        requestId: request.id,
        renterId: request.renterId,
        status: 'RESERVED',
        startAt,
        endAt,
        locationId,
        fulfillmentMode: request.fulfillment,
        confirmedAt: now,
        notes: request.customerNotes,
      },
    })

    // Create Reservation Line
    const line = await tx.rentalReservationLine.create({
      data: {
        reservationId: newReservation.id,
        listingId: request.listingId,
        quantity: request.quantity,
        fulfillmentMode: request.fulfillment,
      },
    })

    // Create Unit Allocations
    if (isSerialized && eligibleUnitIds.length > 0) {
      for (const unitId of eligibleUnitIds.slice(0, request.quantity)) {
        await tx.rentalUnitAllocation.create({
          data: {
            reservationLineId: line.id,
            unitId,
            startAt,
            endAt,
            status: 'COMMITTED',
          },
        })
      }
    } else {
      // Quantity pool allocation
      await tx.rentalPoolAllocation.create({
        data: {
          reservationLineId: line.id,
          stockPoolId: 'DEFAULT_POOL',
          quantity: request.quantity,
          startAt,
          endAt,
        },
      })
    }

    // Create Fulfillment / Handover Task (Step 06 -> Step 07)
    await tx.rentalFulfillmentTask.create({
      data: {
        reservationId: newReservation.id,
        pickupAt: startAt,
        locationId,
        assignedStaffName: 'Operations Handover Team',
        status: 'SCHEDULED',
        checklistJson: JSON.stringify([
          'Inspect physical exterior condition and note grade',
          'Verify serial tag & barcode matches booking allocation',
          'Confirm all standard accessories bundled (chargers, cables, case)',
          'Check battery charge level (>80%) and boot functionality',
          'Collect renter physical ID and handover signature',
        ]),
        notes: request.customerNotes ? `Customer Notes: ${request.customerNotes}` : null,
      },
    })

    // Consume inventory hold
    if (hold) {
      await tx.rentalInventoryHold.update({
        where: { id: hold.id },
        data: {
          status: 'CONSUMED',
        },
      })
    }

    // Transition Request to RESERVED
    await tx.rentalRequest.update({
      where: { id: request.id },
      data: {
        status: 'RESERVED',
        version: request.version + 1,
      },
    })

    // Audit Events
    await tx.rentalRequestEvent.create({
      data: {
        requestId: request.id,
        actorId: actor.id || 'SYSTEM',
        actorName: actor.name || 'Reservation Engine',
        actorType: actor.role === 'ADMIN' ? 'ADMIN' : 'SYSTEM',
        action: 'BOOKING_RESERVED',
        fromStatus: request.status,
        toStatus: 'RESERVED',
        reason: `Booking committed with reference ${bookingNo}. ${eligibleUnitIds.length} serialized unit(s) locked.`,
      },
    })

    await tx.rentalReservationEvent.create({
      data: {
        reservationId: newReservation.id,
        actorId: actor.id || 'SYSTEM',
        actorName: actor.name || 'Reservation Engine',
        actorRole: actor.role || 'SYSTEM',
        action: 'BOOKING_CONFIRMED',
        fromStatus: 'PENDING',
        toStatus: 'RESERVED',
        notes: `Confirmed reservation committed. Scheduled pickup: ${startAt.toISOString()}`,
      },
    })

    return newReservation
  })

  // Fetch full finalized reservation
  const fullReservation = await db.rentalReservation.findUnique({
    where: { id: reservation.id },
    include: {
      request: {
        include: {
          renter: { select: { id: true, name: true, email: true, phone: true } },
          listing: {
            select: { id: true, code: true, name: true, slug: true, coverImage: true, category: true },
          },
          quoteSnapshot: true,
          paymentOrder: {
            include: { receipt: true },
          },
          pickupLocation: true,
          deliveryAddress: true,
        },
      },
      lines: {
        include: {
          unitAllocations: {
            include: {
              unit: {
                select: { id: true, assetTag: true, serialNumber: true, conditionGrade: true, accessories: true },
              },
            },
          },
          poolAllocations: true,
        },
      },
      fulfillmentTask: true,
      events: {
        orderBy: { createdAt: 'desc' },
      },
      location: true,
    },
  })

  return {
    success: true,
    booking_no: fullReservation!.bookingNo,
    reservation: fullReservation,
    message: 'Booking successfully confirmed and inventory committed.',
  }
}
