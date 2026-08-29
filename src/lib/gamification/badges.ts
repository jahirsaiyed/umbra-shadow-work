export interface BadgeAwardContext {
  isFirstJournalEntry: boolean
  completedStageSlug: string | null
  currentStreak: number
}

export function determineNewBadges(context: BadgeAwardContext): string[] {
  const badges: string[] = []
  if (context.isFirstJournalEntry) badges.push('first-entry')
  if (context.completedStageSlug === 'recognition') badges.push('recognition-complete')
  if (context.completedStageSlug === 'acceptance') badges.push('acceptance-complete')
  if (context.currentStreak === 3) badges.push('three-day-streak')
  if (context.currentStreak === 7) badges.push('seven-day-streak')
  return badges
}
