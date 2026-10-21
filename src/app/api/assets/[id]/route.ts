import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const asset = await db.assetListing.findFirst({
      where: {
        OR: [{ id }, { slug: id }],
      },
      include: {
        category: true,
        brand: true,
        rates: { where: { isPrimary: true }, take: 1 },
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
          },
        },
        reviews: {
          orderBy: { createdAt: 'desc' },
          include: { user: true },
        },
      },
    })

    if (!asset) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 })
    }

    const primaryRate = asset.rates[0]?.rateAmount || 0
    let images: string[] = []
    try {
      images = asset.images ? JSON.parse(asset.images) : []
    } catch {
      images = []
    }
    if (asset.coverImage && !images.includes(asset.coverImage)) {
      images.unshift(asset.coverImage)
    }

    let features: string[] = []
    try {
      if (asset.specifications) {
        const parsed = JSON.parse(asset.specifications)
        features = Object.entries(parsed).map(([k, v]) => `${k}: ${v}`)
      }
    } catch {
      features = []
    }

    const activeUnits = asset.units.filter((u) => u.baseStatus === 'ACTIVE').length
    const primaryCity = asset.locationOptions[0]?.location.city || 'Phnom Penh'
    const primaryLocName = asset.locationOptions[0]?.location.name || 'Phnom Penh Logistics Hub'

    return NextResponse.json({
      id: asset.id,
      title: asset.name,
      name: asset.name,
      code: asset.code,
      slug: asset.slug,
      description: asset.description || asset.shortDescription,
      shortDescription: asset.shortDescription,
      categoryId: asset.categoryId,
      location: primaryLocName,
      city: primaryCity,
      pricePerDay: primaryRate,
      deposit: asset.rentalPolicy?.securityDeposit || 0,
      minimumDuration: asset.rentalPolicy?.minimumDuration || 1,
      preparationBufferMinutes: asset.rentalPolicy?.preparationBufferMinutes || 120,
      returnBufferMinutes: asset.rentalPolicy?.returnBufferMinutes || 120,
      images,
      features,
      status: activeUnits > 0 ? 'available' : 'unavailable',
      totalUnits: asset.units.length,
      availableUnitsCount: activeUnits,
      rating: asset.rating,
      reviewCount: asset.reviewCount,
      createdAt: asset.createdAt.toISOString(),
      category: {
        id: asset.category.id,
        name: asset.category.name,
        slug: asset.category.slug,
        icon: asset.category.iconName || 'Folder',
        color: asset.category.color || 'emerald',
      },
      brand: asset.brand,
      owner: {
        id: 'company',
        name: 'RentHub Enterprise',
        avatar: null,
        bio: 'Verified Rental Fleet Operations',
      },
      reviews: asset.reviews.map((r) => ({
        id: r.id,
        rating: r.rating,
        comment: r.comment,
        createdAt: r.createdAt.toISOString(),
        user: {
          id: r.user.id,
          name: r.user.name,
          avatar: r.user.avatar,
        },
      })),
    })
  } catch (error: any) {
    console.error('Error fetching asset detail:', error)
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}
