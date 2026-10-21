import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await req.json().catch(() => ({}))
    const { approvedBy = 'Finance Lead', notes } = body

    const settlement = await db.rentalSettlement.findFirst({
      where: {
        OR: [{ id }, { reservationId: id }],
      },
      include: {
        reservation: {
          include: {
            request: {
              include: { depositLedger: true },
            },
          },
        },
      },
    })

    if (!settlement) {
      return NextResponse.json({ error: 'Settlement record not found' }, { status: 404 })
    }

    const now = new Date()

    await db.$transaction(async (tx) => {
      // 1. Update Settlement
      await tx.rentalSettlement.update({
        where: { id: settlement.id },
        data: {
          status: 'SETTLED',
          approvedBy,
          approvedAt: now,
          refundedAt: now,
          notes: notes || settlement.notes,
        },
      })

      // 2. Settle Deposit Liability Ledger
      if (settlement.reservation.request.depositLedger) {
        await tx.rentalDepositLedger.update({
          where: { requestId: settlement.reservation.requestId },
          data: {
            deductedAmount: settlement.totalDeductions,
            refundedAmount: settlement.netRefundAmount,
            liabilityBalance: 0,
            status: 'SETTLED',
          },
        })
      }

      // 3. Update Reservation to SETTLED
      await tx.rentalReservation.update({
        where: { id: settlement.reservationId },
        data: {
          status: 'SETTLED',
          version: settlement.reservation.version + 1,
        },
      })

      // 4. Update Request to SETTLED
      await tx.rentalRequest.update({
        where: { id: settlement.reservation.requestId },
        data: {
          status: 'SETTLED',
        },
      })

      // 5. Audit Event
      await tx.rentalReservationEvent.create({
        data: {
          reservationId: settlement.reservationId,
          actorName: approvedBy,
          actorRole: 'ADMIN',
          action: 'SETTLEMENT_APPROVED',
          fromStatus: settlement.reservation.status,
          toStatus: 'SETTLED',
          notes: `Settlement approved by ${approvedBy}. Deposit liability released: $${settlement.netRefundAmount.toFixed(2)} refunded, $${settlement.totalDeductions.toFixed(2)} retained.`,
        },
      })
    })

    return NextResponse.json({
      success: true,
      status: 'SETTLED',
      message: 'Settlement approved and security deposit ledger settled.',
    })
  } catch (error: any) {
    console.error('Error approving settlement:', error)
    return NextResponse.json({ error: error.message || 'Failed to approve settlement' }, { status: 500 })
  }
}
