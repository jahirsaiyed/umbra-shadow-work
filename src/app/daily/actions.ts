import { createClient } from '@/lib/supabase/server'
import { submitJournalEntry, type SubmitJournalEntryResult } from '@/lib/journal/submit-entry'
import { redirect } from 'next/navigation'

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

export async function submitDailyCheckInAction(content: string): Promise<SubmitJournalEntryResult> {
  'use server'

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/sign-in')

  const today = new Date().toISOString().slice(0, 10)
  return submitJournalEntry(supabase, user.id, {
    content,
    stageSlug: 'daily',
    lessonSlug: 'daily-checkin',
    activityType: 'daily_practice',
    today,
  })
}
