import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await req.json().catch(() => ({}))
    const { oldUnitId, newUnitId, reason, staffName = 'Admin Operations' } = body

    if (!oldUnitId || !newUnitId || !reason) {
      return NextResponse.json(
        { error: 'oldUnitId, newUnitId, and reason are required for reallocation.' },
        { status: 400 }
      )
    }

    const reservation = await db.rentalReservation.findFirst({
      where: {
        OR: [{ id }, { bookingNo: id }],
      },
      include: {
        lines: {
          include: {
            unitAllocations: true,
          },
        },
      },
    })

    if (!reservation) {
      return NextResponse.json({ error: 'Reservation not found' }, { status: 404 })
    }

    // Locate the allocation
    let allocation = null
    for (const line of reservation.lines) {
      const match = line.unitAllocations.find((a) => a.unitId === oldUnitId)
      if (match) {
        allocation = match
        break
      }
    }

    if (!allocation) {
      return NextResponse.json({ error: 'Allocation for oldUnitId not found in this reservation' }, { status: 404 })
    }

    // Verify newUnit exists and is ACTIVE
    const newUnit = await db.assetUnit.findUnique({
      where: { id: newUnitId },
    })

    if (!newUnit || newUnit.baseStatus !== 'ACTIVE') {
      return NextResponse.json({ error: 'Target unit is not active or available' }, { status: 400 })
    }

    // Verify target unit has no overlapping COMMITTED allocation
    const conflict = await db.rentalUnitAllocation.findFirst({
      where: {
        unitId: newUnitId,
        status: 'COMMITTED',
        OR: [
          { startAt: { lte: allocation.startAt }, endAt: { gte: allocation.startAt } },
          { startAt: { lte: allocation.endAt }, endAt: { gte: allocation.endAt } },
          { startAt: { gte: allocation.startAt }, endAt: { lte: allocation.endAt } },
        ],
      },
    })

    if (conflict) {
      return NextResponse.json(
        { error: 'Target unit is already committed to another reservation in this date interval' },
        { status: 409 }
      )
    }

    // Perform atomic reassignment
    await db.$transaction(async (tx) => {
      await tx.rentalUnitAllocation.update({
        where: { id: allocation.id },
        data: {
          unitId: newUnitId,
        },
      })

      await tx.rentalReservationEvent.create({
        data: {
          reservationId: reservation.id,
          actorId: 'admin-operations',
          actorName: staffName,
          actorRole: 'ADMIN',
          action: 'REALLOCATE_UNIT',
          fromStatus: reservation.status,
          toStatus: reservation.status,
          notes: `Reassigned unit ${oldUnitId} -> ${newUnit.assetTag} (${newUnitId}). Reason: ${reason}`,
        },
      })
    })

    return NextResponse.json({
      success: true,
      message: `Unit successfully reallocated to ${newUnit.assetTag}`,
      newUnit: {
        id: newUnit.id,
        assetTag: newUnit.assetTag,
        serialNumber: newUnit.serialNumber,
      },
    })
  } catch (error: any) {
    console.error('Error reallocating unit:', error)
    return NextResponse.json({ error: error.message || 'Failed to reallocate unit' }, { status: 500 })
  }
}
