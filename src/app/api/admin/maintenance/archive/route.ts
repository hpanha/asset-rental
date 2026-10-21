import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { blockId, unitId, listingId } = body

    if (!blockId && !unitId) {
      return NextResponse.json({ error: 'blockId or unitId is required to archive item' }, { status: 400 })
    }

    await db.$transaction(async (tx) => {
      // If unitId is provided, set baseStatus to RETIRED (Archived)
      if (unitId) {
        await tx.assetUnit.update({
          where: { id: unitId },
          data: { baseStatus: 'RETIRED' },
        })

        await tx.assetAuditEvent.create({
          data: {
            listingId: listingId || null,
            entityType: 'UNIT',
            entityId: unitId,
            actorName: 'Admin',
            action: 'RETIRE',
            afterJson: JSON.stringify({
              baseStatus: 'RETIRED',
              reason: 'Archived via Maintenance Management',
            }),
          },
        })
      }

      // If blockId is provided without unit, delete or archive the block
      if (blockId && !unitId) {
        await tx.assetBlockedInterval.deleteMany({
          where: { id: blockId },
        })
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Item archived safely.',
    })
  } catch (error: any) {
    console.error('Error archiving maintenance item:', error)
    return NextResponse.json({ error: error.message || 'Failed to archive item' }, { status: 500 })
  }
}
