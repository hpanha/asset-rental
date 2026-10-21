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

    await db.$transaction(async (tx) => {
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
        },
      })

      if (!request) throw new Error('Rental request not found')

      const proposal = request.changeProposals[0]
      if (proposal) {
        await tx.rentalChangeProposal.update({
          where: { id: proposal.id },
          data: { status: 'DECLINED' },
        })
      }

      await tx.rentalRequest.update({
        where: { id: request.id },
        data: {
          status: 'CANCELLED_BY_RENTER',
          version: request.version + 1,
        },
      })

      await tx.rentalRequestEvent.create({
        data: {
          requestId: request.id,
          actorId: user.id,
          actorName: user.name,
          actorType: 'RENTER',
          action: 'DECLINE_PROPOSAL',
          fromStatus: 'CHANGE_REQUESTED',
          toStatus: 'CANCELLED_BY_RENTER',
          reason: 'Customer declined the proposed changes and cancelled request',
        },
      })
    })

    return NextResponse.json({
      success: true,
      message: 'Proposal declined and request cancelled.',
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to decline proposal' }, { status: 400 })
  }
}
