import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const filter = searchParams.get('filter') || 'ALL'
    const search = searchParams.get('search')?.trim().toLowerCase() || ''

    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)

    const whereClause: any = {
      status: { in: ['ACTIVE', 'RETURN_REQUESTED', 'RETURN_SCHEDULED'] },
    }

    if (filter === 'OVERDUE') {
      whereClause.endAt = { lt: now }
    } else if (filter === 'DUE_TODAY') {
      whereClause.endAt = { gte: todayStart, lte: todayEnd }
    } else if (filter === 'EXTENSIONS') {
      whereClause.extensions = { some: { status: 'PENDING' } }
    } else if (filter === 'INCIDENTS') {
      whereClause.incidents = { some: { status: 'OPEN' } }
    }

    if (search) {
      whereClause.OR = [
        { bookingNo: { contains: search } },
        { request: { requestNo: { contains: search } } },
        { request: { contactName: { contains: search } } },
        { request: { contactPhone: { contains: search } } },
      ]
    }

    const rentals = await db.rentalReservation.findMany({
      where: whereClause,
      include: {
        request: {
          include: {
            renter: { select: { id: true, name: true, email: true, phone: true } },
            listing: { select: { id: true, name: true, code: true, coverImage: true } },
            paymentOrder: { include: { receipt: true } },
            pickupLocation: true,
          },
        },
        lines: {
          include: {
            unitAllocations: {
              include: { unit: true },
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
        location: true,
      },
      orderBy: { endAt: 'asc' },
    })

    // Compute metrics
    const [allActiveCount, dueTodayCount, overdueCount, pendingExtCount, openIncCount] = await Promise.all([
      db.rentalReservation.count({
        where: { status: { in: ['ACTIVE', 'RETURN_REQUESTED', 'RETURN_SCHEDULED'] } },
      }),
      db.rentalReservation.count({
        where: {
          status: { in: ['ACTIVE', 'RETURN_REQUESTED', 'RETURN_SCHEDULED'] },
          endAt: { gte: todayStart, lte: todayEnd },
        },
      }),
      db.rentalReservation.count({
        where: {
          status: { in: ['ACTIVE', 'RETURN_REQUESTED', 'RETURN_SCHEDULED'] },
          endAt: { lt: now },
        },
      }),
      db.rentalExtensionRequest.count({ where: { status: 'PENDING' } }),
      db.rentalIncident.count({ where: { status: 'OPEN' } }),
    ])

    const formatted = rentals.map((r) => {
      const isOverdue = now > new Date(r.endAt)
      const diffMs = new Date(r.endAt).getTime() - now.getTime()
      const hoursRemaining = Math.round(diffMs / (1000 * 60 * 60))

      return {
        ...r,
        is_overdue: isOverdue,
        hours_remaining: hoursRemaining,
        pending_extension: r.extensions.find((e) => e.status === 'PENDING') || null,
        open_incidents: r.incidents.filter((i) => i.status === 'OPEN'),
      }
    })

    return NextResponse.json({
      rentals: formatted,
      metrics: {
        total_active: allActiveCount,
        due_today: dueTodayCount,
        overdue: overdueCount,
        pending_extensions: pendingExtCount,
        open_incidents: openIncCount,
      },
    })
  } catch (error: any) {
    console.error('Error fetching admin active rentals:', error)
    return NextResponse.json({ error: error.message || 'Failed to fetch active rentals' }, { status: 500 })
  }
}
