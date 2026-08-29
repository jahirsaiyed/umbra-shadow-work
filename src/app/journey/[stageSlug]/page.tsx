import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getStage } from '@/lib/content/journey-stages'

export default async function StagePage({ params }: { params: Promise<{ stageSlug: string }> }) {
  const { stageSlug } = await params
  const stage = getStage(stageSlug)
  if (!stage) notFound()

  return (
    <main className="mx-auto max-w-2xl py-16">
      <h1 className="text-2xl font-serif mb-2">{stage.title}</h1>
      <p className="text-stone-600 mb-8">{stage.description}</p>
      <ul className="flex flex-col gap-4">
        {stage.lessons.map((lesson) => (
          <li key={lesson.slug} className="rounded border border-stone-200 p-4">
            <Link href={`/journey/${stage.slug}/${lesson.slug}`} className="text-lg font-medium">
              {lesson.title}
            </Link>
          </li>
        ))}
      </ul>
    </main>
  )
}
