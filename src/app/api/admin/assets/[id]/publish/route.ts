import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { validateForPublish } from '@/lib/types'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const listing = await db.assetListing.findUnique({
      where: { id },
      include: {
        category: true,
        brand: true,
        rates: true,
        rentalPolicy: true,
        locationOptions: { include: { location: true } },
        units: true,
        blockedIntervals: true,
        auditEvents: true,
      },
    })

    if (!listing) {
      return NextResponse.json({ error: 'Asset listing not found' }, { status: 404 })
    }

    // Prepare data for validator
    let parsedSpecs: Record<string, string> = {}
    try {
      parsedSpecs = listing.specifications ? JSON.parse(listing.specifications) : {}
    } catch {
      parsedSpecs = {}
    }

    let parsedImages: string[] = []
    try {
      parsedImages = listing.images ? JSON.parse(listing.images) : []
    } catch {
      parsedImages = []
    }

    const listingDetail: any = {
      ...listing,
      specifications: parsedSpecs,
      images: parsedImages,
    }

    const validation = validateForPublish(listingDetail)

    if (!validation.canPublish) {
      return NextResponse.json(
        {
          error: 'Validation failed: Asset listing does not meet publication criteria.',
          validation,
        },
        { status: 422 }
      )
    }

    const updated = await db.$transaction(async (tx) => {
      const res = await tx.assetListing.update({
        where: { id },
        data: {
          visibility: 'PUBLISHED',
          publishedAt: new Date(),
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
          action: 'PUBLISH',
          afterJson: JSON.stringify({
            status: 'PUBLISHED',
            publishedAt: new Date().toISOString(),
          }),
        },
      })

      return res
    })

    return NextResponse.json({
      success: true,
      message: 'Asset successfully validated and published to the public catalog!',
      listing: updated,
      validation,
    })
  } catch (error: any) {
    console.error('Error publishing asset:', error)
    return NextResponse.json({ error: error.message || 'Failed to publish asset' }, { status: 500 })
  }
}
