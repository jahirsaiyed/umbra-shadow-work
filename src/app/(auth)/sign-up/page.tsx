import { signUp } from '../actions'

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>
}) {
  const { error, message } = await searchParams
  return (
    <main className="mx-auto max-w-sm py-16">
      <h1 className="text-2xl font-serif mb-6">Begin</h1>
      {error && <p className="text-red-700 mb-4">{error}</p>}
      {message === 'check-email' && (
        <p className="text-stone-600 mb-4">
          Check your email to confirm your account before signing in.
        </p>
      )}
      <form action={signUp} className="flex flex-col gap-4">
        <input name="email" type="email" required placeholder="Email" className="border rounded p-2" />
        <input name="password" type="password" required minLength={8} placeholder="Password" className="border rounded p-2" />
        <button type="submit" className="rounded bg-stone-800 text-white py-2">
          Create account
        </button>
      </form>
    </main>
  )
}
