'use client'

import { useState } from 'react'
import type { SubmitJournalEntryResult } from '@/lib/journal/submit-entry'
import { getLocalDateString } from '@/lib/date'

export function ExerciseForm({
  stageSlug,
  lessonSlug,
  onSubmit,
}: {
  stageSlug: string
  lessonSlug: string
  onSubmit: (stageSlug: string, lessonSlug: string, content: string, today: string) => Promise<SubmitJournalEntryResult>
}) {
  const [content, setContent] = useState('')
  const [result, setResult] = useState<SubmitJournalEntryResult | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const today = getLocalDateString(new Date())
      const outcome = await onSubmit(stageSlug, lessonSlug, content, today)
      setResult(outcome)
    } catch {
      setError("We couldn't save that just now. Your words are still here — please try again.")
    } finally {
      setSaving(false)
    }
  }

  const saved = result !== null

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={6}
        className="border rounded p-3"
        placeholder="Write freely — there's no wrong answer here."
      />
      <button
        type="submit"
        disabled={saving || saved || content.trim().length === 0}
        className="self-start rounded bg-stone-800 text-white px-4 py-2 disabled:opacity-40"
      >
        Save entry
      </button>

      {error && (
        <div className="mt-4 rounded border border-stone-200 bg-stone-50 p-4">
          <p className="text-stone-700">{error}</p>
        </div>
      )}

      {result && (
        <div className="mt-4 rounded border border-stone-200 bg-stone-50 p-4">
          <p>Entry saved.</p>
          {result.safetyFlagged && (
            <p className="mt-2 text-stone-700">
              What you wrote sounds heavy. There&apos;s no pressure to do anything right now — but if it would help,
              this might be a good time to talk to someone. <a href="/resources" className="underline">See some options</a>.
            </p>
          )}
        </div>
      )}
    </form>
  )
}
