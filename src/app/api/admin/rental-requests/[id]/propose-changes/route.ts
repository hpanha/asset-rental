import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await req.json().catch(() => ({}))
    const {
      proposed_start_at,
      proposed_end_at,
      proposed_quantity,
      reason,
      reviewer_name = 'Rental Manager',
    } = body

    if (!reason?.trim()) {
      return NextResponse.json(
        { error: 'An explanation for the proposed change is required.' },
        { status: 400 }
      )
    }

    const result = await db.$transaction(async (tx) => {
      const request = await tx.rentalRequest.findFirst({
        where: {
          OR: [{ id }, { requestNo: id }],
        },
        include: {
          listing: {
            include: {
              rates: { where: { isPrimary: true } },
              rentalPolicy: true,
            },
          },
          quoteSnapshot: true,
        },
      })

      if (!request) {
        throw new Error('NOT_FOUND: Rental request not found')
      }

      if (['REJECTED', 'CANCELLED_BY_RENTER'].includes(request.status)) {
        throw new Error(`CONFLICT: Cannot propose changes to request in ${request.status}`)
      }

      const pStart = proposed_start_at ? new Date(proposed_start_at) : request.startAt
      const pEnd = proposed_end_at ? new Date(proposed_end_at) : request.endAt
      const pQty = proposed_quantity ? Math.max(1, parseInt(proposed_quantity, 10)) : request.quantity

      const diffMs = pEnd.getTime() - pStart.getTime()
      const diffDays = Math.max(1, Math.round(diffMs / (1000 * 60 * 60 * 24)))

      const dailyRate = request.listing.rates[0]?.rateAmount || request.quoteSnapshot?.unitRate || 0
      const proposedSubtotal = dailyRate * diffDays * pQty
      const proposedDeposit = (request.listing.rentalPolicy?.securityDeposit || 0) * pQty
      const deliveryFee = request.quoteSnapshot?.deliveryFee || 0
      const proposedTotal = proposedSubtotal + proposedDeposit + deliveryFee

      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24h validity for proposal

      // Create Proposal
      const proposal = await tx.rentalChangeProposal.create({
        data: {
          requestId: request.id,
          proposedStartAt: pStart,
          proposedEndAt: pEnd,
          proposedQuantity: pQty,
          proposedRate: dailyRate,
          proposedSubtotal,
          proposedDeposit,
          proposedTotal,
          reason: reason.trim(),
          status: 'PENDING_RENTER_RESPONSE',
          expiresAt,
        },
      })

      // Update Request status
      await tx.rentalRequest.update({
        where: { id: request.id },
        data: {
          status: 'CHANGE_REQUESTED',
          version: request.version + 1,
        },
      })

      // Create Event
      await tx.rentalRequestEvent.create({
        data: {
          requestId: request.id,
          actorId: 'admin-01',
          actorName: reviewer_name,
          actorType: 'ADMIN',
          action: 'PROPOSE_CHANGES',
          fromStatus: request.status,
          toStatus: 'CHANGE_REQUESTED',
          reason: reason.trim(),
        },
      })

      return proposal
    })

    return NextResponse.json({
      success: true,
      proposal: result,
      message: 'Change proposal successfully recorded. Customer must review and accept.',
    })
  } catch (error: any) {
    const msg = error.message || 'Failed to propose changes'
    console.error('Error proposing changes:', msg)
    const statusCode = msg.startsWith('NOT_FOUND') ? 404 : msg.startsWith('CONFLICT') ? 409 : 400
    return NextResponse.json({ error: msg }, { status: statusCode })
  }
}
