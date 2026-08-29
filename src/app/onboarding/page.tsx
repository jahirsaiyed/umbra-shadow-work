import { OnboardingForm } from './OnboardingForm'
import { saveOnboardingProfile } from './actions'

export default function OnboardingPage() {
  return (
    <main className="mx-auto max-w-2xl py-16">
      <h1 className="text-2xl font-serif mb-8">A few questions before we begin</h1>
      <OnboardingForm action={saveOnboardingProfile} />
    </main>
  )
}
