import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const entityType = searchParams.get('entityType')
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const pageSize = Math.max(1, Math.min(100, parseInt(searchParams.get('pageSize') || '25', 10)))

    const where: any = {}
    if (entityType && entityType !== 'all') {
      where.entityType = entityType
    }

    const [total, events] = await Promise.all([
      db.assetAuditEvent.count({ where }),
      db.assetAuditEvent.findMany({
        where,
        include: {
          listing: {
            select: { id: true, name: true, code: true, coverImage: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ])

    return NextResponse.json({
      items: events,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    })
  } catch (error: any) {
    console.error('Error fetching audit trail:', error)
    return NextResponse.json({ error: error.message || 'Failed to fetch audit events' }, { status: 500 })
  }
}
