import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

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
    } = body

    const checkedAt = new Date().toISOString()

    if (!start_at || !end_at) {
      return NextResponse.json(
        {
          available: false,
          available_quantity: 0,
          checked_at: checkedAt,
          reason_code: 'INVALID_DATES',
          message: 'Pickup start date and return end date are required.',
        },
        { status: 400 }
      )
    }

    const startDate = new Date(start_at)
    const endDate = new Date(end_at)
    const now = new Date()

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return NextResponse.json(
        {
          available: false,
          available_quantity: 0,
          checked_at: checkedAt,
          reason_code: 'INVALID_DATE_FORMAT',
          message: 'Dates must be valid ISO 8601 timestamps.',
        },
        { status: 400 }
      )
    }

    if (startDate < now) {
      return NextResponse.json(
        {
          available: false,
          available_quantity: 0,
          checked_at: checkedAt,
          reason_code: 'PAST_DATE',
          message: 'Rental start date cannot be in the past.',
        },
        { status: 400 }
      )
    }

    if (endDate <= startDate) {
      return NextResponse.json(
        {
          available: false,
          available_quantity: 0,
          checked_at: checkedAt,
          reason_code: 'INVALID_INTERVAL',
          message: 'Return date must be strictly after pickup date.',
        },
        { status: 400 }
      )
    }

    const requestedQty = Math.max(1, parseInt(quantity, 10))

    // Resolve listing
    const listing = await db.assetListing.findFirst({
      where: {
        OR: [{ id }, { slug: id }],
        visibility: 'PUBLISHED',
      },
      include: {
        rentalPolicy: true,
        blockedIntervals: {
          where: { unitId: null },
        },
        units: {
          where: {
            baseStatus: 'ACTIVE',
            ...(location_id ? { locationId: location_id } : {}),
          },
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
      return NextResponse.json(
        {
          available: false,
          available_quantity: 0,
          checked_at: checkedAt,
          reason_code: 'LISTING_NOT_FOUND',
          message: 'Listing does not exist or is no longer published.',
        },
        { status: 404 }
      )
    }

    const policy = listing.rentalPolicy
    const prepBufferMs = (policy?.preparationBufferMinutes || 120) * 60 * 1000
    const returnBufferMs = (policy?.returnBufferMinutes || 120) * 60 * 1000

    // Validate minimum duration
    const diffMs = endDate.getTime() - startDate.getTime()
    const diffDays = Math.max(1, Math.round(diffMs / (1000 * 60 * 60 * 24)))
    if (policy && policy.minimumDuration && diffDays < policy.minimumDuration) {
      return NextResponse.json(
        {
          available: false,
          available_quantity: 0,
          checked_at: checkedAt,
          reason_code: 'DURATION_TOO_SHORT',
          message: `Minimum rental duration for this equipment is ${policy.minimumDuration} ${policy.minimumDurationUnit.toLowerCase()}(s).`,
          minimumDuration: policy.minimumDuration,
        },
        { status: 200 }
      )
    }

    // Lead time check
    const leadTimeMs = (policy?.minAdvanceNoticeMinutes || 120) * 60 * 1000
    if (startDate.getTime() - now.getTime() < leadTimeMs) {
      return NextResponse.json(
        {
          available: false,
          available_quantity: 0,
          checked_at: checkedAt,
          reason_code: 'LEAD_TIME_VIOLATION',
          message: `This equipment requires at least ${Math.round(leadTimeMs / 60000)} minutes advance notice before pickup.`,
        },
        { status: 200 }
      )
    }

    // Buffer-padded evaluation interval [effectiveStart, effectiveEnd)
    const effectiveStart = new Date(startDate.getTime() - prepBufferMs)
    const effectiveEnd = new Date(endDate.getTime() + returnBufferMs)

    // Check if entire listing is blocked by an admin blackout interval
    const hasListingLevelBlock = (listing.blockedIntervals || []).some((b) => {
      const bStart = new Date(b.startAt)
      const bEnd = new Date(b.endAt)
      return effectiveStart < bEnd && bStart < effectiveEnd
    })

    if (hasListingLevelBlock) {
      return NextResponse.json({
        available: false,
        available_quantity: 0,
        requested_quantity: requestedQty,
        checked_at: checkedAt,
        rental_days: diffDays,
        timezone: 'Asia/Phnom_Penh',
        reason_code: 'NO_STOCK_AVAILABLE',
        message: 'This equipment listing is scheduled for blackout / maintenance during the requested window.',
      })
    }

    const availableUnitIds: string[] = []

    for (const unit of listing.units) {
      // 1. Check maintenance/blackout intervals
      const hasBlockConflict = unit.blockedIntervals.some((b) => {
        const bStart = new Date(b.startAt)
        const bEnd = new Date(b.endAt)
        return effectiveStart < bEnd && bStart < effectiveEnd
      })

      if (hasBlockConflict) continue

      // 2. Check bookings
      const hasBookingConflict = unit.bookings.some((bk) => {
        const bkStart = new Date(bk.startDate)
        const bkEnd = new Date(bk.endDate)
        return effectiveStart < bkEnd && bkStart < effectiveEnd
      })

      if (hasBookingConflict) continue

      availableUnitIds.push(unit.id)
    }

    const availableCount = availableUnitIds.length
    const isAvailable = availableCount >= requestedQty

    return NextResponse.json({
      available: isAvailable,
      available_quantity: availableCount,
      requested_quantity: requestedQty,
      checked_at: checkedAt,
      rental_days: diffDays,
      timezone: 'Asia/Phnom_Penh',
      reason_code: isAvailable
        ? null
        : availableCount === 0
        ? 'NO_STOCK_AVAILABLE'
        : 'INSUFFICIENT_STOCK',
      message: isAvailable
        ? `${availableCount} unit(s) available for your requested rental window.`
        : availableCount === 0
        ? 'No units available for the selected dates due to scheduled maintenance or commitments.'
        : `Only ${availableCount} unit(s) available; you requested ${requestedQty}.`,
    })
  } catch (error: any) {
    console.error('Error in availability-check API:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to check availability' },
      { status: 500 }
    )
  }
}
