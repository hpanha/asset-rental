import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')
    const search = searchParams.get('search') || ''

    const where: any = {}
    if (status && status !== 'all') {
      where.status = status
    }
    if (search.trim()) {
      where.OR = [
        { name: { contains: search } },
        { slug: { contains: search } },
        { shortDescription: { contains: search } },
      ]
    }

    const categories = await db.assetCategory.findMany({
      where,
      include: {
        parent: {
          select: { id: true, name: true, slug: true },
        },
        children: {
          select: { id: true, name: true, slug: true, status: true, displayOrder: true },
        },
        _count: {
          select: { listings: true, children: true },
        },
      },
      orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
    })

    return NextResponse.json(categories)
  } catch (error: any) {
    console.error('Error fetching categories:', error)
    return NextResponse.json({ error: error.message || 'Failed to fetch categories' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      name,
      slug,
      shortDescription,
      description,
      imageUrl,
      iconName = 'Folder',
      color = '#10B981',
      parentId,
      displayOrder = 0,
      status = 'ACTIVE',
      metaTitle,
      metaDescription,
    } = body

    if (!name || name.trim().length < 2) {
      return NextResponse.json(
        { error: 'Category Name is required (minimum 2 characters).' },
        { status: 400 }
      )
    }

    let finalSlug =
      slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '')

    const existingSlug = await db.assetCategory.findUnique({
      where: { slug: finalSlug },
    })
    if (existingSlug) {
      return NextResponse.json(
        { error: `The slug "${finalSlug}" is already in use. Please enter a unique slug.` },
        { status: 400 }
      )
    }

    const category = await db.assetCategory.create({
      data: {
        name: name.trim(),
        slug: finalSlug,
        shortDescription: shortDescription?.trim() || null,
        description: description?.trim() || null,
        imageUrl: imageUrl || null,
        iconName: iconName || 'Folder',
        color: color || '#10B981',
        parentId: parentId || null,
        displayOrder: Number(displayOrder) || 0,
        status: status || 'ACTIVE',
        metaTitle: metaTitle || null,
        metaDescription: metaDescription || null,
      },
      include: { parent: true },
    })

    return NextResponse.json({ success: true, category }, { status: 201 })
  } catch (error: any) {
    console.error('Error creating category:', error)
    return NextResponse.json({ error: error.message || 'Failed to create category' }, { status: 500 })
  }
}
