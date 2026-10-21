import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await req.json().catch(() => ({}))
    const { reason = 'Bank reference not verified', verifiedBy = 'Admin Finance' } = body

    const paymentOrder = await db.rentalPaymentOrder.findUnique({
      where: { id },
      include: {
        request: true,
        attempts: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    })

    if (!paymentOrder) {
      return NextResponse.json({ error: 'Payment order not found' }, { status: 404 })
    }

    if (paymentOrder.paymentStatus === 'PAID') {
      return NextResponse.json(
        { error: 'Cannot reject already confirmed/settled payment order' },
        { status: 400 }
      )
    }

    await db.$transaction(async (tx) => {
      // 1. Mark latest attempt as FAILED
      if (paymentOrder.attempts[0]) {
        await tx.rentalPaymentAttempt.update({
          where: { id: paymentOrder.attempts[0].id },
          data: {
            status: 'FAILED',
            failureReason: reason,
          },
        })
      }

      // 2. Mark order as REQUIRES_REVIEW or UNPAID so renter can retry
      await tx.rentalPaymentOrder.update({
        where: { id: paymentOrder.id },
        data: {
          paymentStatus: 'UNPAID',
        },
      })

      // 3. Keep or restore request in APPROVED_AWAITING_PAYMENT so renter can try again
      await tx.rentalRequest.update({
        where: { id: paymentOrder.requestId },
        data: {
          status: 'APPROVED_AWAITING_PAYMENT',
        },
      })

      // 4. Audit Event
      await tx.rentalRequestEvent.create({
        data: {
          requestId: paymentOrder.requestId,
          actorId: 'admin-finance',
          actorName: verifiedBy,
          actorType: 'ADMIN',
          action: 'REJECT_PAYMENT_PROOF',
          fromStatus: paymentOrder.request.status,
          toStatus: 'APPROVED_AWAITING_PAYMENT',
          reason: `Bank proof rejected. Reason: ${reason}`,
        },
      })
    })

    return NextResponse.json({
      success: true,
      message: 'Bank transfer proof rejected. Renter can retry payment.',
    })
  } catch (error: any) {
    console.error('Error rejecting manual proof:', error)
    return NextResponse.json(
      { error: 'Failed to reject payment proof', details: error.message },
      { status: 500 }
    )
  }
}
