import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { finalizeBookingReservation } from '@/lib/reservations'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const body = await req.json().catch(() => ({}))
    const {
      method = 'CARD', // 'CARD' | 'KHQR' | 'BANK_TRANSFER'
      bank_transfer_reference,
      idempotency_key = req.headers.get('idempotency-key') || body.idempotency_key,
    } = body

    const now = new Date()

    const result = await db.$transaction(async (tx) => {
      // 1. Fetch request with lock check
      const request = await tx.rentalRequest.findFirst({
        where: {
          OR: [{ id }, { requestNo: id }],
          renterId: user.id,
        },
        include: {
          quoteSnapshot: true,
          inventoryHold: true,
          paymentOrder: {
            include: { attempts: true, receipt: true },
          },
        },
      })

      if (!request) {
        throw new Error('NOT_FOUND: Rental request not found')
      }

      // Check idempotency if key provided and already paid
      if (idempotency_key && request.paymentOrder?.attempts) {
        const existingAttempt = request.paymentOrder.attempts.find(
          (a) => a.idempotencyKey === idempotency_key
        )
        if (existingAttempt && existingAttempt.status === 'SUCCEEDED') {
          return {
            is_duplicate: true,
            status: 'PAID',
            receipt_no: request.paymentOrder.receipt?.receiptNo,
            request_no: request.requestNo,
            total_captured: existingAttempt.amount,
          }
        }
      }

      // Status eligibility check
      if (request.status === 'PAYMENT_CONFIRMED') {
        return {
          already_paid: true,
          status: 'PAID',
          receipt_no: request.paymentOrder?.receipt?.receiptNo,
          request_no: request.requestNo,
        }
      }

      if (request.status !== 'APPROVED_AWAITING_PAYMENT' && request.status !== 'PAYMENT_PENDING_VERIFICATION') {
        throw new Error(`CONFLICT: Request is currently in "${request.status}". Payment can only be initialized on approved requests.`)
      }

      // 2. Inventory Hold Expiration Check (Crucial invariant)
      const hold = request.inventoryHold
      if (!hold || hold.status !== 'ACTIVE' || new Date(hold.expiresAt) <= now) {
        // Mark hold expired in database
        if (hold && hold.status === 'ACTIVE') {
          await tx.rentalInventoryHold.update({
            where: { id: hold.id },
            data: { status: 'EXPIRED' },
          })
          await tx.rentalRequest.update({
            where: { id: request.id },
            data: { status: 'PAYMENT_EXPIRED' },
          })
          await tx.rentalRequestEvent.create({
            data: {
              requestId: request.id,
              actorId: 'SYSTEM',
              actorName: 'System Scheduler',
              actorType: 'SYSTEM',
              action: 'EXPIRE_HOLD',
              fromStatus: request.status,
              toStatus: 'PAYMENT_EXPIRED',
              reason: 'Payment hold window elapsed before successful checkout',
            },
          })
        }
        throw new Error('HOLD_EXPIRED: The inventory hold deadline for this approval has elapsed. Stock was released back to inventory.')
      }

      const quote = request.quoteSnapshot
      if (!quote) {
        throw new Error('Commercial quote snapshot missing')
      }

      const rentalCharge = quote.rentalSubtotal + quote.deliveryFee + quote.estimatedTax
      const depositAmount = quote.securityDeposit
      const totalPayable = quote.totalPayable

      // 3. Upsert Payment Order
      const paymentOrder = await tx.rentalPaymentOrder.upsert({
        where: { requestId: request.id },
        update: {
          currency: quote.currency,
          rentalAmount: rentalCharge,
          depositAmount,
          deliveryFee: quote.deliveryFee,
          tax: quote.estimatedTax,
          totalDue: totalPayable,
          dueAt: hold.expiresAt,
        },
        create: {
          requestId: request.id,
          currency: quote.currency,
          rentalAmount: rentalCharge,
          depositAmount,
          deliveryFee: quote.deliveryFee,
          tax: quote.estimatedTax,
          totalDue: totalPayable,
          dueAt: hold.expiresAt,
          paymentStatus: 'PROCESSING',
        },
      })

      // 4. Handle Payment by Method
      if (method === 'CASH') {
        const cashRef =
          body.cash_reference?.trim() ||
          body.cash_notes?.trim() ||
          `CASH-PICKUP-${request.requestNo}`

        // Record attempt awaiting counter collection
        await tx.rentalPaymentAttempt.create({
          data: {
            paymentOrderId: paymentOrder.id,
            method: 'CASH',
            provider: 'CASH_COUNTER',
            providerReference: cashRef,
            amount: totalPayable,
            currency: quote.currency,
            idempotencyKey: idempotency_key || null,
            status: 'PROCESSING',
          },
        })

        await tx.rentalPaymentOrder.update({
          where: { id: paymentOrder.id },
          data: { paymentStatus: 'REQUIRES_REVIEW' },
        })

        await tx.rentalRequest.update({
          where: { id: request.id },
          data: { status: 'PAYMENT_PENDING_VERIFICATION' },
        })

        await tx.rentalRequestEvent.create({
          data: {
            requestId: request.id,
            actorId: user.id,
            actorName: user.name,
            actorType: 'RENTER',
            action: 'SUBMIT_PAYMENT_PROOF',
            fromStatus: request.status,
            toStatus: 'PAYMENT_PENDING_VERIFICATION',
            reason: `Pay by Cash on pickup selected ($${totalPayable.toFixed(2)} USD due at counter). Notes: ${cashRef}`,
          },
        })

        return {
          status: 'PROCESSING',
          payment_method: 'CASH',
          request_no: request.requestNo,
          total_due: totalPayable,
          message: 'Pay by Cash registered. Please pay at the service counter upon equipment pickup.',
        }
      }

      if (method === 'BANK_TRANSFER') {
        if (!bank_transfer_reference?.trim()) {
          throw new Error('VALIDATION: Bank transfer reference/transaction code is required.')
        }

        // Record attempt awaiting admin manual verification
        await tx.rentalPaymentAttempt.create({
          data: {
            paymentOrderId: paymentOrder.id,
            method: 'BANK_TRANSFER',
            provider: 'MANUAL_BANK_TRANSFER',
            providerReference: bank_transfer_reference.trim(),
            amount: totalPayable,
            currency: quote.currency,
            idempotencyKey: idempotency_key || null,
            status: 'PROCESSING',
          },
        })

        await tx.rentalPaymentOrder.update({
          where: { id: paymentOrder.id },
          data: { paymentStatus: 'REQUIRES_REVIEW' },
        })

        await tx.rentalRequest.update({
          where: { id: request.id },
          data: { status: 'PAYMENT_PENDING_VERIFICATION' },
        })

        await tx.rentalRequestEvent.create({
          data: {
            requestId: request.id,
            actorId: user.id,
            actorName: user.name,
            actorType: 'RENTER',
            action: 'SUBMIT_PAYMENT_PROOF',
            fromStatus: request.status,
            toStatus: 'PAYMENT_PENDING_VERIFICATION',
            reason: `Bank wire reference submitted: ${bank_transfer_reference.trim()}`,
          },
        })

        return {
          status: 'PROCESSING',
          payment_method: 'BANK_TRANSFER',
          request_no: request.requestNo,
          message: 'Bank transfer reference submitted for review by finance team.',
        }
      }

      // Online instant capture (CARD or KHQR simulated provider webhook settlement)
      const providerRef = `TXN-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`

      // Create succeeded attempt
      await tx.rentalPaymentAttempt.create({
        data: {
          paymentOrderId: paymentOrder.id,
          method,
          provider: method === 'KHQR' ? 'BAKONG_KHQR' : 'STRIPE_GATEWAY',
          providerReference: providerRef,
          amount: totalPayable,
          currency: quote.currency,
          idempotencyKey: idempotency_key || null,
          status: 'SUCCEEDED',
        },
      })

      // Generate Receipt Number (e.g. REC-2026-000001)
      const currentYear = new Date().getFullYear()
      const receiptCount = await tx.rentalPaymentReceipt.count()
      const receiptNo = `REC-${currentYear}-${(receiptCount + 1).toString().padStart(6, '0')}`

      // Create Receipt
      const receipt = await tx.rentalPaymentReceipt.create({
        data: {
          paymentOrderId: paymentOrder.id,
          receiptNo,
          rentalAmount: rentalCharge,
          depositAmount,
          deliveryFee: quote.deliveryFee,
          tax: quote.estimatedTax,
          totalCaptured: totalPayable,
          currency: quote.currency,
          paymentMethod: method,
          issuedAt: now,
        },
      })

      // Update Order to PAID
      await tx.rentalPaymentOrder.update({
        where: { id: paymentOrder.id },
        data: {
          paymentStatus: 'PAID',
          paidAt: now,
        },
      })

      // Create Deposit Ledger entry (Refundable deposit liability tracking)
      await tx.rentalDepositLedger.upsert({
        where: { requestId: request.id },
        update: {
          collectedAmount: depositAmount,
          heldAmount: depositAmount,
          liabilityBalance: depositAmount,
          status: 'HELD',
        },
        create: {
          requestId: request.id,
          currency: quote.currency,
          collectedAmount: depositAmount,
          heldAmount: depositAmount,
          liabilityBalance: depositAmount,
          status: 'HELD',
        },
      })

      // Update Rental Request to PAYMENT_CONFIRMED
      await tx.rentalRequest.update({
        where: { id: request.id },
        data: {
          status: 'PAYMENT_CONFIRMED',
          version: request.version + 1,
        },
      })

      // Record Audit Event
      await tx.rentalRequestEvent.create({
        data: {
          requestId: request.id,
          actorId: user.id,
          actorName: user.name,
          actorType: 'RENTER',
          action: 'PAYMENT_CONFIRMED',
          fromStatus: request.status,
          toStatus: 'PAYMENT_CONFIRMED',
          reason: `Verified ${method} payment captured: $${totalPayable.toFixed(2)} (Receipt: ${receiptNo})`,
        },
      })

      return {
        status: 'PAID',
        request_id: request.id,
        request_no: request.requestNo,
        receipt_no: receiptNo,
        total_captured: totalPayable,
        currency: quote.currency,
        paid_at: now.toISOString(),
        message: 'Payment and refundable security deposit successfully captured.',
      }
    })

    // Step 06 Handoff: Finalize booking reservation committed inventory
    let bookingResult = null
    if (result.status === 'PAID') {
      try {
        bookingResult = await finalizeBookingReservation(result.request_id, {
          id: user.id,
          name: user.name,
          role: 'RENTER',
        })
      } catch (reserveErr: any) {
        console.error('Reservation finalization post-payment notice:', reserveErr.message)
      }
    }

    return NextResponse.json({
      success: true,
      ...result,
      booking_no: bookingResult?.booking_no || null,
      reservation_id: bookingResult?.reservation?.id || null,
    })
  } catch (error: any) {
    const msg = error.message || 'Payment processing failed'
    console.error('Error processing payment attempt:', msg)

    const statusCode = msg.startsWith('NOT_FOUND')
      ? 404
      : msg.startsWith('HOLD_EXPIRED') || msg.startsWith('CONFLICT')
      ? 409
      : 400

    return NextResponse.json({ error: msg }, { status: statusCode })
  }
}
