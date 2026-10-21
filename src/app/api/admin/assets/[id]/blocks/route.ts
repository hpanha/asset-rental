import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const blocks = await db.assetBlockedInterval.findMany({
      where: { listingId: id },
      include: {
        unit: {
          select: { id: true, assetTag: true, serialNumber: true },
        },
      },
      orderBy: { startAt: 'desc' },
    })
    return NextResponse.json(blocks)
  } catch (error: any) {
    console.error('Error fetching blocks:', error)
    return NextResponse.json({ error: error.message || 'Failed to fetch blocks' }, { status: 500 })
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await req.json()
    const { unitId, startAt, endAt, reason, notes } = body

    if (!startAt || !endAt || !reason) {
      return NextResponse.json(
        { error: 'Start date, end date, and reason are required for a blocked interval.' },
        { status: 400 }
      )
    }

    const startDate = new Date(startAt)
    const endDate = new Date(endAt)

    if (endDate <= startDate) {
      return NextResponse.json(
        { error: 'End date/time must be strictly after start date/time.' },
        { status: 400 }
      )
    }

    const block = await db.$transaction(async (tx) => {
      const created = await tx.assetBlockedInterval.create({
        data: {
          listingId: id,
          unitId: unitId || null,
          startAt: startDate,
          endAt: endDate,
          reason,
          notes: notes || null,
          createdBy: 'Admin',
        },
        include: { unit: true },
      })

      // If applied to a specific unit, update unit to MAINTENANCE
      if (unitId) {
        await tx.assetUnit.update({
          where: { id: unitId },
          data: { baseStatus: 'MAINTENANCE' },
        })
      }

      await tx.assetAuditEvent.create({
        data: {
          listingId: id,
          entityType: 'INTERVAL',
          entityId: created.id,
          actorName: 'Admin',
          action: 'MAINTENANCE_BLOCK',
          afterJson: JSON.stringify({
            unitId: created.unitId,
            reason: created.reason,
            startAt: created.startAt,
            endAt: created.endAt,
          }),
        },
      })

      return created
    })

    return NextResponse.json({ success: true, block }, { status: 201 })
  } catch (error: any) {
    console.error('Error creating block:', error)
    return NextResponse.json({ error: error.message || 'Failed to create block' }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { searchParams } = new URL(req.url)
    const blockId = searchParams.get('blockId')

    if (!blockId) {
      return NextResponse.json({ error: 'blockId query parameter is required' }, { status: 400 })
    }

    const block = await db.assetBlockedInterval.findUnique({
      where: { id: blockId },
    })

    if (!block || block.listingId !== id) {
      return NextResponse.json({ error: 'Blocked interval not found' }, { status: 404 })
    }

    await db.$transaction(async (tx) => {
      await tx.assetBlockedInterval.delete({ where: { id: blockId } })

      // Check if unit has any other active blocked intervals; if not, restore to ACTIVE
      if (block.unitId) {
        const remainingBlocks = await tx.assetBlockedInterval.count({
          where: {
            unitId: block.unitId,
            endAt: { gte: new Date() },
          },
        })

        if (remainingBlocks === 0) {
          await tx.assetUnit.update({
            where: { id: block.unitId },
            data: { baseStatus: 'ACTIVE' },
          })
        }
      }

      await tx.assetAuditEvent.create({
        data: {
          listingId: id,
          entityType: 'INTERVAL',
          entityId: block.id,
          actorName: 'Admin',
          action: 'MAINTENANCE_REMOVE',
          afterJson: JSON.stringify({ reason: 'Maintenance block concluded or removed' }),
        },
      })
    })

    return NextResponse.json({ success: true, message: 'Blocked interval removed successfully' })
  } catch (error: any) {
    console.error('Error deleting block:', error)
    return NextResponse.json({ error: error.message || 'Failed to delete block' }, { status: 500 })
  }
}
