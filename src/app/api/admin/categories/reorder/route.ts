import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { items } = body

    if (!Array.isArray(items)) {
      return NextResponse.json({ error: 'Invalid items payload, expected an array of { id, displayOrder }' }, { status: 400 })
    }

    await db.$transaction(
      items.map((item, index) =>
        db.assetCategory.update({
          where: { id: item.id },
          data: { displayOrder: typeof item.displayOrder === 'number' ? item.displayOrder : index + 1 },
        })
      )
    )

    return NextResponse.json({ success: true, message: 'Category display order updated successfully.' })
  } catch (error: any) {
    console.error('Category reorder error:', error)
    return NextResponse.json({ error: error.message || 'Failed to reorder categories' }, { status: 500 })
  }
}
