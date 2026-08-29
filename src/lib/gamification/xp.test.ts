import { describe, it, expect } from 'vitest'
import { calculateXpGain, growthStageForXp } from './xp'

describe('calculateXpGain', () => {
  it('awards more XP for a lesson exercise than a daily check-in', () => {
    expect(calculateXpGain('lesson_exercise')).toBe(20)
    expect(calculateXpGain('daily_practice')).toBe(10)
  })
})

describe('growthStageForXp', () => {
  it.each([
    [0, 'seed'],
    [49, 'seed'],
    [50, 'sprout'],
    [149, 'sprout'],
    [150, 'sapling'],
    [349, 'sapling'],
    [350, 'bloom'],
    [10000, 'bloom'],
  ])('xp=%i -> %s', (xp, expected) => {
    expect(growthStageForXp(xp)).toBe(expected)
  })
})
