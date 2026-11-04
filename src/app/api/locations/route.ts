import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const locations = await db.assetLocation.findMany({
      where: { isActive: true },
      include: {
        _count: { select: { units: true } },
      },
      orderBy: { name: 'asc' },
    })
    return NextResponse.json(locations, { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' } })
  } catch (error: any) {
    console.error('Error fetching public locations:', error)
    return NextResponse.json({ error: error.message || 'Failed to fetch locations' }, { status: 500 })
  }
}
