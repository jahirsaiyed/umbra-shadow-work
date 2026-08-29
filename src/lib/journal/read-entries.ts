import { decryptText } from './encryption'

// Shape of a row selected from `journal_entries`. `id` is a Postgres
// `bigint generated always as identity`, which supabase-js returns as
// `number` for values within the safe integer range.
export interface EncryptedEntryRow {
  id: number
  stage_slug: string | null
  lesson_slug: string | null
  ciphertext: string
  iv: string
  auth_tag: string
  safety_flagged: boolean
  created_at: string
}

export interface DecryptedEntry {
  id: number
  stage_slug: string | null
  lesson_slug: string | null
  safety_flagged: boolean
  created_at: string
  content: string
}

const UNREADABLE_ENTRY_PLACEHOLDER = '[This entry could not be decrypted]'

// Decrypts each row server-side. A row that fails to decrypt (corrupted
// ciphertext, wrong key, tampered auth tag, etc.) does not take down the
// whole list: it is logged with its id for debugging and included with a
// visible placeholder instead of being silently dropped, so a reviewer
// scanning the page (or the logs) can tell something is wrong rather than
// just seeing a shorter-than-expected list.
export function decryptJournalEntries(rows: EncryptedEntryRow[]): DecryptedEntry[] {
  return rows.map((row) => {
    let content: string
    try {
      content = decryptText({ ciphertext: row.ciphertext, iv: row.iv, authTag: row.auth_tag })
    } catch (error) {
      console.error('Failed to decrypt journal entry:', error, { entryId: row.id })
      content = UNREADABLE_ENTRY_PLACEHOLDER
    }

    return {
      id: row.id,
      stage_slug: row.stage_slug,
      lesson_slug: row.lesson_slug,
      safety_flagged: row.safety_flagged,
      created_at: row.created_at,
      content,
    }
  })
}
