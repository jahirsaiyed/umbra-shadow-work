import { describe, it, expect, beforeAll } from 'vitest'
import { submitJournalEntry } from './submit-entry'

beforeAll(() => {
  process.env.JOURNAL_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString('base64')
})

function createFakeSupabase(opts: {
  existingEntryCount?: number
  companion?: { xp: number; current_streak: number; longest_streak: number; streak_freezes_remaining: number; last_activity_date: string | null } | null
  existingProgress?: { stageSlug: string; lessonSlug: string }[]
}) {
  const calls: { insert: any[]; upsert: any[] } = { insert: [], upsert: [] }
  const progress = [...(opts.existingProgress ?? [])]
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
          if (table === 'journey_progress') {
            return {
              eq: (_col1: string, _userId: string) => ({
                eq: (_col2: string, stageSlug: string) =>
                  Promise.resolve({
                    data: progress
                      .filter((row) => row.stageSlug === stageSlug)
                      .map((row) => ({ lesson_slug: row.lessonSlug })),
                    error: null,
                  }),
              }),
            }
          }
          throw new Error(`Unexpected select on ${table}`)
        },
        insert(row: any) {
          calls.insert.push({ table, row })
          return Promise.resolve({ error: null })
        },
        upsert(rows: any, upsertOpts?: any) {
          calls.upsert.push({ table, rows, opts: upsertOpts })
          if (table === 'journey_progress') {
            const row = rows as { stage_slug: string; lesson_slug: string }
            const alreadyRecorded = progress.some(
              (p) => p.stageSlug === row.stage_slug && p.lessonSlug === row.lesson_slug
            )
            if (!alreadyRecorded) {
              progress.push({ stageSlug: row.stage_slug, lessonSlug: row.lesson_slug })
            }
          }
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
      activityType: 'lesson_exercise',
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
      activityType: 'lesson_exercise',
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
      activityType: 'lesson_exercise',
      today: '2026-08-29',
    })

    expect(result.newBadges).not.toContain('first-entry')
  })

  it('awards the smaller daily-practice XP amount for a daily check-in', async () => {
    const { client, calls } = createFakeSupabase({
      existingEntryCount: 1,
      companion: { xp: 20, current_streak: 1, longest_streak: 1, streak_freezes_remaining: 3, last_activity_date: '2026-08-28' },
    })

    await submitJournalEntry(client as any, 'user-1', {
      content: 'A short daily reflection.',
      stageSlug: 'daily',
      lessonSlug: 'daily-checkin',
      activityType: 'daily_practice',
      today: '2026-08-29',
    })

    const companionUpsert = calls.upsert.find((c) => c.table === 'companion_state')
    expect(companionUpsert.rows.xp).toBe(30) // 20 existing + 10 for daily_practice
  })

  it('awards the recognition-complete badge when the last lesson of the stage is finished', async () => {
    const { client, calls } = createFakeSupabase({
      existingEntryCount: 1,
      companion: { xp: 20, current_streak: 1, longest_streak: 1, streak_freezes_remaining: 3, last_activity_date: '2026-08-28' },
      existingProgress: [{ stageSlug: 'recognition', lessonSlug: 'noticing-triggers' }],
    })

    const result = await submitJournalEntry(client as any, 'user-1', {
      content: 'Reflecting on what I admire and despise in others.',
      stageSlug: 'recognition',
      lessonSlug: 'projection-journaling',
      activityType: 'lesson_exercise',
      today: '2026-08-29',
    })

    expect(result.newBadges).toContain('recognition-complete')
    const progressUpsert = calls.upsert.find((c) => c.table === 'journey_progress')
    expect(progressUpsert.rows).toMatchObject({
      user_id: 'user-1',
      stage_slug: 'recognition',
      lesson_slug: 'projection-journaling',
    })
    expect(progressUpsert.opts).toMatchObject({ onConflict: 'user_id,stage_slug,lesson_slug', ignoreDuplicates: true })
  })

  it('does not award the stage-completion badge when a non-final lesson is completed', async () => {
    const { client } = createFakeSupabase({
      existingEntryCount: 1,
      companion: { xp: 20, current_streak: 1, longest_streak: 1, streak_freezes_remaining: 3, last_activity_date: '2026-08-28' },
      existingProgress: [],
    })

    const result = await submitJournalEntry(client as any, 'user-1', {
      content: 'Noticing a trigger from earlier today.',
      stageSlug: 'recognition',
      lessonSlug: 'noticing-triggers',
      activityType: 'lesson_exercise',
      today: '2026-08-29',
    })

    expect(result.newBadges).not.toContain('recognition-complete')
  })

  it('never triggers stage-completion badge logic for a Daily Practice submission, regardless of journey_progress state', async () => {
    const { client, calls } = createFakeSupabase({
      existingEntryCount: 5,
      companion: { xp: 100, current_streak: 2, longest_streak: 2, streak_freezes_remaining: 3, last_activity_date: '2026-08-28' },
      existingProgress: [
        { stageSlug: 'recognition', lessonSlug: 'noticing-triggers' },
        { stageSlug: 'recognition', lessonSlug: 'projection-journaling' },
      ],
    })

    const result = await submitJournalEntry(client as any, 'user-1', {
      content: 'A short daily reflection.',
      stageSlug: 'daily',
      lessonSlug: 'daily-checkin',
      activityType: 'daily_practice',
      today: '2026-08-29',
    })

    expect(result.newBadges).not.toContain('recognition-complete')
    expect(result.newBadges).not.toContain('acceptance-complete')
    const progressUpsert = calls.upsert.find((c) => c.table === 'journey_progress')
    expect(progressUpsert).toBeUndefined()
  })
})
