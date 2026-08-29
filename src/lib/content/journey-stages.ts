export interface Lesson {
  slug: string
  title: string
  psychoeducation: string
  exercisePrompt: string
}

export interface JourneyStage {
  slug: string
  title: string
  description: string
  lessons: Lesson[]
}

export const JOURNEY_STAGES: JourneyStage[] = [
  {
    slug: 'recognition',
    title: 'Recognition',
    description: 'Learning to notice when the shadow shows up — usually through a reaction stronger than the moment calls for.',
    lessons: [
      {
        slug: 'noticing-triggers',
        title: 'Noticing Your Triggers',
        psychoeducation:
          'A trigger is a disproportionate emotional reaction — irritation, contempt, envy, disgust — to something small. The size of the reaction is a clue: it usually points to something being protected, not just the situation in front of you.',
        exercisePrompt:
          "Think of a moment recently when you reacted more strongly than the situation seemed to call for. What happened, and what did you feel in your body? Don't judge it yet — just describe it.",
      },
      {
        slug: 'projection-journaling',
        title: 'What You Admire and Despise in Others',
        psychoeducation:
          'Projection means placing a disowned trait — good or bad — onto someone else. What we strongly admire or strongly judge in other people is often a mirror for something in ourselves we have not yet recognized.',
        exercisePrompt:
          'Name someone you admire intensely and someone whose behavior irritates you intensely. What quality is it, specifically? Where might that same quality quietly exist in you?',
      },
    ],
  },
  {
    slug: 'acceptance',
    title: 'Acceptance',
    description: 'Sitting with what you noticed in Recognition, without judgment, and without rushing to fix it.',
    lessons: [
      {
        slug: 'naming-without-judgment',
        title: 'Naming It Without Judgment',
        psychoeducation:
          'Acceptance does not mean approval — it means acknowledging a trait or feeling exists in you without immediately trying to eliminate it. Naming something plainly, without a moral verdict attached, is what makes it possible to work with later.',
        exercisePrompt:
          "Take the trait or reaction you identified in Recognition and write one sentence naming it plainly — no self-criticism, no excuses. Just: 'I have a part of me that ___.'",
      },
      {
        slug: 'avoided-emotions',
        title: 'The Emotion You Avoid Most',
        psychoeducation:
          'Most people have one emotion — anger, sadness, envy, need — they were taught was unacceptable early on, and have been managing around ever since. Identifying it is often the single most useful step in shadow work.',
        exercisePrompt:
          "What emotion do you feel most uncomfortable admitting to, even to yourself? When did you last actually feel it, and what did you do with it in that moment?",
      },
    ],
  },
]

export function getStage(slug: string): JourneyStage | undefined {
  return JOURNEY_STAGES.find((stage) => stage.slug === slug)
}

export function getLesson(stageSlug: string, lessonSlug: string): Lesson | undefined {
  return getStage(stageSlug)?.lessons.find((lesson) => lesson.slug === lessonSlug)
}
