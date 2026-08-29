import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getTodaysPrompt, submitDailyCheckInAction } from './actions'
import { DailyCheckInForm } from './DailyCheckInForm'

export default async function DailyPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/sign-in')

  const today = new Date().toISOString().slice(0, 10)
  const prompt = getTodaysPrompt(today)

  return (
    <main className="mx-auto max-w-2xl py-16">
      <h1 className="text-2xl font-serif mb-8">Today&apos;s Check-In</h1>
      <DailyCheckInForm prompt={prompt} onSubmit={submitDailyCheckInAction} />
    </main>
  )
}
