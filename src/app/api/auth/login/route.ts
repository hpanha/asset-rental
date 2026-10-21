import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { db } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { username, email, password } = body
    const identity = (email || username || '').trim().toLowerCase()

    if (!identity) {
      return NextResponse.json({ error: 'Please enter your email or username.' }, { status: 400 })
    }

    // Try finding user by email or name
    let user = await db.user.findFirst({
      where: {
        OR: [
          { email: identity },
          { name: { equals: identity } },
        ],
      },
    })

    // If not found, check if it's standard demo keywords or a new email
    if (!user) {
      if (identity === 'renter' || identity === 'demo' || identity === 'you') {
        user = await db.user.findFirst({
          where: { email: 'you@renthub.app' },
        })
        if (!user) {
          user = await db.user.create({
            data: {
              email: 'you@renthub.app',
              name: 'You (Demo)',
              role: 'member',
            },
          })
        }
      } else if (identity.includes('@')) {
        // Auto-provision registered member account for smooth customer onboarding
        const base = identity.split('@')[0]
        const formattedName = base.charAt(0).toUpperCase() + base.slice(1)
        user = await db.user.create({
          data: {
            email: identity,
            name: formattedName,
            role: 'member',
          },
        })
      } else {
        return NextResponse.json(
          { error: 'Customer account not found. Please enter a valid email or try the demo account.' },
          { status: 401 }
        )
      }
    }

    const response = NextResponse.json({
      ok: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        role: user.role,
      },
    })

    // Set customer authentication cookie (7 days)
    response.cookies.set('customer_token', user.id, {
      httpOnly: true,
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
      sameSite: 'lax',
    })

    return response
  } catch (error: any) {
    console.error('Customer login error:', error)
    return NextResponse.json({ error: 'Failed to authenticate. Please try again.' }, { status: 500 })
  }
}
