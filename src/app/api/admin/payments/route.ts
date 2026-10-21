import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status') || 'ALL'
    const search = searchParams.get('search')?.trim().toLowerCase() || ''

    const whereClause: any = {}
    if (status !== 'ALL') {
      whereClause.paymentStatus = status
    }

    if (search) {
      whereClause.OR = [
        { request: { requestNo: { contains: search } } },
        { request: { contactName: { contains: search } } },
        { request: { contactEmail: { contains: search } } },
        { receipt: { receiptNo: { contains: search } } },
      ]
    }

    const orders = await db.rentalPaymentOrder.findMany({
      where: whereClause,
      include: {
        request: {
          select: {
            id: true,
            requestNo: true,
            status: true,
            contactName: true,
            contactEmail: true,
            contactPhone: true,
            startAt: true,
            endAt: true,
            rentalDays: true,
            listing: { select: { id: true, name: true, code: true, coverImage: true } },
            inventoryHold: true,
            depositLedger: true,
          },
        },
        attempts: {
          orderBy: { createdAt: 'desc' },
        },
        receipt: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    // Compute financial aggregates
    const paidOrders = await db.rentalPaymentOrder.findMany({
      where: { paymentStatus: 'PAID' },
      select: { rentalAmount: true, depositAmount: true, totalDue: true },
    })

    const totalRevenue = paidOrders.reduce((sum, o) => sum + o.rentalAmount, 0)
    const totalDepositHeld = paidOrders.reduce((sum, o) => sum + o.depositAmount, 0)
    const totalCollected = paidOrders.reduce((sum, o) => sum + o.totalDue, 0)

    const pendingManualCount = await db.rentalPaymentOrder.count({
      where: { paymentStatus: 'REQUIRES_REVIEW' },
    })

    const paidOrdersCount = paidOrders.length
    const totalOrdersCount = await db.rentalPaymentOrder.count()

    const formattedOrders = orders.map((o) => ({
      ...o,
      status: o.paymentStatus,
      request: {
        ...o.request,
        requestNumber: o.request.requestNo,
        renterName: o.request.contactName,
        renterEmail: o.request.contactEmail,
        renterPhone: o.request.contactPhone,
        startDate: o.request.startAt ? o.request.startAt.toISOString() : '',
        endDate: o.request.endAt ? o.request.endAt.toISOString() : '',
        totalDays: o.request.rentalDays,
        asset: {
          id: o.request.listing.id,
          name: o.request.listing.name,
          primaryImageUrl: o.request.listing.coverImage,
        },
        inventoryHolds: o.request.inventoryHold ? [o.request.inventoryHold] : [],
        depositLedger: o.request.depositLedger
          ? {
              id: o.request.depositLedger.id,
              collected: o.request.depositLedger.collectedAmount,
              held: o.request.depositLedger.heldAmount,
              deducted: o.request.depositLedger.deductedAmount,
              refunded: o.request.depositLedger.refundedAmount,
              liabilityBalance: o.request.depositLedger.liabilityBalance,
            }
          : undefined,
      },
    }))

    const stats = {
      totalRevenue,
      totalDepositHeld,
      pendingVerificationCount: pendingManualCount,
      paidCount: paidOrdersCount,
      totalCollected,
      totalOrders: totalOrdersCount,
    }

    return NextResponse.json({
      orders: formattedOrders,
      payments: formattedOrders,
      stats,
      metrics: {
        total_collected: totalCollected,
        rental_revenue: totalRevenue,
        held_deposits_liability: totalDepositHeld,
        pending_verifications: pendingManualCount,
        total_orders: totalOrdersCount,
      },
    })
  } catch (error: any) {
    console.error('Error fetching admin payments:', error)
    return NextResponse.json({ error: error.message || 'Failed to fetch payments' }, { status: 500 })
  }
}
