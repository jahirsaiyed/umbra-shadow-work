import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { CompanionView } from '@/components/companion/CompanionView'
import { BadgeGrid } from '@/components/badges/BadgeGrid'
import { signOut } from '@/app/(auth)/actions'
import type { GrowthStage } from '@/lib/gamification/xp'

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/sign-in')

  const { data: companion, error: companionError } = await supabase
    .from('companion_state')
    .select('growth_stage, current_streak')
    .eq('user_id', user.id)
    .single()
  if (companionError) {
    console.error('Failed to load companion_state for dashboard:', companionError, { userId: user.id })
  }

  const { data: earnedBadges, error: badgesError } = await supabase
    .from('user_badges')
    .select('badges(id, name, description)')
    .eq('user_id', user.id)
  if (badgesError) {
    console.error('Failed to load user_badges for dashboard:', badgesError, { userId: user.id })
  }

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
        <form action={signOut}>
          <button type="submit" className="rounded border border-stone-800 px-4 py-2">
            Sign out
          </button>
        </form>
      </div>
      <div>
        <h2 className="text-lg font-medium mb-4">Your badges</h2>
        <BadgeGrid badges={badges} />
      </div>
    </main>
  )
}
