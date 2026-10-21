import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const reservation = await db.rentalReservation.findFirst({
      where: {
        OR: [{ id }, { bookingNo: id }, { requestId: id }],
      },
      include: {
        request: {
          include: {
            renter: { select: { id: true, name: true, email: true, phone: true } },
            listing: {
              include: {
                category: true,
                rentalPolicy: true,
                units: true,
              },
            },
            quoteSnapshot: true,
            paymentOrder: {
              include: {
                receipt: true,
                attempts: { orderBy: { createdAt: 'desc' } },
              },
            },
            depositLedger: true,
            pickupLocation: true,
            deliveryAddress: true,
            events: { orderBy: { createdAt: 'desc' } },
          },
        },
        lines: {
          include: {
            listing: true,
            unitAllocations: {
              include: {
                unit: true,
              },
            },
            poolAllocations: true,
          },
        },
        fulfillmentTask: {
          include: { location: true },
        },
        location: true,
        events: {
          orderBy: { createdAt: 'desc' },
        },
      },
    })

    if (!reservation) {
      return NextResponse.json({ error: 'Reservation not found' }, { status: 404 })
    }

    return NextResponse.json({ reservation })
  } catch (error: any) {
    console.error('Error fetching admin reservation detail:', error)
    return NextResponse.json({ error: error.message || 'Failed to fetch reservation' }, { status: 500 })
  }
}
