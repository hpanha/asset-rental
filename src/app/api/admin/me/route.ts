import { NextResponse } from 'next/server'
import { getCurrentAdminUserState, clearAdminSessionCookie } from '@/lib/auth'

export async function GET() {
  try {
    const { user: admin, isExpired } = await getCurrentAdminUserState()

    if (isExpired) {
      const response = NextResponse.json(
        {
          ok: false,
          error: 'SESSION_EXPIRED',
          message: 'Your admin session has expired. Please log in again.',
        },
        { status: 401 }
      )
      clearAdminSessionCookie(response)
      return response
    }

    if (!admin || admin.role !== 'admin') {
      return NextResponse.json(
        { ok: false, error: 'UNAUTHORIZED', message: 'Administrator credentials required.' },
        { status: 401 }
      )
    }

    return NextResponse.json({
      ok: true,
      user: {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        avatar: admin.avatar,
        role: admin.role,
      },
    })
  } catch (error: any) {
    console.error('Error in GET /api/admin/me:', error)
    return NextResponse.json(
      { ok: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
