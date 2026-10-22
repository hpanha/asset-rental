import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { hashPassword, createSessionToken, setSessionCookie } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password, name, phone } = body

    // Validation
    const cleanEmail = (email || '').trim().toLowerCase()
    const cleanName = (name || '').trim()
    const cleanPhone = (phone || '').trim()

    if (!cleanEmail || !cleanEmail.includes('@')) {
      return NextResponse.json({ error: 'Please provide a valid email address.' }, { status: 400 })
    }

    if (!cleanName || cleanName.length < 2) {
      return NextResponse.json({ error: 'Please enter your full name (minimum 2 characters).' }, { status: 400 })
    }

    if (!password || typeof password !== 'string' || password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters long.' },
        { status: 400 }
      )
    }

    // Check if user already exists
    const existing = await db.user.findUnique({
      where: { email: cleanEmail },
    })

    if (existing) {
      return NextResponse.json(
        { error: 'An account with this email address already exists. Please sign in instead.' },
        { status: 409 }
      )
    }

    // Hash password
    const passwordHash = await hashPassword(password)

    // Generate avatar seed
    const avatarUrl = `https://api.dicebear.com/9.x/avataaars/svg?seed=${encodeURIComponent(cleanName)}&backgroundColor=b6e3f4`

    // Create user in database
    const newUser = await db.user.create({
      data: {
        email: cleanEmail,
        name: cleanName,
        phone: cleanPhone || null,
        passwordHash,
        avatar: avatarUrl,
        role: 'client',
        status: 'ACTIVE',
        lastLoginAt: new Date(),
      },
    })

    // Create client session JWT
    const token = await createClientToken({
      sub: newUser.id,
      email: newUser.email,
      name: newUser.name,
      role: 'client',
      avatar: newUser.avatar,
    }, '24h')

    const response = NextResponse.json({
      ok: true,
      message: 'Account created successfully.',
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        role: 'client',
        avatar: newUser.avatar,
      },
    })

    // Set secure HTTP-only client session cookie
    setClientSessionCookie(response, token)

    return response
  } catch (error: any) {
    console.error('Registration error:', error)
    return NextResponse.json(
      { error: 'An error occurred during registration. Please try again.' },
      { status: 500 }
    )
  }
}
