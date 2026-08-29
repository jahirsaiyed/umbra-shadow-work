import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getLesson } from '@/lib/content/journey-stages'
import { submitJournalEntryAction } from '../../actions'
import { ExerciseForm } from './ExerciseForm'

export default async function LessonPage({
  params,
}: {
  params: Promise<{ stageSlug: string; lessonSlug: string }>
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/sign-in')

  const { stageSlug, lessonSlug } = await params
  const lesson = getLesson(stageSlug, lessonSlug)
  if (!lesson) notFound()

  async function onSubmit(stage: string, slug: string, content: string, today: string) {
    'use server'
    return submitJournalEntryAction(stage, slug, content, today)
  }

  return (
    <main className="mx-auto max-w-2xl py-16">
      <h1 className="text-2xl font-serif mb-4">{lesson.title}</h1>
      <p className="text-stone-700 mb-8">{lesson.psychoeducation}</p>
      <p className="font-medium mb-4">{lesson.exercisePrompt}</p>
      <ExerciseForm stageSlug={stageSlug} lessonSlug={lessonSlug} onSubmit={onSubmit} />
    </main>
  )
}
