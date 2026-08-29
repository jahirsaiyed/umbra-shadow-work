import type { GrowthStage } from '@/lib/gamification/xp'

const STAGE_LABELS: Record<GrowthStage, string> = {
  seed: 'A seedling, just getting started',
  sprout: 'A young sprout, growing steadily',
  sapling: 'A sapling, putting down roots',
  bloom: 'In full bloom',
}

export function CompanionView({ growthStage, currentStreak }: { growthStage: GrowthStage; currentStreak: number }) {
  return (
    <div className="rounded border border-stone-200 p-6 text-center">
      <p className="text-lg">{STAGE_LABELS[growthStage]}</p>
      <p className="text-stone-600 mt-2">
        {currentStreak > 0 ? `${currentStreak}-day streak` : "No streak yet — that's okay, come back whenever you're ready."}
      </p>
    </div>
  )
}
