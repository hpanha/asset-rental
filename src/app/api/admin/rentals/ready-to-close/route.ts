import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status') || 'READY_TO_CLOSE'
    const search = searchParams.get('search')?.trim().toLowerCase() || ''

    const whereClause: any = {}

    if (status === 'READY_TO_CLOSE') {
      whereClause.status = 'SETTLED'
    } else if (status === 'COMPLETED') {
      whereClause.status = 'COMPLETED'
    } else if (status !== 'ALL') {
      whereClause.status = status
    }

    if (search) {
      whereClause.OR = [
        { bookingNo: { contains: search } },
        { request: { requestNo: { contains: search } } },
        { request: { contactName: { contains: search } } },
      ]
    }

    const reservations = await db.rentalReservation.findMany({
      where: whereClause,
      include: {
        request: {
          include: {
            listing: true,
            paymentOrder: { include: { receipt: true } },
            depositLedger: true,
          },
        },
        lines: {
          include: {
            unitAllocations: {
              include: { unit: true },
            },
          },
        },
        inspection: {
          include: { items: true },
        },
        settlement: true,
        closure: true,
      },
      orderBy: { updatedAt: 'desc' },
    })

    const [readyCount, completedCount, totalCount] = await Promise.all([
      db.rentalReservation.count({ where: { status: 'SETTLED' } }),
      db.rentalReservation.count({ where: { status: 'COMPLETED' } }),
      db.rentalReservation.count(),
    ])

    return NextResponse.json({
      reservations,
      counts: {
        ready_to_close: readyCount,
        completed: completedCount,
        total: totalCount,
      },
    })
  } catch (error: any) {
    console.error('Error fetching ready-to-close queue:', error)
    return NextResponse.json({ error: error.message || 'Failed to fetch closeout queue' }, { status: 500 })
  }
}
