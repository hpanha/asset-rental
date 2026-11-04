import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const brands = await db.assetBrand.findMany({
      where: { isActive: true },
      include: {
        _count: { select: { listings: true } },
      },
      orderBy: { name: 'asc' },
    })
    return NextResponse.json(brands, { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' } })
  } catch (error: any) {
    console.error('Error fetching public brands:', error)
    return NextResponse.json({ error: error.message || 'Failed to fetch brands' }, { status: 500 })
  }
}
