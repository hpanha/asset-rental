import { NextResponse } from 'next/server'
import { clearClientSessionCookie } from '@/lib/auth'

export async function POST() {
  const response = NextResponse.json({ ok: true, message: 'Signed out successfully.' })
  clearClientSessionCookie(response)
  return response
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true, message: 'Signed out successfully.' })
  clearClientSessionCookie(response)
  return response
}
