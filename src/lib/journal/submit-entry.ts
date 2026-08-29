import { encryptText } from './encryption'
import { containsCrisisLanguage } from './safety'
import { calculateXpGain, growthStageForXp } from '../gamification/xp'
import { updateStreakForActivity, type StreakState } from '../gamification/streak'
import { determineNewBadges } from '../gamification/badges'

export interface SubmitJournalEntryInput {
  content: string
  stageSlug: string
  lessonSlug: string
  activityType: 'lesson_exercise' | 'daily_practice'
  today: string // 'YYYY-MM-DD', injected so this stays pure and testable
}

export interface SubmitJournalEntryResult {
  safetyFlagged: boolean
  newBadges: string[]
  growthStage: string
}

// `supabase` is typed loosely on purpose: the fake client in submit-entry.test.ts
// only implements the subset of the real SupabaseClient this function calls.
export async function submitJournalEntry(
  supabase: any,
  userId: string,
  input: SubmitJournalEntryInput
): Promise<SubmitJournalEntryResult> {
  const safetyFlagged = containsCrisisLanguage(input.content)
  const { ciphertext, iv, authTag } = encryptText(input.content)

  const { count: existingEntryCount } = await supabase
    .from('journal_entries')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)

  const { error: insertError } = await supabase.from('journal_entries').insert({
    user_id: userId,
    stage_slug: input.stageSlug,
    lesson_slug: input.lessonSlug,
    ciphertext,
    iv,
    auth_tag: authTag,
    safety_flagged: safetyFlagged,
  })
  if (insertError) throw insertError

  const { data: companion, error: companionSelectError } = await supabase
    .from('companion_state')
    .select('*')
    .eq('user_id', userId)
    .single()
  if (companionSelectError) {
    console.error('Failed to load companion_state during journal entry submission:', companionSelectError, {
      userId,
    })
  }

  const streakBefore: StreakState = {
    currentStreak: companion?.current_streak ?? 0,
    longestStreak: companion?.longest_streak ?? 0,
    freezesRemaining: companion?.streak_freezes_remaining ?? 3,
    lastActivityDate: companion?.last_activity_date ?? null,
  }
  const streakAfter = updateStreakForActivity(streakBefore, input.today)

  const newXp = (companion?.xp ?? 0) + calculateXpGain(input.activityType)
  const growthStage = growthStageForXp(newXp)

  const { error: companionUpsertError } = await supabase.from('companion_state').upsert({
    user_id: userId,
    xp: newXp,
    growth_stage: growthStage,
    current_streak: streakAfter.currentStreak,
    longest_streak: streakAfter.longestStreak,
    streak_freezes_remaining: streakAfter.freezesRemaining,
    last_activity_date: input.today,
  })
  if (companionUpsertError) {
    console.error('Failed to update companion_state during journal entry submission:', companionUpsertError, {
      userId,
    })
  }

  const newBadges = determineNewBadges({
    isFirstJournalEntry: (existingEntryCount ?? 0) === 0,
    completedStageSlug: null,
    currentStreak: streakAfter.currentStreak,
  })

  if (newBadges.length > 0) {
    const { error: badgesUpsertError } = await supabase
      .from('user_badges')
      .upsert(
        newBadges.map((badgeId) => ({ user_id: userId, badge_id: badgeId })),
        { onConflict: 'user_id,badge_id', ignoreDuplicates: true }
      )
    if (badgesUpsertError) {
      console.error('Failed to award badges during journal entry submission:', badgesUpsertError, {
        userId,
        newBadges,
      })
    }
  }

  return { safetyFlagged, newBadges, growthStage }
}
