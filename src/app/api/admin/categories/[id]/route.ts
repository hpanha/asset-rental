import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const category = await db.assetCategory.findUnique({
      where: { id },
      include: {
        parent: true,
        children: true,
        _count: { select: { listings: true } },
      },
    })
    if (!category) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 })
    }
    return NextResponse.json(category)
  } catch (error: any) {
    console.error('Error fetching category:', error)
    return NextResponse.json({ error: error.message || 'Failed to fetch category' }, { status: 500 })
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await req.json()
    const {
      name,
      slug,
      shortDescription,
      description,
      imageUrl,
      iconName,
      color,
      parentId,
      displayOrder,
      status,
      metaTitle,
      metaDescription,
    } = body

    // Prevent category from being its own parent (Section 14 of Category Guide)
    if (parentId && parentId === id) {
      return NextResponse.json(
        { error: 'Invalid parent: A category cannot be its own parent.' },
        { status: 400 }
      )
    }

    if (slug) {
      const existing = await db.assetCategory.findFirst({
        where: { slug, NOT: { id } },
      })
      if (existing) {
        return NextResponse.json(
          { error: `The slug "${slug}" is already in use by another category.` },
          { status: 400 }
        )
      }
    }

    const updated = await db.assetCategory.update({
      where: { id },
      data: {
        ...(name ? { name: name.trim() } : {}),
        ...(slug ? { slug } : {}),
        ...(shortDescription !== undefined ? { shortDescription: shortDescription?.trim() || null } : {}),
        ...(description !== undefined ? { description: description?.trim() || null } : {}),
        ...(imageUrl !== undefined ? { imageUrl } : {}),
        ...(iconName !== undefined ? { iconName } : {}),
        ...(color !== undefined ? { color } : {}),
        ...(parentId !== undefined ? { parentId: parentId || null } : {}),
        ...(displayOrder !== undefined ? { displayOrder: Number(displayOrder) } : {}),
        ...(status ? { status } : {}),
        ...(metaTitle !== undefined ? { metaTitle } : {}),
        ...(metaDescription !== undefined ? { metaDescription } : {}),
      },
      include: { parent: true },
    })

    return NextResponse.json({ success: true, category: updated })
  } catch (error: any) {
    console.error('Error updating category:', error)
    return NextResponse.json({ error: error.message || 'Failed to update category' }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const category = await db.assetCategory.findUnique({
      where: { id },
      include: {
        _count: { select: { listings: true, children: true } },
      },
    })

    if (!category) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 })
    }

    // Delete Protection: Check assigned assets (Section 13)
    if (category._count.listings > 0) {
      return NextResponse.json(
        {
          error: `This category contains ${category._count.listings} assigned asset(s). Move or reassign these assets before deleting this category.`,
          assetCount: category._count.listings,
        },
        { status: 400 }
      )
    }

    // Check subcategories
    if (category._count.children > 0) {
      return NextResponse.json(
        {
          error: `This category has ${category._count.children} subcategories. Please reassign or delete subcategories first.`,
          childrenCount: category._count.children,
        },
        { status: 400 }
      )
    }

    await db.assetCategory.delete({ where: { id } })

    return NextResponse.json({ success: true, message: 'Category deleted successfully' })
  } catch (error: any) {
    console.error('Error deleting category:', error)
    return NextResponse.json({ error: error.message || 'Failed to delete category' }, { status: 500 })
  }
}
