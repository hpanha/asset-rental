import { PrismaClient } from '@/lib/prisma-client-v5'

// Invalidate any stale global instance from previous schemas
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const db = new PrismaClient({
  log: ['error', 'warn'],
})

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = db
}

export default db