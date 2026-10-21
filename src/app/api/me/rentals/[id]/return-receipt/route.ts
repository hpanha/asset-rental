import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params

    const reservation = await db.rentalReservation.findFirst({
      where: {
        OR: [{ id }, { bookingNo: id }, { requestId: id }],
        renterId: user.id,
      },
      include: {
        request: { include: { listing: true } },
        returnCase: {
          include: {
            receipt: true,
          },
        },
      },
    })

    if (!reservation || !reservation.returnCase?.receipt) {
      return NextResponse.json(
        { error: 'Return receipt not found or physical return has not been verified yet.' },
        { status: 404 }
      )
    }

    const rc = reservation.returnCase
    const receipt = rc.receipt!

    return NextResponse.json({
      receipt_no: receipt.receiptNo,
      booking_no: reservation.bookingNo,
      asset_name: reservation.request.listing.name,
      received_at: receipt.receivedAt,
      receiving_staff: receipt.receivingStaffName,
      location: receipt.locationName,
      total_units: receipt.totalUnitsReceived,
      notes: receipt.notes,
      legal_notice:
        'This document confirms PHYSICAL CUSTODY RECEIPT ONLY. Final equipment condition, cleaning, repair, and security deposit release are subject to professional inspection in Step 10.',
    })
  } catch (error: any) {
    console.error('Error fetching return receipt:', error)
    return NextResponse.json({ error: error.message || 'Failed to fetch return receipt' }, { status: 500 })
  }
}
