import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const locations = await db.assetLocation.findMany({
      include: {
        _count: { select: { units: true } },
      },
      orderBy: { name: 'asc' },
    })
    return NextResponse.json(locations)
  } catch (error: any) {
    console.error('Error fetching locations:', error)
    return NextResponse.json({ error: error.message || 'Failed to fetch locations' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { name, code, address, city, timezone = 'Asia/Phnom_Penh', isPickupDefault = false } = body

    if (!name || !code || !address || !city) {
      return NextResponse.json(
        { error: 'Name, Code, Address, and City are required fields.' },
        { status: 400 }
      )
    }

    const company = await db.rentalCompany.findFirst()
    if (!company) {
      return NextResponse.json({ error: 'Rental company not found' }, { status: 500 })
    }

    const existingCode = await db.assetLocation.findUnique({ where: { code } })
    if (existingCode) {
      return NextResponse.json(
        { error: `Location code "${code}" is already in use.` },
        { status: 400 }
      )
    }

    const location = await db.assetLocation.create({
      data: {
        companyId: company.id,
        name: name.trim(),
        code: code.trim().toUpperCase(),
        address: address.trim(),
        city: city.trim(),
        timezone,
        isPickupDefault: !!isPickupDefault,
      },
    })

    return NextResponse.json({ success: true, location }, { status: 201 })
  } catch (error: any) {
    console.error('Error creating location:', error)
    return NextResponse.json({ error: error.message || 'Failed to create location' }, { status: 500 })
  }
}
