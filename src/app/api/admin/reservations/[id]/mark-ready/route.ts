import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await req.json().catch(() => ({}))
    const { staffName = 'Warehouse Lead', notes = 'All units inspected and bundled with accessories.' } = body

    const reservation = await db.rentalReservation.findFirst({
      where: {
        OR: [{ id }, { bookingNo: id }],
      },
      include: { fulfillmentTask: true, request: true },
    })

    if (!reservation) {
      return NextResponse.json({ error: 'Reservation not found' }, { status: 404 })
    }

    if (reservation.status !== 'RESERVED') {
      return NextResponse.json(
        { error: `Cannot mark ready. Current reservation status is ${reservation.status}.` },
        { status: 400 }
      )
    }

    const now = new Date()

    await db.$transaction(async (tx) => {
      // 1. Update reservation status
      await tx.rentalReservation.update({
        where: { id: reservation.id },
        data: {
          status: 'READY_FOR_HANDOVER',
          version: reservation.version + 1,
        },
      })

      // 2. Update fulfillment task
      if (reservation.fulfillmentTask) {
        await tx.rentalFulfillmentTask.update({
          where: { id: reservation.fulfillmentTask.id },
          data: {
            status: 'READY_FOR_HANDOVER',
            assignedStaffName: staffName,
            preparedAt: now,
            notes: notes ? `${reservation.fulfillmentTask.notes || ''}\n[Preparation]: ${notes}`.trim() : undefined,
          },
        })
      }

      // 3. Log event
      await tx.rentalReservationEvent.create({
        data: {
          reservationId: reservation.id,
          actorId: 'admin-warehouse',
          actorName: staffName,
          actorRole: 'ADMIN',
          action: 'MARK_READY_FOR_HANDOVER',
          fromStatus: 'RESERVED',
          toStatus: 'READY_FOR_HANDOVER',
          notes,
        },
      })

      await tx.rentalRequestEvent.create({
        data: {
          requestId: reservation.requestId,
          actorId: 'admin-warehouse',
          actorName: staffName,
          actorType: 'ADMIN',
          action: 'MARK_READY_FOR_HANDOVER',
          fromStatus: reservation.request.status,
          toStatus: 'RESERVED',
          reason: `Assets inspected and prepared at location. Ready for customer pickup. Note: ${notes}`,
        },
      })
    })

    return NextResponse.json({
      success: true,
      status: 'READY_FOR_HANDOVER',
      message: 'Reservation marked as READY_FOR_HANDOVER. Handover task prepared for Step 07.',
    })
  } catch (error: any) {
    console.error('Error marking reservation ready:', error)
    return NextResponse.json({ error: error.message || 'Failed to update reservation' }, { status: 500 })
  }
}
