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
    const { category, severity = 'MEDIUM', description } = body

    if (!category || !description) {
      return NextResponse.json({ error: 'category and description are required' }, { status: 400 })
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

    const incident = await db.rentalIncident.create({
      data: {
        reservationId: reservation.id,
        category,
        severity,
        description,
        status: 'OPEN',
      },
    })

    await db.rentalReservationEvent.create({
      data: {
        reservationId: reservation.id,
        actorId: user.id,
        actorName: user.name,
        actorRole: 'RENTER',
        action: 'REPORT_INCIDENT',
        fromStatus: reservation.status,
        toStatus: reservation.status,
        notes: `Renter reported [${category} / ${severity}]: ${description}`,
      },
    })

    return NextResponse.json({
      success: true,
      incident,
      message: 'Incident ticket recorded. Operations team notified for triage.',
    })
  } catch (error: any) {
    console.error('Error reporting incident:', error)
    return NextResponse.json({ error: error.message || 'Failed to report incident' }, { status: 500 })
  }
}
