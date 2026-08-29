import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'

const ALGORITHM = 'aes-256-gcm'

function getKey(): Buffer {
  const raw = process.env.JOURNAL_ENCRYPTION_KEY
  if (!raw) throw new Error('JOURNAL_ENCRYPTION_KEY is not set')
  const key = Buffer.from(raw, 'base64')
  if (key.length !== 32) throw new Error('JOURNAL_ENCRYPTION_KEY must decode to exactly 32 bytes')
  return key
}

export interface EncryptedPayload {
  ciphertext: string
  iv: string
  authTag: string
}

export function encryptText(plaintext: string): EncryptedPayload {
  const key = getKey()
  const iv = randomBytes(12)
  const cipher = createCipheriv(ALGORITHM, key, iv)
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  return {
    ciphertext: ciphertext.toString('base64'),
    iv: iv.toString('base64'),
    authTag: cipher.getAuthTag().toString('base64'),
  }
}

export function decryptText(payload: EncryptedPayload): string {
  const key = getKey()
  const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(payload.iv, 'base64'))
  decipher.setAuthTag(Buffer.from(payload.authTag, 'base64'))
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(payload.ciphertext, 'base64')),
    decipher.final(),
  ])
  return plaintext.toString('utf8')
}
