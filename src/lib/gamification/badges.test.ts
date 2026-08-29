import { describe, it, expect } from 'vitest'
import { determineNewBadges } from './badges'

describe('determineNewBadges', () => {
  it('awards first-entry on the first journal entry only', () => {
    expect(determineNewBadges({ isFirstJournalEntry: true, completedStageSlug: null, currentStreak: 1 })).toContain('first-entry')
    expect(determineNewBadges({ isFirstJournalEntry: false, completedStageSlug: null, currentStreak: 1 })).not.toContain('first-entry')
  })

  it('awards a stage-completion badge matching the completed stage', () => {
    expect(determineNewBadges({ isFirstJournalEntry: false, completedStageSlug: 'recognition', currentStreak: 1 })).toContain('recognition-complete')
    expect(determineNewBadges({ isFirstJournalEntry: false, completedStageSlug: 'acceptance', currentStreak: 1 })).toContain('acceptance-complete')
  })

  it('awards streak badges at exactly 3 and 7 days, not other counts', () => {
    expect(determineNewBadges({ isFirstJournalEntry: false, completedStageSlug: null, currentStreak: 3 })).toContain('three-day-streak')
    expect(determineNewBadges({ isFirstJournalEntry: false, completedStageSlug: null, currentStreak: 7 })).toContain('seven-day-streak')
    expect(determineNewBadges({ isFirstJournalEntry: false, completedStageSlug: null, currentStreak: 4 })).toHaveLength(0)
  })

  it('can award multiple badges from a single event', () => {
    const badges = determineNewBadges({ isFirstJournalEntry: true, completedStageSlug: 'recognition', currentStreak: 3 })
    expect(badges).toEqual(expect.arrayContaining(['first-entry', 'recognition-complete', 'three-day-streak']))
  })
})
