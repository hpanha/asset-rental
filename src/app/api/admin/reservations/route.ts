import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status') || 'ALL'
    const search = searchParams.get('search')?.trim().toLowerCase() || ''
    const pickupDate = searchParams.get('pickupDate')

    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)

    const whereClause: any = {}

    if (status === 'PICKUP_TODAY') {
      whereClause.startAt = {
        gte: todayStart,
        lte: todayEnd,
      }
      whereClause.status = { in: ['RESERVED', 'READY_FOR_HANDOVER'] }
    } else if (status !== 'ALL') {
      whereClause.status = status
    }

    if (pickupDate) {
      const pDate = new Date(pickupDate)
      const pStart = new Date(pDate.getFullYear(), pDate.getMonth(), pDate.getDate())
      const pEnd = new Date(pDate.getFullYear(), pDate.getMonth(), pDate.getDate(), 23, 59, 59, 999)
      whereClause.startAt = { gte: pStart, lte: pEnd }
    }

    if (search) {
      whereClause.OR = [
        { bookingNo: { contains: search } },
        { request: { requestNo: { contains: search } } },
        { request: { contactName: { contains: search } } },
        { request: { contactPhone: { contains: search } } },
        {
          lines: {
            some: {
              unitAllocations: {
                some: {
                  unit: {
                    OR: [
                      { assetTag: { contains: search } },
                      { serialNumber: { contains: search } },
                    ],
                  },
                },
              },
            },
          },
        },
      ]
    }

    const reservations = await db.rentalReservation.findMany({
      where: whereClause,
      include: {
        request: {
          include: {
            renter: { select: { id: true, name: true, email: true, phone: true } },
            listing: {
              select: { id: true, code: true, name: true, slug: true, coverImage: true, category: true },
            },
            quoteSnapshot: true,
            paymentOrder: {
              include: { receipt: true },
            },
            pickupLocation: true,
            deliveryAddress: true,
          },
        },
        lines: {
          include: {
            listing: { select: { id: true, code: true, name: true, coverImage: true } },
            unitAllocations: {
              include: {
                unit: {
                  select: {
                    id: true,
                    assetTag: true,
                    serialNumber: true,
                    conditionGrade: true,
                    accessories: true,
                    baseStatus: true,
                  },
                },
              },
            },
            poolAllocations: true,
          },
        },
        fulfillmentTask: true,
        location: true,
      },
      orderBy: { startAt: 'asc' },
    })

    // Compute status counts for admin tabs
    const [reservedCount, readyCount, pickupTodayCount, activeCount, totalCount] = await Promise.all([
      db.rentalReservation.count({ where: { status: 'RESERVED' } }),
      db.rentalReservation.count({ where: { status: 'READY_FOR_HANDOVER' } }),
      db.rentalReservation.count({
        where: {
          startAt: { gte: todayStart, lte: todayEnd },
          status: { in: ['RESERVED', 'READY_FOR_HANDOVER'] },
        },
      }),
      db.rentalReservation.count({ where: { status: 'ACTIVE' } }),
      db.rentalReservation.count(),
    ])

    return NextResponse.json({
      reservations,
      counts: {
        reserved: reservedCount,
        ready_for_handover: readyCount,
        pickup_today: pickupTodayCount,
        active: activeCount,
        total: totalCount,
      },
    })
  } catch (error: any) {
    console.error('Error fetching admin reservations:', error)
    return NextResponse.json({ error: error.message || 'Failed to fetch reservations' }, { status: 500 })
  }
}
