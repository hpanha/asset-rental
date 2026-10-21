import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const statusFilter = searchParams.get('status')

    const whereClause: any = {
      renterId: user.id,
    }

    if (statusFilter && statusFilter !== 'ALL') {
      whereClause.status = statusFilter
    }

    const requests = await db.rentalRequest.findMany({
      where: whereClause,
      include: {
        listing: {
          select: {
            id: true,
            code: true,
            name: true,
            slug: true,
            coverImage: true,
            category: { select: { id: true, name: true } },
            brand: { select: { id: true, name: true } },
          },
        },
        pickupLocation: {
          select: { id: true, name: true, address: true, city: true },
        },
        returnLocation: {
          select: { id: true, name: true, address: true, city: true },
        },
        quoteSnapshot: true,
        deliveryAddress: true,
        inventoryHold: true,
        approvalDecisions: {
          orderBy: { decidedAt: 'desc' },
          take: 1,
        },
        changeProposals: {
          where: { status: 'PENDING_RENTER_RESPONSE' },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        events: {
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { submittedAt: 'desc' },
    })

    return NextResponse.json({ requests })
  } catch (error: any) {
    console.error('Error fetching rental requests:', error)
    return NextResponse.json({ error: error.message || 'Failed to fetch requests' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized. Please sign in to submit a rental request.' }, { status: 401 })
    }

    const body = await req.json()
    const {
      listing_id,
      start_at,
      end_at,
      quantity = 1,
      fulfillment = 'PICKUP',
      pickup_location_id,
      return_location_id,
      contact_name,
      contact_phone,
      contact_email,
      organization_name,
      customer_notes,
      quote_token,
      terms_accepted,
      terms_version_id = 'rental-terms-2026.1',
      idempotency_key = req.headers.get('idempotency-key') || body.idempotency_key,
      delivery_address,
    } = body

    // 1. Check idempotency key if provided
    if (idempotency_key) {
      const existing = await db.rentalRequest.findFirst({
        where: {
          renterId: user.id,
          idempotencyKey: idempotency_key,
        },
        include: {
          listing: {
            select: { id: true, code: true, name: true, slug: true, coverImage: true },
          },
          quoteSnapshot: true,
          pickupLocation: true,
          deliveryAddress: true,
        },
      })

      if (existing) {
        return NextResponse.json(
          {
            success: true,
            is_duplicate: true,
            request: existing,
            message: 'Original request retrieved via idempotency key.',
          },
          { status: 200 }
        )
      }
    }

    // 2. Validate mandatory consent
    if (!terms_accepted) {
      return NextResponse.json(
        { error: 'You must review and agree to the Terms of Service & Rental Agreement to proceed.' },
        { status: 400 }
      )
    }

    // 3. Validate contact info
    if (!contact_name || !contact_phone || !contact_email) {
      return NextResponse.json(
        { error: 'Contact name, phone number, and email address are required.' },
        { status: 400 }
      )
    }

    // 4. Validate dates
    if (!start_at || !end_at) {
      return NextResponse.json(
        { error: 'Rental start and return dates are required.' },
        { status: 400 }
      )
    }

    const startDate = new Date(start_at)
    const endDate = new Date(end_at)
    const now = new Date()

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return NextResponse.json({ error: 'Invalid date formats provided.' }, { status: 400 })
    }

    // Buffer check: start must be at least now (with a 5 min grace window for client clock drift)
    if (startDate.getTime() < now.getTime() - 5 * 60 * 1000) {
      return NextResponse.json({ error: 'Rental start date cannot be in the past.' }, { status: 400 })
    }

    if (endDate <= startDate) {
      return NextResponse.json({ error: 'Return date must be strictly after the start date.' }, { status: 400 })
    }

    const requestedQty = Math.max(1, parseInt(quantity, 10))

    // 5. Fetch and validate listing
    const listing = await db.assetListing.findFirst({
      where: {
        OR: [{ id: listing_id }, { slug: listing_id }],
        visibility: 'PUBLISHED',
      },
      include: {
        company: true,
        rates: { where: { isPrimary: true }, take: 1 },
        rentalPolicy: true,
        locationOptions: { include: { location: true } },
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
      return NextResponse.json({ error: 'Asset listing not found or is currently unavailable.' }, { status: 404 })
    }

    // 6. Fulfillment checks
    if (fulfillment === 'DELIVERY') {
      if (!listing.allowDelivery) {
        return NextResponse.json(
          { error: 'Delivery is not supported for this asset. Please select pickup.' },
          { status: 400 }
        )
      }
      if (!delivery_address || !delivery_address.address_line1 || !delivery_address.city) {
        return NextResponse.json(
          { error: 'Street address and city are required for delivery.' },
          { status: 400 }
        )
      }
    } else {
      // PICKUP
      if (!pickup_location_id) {
        return NextResponse.json(
          { error: 'Please select an authorized pickup location.' },
          { status: 400 }
        )
      }
      const validLocation = listing.locationOptions.some(
        (opt) => opt.locationId === pickup_location_id && opt.pickupEnabled
      )
      if (!validLocation) {
        return NextResponse.json(
          { error: 'Selected pickup location is not available for this asset.' },
          { status: 400 }
        )
      }
    }

    // 7. Duration calculation
    const diffMs = endDate.getTime() - startDate.getTime()
    const diffDays = Math.max(1, Math.round(diffMs / (1000 * 60 * 60 * 24)))

    // Check policy min duration
    const minDays = listing.rentalPolicy?.minimumDuration || 1
    if (diffDays < minDays) {
      return NextResponse.json(
        { error: `Minimum rental duration for this equipment is ${minDays} day(s).` },
        { status: 400 }
      )
    }

    // 8. Recheck real-time stock / unit availability
    const availableUnits = listing.units.filter((unit) => {
      if (fulfillment === 'PICKUP' && pickup_location_id && unit.locationId !== pickup_location_id) {
        return false
      }
      // Check blocked intervals
      const hasBlocked = unit.blockedIntervals.some((b) => {
        return startDate < b.endAt && endDate > b.startAt
      })
      if (hasBlocked) return false

      // Check active bookings
      const hasBooking = unit.bookings.some((bk) => {
        return startDate < bk.endDate && endDate > bk.startDate
      })
      if (hasBooking) return false

      return true
    })

    if (availableUnits.length < requestedQty) {
      return NextResponse.json(
        {
          error: `Only ${availableUnits.length} unit(s) available for the selected dates. Please adjust quantity or dates.`,
          code: 'STOCK_UNAVAILABLE',
          available_quantity: availableUnits.length,
        },
        { status: 409 }
      )
    }

    // 9. Independent server-side commercial quote computation
    const primaryRate = listing.rates[0] || {
      rateAmount: 0,
      currency: 'USD',
      billingUnit: 'DAY',
    }
    const policy = listing.rentalPolicy

    const dailyRate = primaryRate.rateAmount
    const rentalSubtotal = dailyRate * diffDays * requestedQty
    const securityDeposit = (policy?.securityDeposit || 0) * requestedQty
    const deliveryFee =
      fulfillment === 'DELIVERY' && listing.allowDelivery ? listing.deliveryFee || 0 : 0
    const estimatedTax = 0
    const totalPayable = rentalSubtotal + securityDeposit + deliveryFee + estimatedTax

    const contingentLateFee = policy?.lateFeeAmount || 0
    const contingentLateFeeUnit = policy?.lateFeeUnit || 'DAY'

    // 10. Generate sequential unique request number (e.g. REQ-2026-000001)
    const currentYear = new Date().getFullYear()
    const countThisYear = await db.rentalRequest.count({
      where: {
        submittedAt: {
          gte: new Date(`${currentYear}-01-01T00:00:00.000Z`),
        },
      },
    })
    const seq = (countThisYear + 1).toString().padStart(6, '0')
    const requestNo = `REQ-${currentYear}-${seq}`

    // 11. Atomic database transaction
    const newRequest = await db.$transaction(async (tx) => {
      // Create request
      const reqRecord = await tx.rentalRequest.create({
        data: {
          requestNo,
          renterId: user.id,
          listingId: listing.id,
          companyId: listing.companyId,
          status: 'PENDING_APPROVAL',
          startAt: startDate,
          endAt: endDate,
          rentalDays: diffDays,
          quantity: requestedQty,
          fulfillment,
          pickupLocationId: fulfillment === 'PICKUP' ? pickup_location_id : null,
          returnLocationId: fulfillment === 'PICKUP' ? (return_location_id || pickup_location_id) : null,
          contactName: contact_name.trim(),
          contactPhone: contact_phone.trim(),
          contactEmail: contact_email.trim().toLowerCase(),
          organizationName: organization_name ? organization_name.trim() : null,
          customerNotes: customer_notes ? customer_notes.trim().slice(0, 500) : null,
          idempotencyKey: idempotency_key || null,
          quoteToken: quote_token || null,
        },
      })

      // Create immutable quote snapshot
      await tx.rentalQuoteSnapshot.create({
        data: {
          requestId: reqRecord.id,
          currency: primaryRate.currency || 'USD',
          billingUnit: primaryRate.billingUnit || 'DAY',
          unitRate: dailyRate,
          rentalDays: diffDays,
          quantity: requestedQty,
          rentalSubtotal,
          securityDeposit,
          deliveryFee,
          estimatedTax,
          totalPayable,
          contingentLateFee,
          contingentLateFeeUnit,
        },
      })

      // Create delivery address snapshot if delivery
      if (fulfillment === 'DELIVERY' && delivery_address) {
        await tx.rentalRequestAddress.create({
          data: {
            requestId: reqRecord.id,
            recipientName: (delivery_address.recipient_name || contact_name).trim(),
            recipientPhone: (delivery_address.recipient_phone || contact_phone).trim(),
            addressLine1: delivery_address.address_line1.trim(),
            addressLine2: delivery_address.address_line2 ? delivery_address.address_line2.trim() : null,
            city: delivery_address.city.trim(),
            postalCode: delivery_address.postal_code ? delivery_address.postal_code.trim() : null,
            deliveryNotes: delivery_address.delivery_notes ? delivery_address.delivery_notes.trim().slice(0, 300) : null,
          },
        })
      }

      // Create terms acceptance record
      await tx.rentalTermsAcceptance.create({
        data: {
          requestId: reqRecord.id,
          termsVersionId: terms_version_id,
          actorId: user.id,
          ipAddress: req.headers.get('x-forwarded-for') || null,
        },
      })

      // Create initial audit event
      await tx.rentalRequestEvent.create({
        data: {
          requestId: reqRecord.id,
          actorId: user.id,
          actorName: user.name || contact_name,
          actorType: 'RENTER',
          action: 'SUBMIT',
          fromStatus: null,
          toStatus: 'PENDING_APPROVAL',
          reason: 'Initial rental request submitted by renter',
        },
      })

      return reqRecord
    })

    return NextResponse.json(
      {
        success: true,
        request_id: newRequest.id,
        request_no: newRequest.requestNo,
        status: newRequest.status,
        submitted_at: newRequest.submittedAt,
        message: 'Rental request successfully submitted for review.',
      },
      { status: 201 }
    )
  } catch (error: any) {
    console.error('Error submitting rental request:', error)
    return NextResponse.json(
      { error: error.message || 'An unexpected error occurred while submitting your rental request.' },
      { status: 500 }
    )
  }
}
