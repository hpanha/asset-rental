import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  try {
    const { provider } = await params
    const body = await req.json().catch(() => ({}))

    const { eventId, type, data } = body
    if (!eventId || !data?.paymentOrderId) {
      return NextResponse.json({ error: 'Missing required webhook fields' }, { status: 400 })
    }

    const paymentOrder = await db.rentalPaymentOrder.findUnique({
      where: { id: data.paymentOrderId },
      include: {
        request: {
          include: {
            inventoryHold: true,
          },
        },
      },
    })

    if (!paymentOrder) {
      return NextResponse.json({ error: 'Payment order not found' }, { status: 404 })
    }

    // Idempotency: if already paid, acknowledge safely
    if (paymentOrder.paymentStatus === 'PAID') {
      return NextResponse.json({ received: true, message: 'Already processed' })
    }

    if (type === 'payment.failed') {
      await db.rentalPaymentOrder.update({
        where: { id: paymentOrder.id },
        data: { paymentStatus: 'FAILED' },
      })
      return NextResponse.json({ received: true, status: 'FAILED' })
    }

    if (type === 'payment.succeeded') {
      const hold = paymentOrder.request.inventoryHold
      const now = new Date()

      // Late payment after hold expired: flag for review, do NOT automatically confirm stock
      if (!hold || hold.status !== 'ACTIVE' || new Date(hold.expiresAt) <= now) {
        await db.rentalPaymentOrder.update({
          where: { id: paymentOrder.id },
          data: { paymentStatus: 'REQUIRES_REVIEW' },
        })
        await db.rentalRequestEvent.create({
          data: {
            requestId: paymentOrder.requestId,
            actorId: 'SYSTEM',
            actorName: `${provider.toUpperCase()} Webhook`,
            actorType: 'SYSTEM',
            action: 'LATE_PAYMENT_HOLD_EXPIRED',
            fromStatus: paymentOrder.request.status,
            toStatus: paymentOrder.request.status,
            reason: `Payment received of $${data.amount} via ${provider}, but inventory hold expired at ${hold?.expiresAt || 'N/A'}. Flagged for review/reavailability check.`,
          },
        })
        return NextResponse.json({
          received: true,
          status: 'REQUIRES_REVIEW',
          message: 'Payment received but inventory hold expired. Flagged for review.',
        })
      }

      // Valid payment within hold window: settle transaction
      const currentYear = new Date().getFullYear()
      const receiptCount = await db.rentalPaymentReceipt.count()
      const receiptNo = `REC-${currentYear}-${(receiptCount + 1).toString().padStart(6, '0')}`

      await db.$transaction(async (tx) => {
        // 1. Mark order as PAID
        await tx.rentalPaymentOrder.update({
          where: { id: paymentOrder.id },
          data: {
            paymentStatus: 'PAID',
            paidAt: now,
          },
        })

        // 2. Create attempt as SUCCEEDED
        await tx.rentalPaymentAttempt.create({
          data: {
            paymentOrderId: paymentOrder.id,
            method: provider.toUpperCase(),
            provider,
            providerReference: data.providerReference || `WEBHOOK-${eventId}`,
            attemptNo: 1,
            status: 'SUCCEEDED',
            amount: paymentOrder.totalDue,
            currency: paymentOrder.currency,
            idempotencyKey: `webhook-${eventId}`,
          },
        })

        // 3. Generate official receipt invoice
        await tx.rentalPaymentReceipt.create({
          data: {
            paymentOrderId: paymentOrder.id,
            receiptNo,
            totalCaptured: paymentOrder.totalDue,
            currency: paymentOrder.currency,
            rentalAmount: paymentOrder.rentalAmount,
            tax: paymentOrder.tax,
            deliveryFee: paymentOrder.deliveryFee,
            depositAmount: paymentOrder.depositAmount,
            paymentMethod: provider.toUpperCase(),
            issuedAt: now,
          },
        })

        // 4. Deposit liability ledger accounting
        if (paymentOrder.depositAmount > 0) {
          await tx.rentalDepositLedger.upsert({
            where: { requestId: paymentOrder.requestId },
            update: {
              collectedAmount: paymentOrder.depositAmount,
              heldAmount: paymentOrder.depositAmount,
              liabilityBalance: paymentOrder.depositAmount,
              status: 'HELD',
            },
            create: {
              requestId: paymentOrder.requestId,
              collectedAmount: paymentOrder.depositAmount,
              heldAmount: paymentOrder.depositAmount,
              deductedAmount: 0,
              refundedAmount: 0,
              liabilityBalance: paymentOrder.depositAmount,
              currency: paymentOrder.currency,
              status: 'HELD',
            },
          })
        }

        // 5. Update request to PAYMENT_CONFIRMED
        await tx.rentalRequest.update({
          where: { id: paymentOrder.requestId },
          data: {
            status: 'PAYMENT_CONFIRMED',
            version: paymentOrder.request.version + 1,
          },
        })

        // 6. Audit Trail Event
        await tx.rentalRequestEvent.create({
          data: {
            requestId: paymentOrder.requestId,
            actorId: 'SYSTEM',
            actorName: `${provider.toUpperCase()} Webhook`,
            actorType: 'SYSTEM',
            action: 'PAYMENT_CONFIRMED',
            fromStatus: paymentOrder.request.status,
            toStatus: 'PAYMENT_CONFIRMED',
            reason: `Verified webhook settlement of $${paymentOrder.totalDue} (${paymentOrder.currency}). Receipt issued: ${receiptNo}. Deposit held: $${paymentOrder.depositAmount}.`,
          },
        })
      })

      return NextResponse.json({
        received: true,
        receiptNo,
        status: 'PAID',
      })
    }

    return NextResponse.json({ received: true, status: 'IGNORED' })
  } catch (error: any) {
    console.error('Webhook error:', error)
    return NextResponse.json(
      { error: 'Webhook processing failed', details: error.message },
      { status: 500 }
    )
  }
}
