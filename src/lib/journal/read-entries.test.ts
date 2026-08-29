import { describe, it, expect, beforeAll } from 'vitest'
import { encryptText } from './encryption'
import { decryptJournalEntries, type EncryptedEntryRow } from './read-entries'

beforeAll(() => {
  process.env.JOURNAL_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString('base64')
})

function encryptRow(overrides: Partial<EncryptedEntryRow> & { content: string }): EncryptedEntryRow {
  const { content, ...rest } = overrides
  const { ciphertext, iv, authTag } = encryptText(content)
  return {
    id: 1,
    stage_slug: 'recognition',
    lesson_slug: 'noticing-triggers',
    ciphertext,
    iv,
    auth_tag: authTag,
    safety_flagged: false,
    created_at: '2026-08-29T12:00:00.000Z',
    ...rest,
  }
}

describe('decryptJournalEntries', () => {
  it('decrypts multiple rows and preserves the other fields', () => {
    const rows: EncryptedEntryRow[] = [
      encryptRow({ id: 1, content: 'First entry content.' }),
      encryptRow({ id: 2, content: 'Second entry content.', stage_slug: 'acceptance', lesson_slug: 'avoided-emotions' }),
    ]

    const result = decryptJournalEntries(rows)

    expect(result).toHaveLength(2)
    expect(result[0]).toMatchObject({
      id: 1,
      stage_slug: 'recognition',
      lesson_slug: 'noticing-triggers',
      safety_flagged: false,
      created_at: '2026-08-29T12:00:00.000Z',
      content: 'First entry content.',
    })
    expect(result[1]).toMatchObject({
      id: 2,
      stage_slug: 'acceptance',
      lesson_slug: 'avoided-emotions',
      content: 'Second entry content.',
    })
    // Encrypted fields must not leak onto the decrypted shape.
    expect(result[0]).not.toHaveProperty('ciphertext')
    expect(result[0]).not.toHaveProperty('iv')
    expect(result[0]).not.toHaveProperty('auth_tag')
  })

  it('does not crash on a corrupted row and still decrypts the valid ones', () => {
    const goodRow = encryptRow({ id: 1, content: 'A perfectly good entry.' })
    const corruptedRow = encryptRow({ id: 2, content: 'Doomed entry.' })
    corruptedRow.auth_tag = Buffer.alloc(16, 1).toString('base64') // tamper -> decrypt will throw

    const result = decryptJournalEntries([goodRow, corruptedRow])

    expect(result).toHaveLength(2)
    expect(result.find((entry) => entry.id === 1)?.content).toBe('A perfectly good entry.')
    expect(result.find((entry) => entry.id === 2)?.content).toBe('[This entry could not be decrypted]')
  })
})
