import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentClientUserState, clearClientSessionCookie } from '@/lib/auth'

export async function GET() {
  try {
    const { user: me, isExpired } = await getCurrentClientUserState()

    if (isExpired) {
      const response = NextResponse.json(
        {
          user: null,
          listings: [],
          expired: true,
          error: 'SESSION_EXPIRED',
          message: 'Your session has expired. Please sign in again.',
        },
        { status: 401 }
      )
      clearClientSessionCookie(response)
      return response
    }

    if (!me) {
      return NextResponse.json({
        user: null,
        listings: [],
      })
    }

    const listings = await db.assetListing.findMany({
      where: { visibility: 'PUBLISHED' },
      take: 5,
      include: {
        category: true,
        rates: { where: { isPrimary: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    const formatted = listings.map((l) => ({
      id: l.id,
      title: l.name,
      pricePerDay: l.rates[0]?.rateAmount || 0,
      images: [l.coverImage],
      category: {
        id: l.category.id,
        name: l.category.name,
        icon: l.category.iconName || 'Folder',
      },
    }))

    return NextResponse.json({
      user: {
        id: me.id,
        name: me.name,
        email: me.email,
        avatar: me.avatar,
        role: me.role,
        bio: me.bio,
      },
      listings: formatted,
    })
  } catch (error: any) {
    console.error('Error in GET /api/me:', error)
    return NextResponse.json({
      user: null,
      listings: [],
    })
  }
}
