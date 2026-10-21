import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const listing = await db.assetListing.findUnique({ where: { id } })
    if (!listing) {
      return NextResponse.json({ error: 'Asset listing not found' }, { status: 404 })
    }

    const updated = await db.$transaction(async (tx) => {
      const res = await tx.assetListing.update({
        where: { id },
        data: {
          visibility: 'ARCHIVED',
          version: { increment: 1 },
        },
      })

      await tx.assetAuditEvent.create({
        data: {
          companyId: listing.companyId,
          listingId: listing.id,
          entityType: 'LISTING',
          entityId: listing.id,
          actorName: 'Admin',
          action: 'ARCHIVE',
          afterJson: JSON.stringify({ status: 'ARCHIVED' }),
        },
      })

      return res
    })

    return NextResponse.json({
      success: true,
      message: 'Asset archived safely. Historical rental records remain preserved.',
      listing: updated,
    })
  } catch (error: any) {
    console.error('Error archiving asset:', error)
    return NextResponse.json({ error: error.message || 'Failed to archive asset' }, { status: 500 })
  }
}
