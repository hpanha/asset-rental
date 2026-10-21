import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status') || 'ALL'
    const search = searchParams.get('search')?.trim().toLowerCase() || ''

    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)

    const whereClause: any = {}

    if (status === 'READY') {
      whereClause.status = 'READY_FOR_HANDOVER'
    } else if (status === 'TODAY') {
      whereClause.startAt = { gte: todayStart, lte: todayEnd }
      whereClause.status = { in: ['RESERVED', 'READY_FOR_HANDOVER'] }
    } else if (status === 'ACTIVE') {
      whereClause.status = 'ACTIVE'
    } else if (status !== 'ALL') {
      whereClause.status = status
    } else {
      whereClause.status = { in: ['RESERVED', 'READY_FOR_HANDOVER', 'ACTIVE'] }
    }

    if (search) {
      whereClause.OR = [
        { bookingNo: { contains: search } },
        { request: { requestNo: { contains: search } } },
        { request: { contactName: { contains: search } } },
        { request: { contactPhone: { contains: search } } },
      ]
    }

    const reservations = await db.rentalReservation.findMany({
      where: whereClause,
      include: {
        request: {
          include: {
            renter: { select: { id: true, name: true, email: true, phone: true } },
            listing: { select: { id: true, name: true, code: true, coverImage: true } },
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
        fulfillmentTask: true,
        handover: {
          include: { items: true },
        },
        location: true,
      },
      orderBy: { startAt: 'asc' },
    })

    const [todayCount, readyCount, activeCount, totalCount] = await Promise.all([
      db.rentalReservation.count({
        where: {
          startAt: { gte: todayStart, lte: todayEnd },
          status: { in: ['RESERVED', 'READY_FOR_HANDOVER'] },
        },
      }),
      db.rentalReservation.count({ where: { status: 'READY_FOR_HANDOVER' } }),
      db.rentalReservation.count({ where: { status: 'ACTIVE' } }),
      db.rentalReservation.count({
        where: { status: { in: ['RESERVED', 'READY_FOR_HANDOVER', 'ACTIVE'] } },
      }),
    ])

    return NextResponse.json({
      handovers: reservations,
      counts: {
        today: todayCount,
        ready: readyCount,
        active: activeCount,
        total: totalCount,
      },
    })
  } catch (error: any) {
    console.error('Error fetching handovers queue:', error)
    return NextResponse.json({ error: error.message || 'Failed to fetch handovers' }, { status: 500 })
  }
}
