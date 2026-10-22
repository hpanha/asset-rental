import { NextResponse } from 'next/server'
import { CLIENT_COOKIE_NAME, ADMIN_COOKIE_NAME } from './jwt'

export const CLIENT_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge: 60 * 60 * 24, // 24 hours
}

export const ADMIN_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge: 60 * 60 * 8, // 8 hours
}

export function setClientSessionCookie(response: NextResponse, token: string) {
  response.cookies.set(CLIENT_COOKIE_NAME, token, CLIENT_COOKIE_OPTIONS)
  response.cookies.delete('customer_token')
}

export function clearClientSessionCookie(response: NextResponse) {
  response.cookies.set(CLIENT_COOKIE_NAME, '', {
    ...CLIENT_COOKIE_OPTIONS,
    maxAge: 0,
  })
  response.cookies.delete('customer_token')
}

export function setAdminSessionCookie(response: NextResponse, token: string) {
  response.cookies.set(ADMIN_COOKIE_NAME, token, ADMIN_COOKIE_OPTIONS)
  response.cookies.delete('admin_token')
}

export function clearAdminSessionCookie(response: NextResponse) {
  response.cookies.set(ADMIN_COOKIE_NAME, '', {
    ...ADMIN_COOKIE_OPTIONS,
    maxAge: 0,
  })
  response.cookies.delete('admin_token')
}

// Backward compatibility helpers
export function setSessionCookie(response: NextResponse, token: string) {
  setClientSessionCookie(response, token)
}

export function clearSessionCookie(response: NextResponse) {
  clearClientSessionCookie(response)
  clearAdminSessionCookie(response)
}
