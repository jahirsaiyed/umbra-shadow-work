import { describe, it, expect } from 'vitest'
import { containsCrisisLanguage } from './safety'

describe('containsCrisisLanguage', () => {
  it.each([
    'I keep thinking about killing myself',
    "I don't want to be here anymore",
    'I want to end my life',
    'I have been hurting myself',
    "It's not worth living",
    'I have been having thoughts of self-harm',
  ])('flags: "%s"', (text) => {
    expect(containsCrisisLanguage(text)).toBe(true)
  })

  it.each([
    'I killed it at my presentation today',
    'I want to end my lease early',
    'My coworker hurt my feelings',
    'Today was a calm, ordinary day',
  ])('does not flag: "%s"', (text) => {
    expect(containsCrisisLanguage(text)).toBe(false)
  })
})
