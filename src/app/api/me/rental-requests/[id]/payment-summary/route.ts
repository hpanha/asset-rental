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
    const now = new Date()

    const request = await db.rentalRequest.findFirst({
      where: {
        OR: [{ id }, { requestNo: id }],
        renterId: user.id,
      },
      include: {
        listing: {
          select: { id: true, code: true, name: true, slug: true, coverImage: true },
        },
        quoteSnapshot: true,
        inventoryHold: true,
        paymentOrder: {
          include: { receipt: true },
        },
        pickupLocation: true,
        deliveryAddress: true,
      },
    })

    if (!request) {
      return NextResponse.json({ error: 'Rental request not found' }, { status: 404 })
    }

    const hold = request.inventoryHold
    const isHoldActive = hold && hold.status === 'ACTIVE' && new Date(hold.expiresAt) > now
    const expiresAt = hold ? new Date(hold.expiresAt).toISOString() : null
    const remainingSeconds = hold
      ? Math.max(0, Math.floor((new Date(hold.expiresAt).getTime() - now.getTime()) / 1000))
      : 0

    const quote = request.quoteSnapshot
    if (!quote) {
      return NextResponse.json({ error: 'Commercial quote snapshot missing' }, { status: 500 })
    }

    // Separate rental revenue charges from refundable security deposit liability
    const rentalCharges = {
      rental_subtotal: quote.rentalSubtotal,
      delivery_fee: quote.deliveryFee,
      estimated_tax: quote.estimatedTax,
      subtotal_due: quote.rentalSubtotal + quote.deliveryFee + quote.estimatedTax,
    }

    const refundableDeposit = {
      amount: quote.securityDeposit,
      terms_note: 'Refunded in full upon return inspection in Step 10, minus any late return or damage assessments.',
    }

    const totalDue = quote.totalPayable

    return NextResponse.json({
      request_id: request.id,
      request_no: request.requestNo,
      status: request.status,
      is_payable: request.status === 'APPROVED_AWAITING_PAYMENT' && isHoldActive,
      is_hold_expired: !isHoldActive,
      payment_due_at: expiresAt,
      remaining_seconds: remainingSeconds,
      asset: {
        id: request.listing.id,
        code: request.listing.code,
        name: request.listing.name,
        slug: request.listing.slug,
        cover_image: request.listing.coverImage,
        quantity: request.quantity,
        rental_days: request.rentalDays,
        start_at: request.startAt,
        end_at: request.endAt,
        fulfillment: request.fulfillment,
        location_city: request.pickupLocation?.city || request.deliveryAddress?.city || 'Phnom Penh',
      },
      commercial_breakdown: {
        currency: quote.currency,
        unit_rate: quote.unitRate,
        rental_charges: rentalCharges,
        refundable_deposit: refundableDeposit,
        total_due: totalDue,
      },
      payment_order: request.paymentOrder || null,
      supported_methods: [
        { id: 'CARD', name: 'Credit / Debit Card', description: 'Instant processing via Visa, Mastercard, or UnionPay' },
        { id: 'KHQR', name: 'Bakong KHQR / ABA PAY', description: 'Instant mobile banking scan in KHR or USD' },
        { id: 'BANK_TRANSFER', name: 'Direct Bank Wire', description: 'Manual bank transfer with verification review' },
      ],
    })
  } catch (error: any) {
    console.error('Error fetching payment summary:', error)
    return NextResponse.json({ error: error.message || 'Failed to fetch payment summary' }, { status: 500 })
  }
}
