import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const request = await db.rentalRequest.findFirst({
      where: {
        OR: [{ id }, { requestNo: id }],
        renterId: user.id,
      },
      include: {
        listing: {
          select: {
            id: true,
            code: true,
            name: true,
            slug: true,
            coverImage: true,
            allowDelivery: true,
            deliveryFee: true,
            category: { select: { id: true, name: true } },
            brand: { select: { id: true, name: true } },
          },
        },
        pickupLocation: {
          select: { id: true, name: true, code: true, address: true, city: true },
        },
        returnLocation: {
          select: { id: true, name: true, code: true, address: true, city: true },
        },
        quoteSnapshot: true,
        deliveryAddress: true,
        termsAcceptance: true,
        inventoryHold: true,
        approvalDecisions: {
          orderBy: { decidedAt: 'desc' },
        },
        changeProposals: {
          orderBy: { createdAt: 'desc' },
        },
        events: {
          orderBy: { createdAt: 'asc' },
        },
      },
    })

    if (!request) {
      return NextResponse.json({ error: 'Rental request not found.' }, { status: 404 })
    }

    return NextResponse.json({ request })
  } catch (error: any) {
    console.error('Error fetching rental request detail:', error)
    return NextResponse.json({ error: error.message || 'Failed to fetch request detail' }, { status: 500 })
  }
}
