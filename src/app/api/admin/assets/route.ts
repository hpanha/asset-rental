import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const search = searchParams.get('search') || ''
    const categoryId = searchParams.get('categoryId')
    const brandId = searchParams.get('brandId')
    const visibility = searchParams.get('visibility')
    const trackingMode = searchParams.get('trackingMode')
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const pageSize = Math.max(1, Math.min(100, parseInt(searchParams.get('pageSize') || '20', 10)))

    const where: any = {}

    if (search.trim()) {
      where.OR = [
        { name: { contains: search } },
        { code: { contains: search } },
        { model: { contains: search } },
        { shortDescription: { contains: search } },
      ]
    }

    if (categoryId && categoryId !== 'all') {
      where.categoryId = categoryId
    }

    if (brandId && brandId !== 'all') {
      where.brandId = brandId
    }

    if (visibility && visibility !== 'all') {
      where.visibility = visibility
    }

    if (trackingMode && trackingMode !== 'all') {
      where.trackingMode = trackingMode
    }

    const [total, listings] = await Promise.all([
      db.assetListing.count({ where }),
      db.assetListing.findMany({
        where,
        include: {
          category: {
            select: { id: true, name: true, slug: true, iconName: true, color: true },
          },
          brand: {
            select: { id: true, name: true, slug: true },
          },
          rates: {
            where: { isPrimary: true },
            take: 1,
          },
          units: {
            select: { id: true, baseStatus: true, conditionGrade: true },
          },
          _count: {
            select: { units: true, blockedIntervals: true },
          },
          auditEvents: {
            where: { action: 'CREATE' },
            take: 1,
            select: { actorName: true },
          },
        },
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ])

    const formatted = listings.map((item) => {
      const activeUnits = item.units.filter((u) => u.baseStatus === 'ACTIVE').length
      const maintenanceUnits = item.units.filter((u) => u.baseStatus === 'MAINTENANCE').length
      const primaryRate = item.rates[0] || null
      const createdBy = (item as any).auditEvents?.[0]?.actorName || 'Admin'

      return {
        id: item.id,
        code: item.code,
        name: item.name,
        slug: item.slug,
        model: item.model,
        shortDescription: item.shortDescription,
        coverImage: item.coverImage,
        visibility: item.visibility,
        trackingMode: item.trackingMode,
        category: item.category,
        brand: item.brand,
        primaryRate: primaryRate
          ? {
              amount: primaryRate.rateAmount,
              currency: primaryRate.currency,
              billingUnit: primaryRate.billingUnit,
            }
          : null,
        totalUnits: item.units.length,
        activeUnits,
        maintenanceUnits,
        version: item.version,
        publishedAt: item.publishedAt,
        createdBy,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      }
    })

    return NextResponse.json({
      items: formatted,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    })
  } catch (error: any) {
    console.error('Error fetching admin assets:', error)
    return NextResponse.json({ error: error.message || 'Failed to fetch assets' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      code,
      name,
      slug,
      categoryId,
      brandId,
      model,
      shortDescription,
      description,
      specifications,
      trackingMode = 'SERIALIZED',
      coverImage,
      images = [],
      allowDelivery = true,
      deliveryFee = 0,
      visibility = 'DRAFT',
      // Pricing
      currency = 'USD',
      billingUnit = 'DAY',
      rateAmount = 0,
      // Rental policy
      securityDeposit = 0,
      minimumDuration = 1,
      minimumDurationUnit = 'DAY',
      lateFeeAmount = 0,
      lateFeeUnit = 'DAY',
      lateGraceMinutes = 30,
      minAdvanceNoticeMinutes = 120,
      preparationBufferMinutes = 120,
      returnBufferMinutes = 120,
      termsTemplate,
      // Location IDs
      locationIds = [],
      // Optional initial units
      units = [],
    } = body

    if (!code || !name) {
      return NextResponse.json({ error: 'Code and Name are required.' }, { status: 400 })
    }

    if (!categoryId) {
      return NextResponse.json({ error: 'Please select a Category.' }, { status: 400 })
    }

    const company = await db.rentalCompany.findFirst()
    if (!company) {
      return NextResponse.json({ error: 'No rental company record found' }, { status: 500 })
    }

    // Check duplicate code
    const existingCode = await db.assetListing.findUnique({ where: { code } })
    if (existingCode) {
      return NextResponse.json({ error: `Asset code "${code}" is already in use` }, { status: 400 })
    }

    // Generate or check slug
    let finalSlug = slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '')
    const existingSlug = await db.assetListing.findUnique({ where: { slug: finalSlug } })
    if (existingSlug) {
      finalSlug = `${finalSlug}-${Date.now().toString().slice(-4)}`
    }

    // Create listing with relations in a transaction
    const newListing = await db.$transaction(async (tx) => {
      const listing = await tx.assetListing.create({
        data: {
          companyId: company.id,
          code,
          name,
          slug: finalSlug,
          categoryId,
          brandId: brandId || null,
          model: model || null,
          shortDescription: shortDescription || '',
          description: description || '',
          specifications: typeof specifications === 'object' ? JSON.stringify(specifications) : specifications || '{}',
          trackingMode,
          coverImage: coverImage || (images[0] ?? '/placeholder.png'),
          images: JSON.stringify(images),
          allowDelivery: !!allowDelivery,
          deliveryFee: Number(deliveryFee) || 0,
          visibility: visibility === 'PUBLISHED' ? 'DRAFT' : visibility, // Must validate explicitly before publishing
        },
      })

      // Rate
      await tx.assetRate.create({
        data: {
          listingId: listing.id,
          currency,
          billingUnit,
          rateAmount: Number(rateAmount) || 0,
          isPrimary: true,
        },
      })

      // Rental Policy
      await tx.assetRentalPolicy.create({
        data: {
          listingId: listing.id,
          securityDeposit: Number(securityDeposit) || 0,
          minimumDuration: Number(minimumDuration) || 1,
          minimumDurationUnit,
          lateFeeAmount: Number(lateFeeAmount) || 0,
          lateFeeUnit,
          lateGraceMinutes: Number(lateGraceMinutes) || 30,
          minAdvanceNoticeMinutes: Number(minAdvanceNoticeMinutes) || 120,
          preparationBufferMinutes: Number(preparationBufferMinutes) || 120,
          returnBufferMinutes: Number(returnBufferMinutes) || 120,
          termsTemplate: termsTemplate || null,
        },
      })

      // Locations
      if (Array.isArray(locationIds) && locationIds.length > 0) {
        for (const locId of locationIds) {
          await tx.assetLocationOption.create({
            data: {
              listingId: listing.id,
              locationId: locId,
              pickupEnabled: true,
              returnEnabled: true,
            },
          })
        }
      }

      // Initial Units if provided
      if (Array.isArray(units) && units.length > 0) {
        for (const u of units) {
          if (u.assetTag) {
            await tx.assetUnit.create({
              data: {
                listingId: listing.id,
                assetTag: u.assetTag,
                serialNumber: u.serialNumber || null,
                locationId: u.locationId || locationIds[0],
                baseStatus: u.baseStatus || 'ACTIVE',
                conditionGrade: u.conditionGrade || 'EXCELLENT',
                accessories: u.accessories || null,
                purchaseCost: u.purchaseCost ? Number(u.purchaseCost) : null,
                notes: u.notes || null,
              },
            })
          }
        }
      }

      // Audit event
      await tx.assetAuditEvent.create({
        data: {
          companyId: company.id,
          listingId: listing.id,
          entityType: 'LISTING',
          entityId: listing.id,
          actorName: 'Admin',
          action: 'CREATE',
          afterJson: JSON.stringify({ code: listing.code, name: listing.name }),
        },
      })

      return listing
    })

    return NextResponse.json({ success: true, listing: newListing }, { status: 201 })
  } catch (error: any) {
    console.error('Error creating admin asset:', error)
    return NextResponse.json({ error: error.message || 'Failed to create asset' }, { status: 500 })
  }
}
