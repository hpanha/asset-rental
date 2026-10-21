import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { randomBytes } from 'crypto'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await req.json()
    const {
      location_id,
      start_at,
      end_at,
      quantity = 1,
      fulfillment = 'PICKUP', // PICKUP | DELIVERY
    } = body

    if (!start_at || !end_at) {
      return NextResponse.json(
        { error: 'Start date and end date are required for quote preview.' },
        { status: 400 }
      )
    }

    const startDate = new Date(start_at)
    const endDate = new Date(end_at)
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime()) || endDate <= startDate) {
      return NextResponse.json({ error: 'Invalid date range.' }, { status: 400 })
    }

    const requestedQty = Math.max(1, parseInt(quantity, 10))

    const listing = await db.assetListing.findFirst({
      where: {
        OR: [{ id }, { slug: id }],
        visibility: 'PUBLISHED',
      },
      include: {
        rates: { where: { isPrimary: true }, take: 1 },
        rentalPolicy: true,
        locationOptions: { include: { location: true } },
      },
    })

    if (!listing) {
      return NextResponse.json({ error: 'Listing not found or unpublished.' }, { status: 404 })
    }

    const primaryRate = listing.rates[0] || {
      rateAmount: 0,
      currency: 'USD',
      billingUnit: 'DAY',
    }

    const policy = listing.rentalPolicy

    // Duration calculation in days
    const diffMs = endDate.getTime() - startDate.getTime()
    const diffDays = Math.max(1, Math.round(diffMs / (1000 * 60 * 60 * 24)))

    // Itemized charges
    const dailyRate = primaryRate.rateAmount
    const itemSubtotal = dailyRate * diffDays * requestedQty
    const securityDeposit = (policy?.securityDeposit || 0) * requestedQty
    const deliveryFee =
      fulfillment === 'DELIVERY' && listing.allowDelivery ? listing.deliveryFee || 0 : 0
    const estimatedTax = 0 // Optional regional tax rate
    const totalPayableEstimate = itemSubtotal + securityDeposit + deliveryFee + estimatedTax

    // Contingent fees (disclosed upfront, charged only on violation/extension)
    const contingentLateFee = {
      amount: policy?.lateFeeAmount || 0,
      unit: policy?.lateFeeUnit || 'DAY',
      graceMinutes: policy?.lateGraceMinutes || 30,
      note: 'Assessed only if equipment is returned after scheduled end time.',
    }

    // Generate unique short-lived quote token for Step 03 handoff
    const quoteToken = `QT-${Date.now().toString(36).toUpperCase()}-${randomBytes(4).toString('hex').toUpperCase()}`
    const checkedAt = new Date().toISOString()
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString() // 15 mins validity

    return NextResponse.json({
      quote_token: quoteToken,
      listing_id: listing.id,
      code: listing.code,
      name: listing.name,
      currency: primaryRate.currency || 'USD',
      billing_unit: primaryRate.billingUnit || 'DAY',
      rental_days: diffDays,
      quantity: requestedQty,
      fulfillment,
      rate_amount: dailyRate,
      breakdown: {
        rental_subtotal: itemSubtotal,
        security_deposit: securityDeposit,
        delivery_fee: deliveryFee,
        tax: estimatedTax,
        total_estimated_payable: totalPayableEstimate,
      },
      contingent_fees: contingentLateFee,
      lead_time_notice_minutes: policy?.minAdvanceNoticeMinutes || 120,
      preparation_buffer_minutes: policy?.preparationBufferMinutes || 120,
      return_buffer_minutes: policy?.returnBufferMinutes || 120,
      checked_at: checkedAt,
      quote_expires_at: expiresAt,
      is_indicative: true,
      advisory_note:
        'This is an indicative estimate based on current rates and stock. Inventory is held only upon rental request submission and approval in subsequent steps.',
    })
  } catch (error: any) {
    console.error('Error generating quote preview:', error)
    return NextResponse.json({ error: error.message || 'Failed to generate quote' }, { status: 500 })
  }
}
