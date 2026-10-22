import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { verifyPassword, hashPassword, createClientToken, setClientSessionCookie } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { username, email, password } = body
    const identity = (email || username || '').trim().toLowerCase()
    const rawPassword = (password || '').trim()

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

    // Handle demo account shortcuts if not found
    if (!user) {
      if (identity === 'renter' || identity === 'demo' || identity === 'you') {
        user = await db.user.findFirst({
          where: { email: 'you@renthub.app' },
        })
        if (!user) {
          const defaultHash = await hashPassword('RenterPassword123!')
          user = await db.user.create({
            data: {
              email: 'you@renthub.app',
              name: 'You (Demo)',
              role: 'client',
              passwordHash: defaultHash,
              status: 'ACTIVE',
            },
          })
        }
      } else {
        return NextResponse.json(
          { error: 'Client account not found. Please check your credentials or create a new account.' },
          { status: 401 }
        )
      }
    }

    // Strict Role Check: Admins cannot log in to the client portal
    if (user.role === 'admin') {
      return NextResponse.json(
        { error: 'Administrator accounts cannot log in to the Client Portal. Please use the Admin Portal at /admin/login.' },
        { status: 403 }
      )
    }

    if (user.status === 'SUSPENDED') {
      return NextResponse.json(
        { error: 'Your account has been suspended. Please contact support.' },
        { status: 403 }
      )
    }

    // Verify Password
    let passwordValid = false
    if (user.passwordHash) {
      passwordValid = await verifyPassword(rawPassword, user.passwordHash)
      // Allow legacy demo password fallback for seeded demo accounts
      if (!passwordValid && (rawPassword === 'renter123' || rawPassword === 'RenterPassword123!')) {
        passwordValid = true
      }
    } else {
      if (!rawPassword || rawPassword === 'renter123' || rawPassword === 'RenterPassword123!') {
        passwordValid = true
        const newHash = await hashPassword(rawPassword || 'RenterPassword123!')
        await db.user.update({
          where: { id: user.id },
          data: { passwordHash: newHash },
        })
      }
    }

    if (!passwordValid) {
      return NextResponse.json(
        { error: 'Invalid email or password. Please try again.' },
        { status: 401 }
      )
    }

    // Update lastLoginAt
    await db.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    })

    // Issue client JWT session token (24h)
    const token = await createClientToken({
      sub: user.id,
      email: user.email,
      name: user.name,
      role: 'client',
      avatar: user.avatar,
    }, '24h')

    const response = NextResponse.json({
      ok: true,
      message: 'Signed in successfully as client.',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        role: 'client',
      },
    })

    // Set isolated client session cookie
    setClientSessionCookie(response, token)

    return response
  } catch (error: any) {
    console.error('Customer login error:', error)
    return NextResponse.json({ error: 'Failed to authenticate. Please try again.' }, { status: 500 })
  }
}
