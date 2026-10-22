import crypto from 'node:crypto'
import { promisify } from 'node:util'

const scryptAsync = promisify(crypto.scrypt)

const KEY_LENGTH = 64

/**
 * Hash a plain password using scrypt with a random 16-byte salt
 * Returns string in format: `<salt>:<derivedKeyHex>`
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(16).toString('hex')
  const derivedKey = (await scryptAsync(password, salt, KEY_LENGTH)) as Buffer
  return `${salt}:${derivedKey.toString('hex')}`
}

/**
 * Verify a plain password against stored salt:hash string
 */
export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  try {
    const [salt, keyHex] = storedHash.split(':')
    if (!salt || !keyHex) {
      return false
    }

    const keyBuffer = Buffer.from(keyHex, 'hex')
    const derivedKey = (await scryptAsync(password, salt, KEY_LENGTH)) as Buffer

    if (keyBuffer.length !== derivedKey.length) {
      return false
    }

    return crypto.timingSafeEqual(keyBuffer, derivedKey)
  } catch {
    return false
  }
}
