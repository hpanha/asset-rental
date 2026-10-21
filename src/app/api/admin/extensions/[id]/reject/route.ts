import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await req.json().catch(() => ({}))
    const { reason = 'Upcoming reservation conflict', reviewerName = 'Operations Lead' } = body

    const extension = await db.rentalExtensionRequest.findUnique({
      where: { id },
    })

    if (!extension) {
      return NextResponse.json({ error: 'Extension not found' }, { status: 404 })
    }

    await db.rentalExtensionRequest.update({
      where: { id },
      data: {
        status: 'REJECTED',
        rejectReason: reason,
        decidedAt: new Date(),
        decidedBy: reviewerName,
      },
    })

    await db.rentalReservationEvent.create({
      data: {
        reservationId: extension.reservationId,
        actorName: reviewerName,
        actorRole: 'ADMIN',
        action: 'EXTENSION_REJECTED',
        fromStatus: 'ACTIVE',
        toStatus: 'ACTIVE',
        notes: `Extension rejected. Reason: ${reason}`,
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Extension rejected. Original return due date remains in effect.',
    })
  } catch (error: any) {
    console.error('Error rejecting extension:', error)
    return NextResponse.json({ error: error.message || 'Failed to reject extension' }, { status: 500 })
  }
}
