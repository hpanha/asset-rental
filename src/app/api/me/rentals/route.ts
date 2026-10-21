import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status') || 'ACTIVE'

    const now = new Date()

    const whereClause: any = {
      renterId: user.id,
    }

    if (status === 'ACTIVE') {
      whereClause.status = { in: ['ACTIVE', 'RETURN_REQUESTED', 'RETURN_SCHEDULED'] }
    } else if (status !== 'ALL') {
      whereClause.status = status
    }

    const reservations = await db.rentalReservation.findMany({
      where: whereClause,
      include: {
        request: {
          include: {
            listing: { select: { id: true, name: true, code: true, coverImage: true, category: true } },
            paymentOrder: { include: { receipt: true } },
            pickupLocation: true,
            deliveryAddress: true,
          },
        },
        lines: {
          include: {
            unitAllocations: {
              include: {
                unit: { select: { id: true, assetTag: true, conditionGrade: true, accessories: true } },
              },
            },
          },
        },
        handover: true,
        extensions: {
          orderBy: { requestedAt: 'desc' },
        },
        incidents: {
          orderBy: { reportedAt: 'desc' },
        },
        returnCase: true,
        location: true,
      },
      orderBy: { startAt: 'desc' },
    })

    const formatted = reservations.map((res) => {
      const dueAt = new Date(res.endAt)
      const isOverdue = now > dueAt && res.status === 'ACTIVE'
      const remainingSeconds = Math.max(0, Math.floor((dueAt.getTime() - now.getTime()) / 1000))

      return {
        id: res.id,
        booking_no: res.bookingNo,
        request_id: res.requestId,
        status: res.status,
        is_overdue: isOverdue,
        remaining_seconds: remainingSeconds,
        start_at: res.startAt,
        end_at: res.endAt,
        handover_at: res.handover?.handoverAt || null,
        asset: {
          id: res.request.listing.id,
          name: res.request.listing.name,
          code: res.request.listing.code,
          category: res.request.listing.category?.name,
          cover_image: res.request.listing.coverImage,
          quantity: res.request.quantity,
          allocated_units: res.lines[0]?.unitAllocations.map((a) => a.unit.assetTag) || [],
        },
        location: res.location?.name || res.request.pickupLocation?.name || 'Main Facility',
        payment: {
          total_paid: res.request.paymentOrder?.totalDue,
          deposit_held: res.request.paymentOrder?.depositAmount,
          receipt_no: res.request.paymentOrder?.receipt?.receiptNo,
        },
        active_extension: res.extensions.find((e) => e.status === 'PENDING') || null,
        open_incidents_count: res.incidents.filter((i) => i.status === 'OPEN').length,
        has_return_case: Boolean(res.returnCase),
      }
    })

    return NextResponse.json({ rentals: formatted })
  } catch (error: any) {
    console.error('Error fetching active rentals:', error)
    return NextResponse.json({ error: error.message || 'Failed to fetch active rentals' }, { status: 500 })
  }
}
