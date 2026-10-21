import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { finalizeBookingReservation } from '@/lib/reservations'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await req.json().catch(() => ({}))
    const { reviewer_name = 'Finance Manager', bank_statement_ref } = body

    const now = new Date()

    const result = await db.$transaction(async (tx) => {
      const order = await tx.rentalPaymentOrder.findUnique({
        where: { id },
        include: {
          request: true,
          attempts: {
            where: { status: 'PROCESSING' },
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
      })

      if (!order) throw new Error('Payment order not found')
      if (order.paymentStatus === 'PAID') throw new Error('Payment order already verified and paid')

      const primaryAttempt = order.attempts[0]
      const method = primaryAttempt?.method || body.paymentMethod || 'CASH'

      // Mark attempt succeeded
      if (primaryAttempt) {
        await tx.rentalPaymentAttempt.update({
          where: { id: primaryAttempt.id },
          data: {
            status: 'SUCCEEDED',
            providerReference: bank_statement_ref || primaryAttempt.providerReference,
          },
        })
      }

      // Generate receipt
      const currentYear = new Date().getFullYear()
      const receiptCount = await tx.rentalPaymentReceipt.count()
      const receiptNo = `REC-${currentYear}-${(receiptCount + 1).toString().padStart(6, '0')}`

      const receipt = await tx.rentalPaymentReceipt.create({
        data: {
          paymentOrderId: order.id,
          receiptNo,
          rentalAmount: order.rentalAmount,
          depositAmount: order.depositAmount,
          deliveryFee: order.deliveryFee,
          tax: order.tax,
          totalCaptured: order.totalDue,
          currency: order.currency,
          paymentMethod: method,
          issuedAt: now,
        },
      })

      // Update Order
      await tx.rentalPaymentOrder.update({
        where: { id: order.id },
        data: {
          paymentStatus: 'PAID',
          paidAt: now,
        },
      })

      // Create Deposit Ledger entry
      await tx.rentalDepositLedger.upsert({
        where: { requestId: order.requestId },
        update: {
          collectedAmount: order.depositAmount,
          heldAmount: order.depositAmount,
          liabilityBalance: order.depositAmount,
          status: 'HELD',
        },
        create: {
          requestId: order.requestId,
          currency: order.currency,
          collectedAmount: order.depositAmount,
          heldAmount: order.depositAmount,
          liabilityBalance: order.depositAmount,
          status: 'HELD',
        },
      })

      // Update Request status
      await tx.rentalRequest.update({
        where: { id: order.requestId },
        data: {
          status: 'PAYMENT_CONFIRMED',
          version: order.request.version + 1,
        },
      })

      // Audit event
      await tx.rentalRequestEvent.create({
        data: {
          requestId: order.requestId,
          actorId: 'finance-01',
          actorName: reviewer_name,
          actorType: 'ADMIN',
          action: 'VERIFY_MANUAL_PAYMENT',
          fromStatus: order.request.status,
          toStatus: 'PAYMENT_CONFIRMED',
          reason: `Manual ${method === 'CASH' ? 'cash payment at counter' : 'bank transfer'} confirmed by ${reviewer_name}. Receipt: ${receiptNo}`,
        },
      })

      return { receipt, requestId: order.requestId, method }
    })

    // Step 06 Handoff: Finalize booking reservation
    let bookingResult = null
    try {
      bookingResult = await finalizeBookingReservation(result.requestId, {
        name: reviewer_name,
        role: 'ADMIN',
      })
    } catch (reserveErr: any) {
      console.error('Reservation finalization post-manual verify notice:', reserveErr.message)
    }

    return NextResponse.json({
      success: true,
      receipt_no: result.receipt.receiptNo,
      booking_no: bookingResult?.booking_no || null,
      message: `${result.method === 'CASH' ? 'Cash payment' : 'Bank transfer'} verified. Payment confirmed and asset reserved.`,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Verification failed' }, { status: 400 })
  }
}
