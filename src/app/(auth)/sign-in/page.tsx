import { signIn } from '../actions'

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams
  return (
    <main className="mx-auto max-w-sm py-16">
      <h1 className="text-2xl font-serif mb-6">Welcome back</h1>
      {error && <p className="text-red-700 mb-4">{error}</p>}
      <form action={signIn} className="flex flex-col gap-4">
        <input name="email" type="email" required placeholder="Email" className="border rounded p-2" />
        <input name="password" type="password" required placeholder="Password" className="border rounded p-2" />
        <button type="submit" className="rounded bg-stone-800 text-white py-2">
          Sign in
        </button>
      </form>
    </main>
  )
}
