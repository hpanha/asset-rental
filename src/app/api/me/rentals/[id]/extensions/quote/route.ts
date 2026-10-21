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
    const { requestedEndAt } = body

    if (!requestedEndAt) {
      return NextResponse.json({ error: 'requestedEndAt is required' }, { status: 400 })
    }

    const reservation = await db.rentalReservation.findFirst({
      where: {
        OR: [{ id }, { bookingNo: id }, { requestId: id }],
        renterId: user.id,
      },
      include: {
        request: {
          include: {
            quoteSnapshot: true,
          },
        },
        lines: {
          include: {
            unitAllocations: true,
          },
        },
      },
    })

    if (!reservation) {
      return NextResponse.json({ error: 'Rental reservation not found' }, { status: 404 })
    }

    const currentEnd = new Date(reservation.endAt)
    const newEnd = new Date(requestedEndAt)

    if (newEnd <= currentEnd) {
      return NextResponse.json(
        { error: 'Proposed extension end date must be later than the current due date.' },
        { status: 400 }
      )
    }

    // Check collision for each allocated unit between currentEnd and newEnd
    const allocations = reservation.lines[0]?.unitAllocations || []
    for (const alloc of allocations) {
      const conflict = await db.rentalUnitAllocation.findFirst({
        where: {
          unitId: alloc.unitId,
          reservationLineId: { not: alloc.reservationLineId },
          status: 'COMMITTED',
          OR: [
            { startAt: { lte: currentEnd }, endAt: { gte: currentEnd } },
            { startAt: { lte: newEnd }, endAt: { gte: newEnd } },
            { startAt: { gte: currentEnd }, endAt: { lte: newEnd } },
          ],
        },
      })

      if (conflict) {
        return NextResponse.json({
          available: false,
          reason: 'CONFLICT: This equipment has already been reserved by another customer for the requested extension period.',
        })
      }
    }

    // Compute extra rate
    const diffMs = newEnd.getTime() - currentEnd.getTime()
    const additionalDays = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)))
    const unitRate = reservation.request.quoteSnapshot?.unitRate || 25
    const additionalCharge = additionalDays * unitRate * (reservation.request.quantity || 1)

    return NextResponse.json({
      available: true,
      currentEndAt: currentEnd.toISOString(),
      requestedEndAt: newEnd.toISOString(),
      additionalDays,
      dailyRate: unitRate,
      additionalCharge,
      currency: reservation.request.quoteSnapshot?.currency || 'USD',
      message: `Equipment is available for extension of ${additionalDays} day(s).`,
    })
  } catch (error: any) {
    console.error('Error generating extension quote:', error)
    return NextResponse.json({ error: error.message || 'Failed to quote extension' }, { status: 500 })
  }
}
