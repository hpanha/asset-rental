import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

export async function POST(request: Request) {
  try {
    const me = await getCurrentUser()
    const body = await request.json()

    if (!body.assetId || !body.rating || !body.comment) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }

    const rating = Number(body.rating)
    if (rating < 1 || rating > 5) {
      return NextResponse.json({ error: 'Rating must be 1-5' }, { status: 400 })
    }

    const review = await db.review.create({
      data: {
        listingId: body.assetId,
        userId: me.id,
        rating,
        comment: String(body.comment).slice(0, 500),
      },
      include: { user: true },
    })

    // Update asset aggregate rating + count
    const agg = await db.review.aggregate({
      where: { listingId: body.assetId },
      _avg: { rating: true },
      _count: true,
    })

    await db.assetListing.update({
      where: { id: body.assetId },
      data: {
        rating: Math.round((agg._avg.rating || 0) * 10) / 10,
        reviewCount: agg._count,
      },
    })

    return NextResponse.json({
      id: review.id,
      rating: review.rating,
      comment: review.comment,
      createdAt: review.createdAt.toISOString(),
      user: {
        id: review.user.id,
        name: review.user.name,
        avatar: review.user.avatar,
      },
    })
  } catch (error: any) {
    console.error('Error in POST /api/reviews:', error)
    return NextResponse.json({ error: error.message || 'Failed to submit review' }, { status: 500 })
  }
}
