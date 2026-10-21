import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const listing = await db.assetListing.findFirst({
      where: {
        OR: [{ slug: id }, { id }],
        visibility: 'PUBLISHED', // Step 02 Rule: Strictly published only
      },
      include: {
        category: true,
        brand: true,
        rates: {
          where: { isPrimary: true },
          take: 1,
        },
        rentalPolicy: true,
        locationOptions: {
          include: { location: true },
        },
        units: {
          select: {
            id: true,
            baseStatus: true,
            conditionGrade: true,
            accessories: true,
            blockedIntervals: {
              where: {
                endAt: { gte: new Date() },
              },
            },
          },
        },
        reviews: {
          include: {
            user: { select: { id: true, name: true, avatar: true } },
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    })

    if (!listing) {
      return NextResponse.json({ error: 'Asset listing not found or not published' }, { status: 404 })
    }

    const primaryRate = listing.rates[0] || {
      rateAmount: 0,
      currency: 'USD',
      billingUnit: 'DAY',
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
    if (listing.coverImage && !parsedImages.includes(listing.coverImage)) {
      parsedImages.unshift(listing.coverImage)
    }

    const now = new Date()
    const activeUnits = listing.units.filter((u) => {
      if (u.baseStatus !== 'ACTIVE') return false
      return !u.blockedIntervals.some(
        (b) => new Date(b.startAt) <= now && new Date(b.endAt) >= now
      )
    })

    // Extract inclusions list from accessories across active units or default specs
    const inclusionsSet = new Set<string>()
    listing.units.forEach((u) => {
      if (u.accessories) {
        u.accessories.split(',').forEach((item) => {
          const trimmed = item.trim()
          if (trimmed) inclusionsSet.add(trimmed)
        })
      }
    })

    const inclusions = inclusionsSet.size > 0 ? Array.from(inclusionsSet) : ['Standard Power Adapter / Cable', 'Protective Carry Sleeve / Case']

    // Fetch 3 related assets from same category
    const similarListings = await db.assetListing.findMany({
      where: {
        categoryId: listing.categoryId,
        visibility: 'PUBLISHED',
        NOT: { id: listing.id },
      },
      take: 3,
      include: {
        rates: { where: { isPrimary: true }, take: 1 },
        category: true,
      },
    })

    const sanitized = {
      id: listing.id,
      code: listing.code,
      name: listing.name,
      slug: listing.slug,
      shortDescription: listing.shortDescription,
      description: listing.description,
      model: listing.model,
      coverImage: listing.coverImage,
      images: parsedImages,
      specifications: parsedSpecs,
      inclusions,
      category: listing.category,
      brand: listing.brand,
      primaryRate: {
        amount: primaryRate.rateAmount,
        currency: primaryRate.currency,
        billingUnit: primaryRate.billingUnit,
      },
      rentalPolicy: listing.rentalPolicy,
      allowDelivery: listing.allowDelivery,
      deliveryFee: listing.deliveryFee,
      totalUnits: listing.units.length,
      availableUnitsCount: activeUnits.length,
      locations: listing.locationOptions.map((opt) => opt.location),
      rating: listing.rating,
      reviewCount: listing.reviewCount,
      reviews: listing.reviews,
      similarAssets: similarListings.map((sim) => ({
        id: sim.id,
        name: sim.name,
        slug: sim.slug,
        coverImage: sim.coverImage,
        rateAmount: sim.rates[0]?.rateAmount || 0,
        currency: sim.rates[0]?.currency || 'USD',
        categoryName: sim.category.name,
      })),
    }

    return NextResponse.json(sanitized)
  } catch (error: any) {
    console.error('Error fetching asset detail:', error)
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}
