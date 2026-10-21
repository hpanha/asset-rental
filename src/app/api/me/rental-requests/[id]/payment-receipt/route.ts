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
        company: true,
        listing: {
          select: { name: true, code: true, coverImage: true, category: true },
        },
        paymentOrder: {
          include: {
            receipt: true,
            attempts: {
              where: { status: 'SUCCEEDED' },
              take: 1,
            },
          },
        },
        depositLedger: true,
        pickupLocation: true,
        deliveryAddress: true,
      },
    })

    if (!request || !request.paymentOrder?.receipt) {
      return NextResponse.json(
        { error: 'Payment receipt not found or payment has not been captured yet' },
        { status: 404 }
      )
    }

    const receipt = request.paymentOrder.receipt
    const successfulAttempt = request.paymentOrder.attempts[0]

    return NextResponse.json({
      receipt_no: receipt.receiptNo,
      issued_at: receipt.issuedAt,
      request_no: request.requestNo,
      payment_method: receipt.paymentMethod,
      provider_reference: successfulAttempt?.providerReference || null,
      company: {
        name: request.company?.name || 'RentHub Enterprise Rentals',
        legal_name: request.company?.legalName || 'RentHub Co., Ltd.',
        address: request.company?.address || 'Building 42, Norodom Blvd, Phnom Penh, Cambodia',
        phone: request.company?.phone || '+855 23 888 999',
        email: request.company?.email || 'finance@renthub.app',
      },
      customer: {
        name: request.contactName,
        email: request.contactEmail,
        phone: request.contactPhone,
        organization: request.organizationName || null,
      },
      asset: {
        name: request.listing.name,
        code: request.listing.code,
        category: request.listing.category?.name || 'Equipment',
        quantity: request.quantity,
        rental_days: request.rentalDays,
        start_at: request.startAt,
        end_at: request.endAt,
      },
      breakdown: {
        currency: receipt.currency,
        rental_subtotal: receipt.rentalAmount,
        refundable_deposit: receipt.depositAmount,
        delivery_fee: receipt.deliveryFee,
        tax: receipt.tax,
        total_captured: receipt.totalCaptured,
      },
      legal_disclaimer:
        'The security deposit is held as a refundable customer liability and will be returned upon equipment inspection in Step 10, minus any assessed damages or excess duration fees.',
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch receipt' }, { status: 500 })
  }
}
