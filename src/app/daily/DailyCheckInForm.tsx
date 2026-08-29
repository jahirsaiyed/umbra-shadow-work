'use client'

import { useState } from 'react'
import type { SubmitJournalEntryResult } from '@/lib/journal/submit-entry'

export function DailyCheckInForm({
  prompt,
  onSubmit,
}: {
  prompt: string
  onSubmit: (content: string) => Promise<SubmitJournalEntryResult>
}) {
  const [content, setContent] = useState('')
  const [result, setResult] = useState<SubmitJournalEntryResult | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setResult(await onSubmit(content))
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <p className="font-medium">{prompt}</p>
      <textarea value={content} onChange={(e) => setContent(e.target.value)} rows={4} className="border rounded p-3" />
      <button type="submit" disabled={content.trim().length === 0} className="self-start rounded bg-stone-800 text-white px-4 py-2 disabled:opacity-40">
        Check in
      </button>
      {result && <p className="mt-2 text-stone-700">Thanks for checking in today.</p>}
    </form>
  )
}
