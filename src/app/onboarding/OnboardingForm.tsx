'use client'

import { useState } from 'react'

type Answers = {
  familiarity_level: string
  emotional_bandwidth: string
  primary_focus: string
}

export function OnboardingForm({ action }: { action: (formData: FormData) => void }) {
  const [answers, setAnswers] = useState<Partial<Answers>>({})
  const isComplete = Boolean(
    answers.familiarity_level && answers.emotional_bandwidth && answers.primary_focus
  )

  function set<K extends keyof Answers>(key: K, value: Answers[K]) {
    setAnswers((prev) => ({ ...prev, [key]: value }))
  }

  return (
    <form action={action} className="flex flex-col gap-8 max-w-lg">
      <fieldset>
        <legend className="font-medium mb-2">How familiar are you with shadow work?</legend>
        {[
          { value: 'new', label: "I'm new to this" },
          { value: 'some_experience', label: 'I have some experience' },
          { value: 'experienced', label: "I've done this before" },
        ].map((opt) => (
          <label key={opt.value} className="flex items-center gap-2">
            <input
              type="radio"
              name="familiarity_level"
              value={opt.value}
              onChange={() => set('familiarity_level', opt.value)}
            />
            {opt.label}
          </label>
        ))}
      </fieldset>

      <fieldset>
        <legend className="font-medium mb-2">How much emotional bandwidth do you have right now?</legend>
        {[
          { value: 'low', label: 'Low — go gently' },
          { value: 'moderate', label: 'Moderate' },
          { value: 'high', label: 'High — I can go deeper' },
        ].map((opt) => (
          <label key={opt.value} className="flex items-center gap-2">
            <input
              type="radio"
              name="emotional_bandwidth"
              value={opt.value}
              onChange={() => set('emotional_bandwidth', opt.value)}
            />
            {opt.label}
          </label>
        ))}
      </fieldset>

      <fieldset>
        <legend className="font-medium mb-2">What&apos;s drawing you in right now?</legend>
        {[
          { value: 'relationship_pattern', label: 'A relationship pattern' },
          { value: 'self_criticism', label: 'Self-criticism' },
          { value: 'recurring_trigger', label: 'A recurring trigger' },
          { value: 'curiosity', label: 'General curiosity' },
        ].map((opt) => (
          <label key={opt.value} className="flex items-center gap-2">
            <input
              type="radio"
              name="primary_focus"
              value={opt.value}
              onChange={() => set('primary_focus', opt.value)}
            />
            {opt.label}
          </label>
        ))}
      </fieldset>

      <button type="submit" disabled={!isComplete} className="rounded bg-stone-800 text-white py-2 disabled:opacity-40">
        Continue
      </button>
    </form>
  )
}
