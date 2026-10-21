import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params

    const request = await db.rentalRequest.findFirst({
      where: {
        OR: [{ id }, { requestNo: id }],
        renterId: user.id,
      },
      include: {
        paymentOrder: {
          include: {
            attempts: { orderBy: { createdAt: 'desc' } },
            receipt: true,
          },
        },
        depositLedger: true,
        inventoryHold: true,
      },
    })

    if (!request) {
      return NextResponse.json({ error: 'Rental request not found' }, { status: 404 })
    }

    return NextResponse.json({
      request_id: request.id,
      request_no: request.requestNo,
      request_status: request.status,
      payment_status: request.paymentOrder?.paymentStatus || 'UNPAID',
      payment_order: request.paymentOrder,
      deposit_ledger: request.depositLedger,
      receipt: request.paymentOrder?.receipt || null,
      inventory_hold: request.inventoryHold,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch payment status' }, { status: 500 })
  }
}
