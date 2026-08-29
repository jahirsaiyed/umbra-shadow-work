// Pure prompt-selection logic, kept free of server-only imports (cookies, etc.)
// so it can be imported from both server code (daily/actions.ts) and client
// components (DailyCheckInForm.tsx) without pulling server-only code into the
// client bundle.

const DAILY_PROMPTS = [
  'What emotion showed up most today, and where did you feel it in your body?',
  'Did anything today provoke a reaction bigger than the moment called for?',
  "What's one thing you did today that you'd rather not admit to?",
  'Who did you compare yourself to today, and what did that comparison reveal?',
]

export function getTodaysPrompt(dateSeed: string): string {
  const index = Array.from(dateSeed).reduce((sum, char) => sum + char.charCodeAt(0), 0) % DAILY_PROMPTS.length
  return DAILY_PROMPTS[index]
}
