import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const source = await db.assetListing.findUnique({
      where: { id },
      include: {
        rates: true,
        rentalPolicy: true,
        locationOptions: true,
      },
    })

    if (!source) {
      return NextResponse.json({ error: 'Source asset listing not found' }, { status: 404 })
    }

    const randomSuffix = Math.floor(1000 + Math.random() * 9000).toString()
    const newCode = `${source.code}-COPY-${randomSuffix}`
    const newSlug = `${source.slug}-copy-${randomSuffix}`
    const newName = `${source.name} (Copy)`

    const duplicated = await db.$transaction(async (tx) => {
      const listing = await tx.assetListing.create({
        data: {
          companyId: source.companyId,
          code: newCode,
          name: newName,
          slug: newSlug,
          categoryId: source.categoryId,
          brandId: source.brandId,
          model: source.model,
          shortDescription: source.shortDescription,
          description: source.description,
          specifications: source.specifications,
          trackingMode: source.trackingMode,
          coverImage: source.coverImage,
          images: source.images,
          allowDelivery: source.allowDelivery,
          deliveryFee: source.deliveryFee,
          visibility: 'DRAFT',
        },
      })

      // Duplicate rates
      for (const r of source.rates) {
        await tx.assetRate.create({
          data: {
            listingId: listing.id,
            currency: r.currency,
            billingUnit: r.billingUnit,
            rateAmount: r.rateAmount,
            isPrimary: r.isPrimary,
          },
        })
      }

      // Duplicate policy
      if (source.rentalPolicy) {
        await tx.assetRentalPolicy.create({
          data: {
            listingId: listing.id,
            securityDeposit: source.rentalPolicy.securityDeposit,
            minimumDuration: source.rentalPolicy.minimumDuration,
            minimumDurationUnit: source.rentalPolicy.minimumDurationUnit,
            maximumDuration: source.rentalPolicy.maximumDuration,
            lateFeeAmount: source.rentalPolicy.lateFeeAmount,
            lateFeeUnit: source.rentalPolicy.lateFeeUnit,
            lateGraceMinutes: source.rentalPolicy.lateGraceMinutes,
            minAdvanceNoticeMinutes: source.rentalPolicy.minAdvanceNoticeMinutes,
            preparationBufferMinutes: source.rentalPolicy.preparationBufferMinutes,
            returnBufferMinutes: source.rentalPolicy.returnBufferMinutes,
            allowedPickupWeekdays: source.rentalPolicy.allowedPickupWeekdays,
            termsTemplate: source.rentalPolicy.termsTemplate,
          },
        })
      }

      // Duplicate location options
      for (const loc of source.locationOptions) {
        await tx.assetLocationOption.create({
          data: {
            listingId: listing.id,
            locationId: loc.locationId,
            pickupEnabled: loc.pickupEnabled,
            returnEnabled: loc.returnEnabled,
          },
        })
      }

      await tx.assetAuditEvent.create({
        data: {
          companyId: listing.companyId,
          listingId: listing.id,
          entityType: 'LISTING',
          entityId: listing.id,
          actorName: 'Admin',
          action: 'CREATE',
          afterJson: JSON.stringify({
            duplicatedFrom: source.code,
            newCode: listing.code,
          }),
        },
      })

      return listing
    })

    return NextResponse.json({
      success: true,
      message: 'Asset duplicated as Draft. Physical units must be registered for the new copy.',
      listing: duplicated,
    })
  } catch (error: any) {
    console.error('Error duplicating asset:', error)
    return NextResponse.json({ error: error.message || 'Failed to duplicate asset' }, { status: 500 })
  }
}
