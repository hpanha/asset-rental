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
      expected_version,
      reason_code,
      public_reason,
      internal_notes,
      reviewer_name = 'Rental Manager',
    } = body

    if (!reason_code || !public_reason?.trim()) {
      return NextResponse.json(
        { error: 'Both reason code and a public explanation for the customer are required.' },
        { status: 400 }
      )
    }

    const result = await db.$transaction(async (tx) => {
      const request = await tx.rentalRequest.findFirst({
        where: {
          OR: [{ id }, { requestNo: id }],
        },
      })

      if (!request) {
        throw new Error('NOT_FOUND: Rental request not found')
      }

      if (['REJECTED', 'CANCELLED_BY_RENTER'].includes(request.status)) {
        throw new Error(`CONFLICT: Request is already ${request.status}`)
      }

      if (expected_version !== undefined && expected_version !== null) {
        if (request.version !== expected_version) {
          throw new Error('STALE_VERSION: Request was modified by another reviewer. Please refresh and review latest state.')
        }
      }

      // Release any active hold
      await tx.rentalInventoryHold.updateMany({
        where: { requestId: request.id, status: 'ACTIVE' },
        data: { status: 'RELEASED' },
      })

      // Create Decision
      await tx.rentalApprovalDecision.create({
        data: {
          requestId: request.id,
          reviewerId: 'admin-01',
          reviewerName: reviewer_name,
          decision: 'REJECT',
          reasonCode: reason_code,
          publicReason: public_reason.trim(),
          internalNotes: internal_notes ? internal_notes.trim() : null,
          requestVersion: request.version,
        },
      })

      // Update Request
      const updated = await tx.rentalRequest.update({
        where: { id: request.id },
        data: {
          status: 'REJECTED',
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
          action: 'REJECT',
          fromStatus: request.status,
          toStatus: 'REJECTED',
          reason: `[${reason_code}] ${public_reason.trim()}`,
        },
      })

      return updated
    })

    return NextResponse.json({
      success: true,
      request_id: result.id,
      request_no: result.requestNo,
      status: result.status,
      version: result.version,
      message: 'Rental request has been rejected.',
    })
  } catch (error: any) {
    const msg = error.message || 'Failed to reject rental request'
    console.error('Error rejecting rental request:', msg)

    const statusCode = msg.startsWith('NOT_FOUND')
      ? 404
      : msg.startsWith('CONFLICT') || msg.startsWith('STALE_VERSION')
      ? 409
      : 400

    return NextResponse.json({ error: msg }, { status: statusCode })
  }
}
