export type ActivityType = 'lesson_exercise' | 'daily_practice'

const XP_BY_ACTIVITY: Record<ActivityType, number> = {
  lesson_exercise: 20,
  daily_practice: 10,
}

export function calculateXpGain(activity: ActivityType): number {
  return XP_BY_ACTIVITY[activity]
}

export type GrowthStage = 'seed' | 'sprout' | 'sapling' | 'bloom'

const GROWTH_THRESHOLDS: [number, GrowthStage][] = [
  [0, 'seed'],
  [50, 'sprout'],
  [150, 'sapling'],
  [350, 'bloom'],
]

export function growthStageForXp(xp: number): GrowthStage {
  let stage: GrowthStage = 'seed'
  for (const [threshold, name] of GROWTH_THRESHOLDS) {
    if (xp >= threshold) stage = name
  }
  return stage
}
