'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function signUp(formData: FormData) {
  const email = String(formData.get('email'))
  const password = String(formData.get('password'))
  const supabase = await createClient()
  const { data, error } = await supabase.auth.signUp({ email, password })
  if (error) redirect(`/sign-up?error=${encodeURIComponent(error.message)}`)

  // When Supabase's "Confirm email" setting is enabled, signUp() succeeds but
  // returns no session — the user isn't authenticated yet, so we can't send
  // them into the (auth-guarded) onboarding flow.
  if (!data.session) redirect('/sign-up?message=check-email')

  redirect('/onboarding')
}

export async function signIn(formData: FormData) {
  const email = String(formData.get('email'))
  const password = String(formData.get('password'))
  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) redirect(`/sign-in?error=${encodeURIComponent(error.message)}`)
  redirect('/dashboard')
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/sign-in')
}
