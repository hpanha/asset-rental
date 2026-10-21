import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const search = searchParams.get('search')?.toLowerCase() || ''
    const status = searchParams.get('status') || 'all'
    const categoryId = searchParams.get('categoryId') || 'all'

    // Fetch all blocked intervals
    const blocks = await db.assetBlockedInterval.findMany({
      include: {
        listing: {
          select: {
            id: true,
            name: true,
            code: true,
            coverImage: true,
            category: { select: { id: true, name: true } },
          },
        },
        unit: {
          include: { location: true },
        },
      },
      orderBy: { startAt: 'desc' },
    })

    // Fetch units in MAINTENANCE or RETIRED (Archived)
    const units = await db.assetUnit.findMany({
      where: {
        baseStatus: { in: ['MAINTENANCE', 'RETIRED'] },
      },
      include: {
        listing: {
          select: {
            id: true,
            name: true,
            code: true,
            coverImage: true,
            category: { select: { id: true, name: true } },
          },
        },
        location: true,
      },
      orderBy: { updatedAt: 'desc' },
    })

    // Fetch categories and listings for modal & filtering
    const categories = await db.assetCategory.findMany({
      select: { id: true, name: true },
      orderBy: { displayOrder: 'asc' },
    })

    const listings = await db.assetListing.findMany({
      select: {
        id: true,
        name: true,
        code: true,
        units: {
          select: { id: true, assetTag: true, serialNumber: true, baseStatus: true },
        },
      },
      orderBy: { name: 'asc' },
    })

    // Build unified maintenance records
    const records: any[] = []
    const coveredUnitIds = new Set<string>()

    for (const b of blocks) {
      if (b.unitId) {
        coveredUnitIds.add(b.unitId)
      }

      const now = new Date()
      const isPast = new Date(b.endAt) < now
      const isUnitMaintenance = b.unit?.baseStatus === 'MAINTENANCE'

      let recordStatus: 'MAINTENANCE' | 'SCHEDULED' | 'COMPLETED' | 'ARCHIVED' = 'SCHEDULED'
      if (b.unit?.baseStatus === 'RETIRED') {
        recordStatus = 'ARCHIVED'
      } else if (isUnitMaintenance || (!isPast && new Date(b.startAt) <= now)) {
        recordStatus = 'MAINTENANCE'
      } else if (isPast) {
        recordStatus = 'COMPLETED'
      } else {
        recordStatus = 'SCHEDULED'
      }

      records.push({
        id: `block-${b.id}`,
        type: 'BLOCK',
        blockId: b.id,
        listingId: b.listing.id,
        listingName: b.listing.name,
        listingCode: b.listing.code,
        categoryName: b.listing.category?.name || 'Equipment',
        categoryId: b.listing.category?.id,
        coverImage: b.listing.coverImage,
        unitId: b.unit?.id || null,
        code: b.unit ? b.unit.assetTag : b.listing.code,
        target: b.unit ? `Unit ${b.unit.assetTag}` : 'Entire Listing',
        targetType: b.unit ? 'UNIT' : 'LISTING',
        targetTitle: b.listing.name,
        locationName: b.unit?.location?.name || 'Phnom Penh Hub',
        conditionGrade: b.unit?.conditionGrade || null,
        description: b.reason,
        notes: b.notes,
        scheduledBy: b.createdBy || 'Admin',
        startAt: b.startAt.toISOString(),
        endAt: b.endAt.toISOString(),
        status: recordStatus,
        baseStatus: b.unit?.baseStatus || 'ACTIVE',
        createdAt: b.createdAt.toISOString(),
      })
    }

    // Add units in MAINTENANCE or RETIRED not covered by a block
    for (const u of units) {
      if (coveredUnitIds.has(u.id)) continue

      const recordStatus = u.baseStatus === 'RETIRED' ? 'ARCHIVED' : 'MAINTENANCE'

      records.push({
        id: `unit-${u.id}`,
        type: 'UNIT',
        blockId: null,
        listingId: u.listing.id,
        listingName: u.listing.name,
        listingCode: u.listing.code,
        categoryName: u.listing.category?.name || 'Equipment',
        categoryId: u.listing.category?.id,
        coverImage: u.listing.coverImage,
        unitId: u.id,
        code: u.assetTag,
        target: `Unit ${u.assetTag}`,
        targetType: 'UNIT',
        targetTitle: u.listing.name,
        locationName: u.location?.name || 'Phnom Penh Hub',
        conditionGrade: u.conditionGrade,
        description:
          u.notes ||
          (u.baseStatus === 'RETIRED'
            ? 'Archived unit removed from active service'
            : 'Physical unit under active technical service'),
        notes: u.notes,
        scheduledBy: 'Admin Staff',
        startAt: u.updatedAt.toISOString(),
        endAt: null,
        status: recordStatus,
        baseStatus: u.baseStatus,
        createdAt: u.createdAt.toISOString(),
      })
    }

    // Filtering
    let filtered = records
    if (search) {
      filtered = filtered.filter(
        (r) =>
          r.code?.toLowerCase().includes(search) ||
          r.description?.toLowerCase().includes(search) ||
          r.target?.toLowerCase().includes(search) ||
          r.targetTitle?.toLowerCase().includes(search) ||
          r.scheduledBy?.toLowerCase().includes(search) ||
          r.notes?.toLowerCase().includes(search)
      )
    }

    if (status !== 'all') {
      filtered = filtered.filter((r) => r.status === status)
    }

    if (categoryId !== 'all') {
      filtered = filtered.filter((r) => r.categoryId === categoryId)
    }

    // Stats
    const stats = {
      total: records.length,
      maintenance: records.filter((r) => r.status === 'MAINTENANCE').length,
      scheduled: records.filter((r) => r.status === 'SCHEDULED').length,
      archived: records.filter((r) => r.status === 'ARCHIVED').length,
      completed: records.filter((r) => r.status === 'COMPLETED').length,
    }

    return NextResponse.json({
      items: filtered,
      stats,
      categories,
      listings,
    })
  } catch (error: any) {
    console.error('Error fetching maintenance:', error)
    return NextResponse.json({ error: error.message || 'Failed to fetch maintenance' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { listingId, unitId, reason, startAt, endAt, notes, createdBy } = body

    if (!listingId || !reason || !startAt || !endAt) {
      return NextResponse.json(
        { error: 'Listing, reason, start date, and end date are required.' },
        { status: 400 }
      )
    }

    const startDate = new Date(startAt)
    const endDate = new Date(endAt)
    if (endDate <= startDate) {
      return NextResponse.json(
        { error: 'End date must be strictly after start date.' },
        { status: 400 }
      )
    }

    const block = await db.$transaction(async (tx) => {
      const b = await tx.assetBlockedInterval.create({
        data: {
          listingId,
          unitId: unitId || null,
          startAt: startDate,
          endAt: endDate,
          reason,
          notes: notes || null,
          createdBy: createdBy || 'Admin',
        },
      })

      if (unitId) {
        await tx.assetUnit.update({
          where: { id: unitId },
          data: { baseStatus: 'MAINTENANCE' },
        })
      }

      await tx.assetAuditEvent.create({
        data: {
          listingId,
          entityType: 'INTERVAL',
          entityId: b.id,
          actorName: createdBy || 'Admin',
          action: 'MAINTENANCE_BLOCK',
          afterJson: JSON.stringify({ unitId, reason, startAt, endAt }),
        },
      })

      return b
    })

    return NextResponse.json({ success: true, message: 'Maintenance scheduled successfully!', block })
  } catch (error: any) {
    console.error('Error scheduling maintenance:', error)
    return NextResponse.json({ error: error.message || 'Failed to schedule maintenance' }, { status: 500 })
  }
}
