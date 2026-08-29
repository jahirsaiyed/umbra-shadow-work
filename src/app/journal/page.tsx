import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { decryptJournalEntries, type EncryptedEntryRow, type DecryptedEntry } from '@/lib/journal/read-entries'
import { getLesson } from '@/lib/content/journey-stages'

function entrySourceLabel(entry: DecryptedEntry): string {
  if (entry.stage_slug === 'daily') return 'Daily Practice'
  if (entry.stage_slug && entry.lesson_slug) {
    const lesson = getLesson(entry.stage_slug, entry.lesson_slug)
    if (lesson) return lesson.title
  }
  return 'Reflection'
}

export default async function JournalPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/sign-in')

  const { data: rows, error } = await supabase
    .from('journal_entries')
    .select('id, stage_slug, lesson_slug, ciphertext, iv, auth_tag, safety_flagged, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
  if (error) {
    console.error('Failed to load journal_entries for journal page:', error, { userId: user.id })
  }

  const entries = decryptJournalEntries((rows ?? []) as EncryptedEntryRow[])

  return (
    <main className="mx-auto max-w-2xl py-16 flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-serif mb-2">Your Journal</h1>
        <p className="text-stone-600">A private record of what you've written along the way.</p>
      </div>

      {entries.length === 0 ? (
        <p className="text-stone-500 italic">No entries yet — your reflections will show up here.</p>
      ) : (
        <ul className="flex flex-col gap-6">
          {entries.map((entry) => (
            <li key={entry.id} className="rounded border border-stone-200 p-5 flex flex-col gap-2">
              <div className="flex items-baseline justify-between gap-4">
                <span className="text-sm font-medium text-stone-500">{entrySourceLabel(entry)}</span>
                <time className="text-sm text-stone-400" dateTime={entry.created_at}>
                  {new Date(entry.created_at).toLocaleDateString()}
                </time>
              </div>
              <p className="text-stone-800 whitespace-pre-wrap">{entry.content}</p>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
