import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    const { searchParams } = new URL(req.url)
    const startStr = searchParams.get('start')
    const endStr = searchParams.get('end')
    const requestedQty = Math.max(1, parseInt(searchParams.get('quantity') || '1', 10))

    if (!startStr || !endStr) {
      return NextResponse.json(
        { error: 'Start and End dates are required (ISO 8601 strings).' },
        { status: 400 }
      )
    }

    const requestedStart = new Date(startStr)
    const requestedEnd = new Date(endStr)

    if (isNaN(requestedStart.getTime()) || isNaN(requestedEnd.getTime())) {
      return NextResponse.json({ error: 'Invalid start or end date format.' }, { status: 400 })
    }

    if (requestedEnd <= requestedStart) {
      return NextResponse.json(
        { error: 'End date must be greater than start date.' },
        { status: 400 }
      )
    }

    const listing = await db.assetListing.findFirst({
      where: {
        OR: [{ slug }, { id: slug }],
        visibility: 'PUBLISHED',
      },
      include: {
        rates: { where: { isPrimary: true }, take: 1 },
        rentalPolicy: true,
        units: {
          where: { baseStatus: 'ACTIVE' },
          include: {
            blockedIntervals: true,
            bookings: {
              where: {
                status: { in: ['confirmed', 'paid', 'active'] },
              },
            },
          },
        },
      },
    })

    if (!listing) {
      return NextResponse.json({ error: 'Asset listing not found or not published' }, { status: 404 })
    }

    const policy = listing.rentalPolicy
    const prepBufferMs = (policy?.preparationBufferMinutes || 120) * 60 * 1000
    const returnBufferMs = (policy?.returnBufferMinutes || 120) * 60 * 1000

    // Buffer-adjusted window for the requested booking:
    // [effectiveStart, effectiveEnd)
    const effectiveStart = new Date(requestedStart.getTime() - prepBufferMs)
    const effectiveEnd = new Date(requestedEnd.getTime() + returnBufferMs)

    // Evaluate each serialized unit for interval conflicts
    const availableUnits: string[] = []
    const conflictedUnits: { unitId: string; reason: string }[] = []

    for (const unit of listing.units) {
      // 1. Check blocked intervals
      const hasBlockOverlap = unit.blockedIntervals.some((block) => {
        const bStart = new Date(block.startAt)
        const bEnd = new Date(block.endAt)
        // Two intervals [A, B) and [C, D) overlap if A < D and C < B
        return effectiveStart < bEnd && bStart < effectiveEnd
      })

      if (hasBlockOverlap) {
        conflictedUnits.push({ unitId: unit.id, reason: 'Maintenance or administrative blackout' })
        continue
      }

      // 2. Check confirmed bookings (Step 02 compatibility)
      const hasBookingOverlap = unit.bookings.some((booking) => {
        const bkStart = new Date(booking.startDate)
        const bkEnd = new Date(booking.endDate)
        return effectiveStart < bkEnd && bkStart < effectiveEnd
      })

      if (hasBookingOverlap) {
        conflictedUnits.push({ unitId: unit.id, reason: 'Committed reservation' })
        continue
      }

      availableUnits.push(unit.id)
    }

    const isAvailable = availableUnits.length >= requestedQty

    // Duration calculation in days
    const diffMs = requestedEnd.getTime() - requestedStart.getTime()
    const diffDays = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)))
    const primaryRate = listing.rates[0]?.rateAmount || 0
    const estimatedRentalFee = primaryRate * diffDays * requestedQty
    const depositRequired = (policy?.securityDeposit || 0) * requestedQty

    return NextResponse.json({
      listingId: listing.id,
      slug: listing.slug,
      name: listing.name,
      currency: listing.rates[0]?.currency || 'USD',
      billingUnit: listing.rates[0]?.billingUnit || 'DAY',
      requestedStart: requestedStart.toISOString(),
      requestedEnd: requestedEnd.toISOString(),
      rentalDays: diffDays,
      requestedQuantity: requestedQty,
      isAvailable,
      availableCount: availableUnits.length,
      availableUnitIds: availableUnits,
      minimumDurationDays: policy?.minimumDuration || 1,
      pricingQuote: {
        dailyRate: primaryRate,
        estimatedRentalTotal: estimatedRentalFee,
        securityDeposit: depositRequired,
        totalInitialPayable: estimatedRentalFee + depositRequired,
      },
    })
  } catch (error: any) {
    console.error('Error calculating availability:', error)
    return NextResponse.json({ error: error.message || 'Failed to check availability' }, { status: 500 })
  }
}
