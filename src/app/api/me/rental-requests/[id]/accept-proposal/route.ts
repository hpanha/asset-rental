import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params

    const result = await db.$transaction(async (tx) => {
      const request = await tx.rentalRequest.findFirst({
        where: {
          OR: [{ id }, { requestNo: id }],
          renterId: user.id,
        },
        include: {
          changeProposals: {
            where: { status: 'PENDING_RENTER_RESPONSE' },
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
          quoteSnapshot: true,
        },
      })

      if (!request) throw new Error('Rental request not found')

      const proposal = request.changeProposals[0]
      if (!proposal) throw new Error('No pending change proposal found for this request')

      // Mark proposal accepted
      await tx.rentalChangeProposal.update({
        where: { id: proposal.id },
        data: { status: 'ACCEPTED' },
      })

      // Update request dates, quantity, and recalculate days
      const newStart = proposal.proposedStartAt || request.startAt
      const newEnd = proposal.proposedEndAt || request.endAt
      const newQty = proposal.proposedQuantity || request.quantity
      const diffMs = newEnd.getTime() - newStart.getTime()
      const diffDays = Math.max(1, Math.round(diffMs / (1000 * 60 * 60 * 24)))

      await tx.rentalRequest.update({
        where: { id: request.id },
        data: {
          startAt: newStart,
          endAt: newEnd,
          rentalDays: diffDays,
          quantity: newQty,
          status: 'PENDING_APPROVAL', // Moves back to admin review for approval hold
          version: request.version + 1,
        },
      })

      // Update quote snapshot with proposed values
      if (request.quoteSnapshot && proposal.proposedTotal) {
        await tx.rentalQuoteSnapshot.update({
          where: { requestId: request.id },
          data: {
            unitRate: proposal.proposedRate || request.quoteSnapshot.unitRate,
            rentalDays: diffDays,
            quantity: newQty,
            rentalSubtotal: proposal.proposedSubtotal || request.quoteSnapshot.rentalSubtotal,
            securityDeposit: proposal.proposedDeposit || request.quoteSnapshot.securityDeposit,
            totalPayable: proposal.proposedTotal,
          },
        })
      }

      // Record event
      await tx.rentalRequestEvent.create({
        data: {
          requestId: request.id,
          actorId: user.id,
          actorName: user.name,
          actorType: 'RENTER',
          action: 'ACCEPT_PROPOSAL',
          fromStatus: 'CHANGE_REQUESTED',
          toStatus: 'PENDING_APPROVAL',
          reason: 'Customer accepted the proposed changes',
        },
      })

      return request
    })

    return NextResponse.json({
      success: true,
      message: 'Proposal accepted. Request is now pending admin final approval.',
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to accept proposal' }, { status: 400 })
  }
}
