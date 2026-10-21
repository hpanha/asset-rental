import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params

    const listing = await db.assetListing.findFirst({
      where: {
        OR: [{ slug }, { id: slug }],
        visibility: 'PUBLISHED',
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
      return NextResponse.json({ error: 'Asset not found or not published' }, { status: 404 })
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

    const now = new Date()
    const activeUnits = listing.units.filter((u) => {
      if (u.baseStatus !== 'ACTIVE') return false
      return !u.blockedIntervals.some(
        (b) => new Date(b.startAt) <= now && new Date(b.endAt) >= now
      )
    })

    const sanitized = {
      id: listing.id,
      code: listing.code,
      name: listing.name,
      slug: listing.slug,
      shortDescription: listing.shortDescription,
      description: listing.description,
      specifications: parsedSpecs,
      coverImage: listing.coverImage,
      images: parsedImages,
      rating: listing.rating,
      reviewCount: listing.reviewCount,
      category: listing.category,
      brand: listing.brand,
      model: listing.model,
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
      reviews: listing.reviews,
    }

    return NextResponse.json(sanitized)
  } catch (error: any) {
    console.error('Error fetching public asset detail:', error)
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}
