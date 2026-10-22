import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify, errors } from 'jose'

const DEFAULT_SECRET = 'renthub-super-secret-jwt-key-2026-production-ready'
const CLIENT_COOKIE_NAME = process.env.CLIENT_COOKIE_NAME || 'renthub_client_session'
const ADMIN_COOKIE_NAME = process.env.ADMIN_COOKIE_NAME || 'renthub_admin_session'

interface TokenVerifyResult {
  valid: boolean
  expired: boolean
  payload: any
}

async function verifyToken(token: string | undefined): Promise<TokenVerifyResult> {
  if (!token) return { valid: false, expired: false, payload: null }

  try {
    const secret = new TextEncoder().encode(process.env.AUTH_SECRET || DEFAULT_SECRET)
    const { payload } = await jwtVerify(token, secret)
    return { valid: true, expired: false, payload }
  } catch (err: any) {
    if (err instanceof errors.JWTExpired || err?.code === 'ERR_JWT_EXPIRED') {
      return { valid: false, expired: true, payload: null }
    }
    return { valid: false, expired: false, payload: null }
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // ─────────────────────────────────────────────────────────────
  // 1. ADMIN PAGES GUARD (/admin/* except /admin/login)
  // ─────────────────────────────────────────────────────────────
  if (pathname.startsWith('/admin') && pathname !== '/admin/login') {
    const token = request.cookies.get(ADMIN_COOKIE_NAME)?.value
    const { valid, expired, payload } = await verifyToken(token)
    const legacyAdmin = request.cookies.get('admin_token')?.value === 'renthub-admin-secret'

    if (expired) {
      const loginUrl = new URL('/admin/login', request.url)
      loginUrl.searchParams.set('from', pathname)
      loginUrl.searchParams.set('expired', '1')
      const response = NextResponse.redirect(loginUrl)
      response.cookies.delete(ADMIN_COOKIE_NAME)
      response.cookies.delete('admin_token')
      return response
    }

    const isAdmin = (valid && payload?.role === 'admin' && payload?.sessionType === 'admin') || legacyAdmin

    if (!isAdmin) {
      const loginUrl = new URL('/admin/login', request.url)
      loginUrl.searchParams.set('from', pathname)
      return NextResponse.redirect(loginUrl)
    }
  }

  // ─────────────────────────────────────────────────────────────
  // 2. ADMIN API ENDPOINTS GUARD (/api/admin/* except /api/admin/login)
  // ─────────────────────────────────────────────────────────────
  if (pathname.startsWith('/api/admin') && pathname !== '/api/admin/login') {
    const token = request.cookies.get(ADMIN_COOKIE_NAME)?.value
    const { valid, expired, payload } = await verifyToken(token)
    const legacyAdmin = request.cookies.get('admin_token')?.value === 'renthub-admin-secret'

    if (expired) {
      const response = NextResponse.json(
        { ok: false, error: 'SESSION_EXPIRED', message: 'Your admin session has expired. Please log in again.' },
        { status: 401 }
      )
      response.cookies.delete(ADMIN_COOKIE_NAME)
      response.cookies.delete('admin_token')
      return response
    }

    const isAdmin = (valid && payload?.role === 'admin' && payload?.sessionType === 'admin') || legacyAdmin
    if (!isAdmin) {
      return NextResponse.json(
        { ok: false, error: 'Unauthorized. Administrator credentials required.' },
        { status: 401 }
      )
    }
  }

  // ─────────────────────────────────────────────────────────────
  // 3. PROTECTED CLIENT CUSTOMER ROUTES
  // ─────────────────────────────────────────────────────────────
  const protectedCustomerRoutes = [
    '/rentals/request',
    '/rentals/my-requests',
    '/rentals/active',
  ]

  const isCustomerProtectedRoute = protectedCustomerRoutes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  )

  if (isCustomerProtectedRoute) {
    const token = request.cookies.get(CLIENT_COOKIE_NAME)?.value
    const { valid, expired, payload } = await verifyToken(token)
    const hasLegacyCustomer = !!request.cookies.get('customer_token')?.value

    if (expired) {
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('from', pathname)
      loginUrl.searchParams.set('expired', '1')
      const response = NextResponse.redirect(loginUrl)
      response.cookies.delete(CLIENT_COOKIE_NAME)
      response.cookies.delete('customer_token')
      return response
    }

    const isClient = (valid && payload?.role !== 'admin' && payload?.sessionType === 'client') || hasLegacyCustomer

    if (!isClient) {
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('from', pathname)
      return NextResponse.redirect(loginUrl)
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/api/admin/:path*',
    '/rentals/request/:path*',
    '/rentals/my-requests/:path*',
    '/rentals/active/:path*',
  ],
}
