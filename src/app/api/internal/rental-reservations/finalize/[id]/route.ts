import { NextRequest, NextResponse } from 'next/server'
import { finalizeBookingReservation } from '@/lib/reservations'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await req.json().catch(() => ({}))
    const { actor = { id: 'SYSTEM', name: 'Internal Finalizer', role: 'SYSTEM' } } = body

    const result = await finalizeBookingReservation(id, actor)

    return NextResponse.json(result)
  } catch (error: any) {
    const msg = error.message || 'Reservation finalization failed'
    console.error('Internal reservation error:', msg)

    const statusCode = msg.startsWith('NOT_FOUND')
      ? 404
      : msg.startsWith('HOLD_EXPIRED') || msg.startsWith('PAYMENT_UNVERIFIED') || msg.startsWith('INSUFFICIENT_STOCK')
      ? 409
      : 400

    return NextResponse.json({ error: msg }, { status: statusCode })
  }
}
