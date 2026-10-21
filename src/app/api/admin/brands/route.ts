import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const brands = await db.assetBrand.findMany({
      include: {
        _count: { select: { listings: true } },
      },
      orderBy: { name: 'asc' },
    })
    return NextResponse.json(brands)
  } catch (error: any) {
    console.error('Error fetching brands:', error)
    return NextResponse.json({ error: error.message || 'Failed to fetch brands' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { name, slug } = body

    if (!name) {
      return NextResponse.json({ error: 'Brand Name is required' }, { status: 400 })
    }

    const finalSlug = slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '')

    const brand = await db.assetBrand.create({
      data: {
        name: name.trim(),
        slug: finalSlug,
      },
    })

    return NextResponse.json({ success: true, brand }, { status: 201 })
  } catch (error: any) {
    console.error('Error creating brand:', error)
    return NextResponse.json({ error: error.message || 'Failed to create brand' }, { status: 500 })
  }
}
