import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { blockId, unitId, listingId } = body

    if (!blockId && !unitId) {
      return NextResponse.json({ error: 'blockId or unitId is required to restore item' }, { status: 400 })
    }

    await db.$transaction(async (tx) => {
      // If blockId is provided, delete or conclude the blocked interval
      if (blockId) {
        await tx.assetBlockedInterval.deleteMany({
          where: { id: blockId },
        })
      }

      // If unitId is provided, restore baseStatus back to ACTIVE
      if (unitId) {
        await tx.assetUnit.update({
          where: { id: unitId },
          data: { baseStatus: 'ACTIVE' },
        })

        // Also clean up any active blocked intervals specifically for this unit
        await tx.assetBlockedInterval.deleteMany({
          where: { unitId },
        })

        await tx.assetAuditEvent.create({
          data: {
            listingId: listingId || null,
            entityType: 'UNIT',
            entityId: unitId,
            actorName: 'Admin',
            action: 'STATUS_ACTIVE',
            afterJson: JSON.stringify({
              baseStatus: 'ACTIVE',
              reason: 'Restored from maintenance/archive back to operational inventory',
            }),
          },
        })
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Item restored back to active operational inventory!',
    })
  } catch (error: any) {
    console.error('Error restoring maintenance item:', error)
    return NextResponse.json({ error: error.message || 'Failed to restore item' }, { status: 500 })
  }
}
