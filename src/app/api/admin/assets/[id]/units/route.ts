import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const units = await db.assetUnit.findMany({
      where: { listingId: id },
      include: {
        location: true,
        blockedIntervals: {
          where: { endAt: { gte: new Date() } },
        },
      },
      orderBy: { assetTag: 'asc' },
    })
    return NextResponse.json(units)
  } catch (error: any) {
    console.error('Error fetching units:', error)
    return NextResponse.json({ error: error.message || 'Failed to fetch units' }, { status: 500 })
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await req.json()
    const {
      assetTag,
      serialNumber,
      locationId,
      baseStatus = 'ACTIVE',
      conditionGrade = 'GOOD',
      accessories,
      purchaseCost,
      notes,
    } = body

    if (!assetTag || !locationId) {
      return NextResponse.json(
        { error: 'Asset Tag and Physical Location are required.' },
        { status: 400 }
      )
    }

    // Check unique tag
    const existing = await db.assetUnit.findUnique({
      where: { assetTag },
    })
    if (existing) {
      return NextResponse.json(
        { error: `Asset Tag "${assetTag}" already exists in the system. Asset tags must be unique.` },
        { status: 400 }
      )
    }

    const unit = await db.$transaction(async (tx) => {
      const created = await tx.assetUnit.create({
        data: {
          listingId: id,
          assetTag,
          serialNumber: serialNumber || null,
          locationId,
          baseStatus,
          conditionGrade,
          accessories: accessories || null,
          purchaseCost: purchaseCost ? Number(purchaseCost) : null,
          notes: notes || null,
        },
        include: { location: true },
      })

      await tx.assetAuditEvent.create({
        data: {
          listingId: id,
          entityType: 'UNIT',
          entityId: created.id,
          actorName: 'Admin',
          action: 'CREATE',
          afterJson: JSON.stringify({
            assetTag: created.assetTag,
            serialNumber: created.serialNumber,
            conditionGrade: created.conditionGrade,
            baseStatus: created.baseStatus,
          }),
        },
      })

      return created
    })

    return NextResponse.json({ success: true, unit }, { status: 201 })
  } catch (error: any) {
    console.error('Error creating unit:', error)
    return NextResponse.json({ error: error.message || 'Failed to create unit' }, { status: 500 })
  }
}
