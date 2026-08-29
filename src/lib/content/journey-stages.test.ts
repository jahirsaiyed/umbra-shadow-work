// src/lib/content/journey-stages.test.ts
import { describe, it, expect } from 'vitest'
import { JOURNEY_STAGES, getStage, getLesson } from './journey-stages'

describe('journey content', () => {
  it('exposes exactly the Phase 1 stages, in order', () => {
    expect(JOURNEY_STAGES.map((s) => s.slug)).toEqual(['recognition', 'acceptance'])
  })

  it('every lesson has at least one exercise prompt', () => {
    for (const stage of JOURNEY_STAGES) {
      for (const lesson of stage.lessons) {
        expect(lesson.exercisePrompt.length).toBeGreaterThan(0)
      }
    }
  })

  it('getStage finds a stage by slug and returns undefined for unknown slugs', () => {
    expect(getStage('recognition')?.title).toBe('Recognition')
    expect(getStage('nonexistent')).toBeUndefined()
  })

  it('getLesson finds a lesson within a stage', () => {
    expect(getLesson('recognition', 'noticing-triggers')?.title).toBe('Noticing Your Triggers')
    expect(getLesson('recognition', 'nonexistent')).toBeUndefined()
  })
})
