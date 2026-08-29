import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { getStage } from '@/lib/content/journey-stages'
import { createClient } from '@/lib/supabase/server'

export default async function StagePage({ params }: { params: Promise<{ stageSlug: string }> }) {
  const { stageSlug } = await params
  const stage = getStage(stageSlug)
  if (!stage) notFound()

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/sign-in')

  const { data: progressRows, error: progressError } = await supabase
    .from('journey_progress')
    .select('lesson_slug')
    .eq('user_id', user.id)
    .eq('stage_slug', stage.slug)
  if (progressError) {
    console.error('Failed to load journey_progress for stage page:', progressError, { userId: user.id, stageSlug: stage.slug })
  }
  const completedLessonSlugs = new Set((progressRows ?? []).map((row) => row.lesson_slug))

  return (
    <main className="mx-auto max-w-2xl py-16">
      <h1 className="text-2xl font-serif mb-2">{stage.title}</h1>
      <p className="text-stone-600 mb-8">{stage.description}</p>
      <ul className="flex flex-col gap-4">
        {stage.lessons.map((lesson) => {
          const isCompleted = completedLessonSlugs.has(lesson.slug)
          return (
            <li key={lesson.slug} className="rounded border border-stone-200 p-4 flex items-center justify-between gap-4">
              <Link href={`/journey/${stage.slug}/${lesson.slug}`} className="text-lg font-medium">
                {lesson.title}
              </Link>
              {isCompleted && (
                <span className="text-sm font-medium text-green-700" aria-label="Lesson completed">
                  ✓ Completed
                </span>
              )}
            </li>
          )
        })}
      </ul>
    </main>
  )
}
