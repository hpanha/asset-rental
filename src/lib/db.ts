import { PrismaClient } from '@/lib/prisma-client-v6'
import fs from 'node:fs'
import path from 'node:path'

/**
 * Determine if running in a serverless cloud environment (Vercel Lambda / AWS Lambda).
 * In these environments, /var/task is read-only, but /tmp is writable.
 */
const isServerless = Boolean(
  process.env.VERCEL ||
  process.env.AWS_LAMBDA_FUNCTION_NAME ||
  process.env.LAMBDA_TASK_ROOT
)

function resolveDatabaseUrl(): string {
  // If an external database URL is explicitly configured (e.g., PostgreSQL, Supabase, Neon, LibSQL)
  if (process.env.DATABASE_URL && !process.env.DATABASE_URL.startsWith('file:')) {
    return process.env.DATABASE_URL
  }

  // Serverless environment (Vercel / Lambda):
  // SQLite needs write access to create WAL journal files and lock files.
  // /var/task is read-only, so we copy the bundled database to /tmp/custom.db on cold start.
  if (isServerless) {
    const tmpDbPath = '/tmp/custom.db'

    let needsCopy = true
    try {
      if (fs.existsSync(tmpDbPath)) {
        const stat = fs.statSync(tmpDbPath)
        if (stat.size > 0) {
          needsCopy = false
        }
      }
    } catch {
      needsCopy = true
    }

    if (needsCopy) {
      const candidatePaths = [
        path.join(process.cwd(), 'db', 'custom.db'),
        path.join(process.cwd(), 'prisma', 'custom.db'),
        path.resolve(__dirname, '../../../../db/custom.db'),
        path.resolve(__dirname, '../../../db/custom.db'),
        path.resolve(__dirname, '../../db/custom.db'),
        path.resolve(__dirname, '../db/custom.db'),
        path.resolve(__dirname, 'custom.db'),
        '/var/task/db/custom.db',
        '/var/task/prisma/custom.db',
      ]

      let copied = false
      for (const cand of candidatePaths) {
        try {
          if (fs.existsSync(cand)) {
            fs.copyFileSync(cand, tmpDbPath)
            copied = true
            console.log(`[db] Loaded SQLite bundle from ${cand} -> ${tmpDbPath}`)

            // Copy WAL/SHM files if present
            try {
              if (fs.existsSync(`${cand}-wal`)) fs.copyFileSync(`${cand}-wal`, `${tmpDbPath}-wal`)
              if (fs.existsSync(`${cand}-shm`)) fs.copyFileSync(`${cand}-shm`, `${tmpDbPath}-shm`)
            } catch {}
            break
          }
        } catch (copyErr) {
          console.warn(`[db] Candidate ${cand} copy error:`, copyErr)
        }
      }

      if (!copied) {
        console.warn('[db] No existing custom.db found in candidates; using /tmp/custom.db')
      }
    }

    const tmpUrl = `file:${tmpDbPath}`
    process.env.DATABASE_URL = tmpUrl
    return tmpUrl
  }

  // Local development (Windows / macOS / Linux)
  const localCandidates = [
    path.resolve(process.cwd(), 'db', 'custom.db'),
    path.resolve(__dirname, '../../db/custom.db'),
    path.resolve(__dirname, '../../../db/custom.db'),
  ]

  for (const cand of localCandidates) {
    try {
      if (fs.existsSync(cand)) {
        const formatted = `file:${cand.replace(/\\/g, '/')}`
        process.env.DATABASE_URL = formatted
        return formatted
      }
    } catch {}
  }

  const defaultUrl = `file:${path.resolve(process.cwd(), 'db', 'custom.db').replace(/\\/g, '/')}`
  process.env.DATABASE_URL = defaultUrl
  return defaultUrl
}

const dbUrl = resolveDatabaseUrl()

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: {
      db: {
        url: dbUrl,
      },
    },
    log: ['error', 'warn'],
  })

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = db
}

export default db
