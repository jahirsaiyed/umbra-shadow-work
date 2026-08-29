import Link from 'next/link'

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center bg-stone-50 px-6 py-24 text-center">
      <div className="flex max-w-lg flex-col items-center gap-6">
        <h1 className="text-4xl font-serif text-stone-900">Umbra</h1>
        <p className="text-lg text-stone-600">
          A quiet space for shadow work. Umbra guides you through daily reflection and a
          structured journey to help you notice and understand the parts of yourself
          you&apos;d rather look away from.
        </p>
        <div className="flex gap-4">
          <Link href="/sign-up" className="rounded bg-stone-800 text-white px-5 py-2.5 font-medium">
            Begin
          </Link>
          <Link
            href="/sign-in"
            className="rounded border border-stone-800 px-5 py-2.5 font-medium text-stone-800"
          >
            Sign in
          </Link>
        </div>
      </div>
    </main>
  )
}
