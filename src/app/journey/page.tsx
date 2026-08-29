import Link from 'next/link'
import { JOURNEY_STAGES } from '@/lib/content/journey-stages'

export default function JourneyPage() {
  return (
    <main className="mx-auto max-w-2xl py-16">
      <h1 className="text-2xl font-serif mb-8">The Journey</h1>
      <ul className="flex flex-col gap-4">
        {JOURNEY_STAGES.map((stage) => (
          <li key={stage.slug} className="rounded border border-stone-200 p-4">
            <Link href={`/journey/${stage.slug}`} className="text-lg font-medium">
              {stage.title}
            </Link>
            <p className="text-stone-600">{stage.description}</p>
          </li>
        ))}
      </ul>
    </main>
  )
}
