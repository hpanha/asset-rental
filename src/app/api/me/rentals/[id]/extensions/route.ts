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
    const { requestedEndAt, additionalDays, additionalCharge } = body

    if (!requestedEndAt || !additionalDays) {
      return NextResponse.json({ error: 'Missing extension parameters' }, { status: 400 })
    }

    const reservation = await db.rentalReservation.findFirst({
      where: {
        OR: [{ id }, { bookingNo: id }, { requestId: id }],
        renterId: user.id,
      },
    })

    if (!reservation) {
      return NextResponse.json({ error: 'Rental reservation not found' }, { status: 404 })
    }

    if (reservation.status !== 'ACTIVE') {
      return NextResponse.json(
        { error: `Cannot request extension for rental in status ${reservation.status}.` },
        { status: 400 }
      )
    }

    // Check if there is already a pending extension
    const existing = await db.rentalExtensionRequest.findFirst({
      where: {
        reservationId: reservation.id,
        status: 'PENDING',
      },
    })

    if (existing) {
      return NextResponse.json(
        { error: 'An extension request is already pending review for this rental.' },
        { status: 400 }
      )
    }

    const ext = await db.rentalExtensionRequest.create({
      data: {
        reservationId: reservation.id,
        requestedEndAt: new Date(requestedEndAt),
        additionalDays,
        additionalCharge: additionalCharge || 0,
        status: 'PENDING',
      },
    })

    await db.rentalReservationEvent.create({
      data: {
        reservationId: reservation.id,
        actorId: user.id,
        actorName: user.name,
        actorRole: 'RENTER',
        action: 'REQUEST_EXTENSION',
        fromStatus: reservation.status,
        toStatus: reservation.status,
        notes: `Renter requested extension of +${additionalDays} day(s) until ${new Date(requestedEndAt).toLocaleString()}`,
      },
    })

    return NextResponse.json({
      success: true,
      extension: ext,
      message: 'Extension request submitted. Awaiting admin review.',
    })
  } catch (error: any) {
    console.error('Error submitting extension request:', error)
    return NextResponse.json({ error: error.message || 'Failed to submit extension' }, { status: 500 })
  }
}
