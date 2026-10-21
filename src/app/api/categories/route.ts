import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const categories = await db.assetCategory.findMany({
      where: { status: 'ACTIVE' },
      orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
      include: {
        _count: {
          select: {
            listings: {
              where: { visibility: 'PUBLISHED' },
            },
          },
        },
      },
    })

    return NextResponse.json(
      categories.map((c) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        parentId: c.parentId,
        imageUrl: c.imageUrl,
        icon: c.iconName || 'Folder',
        color: c.color || '#10B981',
        description: c.shortDescription || c.description,
        assetCount: c._count.listings,
      }))
    )
  } catch (error: any) {
    console.error('Error fetching categories:', error)
    return NextResponse.json({ error: error.message || 'Failed to fetch categories' }, { status: 500 })
  }
}
