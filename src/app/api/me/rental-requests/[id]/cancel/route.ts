import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    let reason = 'Cancelled by renter'
    try {
      const body = await req.json()
      if (body.reason && typeof body.reason === 'string') {
        reason = body.reason.trim()
      }
    } catch {
      // body optional
    }

    const request = await db.rentalRequest.findFirst({
      where: {
        OR: [{ id }, { requestNo: id }],
        renterId: user.id,
      },
    })

    if (!request) {
      return NextResponse.json({ error: 'Rental request not found.' }, { status: 404 })
    }

    if (request.status !== 'PENDING_APPROVAL') {
      return NextResponse.json(
        {
          error: `Cannot cancel request in status "${request.status}". Only requests pending review can be cancelled by renter.`,
        },
        { status: 400 }
      )
    }

    await db.$transaction(async (tx) => {
      await tx.rentalRequest.update({
        where: { id: request.id },
        data: {
          status: 'CANCELLED_BY_RENTER',
        },
      })

      await tx.rentalRequestEvent.create({
        data: {
          requestId: request.id,
          actorId: user.id,
          actorName: user.name || 'Renter',
          actorType: 'RENTER',
          action: 'CANCEL',
          fromStatus: 'PENDING_APPROVAL',
          toStatus: 'CANCELLED_BY_RENTER',
          reason: reason.slice(0, 500),
        },
      })
    })

    return NextResponse.json({
      success: true,
      message: 'Rental request has been cancelled.',
    })
  } catch (error: any) {
    console.error('Error cancelling rental request:', error)
    return NextResponse.json({ error: error.message || 'Failed to cancel request' }, { status: 500 })
  }
}
