import { notFound } from 'next/navigation'
import { getLesson } from '@/lib/content/journey-stages'
import { submitJournalEntryAction } from '../../actions'
import { ExerciseForm } from './ExerciseForm'

export default async function LessonPage({
  params,
}: {
  params: Promise<{ stageSlug: string; lessonSlug: string }>
}) {
  const { stageSlug, lessonSlug } = await params
  const lesson = getLesson(stageSlug, lessonSlug)
  if (!lesson) notFound()

  async function onSubmit(stage: string, slug: string, content: string) {
    'use server'
    return submitJournalEntryAction(stage, slug, content)
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
