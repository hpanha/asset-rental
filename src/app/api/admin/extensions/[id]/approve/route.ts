import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await req.json().catch(() => ({}))
    const { reviewerName = 'Operations Manager' } = body

    const extension = await db.rentalExtensionRequest.findUnique({
      where: { id },
      include: {
        reservation: {
          include: {
            lines: {
              include: { unitAllocations: true },
            },
            request: true,
          },
        },
      },
    })

    if (!extension) {
      return NextResponse.json({ error: 'Extension request not found' }, { status: 404 })
    }

    if (extension.status !== 'PENDING') {
      return NextResponse.json(
        { error: `Extension request is already in status ${extension.status}` },
        { status: 400 }
      )
    }

    const newEnd = extension.requestedEndAt
    const reservation = extension.reservation

    // Atomically commit new dates
    await db.$transaction(async (tx) => {
      // 1. Mark extension approved
      await tx.rentalExtensionRequest.update({
        where: { id: extension.id },
        data: {
          status: 'APPROVED',
          decidedAt: new Date(),
          decidedBy: reviewerName,
        },
      })

      // 2. Extend reservation end date
      await tx.rentalReservation.update({
        where: { id: reservation.id },
        data: {
          endAt: newEnd,
          version: reservation.version + 1,
        },
      })

      // 3. Extend all unit allocations
      for (const line of reservation.lines) {
        for (const alloc of line.unitAllocations) {
          await tx.rentalUnitAllocation.update({
            where: { id: alloc.id },
            data: {
              endAt: newEnd,
            },
          })
        }
      }

      // 4. Extend request end date
      await tx.rentalRequest.update({
        where: { id: reservation.requestId },
        data: {
          endAt: newEnd,
          rentalDays: reservation.request.rentalDays + extension.additionalDays,
        },
      })

      // 5. Audit event
      await tx.rentalReservationEvent.create({
        data: {
          reservationId: reservation.id,
          actorName: reviewerName,
          actorRole: 'ADMIN',
          action: 'EXTENSION_APPROVED',
          fromStatus: reservation.status,
          toStatus: reservation.status,
          notes: `Extension approved (+${extension.additionalDays}d). New return due date: ${newEnd.toLocaleString()}`,
        },
      })
    })

    return NextResponse.json({
      success: true,
      message: 'Extension approved and inventory commitment dates updated.',
      newDueAt: newEnd.toISOString(),
    })
  } catch (error: any) {
    console.error('Error approving extension:', error)
    return NextResponse.json({ error: error.message || 'Failed to approve extension' }, { status: 500 })
  }
}
