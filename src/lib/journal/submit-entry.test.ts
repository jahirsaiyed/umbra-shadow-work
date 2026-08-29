import { describe, it, expect, beforeAll } from 'vitest'
import { submitJournalEntry } from './submit-entry'

beforeAll(() => {
  process.env.JOURNAL_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString('base64')
})

function createFakeSupabase(opts: {
  existingEntryCount?: number
  companion?: { xp: number; current_streak: number; longest_streak: number; streak_freezes_remaining: number; last_activity_date: string | null } | null
}) {
  const calls: { insert: any[]; upsert: any[] } = { insert: [], upsert: [] }
  const client = {
    from(table: string) {
      return {
        select(_cols: string, selectOpts?: { head?: boolean }) {
          if (table === 'journal_entries' && selectOpts?.head) {
            return { eq: () => Promise.resolve({ count: opts.existingEntryCount ?? 0 }) }
          }
          if (table === 'companion_state') {
            return { eq: () => ({ single: async () => ({ data: opts.companion ?? null }) }) }
          }
          throw new Error(`Unexpected select on ${table}`)
        },
        insert(row: any) {
          calls.insert.push({ table, row })
          return Promise.resolve({ error: null })
        },
        upsert(rows: any, upsertOpts?: any) {
          calls.upsert.push({ table, rows, opts: upsertOpts })
          return Promise.resolve({ error: null })
        },
      }
    },
  }
  return { client, calls }
}

describe('submitJournalEntry', () => {
  it('encrypts content, awards XP, and grants the first-entry badge on a brand-new user', async () => {
    const { client, calls } = createFakeSupabase({ existingEntryCount: 0, companion: null })

    const result = await submitJournalEntry(client as any, 'user-1', {
      content: 'Today I noticed I got defensive when my coworker gave feedback.',
      stageSlug: 'recognition',
      lessonSlug: 'noticing-triggers',
      today: '2026-08-29',
    })

    expect(result.safetyFlagged).toBe(false)
    expect(result.newBadges).toContain('first-entry')
    expect(result.growthStage).toBe('seed')

    const entryInsert = calls.insert.find((c) => c.table === 'journal_entries')
    expect(entryInsert.row.user_id).toBe('user-1')
    expect(entryInsert.row.ciphertext).not.toContain('defensive')
    expect(entryInsert.row.safety_flagged).toBe(false)

    const companionUpsert = calls.upsert.find((c) => c.table === 'companion_state')
    expect(companionUpsert.rows.xp).toBe(20)
    expect(companionUpsert.rows.current_streak).toBe(1)
  })

  it('flags crisis language on the entry without throwing or blocking the save', async () => {
    const { client, calls } = createFakeSupabase({
      existingEntryCount: 2,
      companion: { xp: 40, current_streak: 1, longest_streak: 1, streak_freezes_remaining: 3, last_activity_date: '2026-08-28' },
    })

    const result = await submitJournalEntry(client as any, 'user-1', {
      content: "I don't want to be here anymore.",
      stageSlug: 'recognition',
      lessonSlug: 'noticing-triggers',
      today: '2026-08-29',
    })

    expect(result.safetyFlagged).toBe(true)
    const entryInsert = calls.insert.find((c) => c.table === 'journal_entries')
    expect(entryInsert.row.safety_flagged).toBe(true)
  })

  it('does not award the first-entry badge when the user already has entries', async () => {
    const { client } = createFakeSupabase({
      existingEntryCount: 3,
      companion: { xp: 60, current_streak: 2, longest_streak: 2, streak_freezes_remaining: 3, last_activity_date: '2026-08-28' },
    })

    const result = await submitJournalEntry(client as any, 'user-1', {
      content: 'A calm, ordinary reflection.',
      stageSlug: 'acceptance',
      lessonSlug: 'naming-without-judgment',
      today: '2026-08-29',
    })

    expect(result.newBadges).not.toContain('first-entry')
  })
})
