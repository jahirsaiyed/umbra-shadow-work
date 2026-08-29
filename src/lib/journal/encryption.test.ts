// src/lib/journal/encryption.test.ts
import { describe, it, expect, beforeAll } from 'vitest'
import { encryptText, decryptText } from './encryption'

beforeAll(() => {
  process.env.JOURNAL_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString('base64')
})

describe('journal encryption', () => {
  it('round-trips plaintext through encrypt and decrypt', () => {
    const payload = encryptText('Today I noticed I got defensive.')
    expect(decryptText(payload)).toBe('Today I noticed I got defensive.')
  })

  it('produces a different ciphertext and iv on each call', () => {
    const a = encryptText('same input')
    const b = encryptText('same input')
    expect(a.ciphertext).not.toBe(b.ciphertext)
    expect(a.iv).not.toBe(b.iv)
  })

  it('never stores the plaintext inside the ciphertext field', () => {
    const payload = encryptText('a very identifiable secret phrase')
    expect(payload.ciphertext).not.toContain('identifiable')
  })

  it('throws if the auth tag has been tampered with', () => {
    const payload = encryptText('tamper test')
    const tampered = { ...payload, authTag: Buffer.alloc(16, 1).toString('base64') }
    expect(() => decryptText(tampered)).toThrow()
  })
})
