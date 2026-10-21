import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const reservations = await db.rentalReservation.findMany({
      where: {
        renterId: user.id,
        status: 'COMPLETED',
      },
      include: {
        request: {
          include: {
            listing: true,
            paymentOrder: { include: { receipt: true } },
          },
        },
        settlement: true,
        closure: true,
        handover: true,
        returnCase: { include: { receipt: true } },
      },
      orderBy: { updatedAt: 'desc' },
    })

    const history = reservations.map((r) => ({
      booking_no: r.bookingNo,
      request_no: r.request.requestNo,
      asset_name: r.request.listing.name,
      cover_image: r.request.listing.coverImage,
      rental_days: r.request.rentalDays,
      start_at: r.startAt,
      end_at: r.endAt,
      closed_at: r.closure?.closedAt || r.updatedAt,
      rental_paid: r.settlement?.rentalAmount || r.request.paymentOrder?.rentalAmount || 0,
      deposit_refunded: r.settlement?.netRefundAmount || 0,
      deductions_retained: r.settlement?.totalDeductions || 0,
      receipt_no: r.request.paymentOrder?.receipt?.receiptNo,
      return_receipt_no: r.returnCase?.receipt?.receiptNo,
    }))

    return NextResponse.json({ history })
  } catch (error: any) {
    console.error('Error fetching rental history:', error)
    return NextResponse.json({ error: error.message || 'Failed to fetch history' }, { status: 500 })
  }
}
