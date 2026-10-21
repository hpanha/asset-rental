import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; unitId: string }> }
) {
  try {
    const { id, unitId } = await params
    const body = await req.json()

    const currentUnit = await db.assetUnit.findUnique({
      where: { id: unitId },
      include: { listing: true },
    })

    if (!currentUnit || currentUnit.listingId !== id) {
      return NextResponse.json({ error: 'Physical unit not found' }, { status: 404 })
    }

    const {
      assetTag,
      serialNumber,
      locationId,
      baseStatus,
      conditionGrade,
      accessories,
      purchaseCost,
      notes,
    } = body

    if (assetTag && assetTag !== currentUnit.assetTag) {
      const existing = await db.assetUnit.findUnique({ where: { assetTag } })
      if (existing) {
        return NextResponse.json(
          { error: `Asset tag "${assetTag}" is already registered to another item.` },
          { status: 400 }
        )
      }
    }

    const updated = await db.$transaction(async (tx) => {
      const u = await tx.assetUnit.update({
        where: { id: unitId },
        data: {
          ...(assetTag ? { assetTag } : {}),
          ...(serialNumber !== undefined ? { serialNumber } : {}),
          ...(locationId ? { locationId } : {}),
          ...(baseStatus ? { baseStatus } : {}),
          ...(conditionGrade ? { conditionGrade } : {}),
          ...(accessories !== undefined ? { accessories } : {}),
          ...(purchaseCost !== undefined ? { purchaseCost: purchaseCost ? Number(purchaseCost) : null } : {}),
          ...(notes !== undefined ? { notes } : {}),
        },
        include: { location: true },
      })

      // If unit status changed to MAINTENANCE and reason provided, add a blocked interval
      if (baseStatus === 'MAINTENANCE' && currentUnit.baseStatus !== 'MAINTENANCE') {
        const start = new Date()
        const end = new Date()
        end.setDate(end.getDate() + (Number(body.maintenanceDays) || 7))

        await tx.assetBlockedInterval.create({
          data: {
            listingId: id,
            unitId: u.id,
            startAt: start,
            endAt: end,
            reason: body.maintenanceReason || 'Unit marked for inspection/maintenance',
            notes: body.notes || 'Status updated by admin',
            createdBy: 'Admin',
          },
        })
      }

      await tx.assetAuditEvent.create({
        data: {
          listingId: id,
          entityType: 'UNIT',
          entityId: u.id,
          actorName: 'Admin',
          action: baseStatus && baseStatus !== currentUnit.baseStatus ? `STATUS_${baseStatus}` : 'UPDATE',
          beforeJson: JSON.stringify({
            baseStatus: currentUnit.baseStatus,
            conditionGrade: currentUnit.conditionGrade,
          }),
          afterJson: JSON.stringify({
            baseStatus: u.baseStatus,
            conditionGrade: u.conditionGrade,
          }),
        },
      })

      return u
    })

    return NextResponse.json({ success: true, unit: updated })
  } catch (error: any) {
    console.error('Error updating unit:', error)
    return NextResponse.json({ error: error.message || 'Failed to update unit' }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; unitId: string }> }
) {
  try {
    const { id, unitId } = await params

    const unit = await db.assetUnit.findUnique({
      where: { id: unitId },
      include: {
        _count: { select: { bookings: true } },
      },
    })

    if (!unit || unit.listingId !== id) {
      return NextResponse.json({ error: 'Physical unit not found' }, { status: 404 })
    }

    if (unit._count.bookings > 0) {
      // Mark as RETIRED instead of deleting
      await db.assetUnit.update({
        where: { id: unitId },
        data: { baseStatus: 'RETIRED' },
      })

      await db.assetAuditEvent.create({
        data: {
          listingId: id,
          entityType: 'UNIT',
          entityId: unit.id,
          actorName: 'Admin',
          action: 'RETIRE',
          afterJson: JSON.stringify({ reason: 'Unit has rental history; marked as RETIRED.' }),
        },
      })

      return NextResponse.json({
        success: true,
        message: 'Unit has historical booking data and was safely marked as RETIRED.',
      })
    }

    await db.assetUnit.delete({ where: { id: unitId } })

    return NextResponse.json({ success: true, message: 'Physical unit deleted successfully' })
  } catch (error: any) {
    console.error('Error deleting unit:', error)
    return NextResponse.json({ error: error.message || 'Failed to delete unit' }, { status: 500 })
  }
}
