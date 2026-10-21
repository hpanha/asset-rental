import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await req.json().catch(() => ({}))
    const {
      inspectorName = 'Quality Inspection Team',
      verdict = 'PASS',
      notes = 'Inspection completed and verified against Step 07 baseline.',
      cleaningFee = 0,
      damageFee = 0,
      missingItemsFee = 0,
      unitFindings = [],
    } = body

    const inspection = await db.rentalInspection.findFirst({
      where: {
        OR: [{ id }, { reservationId: id }],
      },
      include: {
        reservation: {
          include: {
            request: {
              include: {
                quoteSnapshot: true,
                paymentOrder: { include: { receipt: true } },
                depositLedger: true,
              },
            },
            lines: {
              include: {
                unitAllocations: true,
              },
            },
            returnCase: true,
          },
        },
      },
    })

    if (!inspection) {
      return NextResponse.json({ error: 'Inspection task not found' }, { status: 404 })
    }

    const reservation = inspection.reservation
    const now = new Date()

    // Compute late fee if returned after due date
    let calculatedLateFee = 0
    const returnReceivedAt = reservation.returnCase?.actualReceivedAt || now
    const agreedDueDate = new Date(reservation.endAt)

    if (returnReceivedAt > agreedDueDate) {
      const lateMs = returnReceivedAt.getTime() - agreedDueDate.getTime()
      const lateHours = lateMs / (1000 * 60 * 60)
      if (lateHours > 1) { // 1 hour grace window
        const dailyRate = reservation.request.quoteSnapshot?.unitRate || 25
        const lateDays = Math.ceil(lateHours / 24)
        calculatedLateFee = lateDays * dailyRate * (reservation.request.quantity || 1)
      }
    }

    const depositHeld = reservation.request.depositLedger?.heldAmount ?? (reservation.request.paymentOrder?.depositAmount || 0)
    const totalDeductions = calculatedLateFee + damageFee + missingItemsFee + cleaningFee
    const netRefundAmount = Math.max(0, depositHeld - totalDeductions)
    const additionalDueAmount = Math.max(0, totalDeductions - depositHeld)

    const isClearPass = verdict === 'PASS' && totalDeductions === 0

    await db.$transaction(async (tx) => {
      // 1. Update Inspection Record
      await tx.rentalInspection.update({
        where: { id: inspection.id },
        data: {
          status: 'COMPLETED',
          completedAt: now,
          inspectorName,
          verdict,
          notes,
        },
      })

      // 2. Create/Update Inspection Items
      const allocations = reservation.lines[0]?.unitAllocations || []
      for (const alloc of allocations) {
        const finding = unitFindings.find((f: any) => f.unitId === alloc.unitId)
        const itemVerdict = finding?.verdict || verdict
        const itemDisp = finding?.disposition || (itemVerdict === 'PASS' ? 'AVAILABLE' : 'MAINTENANCE')

        await tx.rentalInspectionItem.create({
          data: {
            inspectionId: inspection.id,
            unitId: alloc.unitId,
            conditionGrade: finding?.conditionGrade || 'GOOD',
            functionalResult: finding?.functionalResult || 'PASS',
            verdict: itemVerdict,
            disposition: itemDisp,
            damageNotes: finding?.damageNotes || null,
            estimatedRepairCost: finding?.estimatedRepairCost || 0,
          },
        })

        // If unit needs repair or maintenance, log a maintenance task
        if (itemDisp === 'MAINTENANCE') {
          await tx.rentalMaintenanceTask.create({
            data: {
              unitId: alloc.unitId,
              reservationId: reservation.id,
              issueDescription: finding?.damageNotes || 'Discovered damage during Step 10 return inspection',
              priority: itemVerdict === 'DAMAGED' ? 'HIGH' : 'MEDIUM',
              status: 'OPEN',
            },
          })
        }
      }

      // 3. Upsert Settlement Record
      await tx.rentalSettlement.upsert({
        where: { reservationId: reservation.id },
        update: {
          depositHeld,
          lateFee: calculatedLateFee,
          damageFee,
          missingItemsFee,
          cleaningFee,
          totalDeductions,
          netRefundAmount,
          additionalDueAmount,
          status: isClearPass ? 'APPROVED' : 'PENDING',
          approvedBy: isClearPass ? inspectorName : null,
          approvedAt: isClearPass ? now : null,
          notes,
        },
        create: {
          reservationId: reservation.id,
          currency: reservation.request.quoteSnapshot?.currency || 'USD',
          rentalAmount: reservation.request.paymentOrder?.rentalAmount || 0,
          depositHeld,
          lateFee: calculatedLateFee,
          damageFee,
          missingItemsFee,
          cleaningFee,
          totalDeductions,
          netRefundAmount,
          additionalDueAmount,
          status: isClearPass ? 'APPROVED' : 'PENDING',
          approvedBy: isClearPass ? inspectorName : null,
          approvedAt: isClearPass ? now : null,
          notes,
        },
      })

      // 4. Update Reservation Status
      const nextStatus = isClearPass ? 'SETTLED' : 'SETTLEMENT_PENDING'
      await tx.rentalReservation.update({
        where: { id: reservation.id },
        data: {
          status: nextStatus,
          version: reservation.version + 1,
        },
      })

      // 5. Update Request Status
      await tx.rentalRequest.update({
        where: { id: reservation.requestId },
        data: {
          status: nextStatus,
        },
      })

      // 6. Audit Trail
      await tx.rentalReservationEvent.create({
        data: {
          reservationId: reservation.id,
          actorName: inspectorName,
          actorRole: 'ADMIN',
          action: 'COMPLETE_INSPECTION',
          fromStatus: reservation.status,
          toStatus: nextStatus,
          notes: `Inspection completed with verdict ${verdict}. Total Deductions: $${totalDeductions.toFixed(2)}, Net Refund: $${netRefundAmount.toFixed(2)}.`,
        },
      })
    })

    return NextResponse.json({
      success: true,
      verdict,
      settlement: {
        depositHeld,
        lateFee: calculatedLateFee,
        damageFee,
        missingItemsFee,
        cleaningFee,
        totalDeductions,
        netRefundAmount,
        additionalDueAmount,
        status: isClearPass ? 'APPROVED' : 'PENDING',
      },
      message: 'Inspection completed and financial settlement calculated.',
    })
  } catch (error: any) {
    console.error('Error completing inspection:', error)
    return NextResponse.json({ error: error.message || 'Failed to complete inspection' }, { status: 500 })
  }
}
