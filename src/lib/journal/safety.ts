// Baseline Phase 1 check: intentionally over-inclusive pattern matching, not
// sentiment understanding. Phase 2 replaces this with an LLM classifier;
// until then, false positives are an acceptable trade-off for false negatives.
const CRISIS_PATTERNS: RegExp[] = [
  /\bkill(ing)?\s+myself\b/i,
  /\bend(ing)?\s+my\s+life\b/i,
  /\bsuicid(e|al)\b/i,
  /\bhurt(ing)?\s+myself\b/i,
  /\bdon'?t\s+want\s+to\s+(be\s+here|live|exist)\s*(anymore)?\b/i,
  /\bnot\s+worth\s+living\b/i,
  /\bself[\s-]?harm\b/i,
]

export function containsCrisisLanguage(text: string): boolean {
  return CRISIS_PATTERNS.some((pattern) => pattern.test(text))
}
