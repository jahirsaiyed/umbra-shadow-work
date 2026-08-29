import { describe, it, expect } from 'vitest'
import { getTodaysPrompt } from './actions'

describe('getTodaysPrompt', () => {
  it('returns the same prompt for the same date seed', () => {
    expect(getTodaysPrompt('2026-08-29')).toBe(getTodaysPrompt('2026-08-29'))
  })

  it('returns a non-empty string', () => {
    expect(getTodaysPrompt('2026-08-29').length).toBeGreaterThan(0)
  })
})
