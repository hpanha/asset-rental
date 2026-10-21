import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status') || 'ALL'
    const search = searchParams.get('search')?.trim().toLowerCase() || ''

    const whereClause: any = {}

    if (status !== 'ALL') {
      whereClause.status = status
    }

    if (search) {
      whereClause.OR = [
        { reservation: { bookingNo: { contains: search } } },
        { reservation: { request: { contactName: { contains: search } } } },
        { reservation: { request: { requestNo: { contains: search } } } },
      ]
    }

    const returnCases = await db.rentalReturnCase.findMany({
      where: whereClause,
      include: {
        reservation: {
          include: {
            request: {
              include: {
                listing: true,
                paymentOrder: { include: { receipt: true } },
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
            location: true,
          },
        },
        receipt: true,
      },
      orderBy: { scheduledAt: 'desc' },
    })

    const [scheduledCount, awaitingInspCount, totalCount] = await Promise.all([
      db.rentalReturnCase.count({ where: { status: 'SCHEDULED' } }),
      db.rentalReturnCase.count({ where: { status: 'AWAITING_INSPECTION' } }),
      db.rentalReturnCase.count(),
    ])

    return NextResponse.json({
      returnCases,
      counts: {
        scheduled: scheduledCount,
        awaiting_inspection: awaitingInspCount,
        total: totalCount,
      },
    })
  } catch (error: any) {
    console.error('Error fetching admin returns:', error)
    return NextResponse.json({ error: error.message || 'Failed to fetch returns' }, { status: 500 })
  }
}
