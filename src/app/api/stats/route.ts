import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

export async function GET() {
  try {
    const me = await getCurrentUser()

    const [totalAssets, totalBookings, upcomingBookings, spentAgg] =
      await Promise.all([
        db.assetListing.count({ where: { visibility: 'PUBLISHED' } }),
        db.booking.count({ where: { userId: me.id } }),
        db.booking.count({
          where: { userId: me.id, status: 'confirmed', endDate: { gte: new Date() } },
        }),
        db.booking.aggregate({
          where: { userId: me.id, status: { not: 'cancelled' } },
          _sum: { totalPrice: true },
        }),
      ])

    return NextResponse.json({
      totalAssets,
      totalBookings,
      upcomingBookings,
      activeListings: totalAssets,
      totalSpent: spentAgg._sum.totalPrice || 0,
    })
  } catch (error: any) {
    console.error('Error in GET /api/stats:', error)
    return NextResponse.json({
      totalAssets: 0,
      totalBookings: 0,
      upcomingBookings: 0,
      activeListings: 0,
      totalSpent: 0,
    })
  }
}
