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

    const reservation = await db.rentalReservation.findFirst({
      where: {
        OR: [{ id }, { bookingNo: id }, { requestId: id }],
        renterId: user.id,
      },
      include: {
        request: {
          include: {
            listing: {
              select: {
                id: true,
                code: true,
                name: true,
                slug: true,
                coverImage: true,
                category: { select: { name: true } },
              },
            },
            quoteSnapshot: true,
            paymentOrder: {
              include: { receipt: true },
            },
            pickupLocation: true,
            deliveryAddress: true,
          },
        },
        lines: {
          include: {
            unitAllocations: {
              select: {
                id: true,
                status: true,
                // Do not expose internal purchase cost or sensitive staff notes to renter
                unit: {
                  select: {
                    assetTag: true,
                    conditionGrade: true,
                    accessories: true,
                  },
                },
              },
            },
          },
        },
        fulfillmentTask: {
          select: {
            status: true,
            pickupAt: true,
            assignedStaffName: true,
          },
        },
        location: true,
      },
    })

    if (!reservation) {
      return NextResponse.json({ error: 'Reservation not found' }, { status: 404 })
    }

    return NextResponse.json({
      booking_no: reservation.bookingNo,
      status: reservation.status,
      confirmed_at: reservation.confirmedAt,
      start_at: reservation.startAt,
      end_at: reservation.endAt,
      fulfillment_mode: reservation.fulfillmentMode,
      asset: {
        name: reservation.request.listing.name,
        code: reservation.request.listing.code,
        category: reservation.request.listing.category?.name,
        cover_image: reservation.request.listing.coverImage,
        quantity: reservation.request.quantity,
        rental_days: reservation.request.rentalDays,
      },
      allocated_equipment: reservation.lines[0]?.unitAllocations.map((a) => ({
        tag: a.unit.assetTag,
        condition: a.unit.conditionGrade,
        accessories: a.unit.accessories,
      })) || [],
      location: reservation.location
        ? {
            name: reservation.location.name,
            address: reservation.location.address,
            city: reservation.location.city,
            timezone: reservation.location.timezone,
          }
        : null,
      delivery_address: reservation.request.deliveryAddress || null,
      fulfillment: {
        task_status: reservation.fulfillmentTask?.status || 'SCHEDULED',
        scheduled_pickup: reservation.fulfillmentTask?.pickupAt || reservation.startAt,
        pickup_instructions:
          'Please bring a valid Government ID or Passport and this Booking Confirmation. An operations specialist will inspect all items with you at the counter.',
      },
      payment: {
        total_paid: reservation.request.paymentOrder?.totalDue,
        currency: reservation.request.paymentOrder?.currency,
        receipt_no: reservation.request.paymentOrder?.receipt?.receiptNo,
        paid_at: reservation.request.paymentOrder?.paidAt,
        deposit_liability: reservation.request.paymentOrder?.depositAmount,
      },
      renter: {
        name: reservation.request.contactName,
        email: reservation.request.contactEmail,
        phone: reservation.request.contactPhone,
      },
    })
  } catch (error: any) {
    console.error('Error fetching renter reservation:', error)
    return NextResponse.json({ error: error.message || 'Failed to fetch reservation' }, { status: 500 })
  }
}
