export interface StreakState {
  currentStreak: number
  longestStreak: number
  freezesRemaining: number
  lastActivityDate: string | null // 'YYYY-MM-DD'
}

function daysBetween(a: string, b: string): number {
  const msPerDay = 24 * 60 * 60 * 1000
  return Math.round((new Date(`${b}T00:00:00Z`).getTime() - new Date(`${a}T00:00:00Z`).getTime()) / msPerDay)
}

export function updateStreakForActivity(state: StreakState, today: string): StreakState {
  if (state.lastActivityDate === today) {
    return state
  }

  if (state.lastActivityDate === null) {
    return { ...state, currentStreak: 1, longestStreak: Math.max(1, state.longestStreak), lastActivityDate: today }
  }

  const gap = daysBetween(state.lastActivityDate, today)

  if (gap === 1) {
    const currentStreak = state.currentStreak + 1
    return { ...state, currentStreak, longestStreak: Math.max(currentStreak, state.longestStreak), lastActivityDate: today }
  }

  if (gap === 2 && state.freezesRemaining > 0) {
    const currentStreak = state.currentStreak + 1
    return {
      currentStreak,
      longestStreak: Math.max(currentStreak, state.longestStreak),
      freezesRemaining: state.freezesRemaining - 1,
      lastActivityDate: today,
    }
  }

  return { ...state, currentStreak: 1, lastActivityDate: today }
}
