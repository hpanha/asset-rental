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
        inspection: {
          include: {
            items: {
              include: { unit: { select: { assetTag: true } } },
            },
          },
        },
        settlement: true,
        request: { include: { listing: true } },
      },
    })

    if (!reservation || !reservation.settlement) {
      return NextResponse.json(
        { error: 'Settlement record not found or inspection is still in progress.' },
        { status: 404 }
      )
    }

    const s = reservation.settlement
    const insp = reservation.inspection

    return NextResponse.json({
      booking_no: reservation.bookingNo,
      asset_name: reservation.request.listing.name,
      status: s.status,
      verdict: insp?.verdict || 'PASS',
      inspection_notes: insp?.notes,
      breakdown: {
        currency: s.currency,
        rental_paid: s.rentalAmount,
        deposit_held: s.depositHeld,
        late_fee: s.lateFee,
        damage_fee: s.damageFee,
        missing_items_fee: s.missingItemsFee,
        cleaning_fee: s.cleaningFee,
        total_deductions: s.totalDeductions,
        net_refund: s.netRefundAmount,
        additional_due: s.additionalDueAmount,
      },
      settled_at: s.refundedAt || s.approvedAt,
    })
  } catch (error: any) {
    console.error('Error fetching renter settlement:', error)
    return NextResponse.json({ error: error.message || 'Failed to fetch settlement' }, { status: 500 })
  }
}
