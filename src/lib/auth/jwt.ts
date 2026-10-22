import { SignJWT, jwtVerify, errors } from 'jose'

export interface SessionPayload {
  sub: string
  email: string
  name: string
  role: 'client' | 'admin' | string
  sessionType: 'client' | 'admin'
  avatar?: string | null
}

export interface VerifySessionResult {
  valid: boolean
  expired: boolean
  payload: SessionPayload | null
}

const DEFAULT_SECRET = 'renthub-super-secret-jwt-key-2026-production-ready'

export const CLIENT_COOKIE_NAME = process.env.CLIENT_COOKIE_NAME || 'renthub_client_session'
export const ADMIN_COOKIE_NAME = process.env.ADMIN_COOKIE_NAME || 'renthub_admin_session'

// Backward compatibility alias
export const AUTH_COOKIE_NAME = CLIENT_COOKIE_NAME

export function getJwtSecretKey(): Uint8Array {
  const secret = process.env.AUTH_SECRET || DEFAULT_SECRET
  return new TextEncoder().encode(secret)
}

/**
 * Sign a new session JWT for client / customer users
 * Defaults to 24 hours
 */
export async function createClientToken(
  payload: Omit<SessionPayload, 'sessionType'>,
  expiresIn = '24h'
): Promise<string> {
  const secretKey = getJwtSecretKey()
  return new SignJWT({
    sub: payload.sub,
    email: payload.email,
    name: payload.name,
    role: payload.role || 'client',
    sessionType: 'client',
    avatar: payload.avatar || null,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(secretKey)
}

/**
 * Sign a new session JWT for admin users
 * Defaults to 8 hours
 */
export async function createAdminToken(
  payload: Omit<SessionPayload, 'sessionType'>,
  expiresIn = '8h'
): Promise<string> {
  const secretKey = getJwtSecretKey()
  return new SignJWT({
    sub: payload.sub,
    email: payload.email,
    name: payload.name,
    role: 'admin',
    sessionType: 'admin',
    avatar: payload.avatar || null,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(secretKey)
}

/**
 * Legacy compatibility wrapper
 */
export async function createSessionToken(payload: SessionPayload): Promise<string> {
  if (payload.sessionType === 'admin') {
    return createAdminToken(payload)
  }
  return createClientToken(payload)
}

/**
 * Verify a session JWT and return typed result including expiration status
 */
export async function verifySessionToken(
  token: string,
  expectedType?: 'client' | 'admin'
): Promise<VerifySessionResult> {
  try {
    const secretKey = getJwtSecretKey()
    const { payload } = await jwtVerify(token, secretKey)

    if (!payload.sub || typeof payload.sub !== 'string') {
      return { valid: false, expired: false, payload: null }
    }

    const sessionType = (payload.sessionType as 'client' | 'admin') || 'client'

    // Enforce matching sessionType if expectedType is specified
    if (expectedType && sessionType !== expectedType) {
      return { valid: false, expired: false, payload: null }
    }

    return {
      valid: true,
      expired: false,
      payload: {
        sub: payload.sub,
        email: (payload.email as string) || '',
        name: (payload.name as string) || '',
        role: (payload.role as string) || 'client',
        sessionType,
        avatar: (payload.avatar as string) || null,
      },
    }
  } catch (err: any) {
    if (err instanceof errors.JWTExpired || err?.code === 'ERR_JWT_EXPIRED') {
      return { valid: false, expired: true, payload: null }
    }
    return { valid: false, expired: false, payload: null }
  }
}
