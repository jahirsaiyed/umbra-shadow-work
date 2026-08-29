'use server'

import { createClient } from '@/lib/supabase/server'
import { submitJournalEntry, type SubmitJournalEntryResult } from '@/lib/journal/submit-entry'
import { redirect } from 'next/navigation'

export async function submitJournalEntryAction(
  stageSlug: string,
  lessonSlug: string,
  content: string,
  today: string
): Promise<SubmitJournalEntryResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/sign-in')

  return submitJournalEntry(supabase, user.id, { content, stageSlug, lessonSlug, activityType: 'lesson_exercise', today })
}
