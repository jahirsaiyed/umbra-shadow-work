'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function saveOnboardingProfile(formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/sign-in')

  const { error } = await supabase.from('profiles').upsert({
    id: user.id,
    familiarity_level: String(formData.get('familiarity_level')),
    emotional_bandwidth: String(formData.get('emotional_bandwidth')),
    primary_focus: String(formData.get('primary_focus')),
  })
  if (error) redirect(`/onboarding?error=${encodeURIComponent(error.message)}`)

  const { error: companionStateError } = await supabase.from('companion_state').upsert({ user_id: user.id })
  if (companionStateError) {
    console.error('Failed to initialize companion_state during onboarding:', companionStateError, { userId: user.id })
  }

  redirect('/journey')
}
