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
        request: {
          include: {
            listing: true,
            pickupLocation: true,
            returnLocation: true,
            paymentOrder: { include: { receipt: true } },
          },
        },
        handover: {
          include: {
            items: {
              include: {
                unit: true,
                accessories: true,
              },
            },
          },
        },
        evidence: {
          where: { stage: 'OUT' },
        },
        location: true,
      },
    })

    if (!reservation || !reservation.handover) {
      return NextResponse.json(
        { error: 'Handover receipt not found or equipment has not been physically received yet.' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      booking_no: reservation.bookingNo,
      status: reservation.status,
      handover_at: reservation.handover.handoverAt,
      handover_staff: reservation.handover.staffName,
      receiver_name: reservation.handover.receiverName,
      return_due_at: reservation.endAt,
      location: reservation.location?.name || reservation.request.pickupLocation?.name || 'Main Logistics Hub',
      asset_name: reservation.request.listing.name,
      items: reservation.handover.items.map((item) => ({
        tag: item.scannedTag,
        serial: item.unit.serialNumber,
        condition: item.conditionGrade,
        functional_check: item.functionalCheck,
        accessories: item.accessories.map((a) => `${a.expectedQty}x ${a.name} (${a.condition})`),
      })),
      evidence_photos: reservation.evidence.map((e) => e.mediaUrl),
      payment_summary: {
        total_paid: reservation.request.paymentOrder?.totalDue,
        receipt_no: reservation.request.paymentOrder?.receipt?.receiptNo,
        deposit_held: reservation.request.paymentOrder?.depositAmount,
      },
      return_instructions:
        'Please return all units and included accessories by the return due date. Inspection and deposit release will be conducted upon return receipt in Step 10.',
    })
  } catch (error: any) {
    console.error('Error fetching handover receipt:', error)
    return NextResponse.json({ error: error.message || 'Failed to fetch handover receipt' }, { status: 500 })
  }
}
