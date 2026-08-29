import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { submitDailyCheckInAction } from './actions'
import { DailyCheckInForm } from './DailyCheckInForm'

export default async function DailyPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/sign-in')

  // The prompt is intentionally not computed here: "today" needs to reflect the
  // user's local timezone, which the server doesn't know. DailyCheckInForm
  // computes it client-side (see getLocalDateString) so it rotates at the
  // user's actual local midnight rather than the server's UTC midnight.
  return (
    <main className="mx-auto max-w-2xl py-16">
      <h1 className="text-2xl font-serif mb-8">Today&apos;s Check-In</h1>
      <DailyCheckInForm onSubmit={submitDailyCheckInAction} />
    </main>
  )
}
