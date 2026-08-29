import Link from 'next/link'

export default function ResourcesPage() {
  return (
    <main className="mx-auto max-w-2xl py-16 flex flex-col gap-6">
      <h1 className="text-2xl font-serif">Some options, if you'd like them</h1>
      <p className="text-stone-700">
        Whatever brought you here, you don't have to carry it alone. Reaching out isn't a sign
        that something is wrong with you — it's just one more way of taking care of yourself.
      </p>

      <div className="rounded border border-stone-200 bg-stone-50 p-4">
        <h2 className="text-lg font-medium mb-2">If you're in crisis right now</h2>
        <p className="text-stone-700">
          In the US, you can call or text <strong>988</strong> to reach the Suicide &amp; Crisis
          Lifeline, any time of day. If you're outside the US, a quick search for
          &ldquo;crisis line&rdquo; plus your country name will usually turn up a local number.
          If you're in immediate danger, please contact your local emergency services.
        </p>
      </div>

      <div className="rounded border border-stone-200 bg-stone-50 p-4">
        <h2 className="text-lg font-medium mb-2">If you'd like ongoing support</h2>
        <p className="text-stone-700">
          A therapist or counselor can offer something a journal can't — a real person who gets
          to know you over time. If cost or access is a barrier, many areas have low-cost or
          sliding-scale clinics, and some workplaces offer free sessions through an employee
          assistance program.
        </p>
      </div>

      <div className="rounded border border-stone-200 bg-stone-50 p-4">
        <h2 className="text-lg font-medium mb-2">If you just want to talk to someone</h2>
        <p className="text-stone-700">
          Sometimes the most helpful thing is a trusted friend, family member, or mentor. It's
          okay to let someone know you're having a hard time — you don't need the right words,
          just a willingness to say something.
        </p>
      </div>

      <Link href="/dashboard" className="self-start rounded bg-stone-800 text-white px-4 py-2">
        Back to dashboard
      </Link>
    </main>
  )
}
