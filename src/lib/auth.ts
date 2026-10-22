import { db } from '@/lib/db'
import { cookies } from 'next/headers'
import {
  CLIENT_COOKIE_NAME,
  ADMIN_COOKIE_NAME,
  verifySessionToken,
} from './auth/jwt'

export * from './auth/jwt'
export * from './auth/password'
export * from './auth/session'

export interface AuthUser {
  id: string
  email: string
  name: string
  avatar: string | null
  phone: string | null
  bio: string | null
  role: string
  status: string
  createdAt: Date
  updatedAt: Date
}

export interface UserSessionState {
  user: AuthUser | null
  isExpired: boolean
}

/**
 * Get current client user from the client session cookie.
 * Admin users are NOT accepted here.
 */
export async function getCurrentClientUserState(): Promise<UserSessionState> {
  try {
    const cookieStore = await cookies()
    const sessionToken = cookieStore.get(CLIENT_COOKIE_NAME)?.value

    if (!sessionToken) {
      // Legacy customer_token fallback
      const legacyToken = cookieStore.get('customer_token')?.value
      if (legacyToken) {
        const legacyUser = await db.user.findFirst({
          where: {
            OR: [{ id: legacyToken }, { email: legacyToken }],
            role: { not: 'admin' },
          },
        })
        if (legacyUser && legacyUser.status !== 'SUSPENDED') {
          return {
            user: {
              id: legacyUser.id,
              email: legacyUser.email,
              name: legacyUser.name,
              avatar: legacyUser.avatar,
              phone: legacyUser.phone,
              bio: legacyUser.bio,
              role: legacyUser.role,
              status: legacyUser.status,
              createdAt: legacyUser.createdAt,
              updatedAt: legacyUser.updatedAt,
            },
            isExpired: false,
          }
        }
      }
      return { user: null, isExpired: false }
    }

    const { valid, expired, payload } = await verifySessionToken(sessionToken, 'client')

    if (expired) {
      return { user: null, isExpired: true }
    }

    if (!valid || !payload?.sub) {
      return { user: null, isExpired: false }
    }

    const user = await db.user.findUnique({
      where: { id: payload.sub },
    })

    // Strict client role check: Admins cannot masquerade as client
    if (!user || user.role === 'admin' || user.status === 'SUSPENDED') {
      return { user: null, isExpired: false }
    }

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        phone: user.phone,
        bio: user.bio,
        role: user.role,
        status: user.status,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
      isExpired: false,
    }
  } catch {
    return { user: null, isExpired: false }
  }
}

/**
 * Get current admin user from the admin session cookie.
 * Only users with role === 'admin' are accepted here.
 */
export async function getCurrentAdminUserState(): Promise<UserSessionState> {
  try {
    const cookieStore = await cookies()
    const sessionToken = cookieStore.get(ADMIN_COOKIE_NAME)?.value

    if (!sessionToken) {
      // Legacy admin token fallback
      const legacyAdmin = cookieStore.get('admin_token')?.value === 'renthub-admin-secret'
      if (legacyAdmin) {
        const adminUser = await db.user.findFirst({
          where: { role: 'admin' },
        })
        if (adminUser && adminUser.status !== 'SUSPENDED') {
          return {
            user: {
              id: adminUser.id,
              email: adminUser.email,
              name: adminUser.name,
              avatar: adminUser.avatar,
              phone: adminUser.phone,
              bio: adminUser.bio,
              role: adminUser.role,
              status: adminUser.status,
              createdAt: adminUser.createdAt,
              updatedAt: adminUser.updatedAt,
            },
            isExpired: false,
          }
        }
      }
      return { user: null, isExpired: false }
    }

    const { valid, expired, payload } = await verifySessionToken(sessionToken, 'admin')

    if (expired) {
      return { user: null, isExpired: true }
    }

    if (!valid || !payload?.sub) {
      return { user: null, isExpired: false }
    }

    const user = await db.user.findUnique({
      where: { id: payload.sub },
    })

    if (!user || user.role !== 'admin' || user.status === 'SUSPENDED') {
      return { user: null, isExpired: false }
    }

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        phone: user.phone,
        bio: user.bio,
        role: user.role,
        status: user.status,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
      isExpired: false,
    }
  } catch {
    return { user: null, isExpired: false }
  }
}

/**
 * Get currently authenticated client user (for browse/rent customer portal)
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  const state = await getCurrentClientUserState()
  return state.user
}

/**
 * Get currently authenticated admin user (for admin portal)
 */
export async function getCurrentAdminUser(): Promise<AuthUser | null> {
  const state = await getCurrentAdminUserState()
  return state.user
}

/**
 * Guard requiring client authentication
 */
export async function requireAuth(): Promise<AuthUser> {
  const state = await getCurrentClientUserState()
  if (state.isExpired) {
    throw new Error('SESSION_EXPIRED')
  }
  if (!state.user) {
    throw new Error('UNAUTHORIZED')
  }
  return state.user
}

/**
 * Guard requiring admin privileges
 */
export async function requireAdmin(): Promise<AuthUser> {
  const state = await getCurrentAdminUserState()
  if (state.isExpired) {
    throw new Error('SESSION_EXPIRED')
  }
  if (!state.user || state.user.role !== 'admin') {
    throw new Error('FORBIDDEN')
  }
  return state.user
}
