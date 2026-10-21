import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ reservationId: string }> }
) {
  try {
    const { reservationId } = await params
    const body = await req.json().catch(() => ({}))
    const {
      receiverName,
      staffName = 'Warehouse Lead',
      signature = 'DIGITAL_ACKNOWLEDGED',
      notes,
      unitChecks = [],
    } = body

    if (!receiverName) {
      return NextResponse.json({ error: 'Receiver name is required for custody transfer.' }, { status: 400 })
    }

    const reservation = await db.rentalReservation.findFirst({
      where: {
        OR: [{ id: reservationId }, { bookingNo: reservationId }, { requestId: reservationId }],
      },
      include: {
        request: true,
        lines: {
          include: {
            unitAllocations: {
              include: { unit: true },
            },
          },
        },
        handover: true,
      },
    })

    if (!reservation) {
      return NextResponse.json({ error: 'Reservation not found' }, { status: 404 })
    }

    // Idempotency: If already handed over, return existing handover record (H06)
    if (reservation.status === 'ACTIVE' && reservation.handover) {
      return NextResponse.json({
        is_duplicate: true,
        success: true,
        status: 'ACTIVE',
        handoverId: reservation.handover.id,
        message: 'Handover was already completed for this reservation.',
      })
    }

    if (reservation.status !== 'RESERVED' && reservation.status !== 'READY_FOR_HANDOVER') {
      return NextResponse.json(
        { error: `Cannot perform handover on reservation in status "${reservation.status}".` },
        { status: 400 }
      )
    }

    const now = new Date()

    const result = await db.$transaction(async (tx) => {
      // 1. Create Handover Record
      const handover = await tx.rentalHandover.create({
        data: {
          reservationId: reservation.id,
          locationId: reservation.locationId,
          handoverAt: now,
          staffName,
          receiverName,
          signature,
          notes,
          status: 'COMPLETED',
        },
      })

      // 2. Create Handover Items & Accessories
      const allocations = reservation.lines[0]?.unitAllocations || []
      for (const alloc of allocations) {
        const check = unitChecks.find((c: any) => c.unitId === alloc.unitId || c.scannedTag === alloc.unit.assetTag)
        const condition = check?.conditionGrade || alloc.unit.conditionGrade || 'GOOD'
        const func = check?.functionalCheck || 'PASS'

        const item = await tx.rentalHandoverItem.create({
          data: {
            handoverId: handover.id,
            unitId: alloc.unitId,
            scannedTag: alloc.unit.assetTag,
            conditionGrade: condition,
            functionalCheck: func,
            notes: check?.notes,
            accepted: true,
          },
        })

        // Standard accessories
        const accs = check?.accessories || [
          { name: 'Power Adapter & Cable', quantity: 1, condition: 'GOOD' },
          { name: 'Standard Protective Sleeve', quantity: 1, condition: 'GOOD' },
        ]

        for (const acc of accs) {
          await tx.rentalHandoverAccessory.create({
            data: {
              handoverItemId: item.id,
              name: acc.name,
              expectedQty: acc.quantity || 1,
              actualQty: acc.quantity || 1,
              condition: acc.condition || 'GOOD',
            },
          })
        }

        // Store pre-existing condition photos (stage OUT)
        if (check?.evidencePhotos && Array.isArray(check.evidencePhotos)) {
          for (const photoUrl of check.evidencePhotos) {
            await tx.rentalEvidence.create({
              data: {
                reservationId: reservation.id,
                stage: 'OUT',
                mediaUrl: photoUrl,
                notes: `Handover condition baseline for ${alloc.unit.assetTag}`,
                uploadedBy: staffName,
              },
            })
          }
        }
      }

      // 3. Transition Reservation to ACTIVE
      await tx.rentalReservation.update({
        where: { id: reservation.id },
        data: {
          status: 'ACTIVE',
          version: reservation.version + 1,
        },
      })

      // 4. Transition Request to ACTIVE
      await tx.rentalRequest.update({
        where: { id: reservation.requestId },
        data: {
          status: 'ACTIVE',
          version: reservation.request.version + 1,
        },
      })

      // 5. Update Fulfillment Task
      await tx.rentalFulfillmentTask.updateMany({
        where: { reservationId: reservation.id },
        data: {
          status: 'HANDED_OVER',
          handedOverAt: now,
        },
      })

      // 6. Record Audit Event
      await tx.rentalReservationEvent.create({
        data: {
          reservationId: reservation.id,
          actorName: staffName,
          actorRole: 'ADMIN',
          action: 'ASSET_HANDOVER_COMPLETED',
          fromStatus: reservation.status,
          toStatus: 'ACTIVE',
          notes: `Handover completed to ${receiverName}. Actual custody transfer verified.`,
        },
      })

      return handover
    })

    return NextResponse.json({
      success: true,
      status: 'ACTIVE',
      handoverId: result.id,
      bookingNo: reservation.bookingNo,
      message: 'Physical custody successfully transferred. Rental is now ACTIVE.',
    })
  } catch (error: any) {
    console.error('Handover finalization error:', error)
    return NextResponse.json({ error: error.message || 'Failed to complete handover' }, { status: 500 })
  }
}
