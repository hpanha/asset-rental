import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const [
      totalListings,
      publishedListings,
      draftListings,
      unpublishedListings,
      archivedListings,
      totalUnits,
      activeUnits,
      maintenanceUnits,
      totalCategories,
      totalLocations,
      recentAuditEvents,
    ] = await Promise.all([
      db.assetListing.count(),
      db.assetListing.count({ where: { visibility: 'PUBLISHED' } }),
      db.assetListing.count({ where: { visibility: 'DRAFT' } }),
      db.assetListing.count({ where: { visibility: 'UNPUBLISHED' } }),
      db.assetListing.count({ where: { visibility: 'ARCHIVED' } }),
      db.assetUnit.count(),
      db.assetUnit.count({ where: { baseStatus: 'ACTIVE' } }),
      db.assetUnit.count({ where: { baseStatus: 'MAINTENANCE' } }),
      db.assetCategory.count({ where: { status: 'ACTIVE' } }),
      db.assetLocation.count({ where: { isActive: true } }),
      db.assetAuditEvent.findMany({
        take: 8,
        orderBy: { createdAt: 'desc' },
        include: {
          listing: { select: { id: true, name: true, code: true } },
        },
      }),
    ])

    return NextResponse.json({
      listings: {
        total: totalListings,
        published: publishedListings,
        draft: draftListings,
        unpublished: unpublishedListings,
        archived: archivedListings,
      },
      units: {
        total: totalUnits,
        active: activeUnits,
        maintenance: maintenanceUnits,
      },
      categories: totalCategories,
      locations: totalLocations,
      recentAuditEvents,
    })
  } catch (error: any) {
    console.warn('[Admin Stats] Error fetching admin stats:', error)
    return NextResponse.json({
      listings: {
        total: 0,
        published: 0,
        draft: 0,
        unpublished: 0,
        archived: 0,
      },
      units: {
        total: 0,
        active: 0,
        maintenance: 0,
      },
      categories: 0,
      locations: 0,
      recentAuditEvents: [],
      warning: error?.message || 'Database initializing',
    })
  }
}
