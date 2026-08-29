'use client'

import { useState, useSyncExternalStore } from 'react'
import type { SubmitJournalEntryResult } from '@/lib/journal/submit-entry'
import { getLocalDateString } from '@/lib/date'
import { getTodaysPrompt } from '@/lib/daily-prompt'

// No-op subscription: the client's local-day prompt doesn't change while the
// page is open, so there's nothing to notify on. This exists purely so
// useSyncExternalStore can give us a value that's read only on the client
// (via getSnapshot) with a safe, matching placeholder for the server-rendered
// pass (via getServerSnapshot) — the standard, hydration-safe way to read a
// browser-only value (here, the viewer's local clock) without the
// setState-in-effect anti-pattern.
function subscribeToNothing() {
  return () => {}
}

function getClientPrompt(): string {
  return getTodaysPrompt(getLocalDateString(new Date()))
}

function getServerPrompt(): null {
  return null
}

export function DailyCheckInForm({
  prompt: promptProp,
  onSubmit,
}: {
  // Optional: pass an explicit prompt (used by tests). In production usage the
  // caller omits this and the component computes it itself from the client's
  // local date, so the prompt rotates at the user's actual local midnight
  // rather than at the server's UTC midnight.
  prompt?: string
  onSubmit: (content: string, today: string) => Promise<SubmitJournalEntryResult>
}) {
  const autoPrompt = useSyncExternalStore(subscribeToNothing, getClientPrompt, getServerPrompt)
  const [content, setContent] = useState('')
  const [result, setResult] = useState<SubmitJournalEntryResult | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const prompt = promptProp ?? autoPrompt

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const today = getLocalDateString(new Date())
      const outcome = await onSubmit(content, today)
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
      {prompt && <p className="font-medium">{prompt}</p>}
      <textarea value={content} onChange={(e) => setContent(e.target.value)} rows={4} className="border rounded p-3" />
      <button
        type="submit"
        disabled={saving || saved || content.trim().length === 0}
        className="self-start rounded bg-stone-800 text-white px-4 py-2 disabled:opacity-40"
      >
        Check in
      </button>

      {error && (
        <div className="mt-4 rounded border border-stone-200 bg-stone-50 p-4">
          <p className="text-stone-700">{error}</p>
        </div>
      )}

      {result && <p className="mt-2 text-stone-700">Thanks for checking in today.</p>}
    </form>
  )
}
