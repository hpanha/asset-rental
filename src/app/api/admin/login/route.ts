import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const ADMIN_USERNAME = 'admin'
const ADMIN_PASSWORD = 'admin123'
const TOKEN = 'renthub-admin-secret'

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { username, password } = body

  if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
    const response = NextResponse.json({ ok: true })
    response.cookies.set('admin_token', TOKEN, {
      httpOnly: true,
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      sameSite: 'lax',
    })
    return response
  }

  return NextResponse.json({ ok: false, error: 'Invalid credentials' }, { status: 401 })
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true })
  response.cookies.delete('admin_token')
  return response
}
