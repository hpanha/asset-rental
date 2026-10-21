import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const listing = await db.assetListing.findUnique({
      where: { id },
      include: {
        category: {
          include: { parent: true },
        },
        brand: true,
        rates: {
          orderBy: { isPrimary: 'desc' },
        },
        rentalPolicy: true,
        locationOptions: {
          include: { location: true },
        },
        units: {
          include: {
            location: true,
            blockedIntervals: {
              where: {
                endAt: { gte: new Date() },
              },
            },
          },
          orderBy: { assetTag: 'asc' },
        },
        blockedIntervals: {
          include: { unit: true },
          orderBy: { startAt: 'desc' },
          take: 20,
        },
        auditEvents: {
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    })

    if (!listing) {
      return NextResponse.json({ error: 'Asset listing not found' }, { status: 404 })
    }

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

    let parsedWeekdays: string[] = []
    try {
      parsedWeekdays = listing.rentalPolicy?.allowedPickupWeekdays
        ? JSON.parse(listing.rentalPolicy.allowedPickupWeekdays)
        : ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']
    } catch {
      parsedWeekdays = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']
    }

    const responseData = {
      ...listing,
      specifications: parsedSpecs,
      images: parsedImages,
      rentalPolicy: listing.rentalPolicy
        ? {
            ...listing.rentalPolicy,
            allowedPickupWeekdays: parsedWeekdays,
          }
        : null,
    }

    return NextResponse.json(responseData)
  } catch (error: any) {
    console.error('Error fetching asset detail:', error)
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await req.json()

    const currentListing = await db.assetListing.findUnique({
      where: { id },
      include: { rates: true, rentalPolicy: true },
    })

    if (!currentListing) {
      return NextResponse.json({ error: 'Asset listing not found' }, { status: 404 })
    }

    // Optimistic Concurrency check
    if (body.version !== undefined && body.version !== currentListing.version) {
      return NextResponse.json(
        {
          error:
            'Conflict detected: This record has been updated by another user or session. Please refresh and try again.',
        },
        { status: 409 }
      )
    }

    const {
      name,
      code,
      slug,
      categoryId,
      brandId,
      model,
      shortDescription,
      description,
      specifications,
      trackingMode,
      coverImage,
      images,
      allowDelivery,
      deliveryFee,
      conditionNote,
      // Pricing
      rateAmount,
      currency,
      billingUnit,
      // Policy
      securityDeposit,
      minimumDuration,
      minimumDurationUnit,
      lateFeeAmount,
      lateFeeUnit,
      lateGraceMinutes,
      minAdvanceNoticeMinutes,
      preparationBufferMinutes,
      returnBufferMinutes,
      termsTemplate,
      locationIds,
    } = body

    const updated = await db.$transaction(async (tx) => {
      const updateData: any = {
        version: { increment: 1 },
      }

      if (name !== undefined) updateData.name = name
      if (code !== undefined) updateData.code = code
      if (slug !== undefined) updateData.slug = slug
      if (categoryId !== undefined) updateData.categoryId = categoryId
      if (brandId !== undefined) updateData.brandId = brandId || null
      if (model !== undefined) updateData.model = model || null
      if (shortDescription !== undefined) updateData.shortDescription = shortDescription
      if (description !== undefined) updateData.description = description
      if (specifications !== undefined) {
        updateData.specifications =
          typeof specifications === 'object' ? JSON.stringify(specifications) : specifications
      }
      if (trackingMode !== undefined) updateData.trackingMode = trackingMode
      if (coverImage !== undefined) updateData.coverImage = coverImage
      if (images !== undefined) {
        updateData.images = Array.isArray(images) ? JSON.stringify(images) : images
      }
      if (allowDelivery !== undefined) updateData.allowDelivery = !!allowDelivery
      if (deliveryFee !== undefined) updateData.deliveryFee = Number(deliveryFee) || 0
      if (conditionNote !== undefined) updateData.conditionNote = conditionNote

      const listing = await tx.assetListing.update({
        where: { id },
        data: updateData,
      })

      // Update Primary Rate if provided
      if (rateAmount !== undefined || currency !== undefined || billingUnit !== undefined) {
        const primaryRate = currentListing.rates.find((r) => r.isPrimary) || currentListing.rates[0]
        if (primaryRate) {
          await tx.assetRate.update({
            where: { id: primaryRate.id },
            data: {
              ...(rateAmount !== undefined ? { rateAmount: Number(rateAmount) } : {}),
              ...(currency !== undefined ? { currency } : {}),
              ...(billingUnit !== undefined ? { billingUnit } : {}),
            },
          })
        } else if (rateAmount !== undefined) {
          await tx.assetRate.create({
            data: {
              listingId: id,
              rateAmount: Number(rateAmount),
              currency: currency || 'USD',
              billingUnit: billingUnit || 'DAY',
              isPrimary: true,
            },
          })
        }
      }

      // Update Policy
      if (
        securityDeposit !== undefined ||
        minimumDuration !== undefined ||
        lateFeeAmount !== undefined ||
        preparationBufferMinutes !== undefined ||
        returnBufferMinutes !== undefined ||
        termsTemplate !== undefined
      ) {
        await tx.assetRentalPolicy.upsert({
          where: { listingId: id },
          create: {
            listingId: id,
            securityDeposit: Number(securityDeposit) || 0,
            minimumDuration: Number(minimumDuration) || 1,
            minimumDurationUnit: minimumDurationUnit || 'DAY',
            lateFeeAmount: Number(lateFeeAmount) || 0,
            lateFeeUnit: lateFeeUnit || 'DAY',
            lateGraceMinutes: Number(lateGraceMinutes) || 30,
            minAdvanceNoticeMinutes: Number(minAdvanceNoticeMinutes) || 120,
            preparationBufferMinutes: Number(preparationBufferMinutes) || 120,
            returnBufferMinutes: Number(returnBufferMinutes) || 120,
            termsTemplate: termsTemplate || null,
          },
          update: {
            ...(securityDeposit !== undefined ? { securityDeposit: Number(securityDeposit) } : {}),
            ...(minimumDuration !== undefined ? { minimumDuration: Number(minimumDuration) } : {}),
            ...(minimumDurationUnit !== undefined ? { minimumDurationUnit } : {}),
            ...(lateFeeAmount !== undefined ? { lateFeeAmount: Number(lateFeeAmount) } : {}),
            ...(lateFeeUnit !== undefined ? { lateFeeUnit } : {}),
            ...(lateGraceMinutes !== undefined ? { lateGraceMinutes: Number(lateGraceMinutes) } : {}),
            ...(minAdvanceNoticeMinutes !== undefined ? { minAdvanceNoticeMinutes: Number(minAdvanceNoticeMinutes) } : {}),
            ...(preparationBufferMinutes !== undefined ? { preparationBufferMinutes: Number(preparationBufferMinutes) } : {}),
            ...(returnBufferMinutes !== undefined ? { returnBufferMinutes: Number(returnBufferMinutes) } : {}),
            ...(termsTemplate !== undefined ? { termsTemplate } : {}),
          },
        })
      }

      // Update Locations if provided
      if (Array.isArray(locationIds)) {
        await tx.assetLocationOption.deleteMany({ where: { listingId: id } })
        for (const locId of locationIds) {
          await tx.assetLocationOption.create({
            data: {
              listingId: id,
              locationId: locId,
              pickupEnabled: true,
              returnEnabled: true,
            },
          })
        }
      }

      // Audit Log
      await tx.assetAuditEvent.create({
        data: {
          companyId: listing.companyId,
          listingId: listing.id,
          entityType: 'LISTING',
          entityId: listing.id,
          actorName: 'Admin',
          action: 'UPDATE',
          afterJson: JSON.stringify({ name: listing.name, code: listing.code }),
        },
      })

      return listing
    })

    return NextResponse.json({ success: true, listing: updated })
  } catch (error: any) {
    console.error('Error updating asset:', error)
    return NextResponse.json({ error: error.message || 'Failed to update asset' }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const listing = await db.assetListing.findUnique({
      where: { id },
      include: {
        _count: { select: { bookings: true } },
      },
    })

    if (!listing) {
      return NextResponse.json({ error: 'Asset listing not found' }, { status: 404 })
    }

    // Preservation rule: If listing has historical bookings, archive it rather than hard delete!
    if (listing._count.bookings > 0) {
      await db.assetListing.update({
        where: { id },
        data: { visibility: 'ARCHIVED' },
      })

      await db.assetAuditEvent.create({
        data: {
          companyId: listing.companyId,
          listingId: listing.id,
          entityType: 'LISTING',
          entityId: listing.id,
          actorName: 'Admin',
          action: 'ARCHIVE',
          afterJson: JSON.stringify({ reason: 'Archived due to existing rental history' }),
        },
      })

      return NextResponse.json({
        success: true,
        message: 'Listing has historical bookings and was safely archived rather than deleted.',
      })
    }

    // Delete listing if no bookings
    await db.assetListing.delete({ where: { id } })

    return NextResponse.json({ success: true, message: 'Asset listing deleted successfully' })
  } catch (error: any) {
    console.error('Error deleting asset:', error)
    return NextResponse.json({ error: error.message || 'Failed to delete asset' }, { status: 500 })
  }
}
