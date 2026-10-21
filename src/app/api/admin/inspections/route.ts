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

    const inspections = await db.rentalInspection.findMany({
      where: whereClause,
      include: {
        reservation: {
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
            handover: true,
            returnCase: {
              include: { receipt: true },
            },
            settlement: true,
            evidence: true,
          },
        },
        items: true,
      },
      orderBy: { startedAt: 'desc' },
    })

    const [inProgressCount, completedCount, totalCount] = await Promise.all([
      db.rentalInspection.count({ where: { status: 'IN_PROGRESS' } }),
      db.rentalInspection.count({ where: { status: 'COMPLETED' } }),
      db.rentalInspection.count(),
    ])

    return NextResponse.json({
      inspections,
      counts: {
        in_progress: inProgressCount,
        completed: completedCount,
        total: totalCount,
      },
    })
  } catch (error: any) {
    console.error('Error fetching inspections queue:', error)
    return NextResponse.json({ error: error.message || 'Failed to fetch inspections' }, { status: 500 })
  }
}
