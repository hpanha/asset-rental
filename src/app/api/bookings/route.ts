import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

export async function GET() {
  try {
    const me = await getCurrentUser()
    if (!me) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const bookings = await db.booking.findMany({
      where: { userId: me.id },
      orderBy: { createdAt: 'desc' },
      include: {
        listing: {
          include: { category: true, rates: { where: { isPrimary: true } } },
        },
      },
    })

    const formatted = bookings.map((b) => {
      let images: string[] = []
      try {
        images = b.listing?.images ? JSON.parse(b.listing.images) : []
      } catch {
        images = []
      }
      if (b.listing?.coverImage && !images.includes(b.listing.coverImage)) {
        images.unshift(b.listing.coverImage)
      }

      return {
        id: b.id,
        startDate: b.startDate.toISOString(),
        endDate: b.endDate.toISOString(),
        totalPrice: b.totalPrice,
        status: b.status,
        createdAt: b.createdAt.toISOString(),
        asset: {
          id: b.listing?.id || '',
          title: b.listing?.name || '',
          city: 'Phnom Penh',
          pricePerDay: b.listing?.rates?.[0]?.rateAmount || 0,
          images,
          category: {
            id: b.listing?.category?.id || '',
            name: b.listing?.category?.name || '',
            icon: b.listing?.category?.iconName || 'Folder',
          },
          owner: { id: 'company', name: 'RentHub Enterprise' },
        },
      }
    })

    return NextResponse.json(formatted)
  } catch (error: any) {
    console.error('Error in GET /api/bookings:', error)
    return NextResponse.json([], { status: 200 })
  }
}

export async function POST(request: Request) {
  try {
    const me = await getCurrentUser()
    if (!me) {
      return NextResponse.json({ error: 'Please sign in to book an asset' }, { status: 401 })
    }
    const body = await request.json()

    if (!body.assetId || !body.startDate || !body.endDate) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }

    const listing = await db.assetListing.findUnique({
      where: { id: body.assetId },
      include: {
        rates: { where: { isPrimary: true } },
        units: { where: { baseStatus: 'ACTIVE' }, take: 1 },
      },
    })
    if (!listing) return NextResponse.json({ error: 'Asset listing not found' }, { status: 404 })

    const start = new Date(body.startDate)
    const end = new Date(body.endDate)
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start) {
      return NextResponse.json({ error: 'Invalid date range' }, { status: 400 })
    }

    const days = Math.max(
      1,
      Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
    )
    const pricePerDay = listing.rates[0]?.rateAmount || 0
    const totalPrice = days * pricePerDay

    const booking = await db.booking.create({
      data: {
        listingId: listing.id,
        unitId: listing.units[0]?.id || null,
        userId: me.id,
        startDate: start,
        endDate: end,
        totalPrice,
        status: 'confirmed',
      },
      include: {
        listing: { include: { category: true } },
      },
    })

    return NextResponse.json({
      id: booking.id,
      startDate: booking.startDate.toISOString(),
      endDate: booking.endDate.toISOString(),
      totalPrice: booking.totalPrice,
      status: booking.status,
      createdAt: booking.createdAt.toISOString(),
      asset: {
        id: listing.id,
        title: listing.name,
        city: 'Phnom Penh',
        pricePerDay,
        images: [listing.coverImage],
        category: {
          id: listing.category.id,
          name: listing.category.name,
          icon: listing.category.iconName || 'Folder',
        },
        owner: { id: 'company', name: 'RentHub Enterprise' },
      },
    })
  } catch (error: any) {
    console.error('Error in POST /api/bookings:', error)
    return NextResponse.json({ error: error.message || 'Failed to create booking' }, { status: 500 })
  }
}
