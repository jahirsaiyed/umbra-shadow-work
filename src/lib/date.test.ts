import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { getLocalDateString } from './date'

describe('getLocalDateString', () => {
  it('formats a local date as zero-padded YYYY-MM-DD', () => {
    const date = new Date(2026, 0, 5) // Jan 5 2026, local midnight
    expect(getLocalDateString(date)).toBe('2026-01-05')
  })

  it('zero-pads single-digit months and days', () => {
    const date = new Date(2026, 8, 1) // Sep 1 2026 (month index 8)
    expect(getLocalDateString(date)).toBe('2026-09-01')
    expect(getLocalDateString(date)).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  describe('when the local calendar day differs from the UTC calendar day', () => {
    const originalTZ = process.env.TZ

    beforeAll(() => {
      // Fixed-offset zone (UTC+14, no DST) so the divergence below is deterministic
      // regardless of what timezone the test runner's host machine is in.
      process.env.TZ = 'Pacific/Kiritimati'
    })

    afterAll(() => {
      process.env.TZ = originalTZ
    })

    it('uses the local calendar day, not the UTC day (regression: toISOString() is UTC-based)', () => {
      // Just after local midnight in UTC+14 is still the *previous* day in UTC.
      // This is exactly the scenario from the bug report: a user journaling shortly
      // after their own local midnight must not have that entry attributed to the
      // wrong calendar day.
      const justAfterLocalMidnight = new Date(2026, 5, 15, 0, 30, 0) // 2026-06-15 00:30 local

      // Sanity check that this instant really does straddle a UTC day boundary —
      // otherwise this test wouldn't actually be exercising the local-vs-UTC distinction.
      expect(justAfterLocalMidnight.getUTCDate()).not.toBe(justAfterLocalMidnight.getDate())

      expect(getLocalDateString(justAfterLocalMidnight)).toBe('2026-06-15')
    })
  })
})
