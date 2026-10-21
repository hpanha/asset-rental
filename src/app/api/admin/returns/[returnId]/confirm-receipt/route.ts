import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ returnId: string }> }
) {
  try {
    const { returnId } = await params
    const body = await req.json().catch(() => ({}))
    const {
      receivingStaffName = 'Warehouse Lead',
      locationName = 'Main Logistics Hub',
      discrepancyNotes,
      actualReceivedAt,
    } = body

    const returnCase = await db.rentalReturnCase.findFirst({
      where: {
        OR: [{ id: returnId }, { reservationId: returnId }],
      },
      include: {
        reservation: {
          include: {
            request: true,
            lines: {
              include: {
                unitAllocations: {
                  include: { unit: true },
                },
              },
            },
          },
        },
        receipt: true,
      },
    })

    if (!returnCase) {
      return NextResponse.json({ error: 'Return case not found' }, { status: 404 })
    }

    // Idempotency: if already confirmed, return existing receipt (RT10)
    if (returnCase.receipt) {
      return NextResponse.json({
        is_duplicate: true,
        success: true,
        receiptNo: returnCase.receipt.receiptNo,
        status: 'AWAITING_INSPECTION',
        message: 'Physical receipt already confirmed.',
      })
    }

    const now = actualReceivedAt ? new Date(actualReceivedAt) : new Date()
    const currentYear = new Date().getFullYear()

    const result = await db.$transaction(async (tx) => {
      // 1. Generate Return Receipt Number
      const count = await tx.rentalReturnReceipt.count()
      const receiptNo = `RET-${currentYear}-${(count + 1).toString().padStart(6, '0')}`

      const totalUnits = returnCase.reservation.request.quantity || 1

      // 2. Create Receipt
      const receipt = await tx.rentalReturnReceipt.create({
        data: {
          returnCaseId: returnCase.id,
          receiptNo,
          receivedAt: now,
          receivingStaffName,
          locationName,
          totalUnitsReceived: totalUnits,
          notes: discrepancyNotes,
        },
      })

      // 3. Update Return Case
      await tx.rentalReturnCase.update({
        where: { id: returnCase.id },
        data: {
          status: 'AWAITING_INSPECTION',
          actualReceivedAt: now,
          receivingStaffName,
          discrepancyNotes,
        },
      })

      // 4. Update Reservation Status
      await tx.rentalReservation.update({
        where: { id: returnCase.reservationId },
        data: {
          status: 'RETURN_RECEIVED_AWAITING_INSPECTION',
          version: returnCase.reservation.version + 1,
        },
      })

      // 5. Update Request Status
      await tx.rentalRequest.update({
        where: { id: returnCase.reservation.requestId },
        data: {
          status: 'RETURN_RECEIVED_AWAITING_INSPECTION',
        },
      })

      // 6. Create Step 10 Inspection Task
      await tx.rentalInspection.upsert({
        where: { reservationId: returnCase.reservationId },
        update: {
          status: 'IN_PROGRESS',
        },
        create: {
          reservationId: returnCase.reservationId,
          inspectorName: 'Quality Inspection Team',
          status: 'IN_PROGRESS',
          verdict: 'PASS',
        },
      })

      // 7. Audit Event
      await tx.rentalReservationEvent.create({
        data: {
          reservationId: returnCase.reservationId,
          actorName: receivingStaffName,
          actorRole: 'ADMIN',
          action: 'CONFIRM_PHYSICAL_RETURN',
          fromStatus: returnCase.reservation.status,
          toStatus: 'RETURN_RECEIVED_AWAITING_INSPECTION',
          notes: `Confirmed physical receipt of ${totalUnits} unit(s). Receipt #${receiptNo} issued. Ready for technical inspection.`,
        },
      })

      return receipt
    })

    return NextResponse.json({
      success: true,
      receiptNo: result.receiptNo,
      status: 'RETURN_RECEIVED_AWAITING_INSPECTION',
      message: 'Physical return receipt issued. Inspection task queued for Step 10.',
    })
  } catch (error: any) {
    console.error('Error confirming return receipt:', error)
    return NextResponse.json({ error: error.message || 'Failed to confirm return' }, { status: 500 })
  }
}
