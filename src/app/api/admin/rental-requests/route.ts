import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status') || 'PENDING_APPROVAL'
    const search = searchParams.get('search')?.trim().toLowerCase() || ''

    const whereClause: any = {}

    if (status !== 'ALL') {
      whereClause.status = status
    }

    if (search) {
      whereClause.OR = [
        { requestNo: { contains: search } },
        { contactName: { contains: search } },
        { contactEmail: { contains: search } },
        { contactPhone: { contains: search } },
        { listing: { name: { contains: search } } },
      ]
    }

    // Auto-reap expired holds on queue fetch
    const now = new Date()
    const expiredHolds = await db.rentalInventoryHold.findMany({
      where: {
        status: 'ACTIVE',
        expiresAt: { lt: now },
      },
      select: { id: true, requestId: true },
    })

    if (expiredHolds.length > 0) {
      await db.$transaction(async (tx) => {
        for (const hold of expiredHolds) {
          await tx.rentalInventoryHold.update({
            where: { id: hold.id },
            data: { status: 'EXPIRED' },
          })
          const reqItem = await tx.rentalRequest.findUnique({
            where: { id: hold.requestId },
            select: { id: true, status: true },
          })
          if (reqItem && reqItem.status === 'APPROVED_AWAITING_PAYMENT') {
            await tx.rentalRequest.update({
              where: { id: reqItem.id },
              data: { status: 'PAYMENT_EXPIRED' },
            })
            await tx.rentalRequestEvent.create({
              data: {
                requestId: reqItem.id,
                actorId: 'SYSTEM',
                actorName: 'System Scheduler',
                actorType: 'SYSTEM',
                action: 'EXPIRE_HOLD',
                fromStatus: 'APPROVED_AWAITING_PAYMENT',
                toStatus: 'PAYMENT_EXPIRED',
                reason: 'Payment deadline passed without successful payment hold settlement',
              },
            })
          }
        }
      })
    }

    // Fetch requests
    const requests = await db.rentalRequest.findMany({
      where: whereClause,
      include: {
        renter: {
          select: { id: true, name: true, email: true, phone: true, avatar: true },
        },
        listing: {
          select: {
            id: true,
            code: true,
            name: true,
            slug: true,
            coverImage: true,
            category: { select: { id: true, name: true } },
            brand: { select: { id: true, name: true } },
            units: {
              where: { baseStatus: 'ACTIVE' },
              select: {
                id: true,
                assetTag: true,
                blockedIntervals: true,
                bookings: {
                  where: { status: { in: ['confirmed', 'paid', 'active'] } },
                },
                holdUnits: {
                  include: {
                    hold: {
                      select: { id: true, status: true, startAt: true, endAt: true, expiresAt: true },
                    },
                  },
                },
              },
            },
          },
        },
        pickupLocation: {
          select: { id: true, name: true, city: true },
        },
        quoteSnapshot: true,
        deliveryAddress: true,
        inventoryHold: {
          include: {
            units: {
              include: { unit: { select: { id: true, assetTag: true } } },
            },
          },
        },
        approvalDecisions: {
          orderBy: { decidedAt: 'desc' },
          take: 1,
        },
        changeProposals: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { submittedAt: 'desc' },
    })

    // Compute metrics counts
    const [totalPending, totalApproved, totalRejected, totalAll, totalExpired] = await Promise.all([
      db.rentalRequest.count({ where: { status: 'PENDING_APPROVAL' } }),
      db.rentalRequest.count({ where: { status: 'APPROVED_AWAITING_PAYMENT' } }),
      db.rentalRequest.count({ where: { status: 'REJECTED' } }),
      db.rentalRequest.count(),
      db.rentalRequest.count({ where: { status: 'PAYMENT_EXPIRED' } }),
    ])

    // Format requests with real-time stock availability check
    const formattedRequests = requests.map((item) => {
      const start = new Date(item.startAt)
      const end = new Date(item.endAt)

      const availableUnits = item.listing.units.filter((unit) => {
        // Maintenance overlap check
        const inBlocked = unit.blockedIntervals.some((b) => start < b.endAt && end > b.startAt)
        if (inBlocked) return false

        // Booked overlap check
        const inBooking = unit.bookings.some((bk) => start < bk.endDate && end > bk.startDate)
        if (inBooking) return false

        // Hold overlap check (other requests holding this unit)
        const inHold = unit.holdUnits.some((hu) => {
          if (hu.hold.id === item.inventoryHold?.id) return false
          if (hu.hold.status !== 'ACTIVE') return false
          if (new Date(hu.hold.expiresAt) < now) return false
          return start < hu.hold.endAt && end > hu.hold.startAt
        })
        if (inHold) return false

        return true
      })

      const availableCount = availableUnits.length
      const hasConflict = availableCount < item.quantity
      const isUrgent = start.getTime() - now.getTime() < 24 * 60 * 60 * 1000 && start.getTime() > now.getTime()

      return {
        id: item.id,
        requestNo: item.requestNo,
        version: item.version,
        status: item.status,
        submittedAt: item.submittedAt,
        paymentDueAt: item.paymentDueAt,
        startAt: item.startAt,
        endAt: item.endAt,
        rentalDays: item.rentalDays,
        quantity: item.quantity,
        fulfillment: item.fulfillment,
        contactName: item.contactName,
        contactPhone: item.contactPhone,
        contactEmail: item.contactEmail,
        customerNotes: item.customerNotes,
        renter: item.renter,
        listing: {
          id: item.listing.id,
          code: item.listing.code,
          name: item.listing.name,
          slug: item.listing.slug,
          coverImage: item.listing.coverImage,
          categoryName: item.listing.category?.name || 'General',
        },
        pickupLocation: item.pickupLocation,
        deliveryAddress: item.deliveryAddress,
        quoteSnapshot: item.quoteSnapshot,
        inventoryHold: item.inventoryHold,
        latestDecision: item.approvalDecisions[0] || null,
        latestProposal: item.changeProposals[0] || null,
        stockEvaluation: {
          totalActiveUnits: item.listing.units.length,
          availableCount,
          requestedQuantity: item.quantity,
          hasConflict,
          isUrgent,
        },
      }
    })

    return NextResponse.json({
      requests: formattedRequests,
      counts: {
        pending: totalPending,
        approved: totalApproved,
        rejected: totalRejected,
        expired: totalExpired,
        all: totalAll,
      },
    })
  } catch (error: any) {
    console.error('Error in GET /api/admin/rental-requests:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch admin rental requests' },
      { status: 500 }
    )
  }
}
