import { createClient } from '@/lib/supabase/server'
import { submitJournalEntry, type SubmitJournalEntryResult } from '@/lib/journal/submit-entry'
import { redirect } from 'next/navigation'

// Re-exported from the shared, server-import-free module so client components
// (DailyCheckInForm) can compute the prompt for the user's local day without
// pulling this file's server-only imports (cookies, etc.) into the client bundle.
export { getTodaysPrompt } from '@/lib/daily-prompt'

export async function submitDailyCheckInAction(content: string, today: string): Promise<SubmitJournalEntryResult> {
  'use server'

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/sign-in')

  return submitJournalEntry(supabase, user.id, {
    content,
    stageSlug: 'daily',
    lessonSlug: 'daily-checkin',
    activityType: 'daily_practice',
    today,
  })
}
