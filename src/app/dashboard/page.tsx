import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { CompanionView } from '@/components/companion/CompanionView'
import { BadgeGrid } from '@/components/badges/BadgeGrid'
import type { GrowthStage } from '@/lib/gamification/xp'

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data: companion } = await supabase
    .from('companion_state')
    .select('growth_stage, current_streak')
    .eq('user_id', user.id)
    .single()

  const { data: earnedBadges } = await supabase
    .from('user_badges')
    .select('badges(id, name, description)')
    .eq('user_id', user.id)

  const badges = (earnedBadges ?? []).map((row: any) => row.badges)

  return (
    <main className="mx-auto max-w-2xl py-16 flex flex-col gap-8">
      <h1 className="text-2xl font-serif">Welcome back</h1>
      <CompanionView
        growthStage={(companion?.growth_stage as GrowthStage) ?? 'seed'}
        currentStreak={companion?.current_streak ?? 0}
      />
      <div className="flex gap-4">
        <Link href="/journey" className="rounded bg-stone-800 text-white px-4 py-2">
          Continue the Journey
        </Link>
        <Link href="/daily" className="rounded border border-stone-800 px-4 py-2">
          Today's check-in
        </Link>
      </div>
      <div>
        <h2 className="text-lg font-medium mb-4">Your badges</h2>
        <BadgeGrid badges={badges} />
      </div>
    </main>
  )
}
