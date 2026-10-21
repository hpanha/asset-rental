import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const categorySlug = searchParams.get('category')
    const search = searchParams.get('search') || ''
    const city = searchParams.get('city')
    const sort = searchParams.get('sort') || 'popular'

    const where: any = {
      visibility: 'PUBLISHED', // Strictly published only
    }

    if (categorySlug && categorySlug !== 'all') {
      where.OR = [
        { category: { slug: categorySlug } },
        { category: { parent: { slug: categorySlug } } },
      ]
    }

    if (search.trim()) {
      where.AND = [
        {
          OR: [
            { name: { contains: search } },
            { model: { contains: search } },
            { shortDescription: { contains: search } },
            { description: { contains: search } },
          ],
        },
      ]
    }

    if (city && city !== 'all') {
      where.locationOptions = {
        some: {
          location: {
            city: { contains: city },
          },
        },
      }
    }

    let orderBy: any = { updatedAt: 'desc' }
    if (sort === 'rating') {
      orderBy = { rating: 'desc' }
    } else if (sort === 'popular') {
      orderBy = { reviewCount: 'desc' }
    }

    const listings = await db.assetListing.findMany({
      where,
      include: {
        category: {
          select: { id: true, name: true, slug: true, iconName: true, color: true },
        },
        brand: {
          select: { id: true, name: true },
        },
        rates: {
          where: { isPrimary: true },
          take: 1,
        },
        rentalPolicy: true,
        locationOptions: {
          include: {
            location: {
              select: { id: true, name: true, city: true },
            },
          },
        },
        units: {
          select: {
            id: true,
            baseStatus: true,
            conditionGrade: true,
            // Notice: serialNumber, purchaseCost, and notes are NOT selected
            blockedIntervals: {
              where: {
                endAt: { gte: new Date() },
              },
            },
          },
        },
      },
      orderBy,
    })

    const now = new Date()
    const sanitized = listings.map((item) => {
      const primaryRate = item.rates[0] || {
        rateAmount: 0,
        currency: 'USD',
        billingUnit: 'DAY',
      }

      let parsedSpecs: Record<string, string> = {}
      try {
        parsedSpecs = item.specifications ? JSON.parse(item.specifications) : {}
      } catch {
        parsedSpecs = {}
      }

      let parsedImages: string[] = []
      try {
        parsedImages = item.images ? JSON.parse(item.images) : []
      } catch {
        parsedImages = []
      }

      const activeUnits = item.units.filter((u) => {
        if (u.baseStatus !== 'ACTIVE') return false
        // Check if currently under a maintenance block
        const isBlockedNow = u.blockedIntervals.some(
          (b) => new Date(b.startAt) <= now && new Date(b.endAt) >= now
        )
        return !isBlockedNow
      })

      return {
        id: item.id,
        code: item.code,
        name: item.name,
        slug: item.slug,
        shortDescription: item.shortDescription,
        description: item.description,
        specifications: parsedSpecs,
        coverImage: item.coverImage,
        images: parsedImages,
        rating: item.rating,
        reviewCount: item.reviewCount,
        category: item.category,
        brand: item.brand,
        model: item.model,
        primaryRate: {
          amount: primaryRate.rateAmount,
          currency: primaryRate.currency,
          billingUnit: primaryRate.billingUnit,
        },
        securityDeposit: item.rentalPolicy?.securityDeposit || 0,
        minimumDuration: item.rentalPolicy?.minimumDuration || 1,
        minimumDurationUnit: item.rentalPolicy?.minimumDurationUnit || 'DAY',
        preparationBufferMinutes: item.rentalPolicy?.preparationBufferMinutes || 120,
        returnBufferMinutes: item.rentalPolicy?.returnBufferMinutes || 120,
        allowDelivery: item.allowDelivery,
        deliveryFee: item.deliveryFee,
        totalUnits: item.units.length,
        availableUnitsCount: activeUnits.length,
        locations: item.locationOptions.map((opt) => opt.location),
      }
    })

    // Sort by price if requested
    if (sort === 'priceLow') {
      sanitized.sort((a, b) => a.primaryRate.amount - b.primaryRate.amount)
    } else if (sort === 'priceHigh') {
      sanitized.sort((a, b) => b.primaryRate.amount - a.primaryRate.amount)
    }

    return NextResponse.json(sanitized)
  } catch (error: any) {
    console.error('Error fetching public assets:', error)
    return NextResponse.json({ error: error.message || 'Failed to fetch catalog' }, { status: 500 })
  }
}
