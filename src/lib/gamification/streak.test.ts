import { describe, it, expect } from 'vitest'
import { updateStreakForActivity, type StreakState } from './streak'

const base: StreakState = {
  currentStreak: 0,
  longestStreak: 0,
  freezesRemaining: 3,
  lastActivityDate: null,
}

describe('updateStreakForActivity', () => {
  it('starts a streak at 1 on first-ever activity', () => {
    const result = updateStreakForActivity(base, '2026-08-29')
    expect(result.currentStreak).toBe(1)
    expect(result.lastActivityDate).toBe('2026-08-29')
  })

  it('does not change the streak for a second activity on the same day', () => {
    const dayOne = updateStreakForActivity(base, '2026-08-29')
    const sameDay = updateStreakForActivity(dayOne, '2026-08-29')
    expect(sameDay.currentStreak).toBe(1)
  })

  it('increments the streak on a consecutive day', () => {
    const dayOne = updateStreakForActivity(base, '2026-08-29')
    const dayTwo = updateStreakForActivity(dayOne, '2026-08-30')
    expect(dayTwo.currentStreak).toBe(2)
    expect(dayTwo.longestStreak).toBe(2)
  })

  it('uses a freeze to bridge exactly one missed day, keeping the streak alive', () => {
    const dayOne = updateStreakForActivity(base, '2026-08-29')
    const dayThree = updateStreakForActivity(dayOne, '2026-08-31')
    expect(dayThree.currentStreak).toBe(2)
    expect(dayThree.freezesRemaining).toBe(2)
  })

  it('resets to 1 (never punished below 1) after a missed day with no freezes left', () => {
    const noFreezes: StreakState = { ...base, currentStreak: 5, longestStreak: 5, freezesRemaining: 0, lastActivityDate: '2026-08-29' }
    const result = updateStreakForActivity(noFreezes, '2026-08-31')
    expect(result.currentStreak).toBe(1)
    expect(result.longestStreak).toBe(5)
  })

  it('resets to 1 after a gap of more than one missed day even with freezes available', () => {
    const dayOne = updateStreakForActivity(base, '2026-08-29')
    const dayFive = updateStreakForActivity(dayOne, '2026-09-02')
    expect(dayFive.currentStreak).toBe(1)
    expect(dayFive.freezesRemaining).toBe(3)
  })
})
