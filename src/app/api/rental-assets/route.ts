import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const search = searchParams.get('search') || searchParams.get('q') || ''
    const category = searchParams.get('category') || searchParams.get('categoryId') || ''
    const brand = searchParams.get('brand') || searchParams.get('brandId') || ''
    const location = searchParams.get('location') || searchParams.get('locationId') || ''
    const minPrice = Number(searchParams.get('minPrice')) || 0
    const maxPrice = Number(searchParams.get('maxPrice')) || 0
    const sort = searchParams.get('sort') || 'recommended' // recommended | priceLow | priceHigh | rating | newest
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const pageSize = Math.max(1, Math.min(100, parseInt(searchParams.get('pageSize') || '20', 10)))

    const andConditions: any[] = [{ visibility: 'PUBLISHED' }]

    // Search query
    if (search.trim()) {
      andConditions.push({
        OR: [
          { name: { contains: search } },
          { code: { contains: search } },
          { model: { contains: search } },
          { shortDescription: { contains: search } },
          { description: { contains: search } },
        ],
      })
    }

    // Category filter (support ID or slug or child categories)
    if (category && category !== 'all') {
      andConditions.push({
        OR: [
          { categoryId: category },
          { category: { slug: category } },
          { category: { parentId: category } },
          { category: { parent: { slug: category } } },
        ],
      })
    }

    // Brand filter (support ID or slug)
    if (brand && brand !== 'all') {
      andConditions.push({
        OR: [{ brandId: brand }, { brand: { slug: brand } }],
      })
    }

    // Location filter (locations where this asset is available for pickup)
    if (location && location !== 'all') {
      andConditions.push({
        locationOptions: {
          some: {
            OR: [
              { locationId: location },
              { location: { code: location } },
              { location: { city: { contains: location } } },
            ],
          },
        },
      })
    }

    // Price filtering
    if (minPrice || maxPrice) {
      andConditions.push({
        rates: {
          some: {
            isPrimary: true,
            ...(minPrice ? { rateAmount: { gte: minPrice } } : {}),
            ...(maxPrice ? { rateAmount: { lte: maxPrice } } : {}),
          },
        },
      })
    }

    const where: any = { AND: andConditions }

    // Sort order
    let orderBy: any = [{ rating: 'desc' }, { reviewCount: 'desc' }]
    if (sort === 'newest') {
      orderBy = { createdAt: 'desc' }
    } else if (sort === 'rating') {
      orderBy = { rating: 'desc' }
    }

    const [total, listings] = await Promise.all([
      db.assetListing.count({ where }),
      db.assetListing.findMany({
        where,
        include: {
          category: {
            select: { id: true, name: true, slug: true, iconName: true, color: true, imageUrl: true },
          },
          brand: {
            select: { id: true, name: true, slug: true },
          },
          rates: {
            where: { isPrimary: true },
            take: 1,
          },
          rentalPolicy: true,
          locationOptions: {
            include: {
              location: {
                select: { id: true, name: true, code: true, city: true },
              },
            },
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
        },
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ])

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
      if (item.coverImage && !parsedImages.includes(item.coverImage)) {
        parsedImages.unshift(item.coverImage)
      }

      // Calculate active unblocked units count
      const activeUnits = item.units.filter((u) => {
        if (u.baseStatus !== 'ACTIVE') return false
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
        model: item.model,
        shortDescription: item.shortDescription,
        description: item.description,
        coverImage: item.coverImage,
        images: parsedImages,
        specifications: parsedSpecs,
        category: item.category,
        brand: item.brand,
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
        rating: item.rating,
        reviewCount: item.reviewCount,
        locations: item.locationOptions.map((opt) => opt.location),
        publishedAt: item.publishedAt,
        createdAt: item.createdAt,
      }
    })

    // In-memory price sorting if low/high requested
    if (sort === 'priceLow') {
      sanitized.sort((a, b) => a.primaryRate.amount - b.primaryRate.amount)
    } else if (sort === 'priceHigh') {
      sanitized.sort((a, b) => b.primaryRate.amount - a.primaryRate.amount)
    }

    return NextResponse.json({
      items: sanitized,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    })
  } catch (error: any) {
    console.error('Error fetching rental assets catalog:', error)
    return NextResponse.json({ error: error.message || 'Failed to fetch catalog' }, { status: 500 })
  }
}
