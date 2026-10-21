import { db } from '@/lib/db'
import { cookies } from 'next/headers'

export async function getCurrentUser() {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('customer_token')?.value
    if (!token) {
      return null
    }

    const user = await db.user.findFirst({
      where: {
        OR: [
          { id: token },
          { email: token },
        ],
      },
    })
    return user || null
  } catch {
    return null
  }
}

