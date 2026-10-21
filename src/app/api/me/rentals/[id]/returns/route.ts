import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const body = await req.json().catch(() => ({}))
    const { returnLocationId, scheduledAt, notes } = body

    const reservation = await db.rentalReservation.findFirst({
      where: {
        OR: [{ id }, { bookingNo: id }, { requestId: id }],
        renterId: user.id,
      },
    })

    if (!reservation) {
      return NextResponse.json({ error: 'Rental reservation not found' }, { status: 404 })
    }

    if (!['ACTIVE', 'RETURN_REQUESTED'].includes(reservation.status)) {
      return NextResponse.json(
        { error: `Cannot schedule return for rental in status ${reservation.status}` },
        { status: 400 }
      )
    }

    const scheduledDate = scheduledAt ? new Date(scheduledAt) : new Date()

    // Upsert Return Case
    const returnCase = await db.rentalReturnCase.upsert({
      where: { reservationId: reservation.id },
      update: {
        returnLocationId: returnLocationId || reservation.locationId,
        scheduledAt: scheduledDate,
        status: 'SCHEDULED',
        discrepancyNotes: notes,
      },
      create: {
        reservationId: reservation.id,
        requestedBy: user.name,
        returnLocationId: returnLocationId || reservation.locationId,
        scheduledAt: scheduledDate,
        status: 'SCHEDULED',
        discrepancyNotes: notes,
      },
    })

    // Update reservation status
    await db.rentalReservation.update({
      where: { id: reservation.id },
      data: {
        status: 'RETURN_SCHEDULED',
        version: reservation.version + 1,
      },
    })

    await db.rentalReservationEvent.create({
      data: {
        reservationId: reservation.id,
        actorId: user.id,
        actorName: user.name,
        actorRole: 'RENTER',
        action: 'SCHEDULE_RETURN',
        fromStatus: reservation.status,
        toStatus: 'RETURN_SCHEDULED',
        notes: `Renter scheduled return for ${scheduledDate.toLocaleString()}`,
      },
    })

    return NextResponse.json({
      success: true,
      returnCase,
      message: 'Return scheduled. Please bring all units and accessories to the return location.',
    })
  } catch (error: any) {
    console.error('Error initiating return:', error)
    return NextResponse.json({ error: error.message || 'Failed to initiate return' }, { status: 500 })
  }
}
