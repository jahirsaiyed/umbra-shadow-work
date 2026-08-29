# Umbra MVP (Phase 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a working, testable Phase 1 MVP of Umbra — signup/auth, onboarding quiz, the first two Journey stages (Recognition, Acceptance), Daily Practice, forgiving-streak/companion-growth gamification, and a baseline keyword-level safety check.

**Architecture:** Next.js App Router on Vercel, Supabase for Postgres + auth (provisioned via the Vercel Marketplace integration, already installed — env vars are in `.env.local`). Server Actions do all writes; Row Level Security enforces per-user data isolation at the database layer as a second line of defense. Journal content is encrypted at the application layer before it ever reaches the database.

**Tech Stack:** Next.js (App Router, TypeScript), Tailwind CSS, `@supabase/supabase-js` + `@supabase/ssr`, Vitest + React Testing Library, Node's built-in `crypto` module.

## Global Constraints

- The safety pathway (crisis-language detection and its response UI) is never gated behind a paywall or feature flag — it must work identically for every user.
- Gamification never punishes a missed day: streak breaks reset the streak counter but never delete XP, badges, or companion growth already earned.
- The Phase 1 safety check is a **baseline keyword/pattern matcher only** — no LLM call. The LLM-based classifier and async AI pattern-insights are explicitly out of scope for this plan (Phase 2).
- Journal entry content is encrypted at the application layer (AES-256-GCM) before insert; the database never stores plaintext journal content.
- All server-side code that touches journal content or the encryption key runs in the Node.js runtime (Vercel Fluid Compute default) — do not set `runtime = 'edge'` anywhere in this plan, since Node's `crypto` module requires it.
- Every user-owned table has Row Level Security enabled **and forced**, with a policy restricting rows to `(select auth.uid()) = user_id` (or `= id` for `profiles`/`companion_state`).

---

## File Structure

```
umbra/
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── globals.css
│   │   ├── (auth)/
│   │   │   ├── sign-up/page.tsx
│   │   │   ├── sign-in/page.tsx
│   │   │   └── actions.ts
│   │   ├── onboarding/
│   │   │   ├── page.tsx
│   │   │   ├── OnboardingForm.tsx
│   │   │   └── actions.ts
│   │   ├── journey/
│   │   │   ├── page.tsx
│   │   │   ├── [stageSlug]/page.tsx
│   │   │   ├── [stageSlug]/[lessonSlug]/page.tsx
│   │   │   ├── [stageSlug]/[lessonSlug]/ExerciseForm.tsx
│   │   │   └── actions.ts
│   │   ├── daily/
│   │   │   ├── page.tsx
│   │   │   └── DailyCheckInForm.tsx
│   │   └── dashboard/
│   │       └── page.tsx
│   ├── components/
│   │   ├── companion/CompanionView.tsx
│   │   └── badges/BadgeGrid.tsx
│   ├── lib/
│   │   ├── supabase/{client.ts,server.ts,middleware.ts}
│   │   ├── journal/{encryption.ts,safety.ts,submit-entry.ts}
│   │   ├── gamification/{xp.ts,streak.ts,badges.ts}
│   │   └── content/journey-stages.ts
│   └── middleware.ts
├── supabase/migrations/0001_init.sql
├── scripts/run-migration.mjs
└── vitest.config.ts
```

---

### Task 1: Project Scaffold & Test Runner

**Files:**
- Create: entire Next.js scaffold (via CLI) under the repo root
- Create: `vitest.config.ts`
- Create: `src/lib/sanity.test.ts` (throwaway wiring check, deleted at end of task)

**Interfaces:**
- Produces: a working `npm run dev` / `npm run build` / `npm test` toolchain that every later task relies on.

- [ ] **Step 1: Scaffold Next.js**

Run:
```bash
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm
```
If prompted about the directory not being empty, confirm yes (only `.git`, `.vercel`, `.env.local`, `.gitignore`, and `docs/` exist so far).

- [ ] **Step 2: Install runtime and test dependencies**

```bash
npm install @supabase/supabase-js @supabase/ssr
npm install -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom pg
```

- [ ] **Step 3: Configure Vitest**

```ts
// vitest.config.ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
  },
})
```

Add to `package.json` `"scripts"`: `"test": "vitest run"`.

- [ ] **Step 4: Write and run a sanity test**

```ts
// src/lib/sanity.test.ts
import { describe, it, expect } from 'vitest'

describe('vitest wiring', () => {
  it('runs a basic assertion', () => {
    expect(1 + 1).toBe(2)
  })
})
```

Run: `npm test`
Expected: PASS (1 test)

Delete `src/lib/sanity.test.ts` after confirming it passes — it was only there to prove the toolchain works.

- [ ] **Step 5: Verify production build**

Run: `npm run build`
Expected: build completes with no errors.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore: scaffold Next.js app with Vitest"
```

---

### Task 2: Database Schema & RLS

**Files:**
- Create: `supabase/migrations/0001_init.sql`
- Create: `scripts/run-migration.mjs`

**Interfaces:**
- Produces: tables `profiles`, `journey_progress`, `journal_entries`, `companion_state`, `badges`, `user_badges` — column names used verbatim by every later task's Supabase queries.

- [ ] **Step 1: Write the migration SQL**

```sql
-- supabase/migrations/0001_init.sql

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  familiarity_level text not null check (familiarity_level in ('new','some_experience','experienced')),
  emotional_bandwidth text not null check (emotional_bandwidth in ('low','moderate','high')),
  primary_focus text not null,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.profiles force row level security;
create policy profiles_owner on public.profiles
  for all to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

create table public.journey_progress (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  stage_slug text not null,
  lesson_slug text not null,
  completed_at timestamptz not null default now(),
  unique (user_id, stage_slug, lesson_slug)
);
create index journey_progress_user_id_idx on public.journey_progress (user_id);

alter table public.journey_progress enable row level security;
alter table public.journey_progress force row level security;
create policy journey_progress_owner on public.journey_progress
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create table public.journal_entries (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  stage_slug text,
  lesson_slug text,
  ciphertext text not null,
  iv text not null,
  auth_tag text not null,
  safety_flagged boolean not null default false,
  created_at timestamptz not null default now()
);
create index journal_entries_user_id_idx on public.journal_entries (user_id);

alter table public.journal_entries enable row level security;
alter table public.journal_entries force row level security;
create policy journal_entries_owner on public.journal_entries
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create table public.companion_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  xp integer not null default 0,
  growth_stage text not null default 'seed',
  current_streak integer not null default 0,
  longest_streak integer not null default 0,
  streak_freezes_remaining integer not null default 3,
  last_activity_date date,
  updated_at timestamptz not null default now()
);

alter table public.companion_state enable row level security;
alter table public.companion_state force row level security;
create policy companion_state_owner on public.companion_state
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create table public.badges (
  id text primary key,
  name text not null,
  description text not null,
  icon text not null
);

alter table public.badges enable row level security;
create policy badges_readable on public.badges
  for select to authenticated
  using (true);

insert into public.badges (id, name, description, icon) values
  ('first-entry', 'First Words', 'Wrote your first journal entry.', 'seedling'),
  ('recognition-complete', 'Noticing', 'Completed the Recognition stage.', 'eye'),
  ('acceptance-complete', 'Making Room', 'Completed the Acceptance stage.', 'hands'),
  ('three-day-streak', 'Steady', 'Showed up three days in a row.', 'flame'),
  ('seven-day-streak', 'Rooted', 'Showed up seven days in a row.', 'tree')
on conflict (id) do nothing;

create table public.user_badges (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  badge_id text not null references public.badges(id) on delete cascade,
  earned_at timestamptz not null default now(),
  unique (user_id, badge_id)
);
create index user_badges_user_id_idx on public.user_badges (user_id);
create index user_badges_badge_id_idx on public.user_badges (badge_id);

alter table public.user_badges enable row level security;
alter table public.user_badges force row level security;
create policy user_badges_owner on public.user_badges
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
```

- [ ] **Step 2: Write a runner script (portable across OSes, no `psql` dependency)**

```js
// scripts/run-migration.mjs
import { readFileSync } from 'node:fs'
import { Client } from 'pg'

const [, , migrationPath] = process.argv
if (!migrationPath) {
  console.error('Usage: node scripts/run-migration.mjs <path-to-sql-file>')
  process.exit(1)
}

const sql = readFileSync(migrationPath, 'utf8')
const client = new Client({ connectionString: process.env.POSTGRES_URL_NON_POOLING })

await client.connect()
try {
  await client.query(sql)
  console.log(`Applied ${migrationPath}`)
} finally {
  await client.end()
}
```

- [ ] **Step 3: Run the migration against the provisioned Supabase database**

```bash
npx dotenv -e .env.local -- node scripts/run-migration.mjs supabase/migrations/0001_init.sql
```
(Run `npm install -D dotenv-cli` first if `dotenv` isn't available.)
Expected: `Applied supabase/migrations/0001_init.sql`

- [ ] **Step 4: Verify the tables exist**

```bash
npx dotenv -e .env.local -- node -e "
import('pg').then(async ({ Client }) => {
  const client = new Client({ connectionString: process.env.POSTGRES_URL_NON_POOLING })
  await client.connect()
  const { rows } = await client.query(
    \"select table_name from information_schema.tables where table_schema = 'public' order by table_name\"
  )
  console.log(rows.map((r) => r.table_name))
  await client.end()
})
"
```
Expected output includes: `badges, companion_state, journal_entries, journey_progress, profiles, user_badges`

- [ ] **Step 5: Confirm the tables are reachable through the Data API (not just via direct Postgres connection)**

New tables are usually auto-exposed to PostgREST when created in `public` on a default-configured project, but this isn't guaranteed — check via the Vercel-Supabase integration guide:
```bash
vercel integration guide supabase --framework nextjs
```
If a quick REST check is wanted, hit the REST endpoint directly (should return `401`/`403`, not `404`, proving the table is known to PostgREST even though no auth token was sent):
```bash
npx dotenv -e .env.local -- node -e "
fetch(process.env.NEXT_PUBLIC_SUPABASE_URL + '/rest/v1/badges', {
  headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY }
}).then(async (r) => console.log(r.status, await r.text()))
"
```
Expected: HTTP 200 with the 5 seeded badge rows as JSON (the `badges` table has a public `select` policy, so an anon-keyed request should succeed outright). If this instead 404s, the table isn't exposed to the Data API yet — check the project's Data API settings in the Supabase dashboard (Project Settings → Data API → Exposed schemas) and ensure `public` is listed before continuing to Task 3.

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/0001_init.sql scripts/run-migration.mjs package.json package-lock.json
git commit -m "feat: add Supabase schema with RLS for all user-owned tables"
```

---

### Task 3: Supabase Client Utilities

**Files:**
- Create: `src/lib/supabase/client.ts`
- Create: `src/lib/supabase/server.ts`
- Create: `src/lib/supabase/middleware.ts`
- Create: `src/middleware.ts`

**Interfaces:**
- Produces: `createClient()` (browser, from `@/lib/supabase/client`) and `createClient()` (server, async, from `@/lib/supabase/server`) — consumed by Tasks 4, 5, 11, 12, 13, 14.

- [ ] **Step 1: Browser client**

```ts
// src/lib/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

- [ ] **Step 2: Server client**

```ts
// src/lib/supabase/server.ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (toSet) => {
          try {
            toSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
          } catch {
            // Called from a Server Component render — middleware below refreshes the session instead.
          }
        },
      },
    }
  )
}
```

- [ ] **Step 3: Session-refresh middleware helper**

```ts
// src/lib/supabase/middleware.ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (toSet) => {
          toSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          toSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
        },
      },
    }
  )

  await supabase.auth.getUser()
  return response
}
```

- [ ] **Step 4: Root middleware**

```ts
// src/middleware.ts
import { updateSession } from '@/lib/supabase/middleware'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  return updateSession(request)
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
```

- [ ] **Step 5: Verify the app still builds**

Run: `npm run build`
Expected: build completes with no errors. (These are thin SDK wrappers with no meaningful pure logic to unit test in isolation — Task 4's sign-up/sign-in flow is the real verification of this wiring, exercised manually in a browser.)

- [ ] **Step 6: Commit**

```bash
git add src/lib/supabase src/middleware.ts
git commit -m "feat: add Supabase browser/server clients and session-refresh middleware"
```

---

### Task 4: Auth — Sign Up / Sign In / Sign Out

**Files:**
- Create: `src/app/(auth)/actions.ts`
- Create: `src/app/(auth)/sign-up/page.tsx`
- Create: `src/app/(auth)/sign-in/page.tsx`

**Interfaces:**
- Consumes: `createClient()` from `@/lib/supabase/server` (Task 3).
- Produces: `signUp(formData: FormData)`, `signIn(formData: FormData)`, `signOut()` server actions.

- [ ] **Step 1: Server actions**

```ts
// src/app/(auth)/actions.ts
'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function signUp(formData: FormData) {
  const email = String(formData.get('email'))
  const password = String(formData.get('password'))
  const supabase = await createClient()
  const { error } = await supabase.auth.signUp({ email, password })
  if (error) redirect(`/sign-up?error=${encodeURIComponent(error.message)}`)
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
```

- [ ] **Step 2: Sign-up page**

```tsx
// src/app/(auth)/sign-up/page.tsx
import { signUp } from '../actions'

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams
  return (
    <main className="mx-auto max-w-sm py-16">
      <h1 className="text-2xl font-serif mb-6">Begin</h1>
      {error && <p className="text-red-700 mb-4">{error}</p>}
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
```

- [ ] **Step 3: Sign-in page**

```tsx
// src/app/(auth)/sign-in/page.tsx
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
```

- [ ] **Step 4: Manual verification (no meaningful pure-logic unit test exists for this task — it's entirely Supabase Auth wiring)**

Run: `npm run dev`, then in a browser:
1. Visit `/sign-up`, create an account with a real-looking email and an 8+ character password.
2. Confirm redirect to `/onboarding` (will 404 until Task 5 — that 404 is the expected/correct outcome for this task).
3. Visit `/sign-in` with the same credentials, confirm redirect to `/dashboard` (will 404 until Task 14 — expected).

- [ ] **Step 5: Commit**

```bash
git add "src/app/(auth)"
git commit -m "feat: add sign-up/sign-in/sign-out via Supabase Auth"
```

---

### Task 5: Onboarding Quiz

**Files:**
- Create: `src/app/onboarding/actions.ts`
- Create: `src/app/onboarding/OnboardingForm.tsx`
- Create: `src/app/onboarding/page.tsx`
- Test: `src/app/onboarding/OnboardingForm.test.tsx`

**Interfaces:**
- Consumes: `createClient()` from `@/lib/supabase/server` (Task 3).
- Produces: a `profiles` row per user; later tasks (14) read `profiles.primary_focus` for dashboard copy.

- [ ] **Step 1: Server action**

```ts
// src/app/onboarding/actions.ts
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

  await supabase.from('companion_state').upsert({ user_id: user.id })

  redirect('/journey')
}
```

- [ ] **Step 2: Write the failing component test**

```tsx
// src/app/onboarding/OnboardingForm.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { OnboardingForm } from './OnboardingForm'

describe('OnboardingForm', () => {
  it('disables submit until all three questions are answered', () => {
    render(<OnboardingForm action={vi.fn()} />)
    const submit = screen.getByRole('button', { name: /continue/i })
    expect(submit).toBeDisabled()

    fireEvent.click(screen.getByLabelText(/new to this/i))
    fireEvent.click(screen.getByLabelText(/moderate/i))
    fireEvent.click(screen.getByLabelText(/a recurring trigger/i))

    expect(submit).not.toBeDisabled()
  })
})
```

- [ ] **Step 3: Run it to confirm it fails**

Run: `npm test -- OnboardingForm`
Expected: FAIL — `Cannot find module './OnboardingForm'`

- [ ] **Step 4: Implement the component**

```tsx
// src/app/onboarding/OnboardingForm.tsx
'use client'

import { useState } from 'react'

type Answers = {
  familiarity_level: string
  emotional_bandwidth: string
  primary_focus: string
}

export function OnboardingForm({ action }: { action: (formData: FormData) => void }) {
  const [answers, setAnswers] = useState<Partial<Answers>>({})
  const isComplete = Boolean(
    answers.familiarity_level && answers.emotional_bandwidth && answers.primary_focus
  )

  function set<K extends keyof Answers>(key: K, value: Answers[K]) {
    setAnswers((prev) => ({ ...prev, [key]: value }))
  }

  return (
    <form action={action} className="flex flex-col gap-8 max-w-lg">
      <fieldset>
        <legend className="font-medium mb-2">How familiar are you with shadow work?</legend>
        {[
          { value: 'new', label: "I'm new to this" },
          { value: 'some_experience', label: 'I have some experience' },
          { value: 'experienced', label: "I've done this before" },
        ].map((opt) => (
          <label key={opt.value} className="flex items-center gap-2">
            <input
              type="radio"
              name="familiarity_level"
              value={opt.value}
              onChange={() => set('familiarity_level', opt.value)}
            />
            {opt.label}
          </label>
        ))}
      </fieldset>

      <fieldset>
        <legend className="font-medium mb-2">How much emotional bandwidth do you have right now?</legend>
        {[
          { value: 'low', label: 'Low — go gently' },
          { value: 'moderate', label: 'Moderate' },
          { value: 'high', label: 'High — I can go deeper' },
        ].map((opt) => (
          <label key={opt.value} className="flex items-center gap-2">
            <input
              type="radio"
              name="emotional_bandwidth"
              value={opt.value}
              onChange={() => set('emotional_bandwidth', opt.value)}
            />
            {opt.label}
          </label>
        ))}
      </fieldset>

      <fieldset>
        <legend className="font-medium mb-2">What's drawing you in right now?</legend>
        {[
          { value: 'relationship_pattern', label: 'A relationship pattern' },
          { value: 'self_criticism', label: 'Self-criticism' },
          { value: 'recurring_trigger', label: 'A recurring trigger' },
          { value: 'curiosity', label: 'General curiosity' },
        ].map((opt) => (
          <label key={opt.value} className="flex items-center gap-2">
            <input
              type="radio"
              name="primary_focus"
              value={opt.value}
              onChange={() => set('primary_focus', opt.value)}
            />
            {opt.label}
          </label>
        ))}
      </fieldset>

      <button type="submit" disabled={!isComplete} className="rounded bg-stone-800 text-white py-2 disabled:opacity-40">
        Continue
      </button>
    </form>
  )
}
```

- [ ] **Step 5: Run the test to confirm it passes**

Run: `npm test -- OnboardingForm`
Expected: PASS

- [ ] **Step 6: Wire the page**

```tsx
// src/app/onboarding/page.tsx
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
```

- [ ] **Step 7: Commit**

```bash
git add src/app/onboarding
git commit -m "feat: add onboarding quiz and profile creation"
```

---

### Task 6: Journal Encryption Utility

**Files:**
- Create: `src/lib/journal/encryption.ts`
- Test: `src/lib/journal/encryption.test.ts`

**Interfaces:**
- Produces: `encryptText(plaintext: string): EncryptedPayload`, `decryptText(payload: EncryptedPayload): string`, `EncryptedPayload { ciphertext, iv, authTag }` — consumed by Task 11.

- [ ] **Step 1: Write the failing tests**

```ts
// src/lib/journal/encryption.test.ts
import { describe, it, expect, beforeAll } from 'vitest'
import { encryptText, decryptText } from './encryption'

beforeAll(() => {
  process.env.JOURNAL_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString('base64')
})

describe('journal encryption', () => {
  it('round-trips plaintext through encrypt and decrypt', () => {
    const payload = encryptText('Today I noticed I got defensive.')
    expect(decryptText(payload)).toBe('Today I noticed I got defensive.')
  })

  it('produces a different ciphertext and iv on each call', () => {
    const a = encryptText('same input')
    const b = encryptText('same input')
    expect(a.ciphertext).not.toBe(b.ciphertext)
    expect(a.iv).not.toBe(b.iv)
  })

  it('never stores the plaintext inside the ciphertext field', () => {
    const payload = encryptText('a very identifiable secret phrase')
    expect(payload.ciphertext).not.toContain('identifiable')
  })

  it('throws if the auth tag has been tampered with', () => {
    const payload = encryptText('tamper test')
    const tampered = { ...payload, authTag: Buffer.alloc(16, 1).toString('base64') }
    expect(() => decryptText(tampered)).toThrow()
  })
})
```

- [ ] **Step 2: Run to confirm it fails**

Run: `npm test -- encryption`
Expected: FAIL — `Cannot find module './encryption'`

- [ ] **Step 3: Implement**

```ts
// src/lib/journal/encryption.ts
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'

const ALGORITHM = 'aes-256-gcm'

function getKey(): Buffer {
  const raw = process.env.JOURNAL_ENCRYPTION_KEY
  if (!raw) throw new Error('JOURNAL_ENCRYPTION_KEY is not set')
  const key = Buffer.from(raw, 'base64')
  if (key.length !== 32) throw new Error('JOURNAL_ENCRYPTION_KEY must decode to exactly 32 bytes')
  return key
}

export interface EncryptedPayload {
  ciphertext: string
  iv: string
  authTag: string
}

export function encryptText(plaintext: string): EncryptedPayload {
  const key = getKey()
  const iv = randomBytes(12)
  const cipher = createCipheriv(ALGORITHM, key, iv)
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  return {
    ciphertext: ciphertext.toString('base64'),
    iv: iv.toString('base64'),
    authTag: cipher.getAuthTag().toString('base64'),
  }
}

export function decryptText(payload: EncryptedPayload): string {
  const key = getKey()
  const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(payload.iv, 'base64'))
  decipher.setAuthTag(Buffer.from(payload.authTag, 'base64'))
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(payload.ciphertext, 'base64')),
    decipher.final(),
  ])
  return plaintext.toString('utf8')
}
```

- [ ] **Step 4: Run to confirm it passes**

Run: `npm test -- encryption`
Expected: PASS (4 tests)

- [ ] **Step 5: Generate the real key and add it as a Vercel/local env var**

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```
Add the output to `.env.local` as `JOURNAL_ENCRYPTION_KEY=<value>`, and add the same value in the Vercel dashboard (Project Settings → Environment Variables) for Production and Preview before this feature is deployed.

- [ ] **Step 6: Commit**

```bash
git add src/lib/journal/encryption.ts src/lib/journal/encryption.test.ts
git commit -m "feat: add AES-256-GCM encryption for journal entry content"
```

---

### Task 7: Safety Keyword-Check Utility

**Files:**
- Create: `src/lib/journal/safety.ts`
- Test: `src/lib/journal/safety.test.ts`

**Interfaces:**
- Produces: `containsCrisisLanguage(text: string): boolean` — consumed by Task 11.

- [ ] **Step 1: Write the failing tests**

```ts
// src/lib/journal/safety.test.ts
import { describe, it, expect } from 'vitest'
import { containsCrisisLanguage } from './safety'

describe('containsCrisisLanguage', () => {
  it.each([
    'I keep thinking about killing myself',
    "I don't want to be here anymore",
    'I want to end my life',
    'I have been hurting myself',
    "It's not worth living",
    'I have been having thoughts of self-harm',
  ])('flags: "%s"', (text) => {
    expect(containsCrisisLanguage(text)).toBe(true)
  })

  it.each([
    'I killed it at my presentation today',
    'I want to end my lease early',
    'My coworker hurt my feelings',
    'Today was a calm, ordinary day',
  ])('does not flag: "%s"', (text) => {
    expect(containsCrisisLanguage(text)).toBe(false)
  })
})
```

- [ ] **Step 2: Run to confirm it fails**

Run: `npm test -- safety`
Expected: FAIL — `Cannot find module './safety'`

- [ ] **Step 3: Implement**

```ts
// src/lib/journal/safety.ts

// Baseline Phase 1 check: intentionally over-inclusive pattern matching, not
// sentiment understanding. Phase 2 replaces this with an LLM classifier;
// until then, false positives are an acceptable trade-off for false negatives.
const CRISIS_PATTERNS: RegExp[] = [
  /\bkill(ing)?\s+myself\b/i,
  /\bend(ing)?\s+my\s+life\b/i,
  /\bsuicid(e|al)\b/i,
  /\bhurt(ing)?\s+myself\b/i,
  /\bdon'?t\s+want\s+to\s+(be\s+here|live|exist)\s*(anymore)?\b/i,
  /\bnot\s+worth\s+living\b/i,
  /\bself[\s-]?harm\b/i,
]

export function containsCrisisLanguage(text: string): boolean {
  return CRISIS_PATTERNS.some((pattern) => pattern.test(text))
}
```

- [ ] **Step 4: Run to confirm it passes**

Run: `npm test -- safety`
Expected: PASS (10 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/journal/safety.ts src/lib/journal/safety.test.ts
git commit -m "feat: add baseline keyword-level crisis-language safety check"
```

---

### Task 8: Gamification Utilities — XP, Growth Stage, Streak

**Files:**
- Create: `src/lib/gamification/xp.ts`
- Create: `src/lib/gamification/streak.ts`
- Test: `src/lib/gamification/xp.test.ts`
- Test: `src/lib/gamification/streak.test.ts`

**Interfaces:**
- Produces: `calculateXpGain(activity: ActivityType): number`, `growthStageForXp(xp: number): GrowthStage`, `updateStreakForActivity(state: StreakState, today: string): StreakState` — consumed by Tasks 11 and 14.

- [ ] **Step 1: Write the failing XP test**

```ts
// src/lib/gamification/xp.test.ts
import { describe, it, expect } from 'vitest'
import { calculateXpGain, growthStageForXp } from './xp'

describe('calculateXpGain', () => {
  it('awards more XP for a lesson exercise than a daily check-in', () => {
    expect(calculateXpGain('lesson_exercise')).toBe(20)
    expect(calculateXpGain('daily_practice')).toBe(10)
  })
})

describe('growthStageForXp', () => {
  it.each([
    [0, 'seed'],
    [49, 'seed'],
    [50, 'sprout'],
    [149, 'sprout'],
    [150, 'sapling'],
    [349, 'sapling'],
    [350, 'bloom'],
    [10000, 'bloom'],
  ])('xp=%i -> %s', (xp, expected) => {
    expect(growthStageForXp(xp)).toBe(expected)
  })
})
```

- [ ] **Step 2: Run to confirm it fails**

Run: `npm test -- xp`
Expected: FAIL — `Cannot find module './xp'`

- [ ] **Step 3: Implement**

```ts
// src/lib/gamification/xp.ts
export type ActivityType = 'lesson_exercise' | 'daily_practice'

const XP_BY_ACTIVITY: Record<ActivityType, number> = {
  lesson_exercise: 20,
  daily_practice: 10,
}

export function calculateXpGain(activity: ActivityType): number {
  return XP_BY_ACTIVITY[activity]
}

export type GrowthStage = 'seed' | 'sprout' | 'sapling' | 'bloom'

const GROWTH_THRESHOLDS: [number, GrowthStage][] = [
  [0, 'seed'],
  [50, 'sprout'],
  [150, 'sapling'],
  [350, 'bloom'],
]

export function growthStageForXp(xp: number): GrowthStage {
  let stage: GrowthStage = 'seed'
  for (const [threshold, name] of GROWTH_THRESHOLDS) {
    if (xp >= threshold) stage = name
  }
  return stage
}
```

- [ ] **Step 4: Run to confirm it passes**

Run: `npm test -- xp`
Expected: PASS (9 tests)

- [ ] **Step 5: Write the failing streak test**

```ts
// src/lib/gamification/streak.test.ts
import { describe, it, expect } from 'vitest'
import { updateStreakForActivity, type StreakState } from './streak'

const base: StreakState = {
  currentStreak: 0,
  longestStreak: 0,
  freezesRemaining: 3,
  lastActivityDate: null,
}

describe('updateStreakForActivity', () => {
  it('starts a streak at 1 on first-ever activity', () => {
    const result = updateStreakForActivity(base, '2026-08-29')
    expect(result.currentStreak).toBe(1)
    expect(result.lastActivityDate).toBe('2026-08-29')
  })

  it('does not change the streak for a second activity on the same day', () => {
    const dayOne = updateStreakForActivity(base, '2026-08-29')
    const sameDay = updateStreakForActivity(dayOne, '2026-08-29')
    expect(sameDay.currentStreak).toBe(1)
  })

  it('increments the streak on a consecutive day', () => {
    const dayOne = updateStreakForActivity(base, '2026-08-29')
    const dayTwo = updateStreakForActivity(dayOne, '2026-08-30')
    expect(dayTwo.currentStreak).toBe(2)
    expect(dayTwo.longestStreak).toBe(2)
  })

  it('uses a freeze to bridge exactly one missed day, keeping the streak alive', () => {
    const dayOne = updateStreakForActivity(base, '2026-08-29')
    const dayThree = updateStreakForActivity(dayOne, '2026-08-31')
    expect(dayThree.currentStreak).toBe(2)
    expect(dayThree.freezesRemaining).toBe(2)
  })

  it('resets to 1 (never punished below 1) after a missed day with no freezes left', () => {
    const noFreezes: StreakState = { ...base, currentStreak: 5, longestStreak: 5, freezesRemaining: 0, lastActivityDate: '2026-08-29' }
    const result = updateStreakForActivity(noFreezes, '2026-08-31')
    expect(result.currentStreak).toBe(1)
    expect(result.longestStreak).toBe(5)
  })

  it('resets to 1 after a gap of more than one missed day even with freezes available', () => {
    const dayOne = updateStreakForActivity(base, '2026-08-29')
    const dayFive = updateStreakForActivity(dayOne, '2026-09-02')
    expect(dayFive.currentStreak).toBe(1)
    expect(dayFive.freezesRemaining).toBe(3)
  })
})
```

- [ ] **Step 6: Run to confirm it fails**

Run: `npm test -- streak`
Expected: FAIL — `Cannot find module './streak'`

- [ ] **Step 7: Implement**

```ts
// src/lib/gamification/streak.ts
export interface StreakState {
  currentStreak: number
  longestStreak: number
  freezesRemaining: number
  lastActivityDate: string | null // 'YYYY-MM-DD'
}

function daysBetween(a: string, b: string): number {
  const msPerDay = 24 * 60 * 60 * 1000
  return Math.round((new Date(`${b}T00:00:00Z`).getTime() - new Date(`${a}T00:00:00Z`).getTime()) / msPerDay)
}

export function updateStreakForActivity(state: StreakState, today: string): StreakState {
  if (state.lastActivityDate === today) {
    return state
  }

  if (state.lastActivityDate === null) {
    return { ...state, currentStreak: 1, longestStreak: Math.max(1, state.longestStreak), lastActivityDate: today }
  }

  const gap = daysBetween(state.lastActivityDate, today)

  if (gap === 1) {
    const currentStreak = state.currentStreak + 1
    return { ...state, currentStreak, longestStreak: Math.max(currentStreak, state.longestStreak), lastActivityDate: today }
  }

  if (gap === 2 && state.freezesRemaining > 0) {
    const currentStreak = state.currentStreak + 1
    return {
      currentStreak,
      longestStreak: Math.max(currentStreak, state.longestStreak),
      freezesRemaining: state.freezesRemaining - 1,
      lastActivityDate: today,
    }
  }

  return { ...state, currentStreak: 1, lastActivityDate: today }
}
```

- [ ] **Step 8: Run to confirm it passes**

Run: `npm test -- streak`
Expected: PASS (6 tests)

- [ ] **Step 9: Commit**

```bash
git add src/lib/gamification/xp.ts src/lib/gamification/xp.test.ts src/lib/gamification/streak.ts src/lib/gamification/streak.test.ts
git commit -m "feat: add XP, companion growth-stage, and forgiving-streak logic"
```

---

### Task 9: Badge Award Logic

**Files:**
- Create: `src/lib/gamification/badges.ts`
- Test: `src/lib/gamification/badges.test.ts`

**Interfaces:**
- Consumes: nothing (pure function).
- Produces: `determineNewBadges(context: BadgeAwardContext): string[]`, `BadgeAwardContext { isFirstJournalEntry, completedStageSlug, currentStreak }` — consumed by Task 11. Badge id strings must exactly match the `badges.id` rows seeded in Task 2 (`first-entry`, `recognition-complete`, `acceptance-complete`, `three-day-streak`, `seven-day-streak`).

- [ ] **Step 1: Write the failing tests**

```ts
// src/lib/gamification/badges.test.ts
import { describe, it, expect } from 'vitest'
import { determineNewBadges } from './badges'

describe('determineNewBadges', () => {
  it('awards first-entry on the first journal entry only', () => {
    expect(determineNewBadges({ isFirstJournalEntry: true, completedStageSlug: null, currentStreak: 1 })).toContain('first-entry')
    expect(determineNewBadges({ isFirstJournalEntry: false, completedStageSlug: null, currentStreak: 1 })).not.toContain('first-entry')
  })

  it('awards a stage-completion badge matching the completed stage', () => {
    expect(determineNewBadges({ isFirstJournalEntry: false, completedStageSlug: 'recognition', currentStreak: 1 })).toContain('recognition-complete')
    expect(determineNewBadges({ isFirstJournalEntry: false, completedStageSlug: 'acceptance', currentStreak: 1 })).toContain('acceptance-complete')
  })

  it('awards streak badges at exactly 3 and 7 days, not other counts', () => {
    expect(determineNewBadges({ isFirstJournalEntry: false, completedStageSlug: null, currentStreak: 3 })).toContain('three-day-streak')
    expect(determineNewBadges({ isFirstJournalEntry: false, completedStageSlug: null, currentStreak: 7 })).toContain('seven-day-streak')
    expect(determineNewBadges({ isFirstJournalEntry: false, completedStageSlug: null, currentStreak: 4 })).toHaveLength(0)
  })

  it('can award multiple badges from a single event', () => {
    const badges = determineNewBadges({ isFirstJournalEntry: true, completedStageSlug: 'recognition', currentStreak: 3 })
    expect(badges).toEqual(expect.arrayContaining(['first-entry', 'recognition-complete', 'three-day-streak']))
  })
})
```

- [ ] **Step 2: Run to confirm it fails**

Run: `npm test -- badges`
Expected: FAIL — `Cannot find module './badges'`

- [ ] **Step 3: Implement**

```ts
// src/lib/gamification/badges.ts
export interface BadgeAwardContext {
  isFirstJournalEntry: boolean
  completedStageSlug: string | null
  currentStreak: number
}

export function determineNewBadges(context: BadgeAwardContext): string[] {
  const badges: string[] = []
  if (context.isFirstJournalEntry) badges.push('first-entry')
  if (context.completedStageSlug === 'recognition') badges.push('recognition-complete')
  if (context.completedStageSlug === 'acceptance') badges.push('acceptance-complete')
  if (context.currentStreak === 3) badges.push('three-day-streak')
  if (context.currentStreak === 7) badges.push('seven-day-streak')
  return badges
}
```

- [ ] **Step 4: Run to confirm it passes**

Run: `npm test -- badges`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/gamification/badges.ts src/lib/gamification/badges.test.ts
git commit -m "feat: add badge award logic"
```

---

### Task 10: Journey Content Data (Recognition & Acceptance)

**Files:**
- Create: `src/lib/content/journey-stages.ts`
- Test: `src/lib/content/journey-stages.test.ts`

**Interfaces:**
- Produces: `JOURNEY_STAGES: JourneyStage[]`, `getStage(slug: string): JourneyStage | undefined`, `getLesson(stageSlug: string, lessonSlug: string): Lesson | undefined` — consumed by Task 12.

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/content/journey-stages.test.ts
import { describe, it, expect } from 'vitest'
import { JOURNEY_STAGES, getStage, getLesson } from './journey-stages'

describe('journey content', () => {
  it('exposes exactly the Phase 1 stages, in order', () => {
    expect(JOURNEY_STAGES.map((s) => s.slug)).toEqual(['recognition', 'acceptance'])
  })

  it('every lesson has at least one exercise prompt', () => {
    for (const stage of JOURNEY_STAGES) {
      for (const lesson of stage.lessons) {
        expect(lesson.exercisePrompt.length).toBeGreaterThan(0)
      }
    }
  })

  it('getStage finds a stage by slug and returns undefined for unknown slugs', () => {
    expect(getStage('recognition')?.title).toBe('Recognition')
    expect(getStage('nonexistent')).toBeUndefined()
  })

  it('getLesson finds a lesson within a stage', () => {
    expect(getLesson('recognition', 'noticing-triggers')?.title).toBe('Noticing Your Triggers')
    expect(getLesson('recognition', 'nonexistent')).toBeUndefined()
  })
})
```

- [ ] **Step 2: Run to confirm it fails**

Run: `npm test -- journey-stages`
Expected: FAIL — `Cannot find module './journey-stages'`

- [ ] **Step 3: Implement**

```ts
// src/lib/content/journey-stages.ts
export interface Lesson {
  slug: string
  title: string
  psychoeducation: string
  exercisePrompt: string
}

export interface JourneyStage {
  slug: string
  title: string
  description: string
  lessons: Lesson[]
}

export const JOURNEY_STAGES: JourneyStage[] = [
  {
    slug: 'recognition',
    title: 'Recognition',
    description: 'Learning to notice when the shadow shows up — usually through a reaction stronger than the moment calls for.',
    lessons: [
      {
        slug: 'noticing-triggers',
        title: 'Noticing Your Triggers',
        psychoeducation:
          'A trigger is a disproportionate emotional reaction — irritation, contempt, envy, disgust — to something small. The size of the reaction is a clue: it usually points to something being protected, not just the situation in front of you.',
        exercisePrompt:
          "Think of a moment recently when you reacted more strongly than the situation seemed to call for. What happened, and what did you feel in your body? Don't judge it yet — just describe it.",
      },
      {
        slug: 'projection-journaling',
        title: 'What You Admire and Despise in Others',
        psychoeducation:
          'Projection means placing a disowned trait — good or bad — onto someone else. What we strongly admire or strongly judge in other people is often a mirror for something in ourselves we have not yet recognized.',
        exercisePrompt:
          'Name someone you admire intensely and someone whose behavior irritates you intensely. What quality is it, specifically? Where might that same quality quietly exist in you?',
      },
    ],
  },
  {
    slug: 'acceptance',
    title: 'Acceptance',
    description: 'Sitting with what you noticed in Recognition, without judgment, and without rushing to fix it.',
    lessons: [
      {
        slug: 'naming-without-judgment',
        title: 'Naming It Without Judgment',
        psychoeducation:
          'Acceptance does not mean approval — it means acknowledging a trait or feeling exists in you without immediately trying to eliminate it. Naming something plainly, without a moral verdict attached, is what makes it possible to work with later.',
        exercisePrompt:
          "Take the trait or reaction you identified in Recognition and write one sentence naming it plainly — no self-criticism, no excuses. Just: 'I have a part of me that ___.'",
      },
      {
        slug: 'avoided-emotions',
        title: 'The Emotion You Avoid Most',
        psychoeducation:
          'Most people have one emotion — anger, sadness, envy, need — they were taught was unacceptable early on, and have been managing around ever since. Identifying it is often the single most useful step in shadow work.',
        exercisePrompt:
          "What emotion do you feel most uncomfortable admitting to, even to yourself? When did you last actually feel it, and what did you do with it in that moment?",
      },
    ],
  },
]

export function getStage(slug: string): JourneyStage | undefined {
  return JOURNEY_STAGES.find((stage) => stage.slug === slug)
}

export function getLesson(stageSlug: string, lessonSlug: string): Lesson | undefined {
  return getStage(stageSlug)?.lessons.find((lesson) => lesson.slug === lessonSlug)
}
```

- [ ] **Step 4: Run to confirm it passes**

Run: `npm test -- journey-stages`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/content/journey-stages.ts src/lib/content/journey-stages.test.ts
git commit -m "feat: add Recognition and Acceptance journey content"
```

---

### Task 11: Journal Entry Submission (orchestration)

**Files:**
- Create: `src/lib/journal/submit-entry.ts`
- Create: `src/app/journey/actions.ts`
- Test: `src/lib/journal/submit-entry.test.ts`

**Interfaces:**
- Consumes: `encryptText` (Task 6), `containsCrisisLanguage` (Task 7), `calculateXpGain`/`growthStageForXp` (Task 8), `updateStreakForActivity` (Task 8), `determineNewBadges` (Task 9), `createClient()` server (Task 3).
- Produces: `submitJournalEntry(supabase, userId, input): Promise<SubmitJournalEntryResult>` (pure orchestration, dependency-injected client for testability) and the `'use server'` wrapper `submitJournalEntryAction(input)` — consumed by Task 12's `ExerciseForm`.

- [ ] **Step 1: Write the failing orchestration tests with a fake Supabase client**

```ts
// src/lib/journal/submit-entry.test.ts
import { describe, it, expect, beforeAll } from 'vitest'
import { submitJournalEntry } from './submit-entry'

beforeAll(() => {
  process.env.JOURNAL_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString('base64')
})

function createFakeSupabase(opts: {
  existingEntryCount?: number
  companion?: { xp: number; current_streak: number; longest_streak: number; streak_freezes_remaining: number; last_activity_date: string | null } | null
}) {
  const calls: { insert: any[]; upsert: any[] } = { insert: [], upsert: [] }
  const client = {
    from(table: string) {
      return {
        select(_cols: string, selectOpts?: { head?: boolean }) {
          if (table === 'journal_entries' && selectOpts?.head) {
            return { eq: () => Promise.resolve({ count: opts.existingEntryCount ?? 0 }) }
          }
          if (table === 'companion_state') {
            return { eq: () => ({ single: async () => ({ data: opts.companion ?? null }) }) }
          }
          throw new Error(`Unexpected select on ${table}`)
        },
        insert(row: any) {
          calls.insert.push({ table, row })
          return Promise.resolve({ error: null })
        },
        upsert(rows: any, upsertOpts?: any) {
          calls.upsert.push({ table, rows, opts: upsertOpts })
          return Promise.resolve({ error: null })
        },
      }
    },
  }
  return { client, calls }
}

describe('submitJournalEntry', () => {
  it('encrypts content, awards XP, and grants the first-entry badge on a brand-new user', async () => {
    const { client, calls } = createFakeSupabase({ existingEntryCount: 0, companion: null })

    const result = await submitJournalEntry(client as any, 'user-1', {
      content: 'Today I noticed I got defensive when my coworker gave feedback.',
      stageSlug: 'recognition',
      lessonSlug: 'noticing-triggers',
      today: '2026-08-29',
    })

    expect(result.safetyFlagged).toBe(false)
    expect(result.newBadges).toContain('first-entry')
    expect(result.growthStage).toBe('seed')

    const entryInsert = calls.insert.find((c) => c.table === 'journal_entries')
    expect(entryInsert.row.user_id).toBe('user-1')
    expect(entryInsert.row.ciphertext).not.toContain('defensive')
    expect(entryInsert.row.safety_flagged).toBe(false)

    const companionUpsert = calls.upsert.find((c) => c.table === 'companion_state')
    expect(companionUpsert.rows.xp).toBe(20)
    expect(companionUpsert.rows.current_streak).toBe(1)
  })

  it('flags crisis language on the entry without throwing or blocking the save', async () => {
    const { client, calls } = createFakeSupabase({
      existingEntryCount: 2,
      companion: { xp: 40, current_streak: 1, longest_streak: 1, streak_freezes_remaining: 3, last_activity_date: '2026-08-28' },
    })

    const result = await submitJournalEntry(client as any, 'user-1', {
      content: "I don't want to be here anymore.",
      stageSlug: 'recognition',
      lessonSlug: 'noticing-triggers',
      today: '2026-08-29',
    })

    expect(result.safetyFlagged).toBe(true)
    const entryInsert = calls.insert.find((c) => c.table === 'journal_entries')
    expect(entryInsert.row.safety_flagged).toBe(true)
  })

  it('does not award the first-entry badge when the user already has entries', async () => {
    const { client } = createFakeSupabase({
      existingEntryCount: 3,
      companion: { xp: 60, current_streak: 2, longest_streak: 2, streak_freezes_remaining: 3, last_activity_date: '2026-08-28' },
    })

    const result = await submitJournalEntry(client as any, 'user-1', {
      content: 'A calm, ordinary reflection.',
      stageSlug: 'acceptance',
      lessonSlug: 'naming-without-judgment',
      today: '2026-08-29',
    })

    expect(result.newBadges).not.toContain('first-entry')
  })
})
```

- [ ] **Step 2: Run to confirm it fails**

Run: `npm test -- submit-entry`
Expected: FAIL — `Cannot find module './submit-entry'`

- [ ] **Step 3: Implement the orchestration function**

```ts
// src/lib/journal/submit-entry.ts
import { encryptText } from './encryption'
import { containsCrisisLanguage } from './safety'
import { calculateXpGain, growthStageForXp } from '../gamification/xp'
import { updateStreakForActivity, type StreakState } from '../gamification/streak'
import { determineNewBadges } from '../gamification/badges'

export interface SubmitJournalEntryInput {
  content: string
  stageSlug: string
  lessonSlug: string
  today: string // 'YYYY-MM-DD', injected so this stays pure and testable
}

export interface SubmitJournalEntryResult {
  safetyFlagged: boolean
  newBadges: string[]
  growthStage: string
}

// `supabase` is typed loosely on purpose: the fake client in submit-entry.test.ts
// only implements the subset of the real SupabaseClient this function calls.
export async function submitJournalEntry(
  supabase: any,
  userId: string,
  input: SubmitJournalEntryInput
): Promise<SubmitJournalEntryResult> {
  const safetyFlagged = containsCrisisLanguage(input.content)
  const { ciphertext, iv, authTag } = encryptText(input.content)

  const { count: existingEntryCount } = await supabase
    .from('journal_entries')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)

  const { error: insertError } = await supabase.from('journal_entries').insert({
    user_id: userId,
    stage_slug: input.stageSlug,
    lesson_slug: input.lessonSlug,
    ciphertext,
    iv,
    auth_tag: authTag,
    safety_flagged: safetyFlagged,
  })
  if (insertError) throw insertError

  const { data: companion } = await supabase
    .from('companion_state')
    .select('*')
    .eq('user_id', userId)
    .single()

  const streakBefore: StreakState = {
    currentStreak: companion?.current_streak ?? 0,
    longestStreak: companion?.longest_streak ?? 0,
    freezesRemaining: companion?.streak_freezes_remaining ?? 3,
    lastActivityDate: companion?.last_activity_date ?? null,
  }
  const streakAfter = updateStreakForActivity(streakBefore, input.today)

  const newXp = (companion?.xp ?? 0) + calculateXpGain('lesson_exercise')
  const growthStage = growthStageForXp(newXp)

  await supabase.from('companion_state').upsert({
    user_id: userId,
    xp: newXp,
    growth_stage: growthStage,
    current_streak: streakAfter.currentStreak,
    longest_streak: streakAfter.longestStreak,
    streak_freezes_remaining: streakAfter.freezesRemaining,
    last_activity_date: input.today,
  })

  const newBadges = determineNewBadges({
    isFirstJournalEntry: (existingEntryCount ?? 0) === 0,
    completedStageSlug: null,
    currentStreak: streakAfter.currentStreak,
  })

  if (newBadges.length > 0) {
    await supabase
      .from('user_badges')
      .upsert(
        newBadges.map((badgeId) => ({ user_id: userId, badge_id: badgeId })),
        { onConflict: 'user_id,badge_id', ignoreDuplicates: true }
      )
  }

  return { safetyFlagged, newBadges, growthStage }
}
```

- [ ] **Step 4: Run to confirm it passes**

Run: `npm test -- submit-entry`
Expected: PASS (3 tests)

- [ ] **Step 5: Add the real server-action wrapper**

```ts
// src/app/journey/actions.ts
'use server'

import { createClient } from '@/lib/supabase/server'
import { submitJournalEntry, type SubmitJournalEntryResult } from '@/lib/journal/submit-entry'
import { redirect } from 'next/navigation'

export async function submitJournalEntryAction(
  stageSlug: string,
  lessonSlug: string,
  content: string
): Promise<SubmitJournalEntryResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/sign-in')

  const today = new Date().toISOString().slice(0, 10)
  return submitJournalEntry(supabase, user.id, { content, stageSlug, lessonSlug, today })
}
```

- [ ] **Step 6: Commit**

```bash
git add src/lib/journal/submit-entry.ts src/lib/journal/submit-entry.test.ts src/app/journey/actions.ts
git commit -m "feat: wire journal entry submission through encryption, safety, XP, streak, and badges"
```

---

### Task 12: Journey Pages (stage list, lesson, exercise form)

**Files:**
- Create: `src/app/journey/page.tsx`
- Create: `src/app/journey/[stageSlug]/page.tsx`
- Create: `src/app/journey/[stageSlug]/[lessonSlug]/page.tsx`
- Create: `src/app/journey/[stageSlug]/[lessonSlug]/ExerciseForm.tsx`
- Test: `src/app/journey/[stageSlug]/[lessonSlug]/ExerciseForm.test.tsx`

**Interfaces:**
- Consumes: `JOURNEY_STAGES`, `getStage`, `getLesson` (Task 10); `submitJournalEntryAction` (Task 11).

- [ ] **Step 1: Write the failing test for the safety-response UI**

```tsx
// src/app/journey/[stageSlug]/[lessonSlug]/ExerciseForm.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ExerciseForm } from './ExerciseForm'

describe('ExerciseForm', () => {
  it('shows a normal confirmation when the entry is not safety-flagged', async () => {
    const submit = vi.fn().mockResolvedValue({ safetyFlagged: false, newBadges: [], growthStage: 'seed' })
    render(<ExerciseForm stageSlug="recognition" lessonSlug="noticing-triggers" onSubmit={submit} />)

    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'A calm reflection.' } })
    fireEvent.click(screen.getByRole('button', { name: /save/i }))

    await waitFor(() => expect(screen.getByText(/entry saved/i)).toBeInTheDocument())
    expect(screen.queryByText(/might be a good time to talk to someone/i)).not.toBeInTheDocument()
  })

  it('shows the gentle safety pathway, without blocking, when the entry is flagged', async () => {
    const submit = vi.fn().mockResolvedValue({ safetyFlagged: true, newBadges: [], growthStage: 'seed' })
    render(<ExerciseForm stageSlug="recognition" lessonSlug="noticing-triggers" onSubmit={submit} />)

    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'a flagged entry' } })
    fireEvent.click(screen.getByRole('button', { name: /save/i }))

    await waitFor(() => expect(screen.getByText(/might be a good time to talk to someone/i)).toBeInTheDocument())
    expect(screen.getByText(/entry saved/i)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run to confirm it fails**

Run: `npm test -- ExerciseForm`
Expected: FAIL — `Cannot find module './ExerciseForm'`

- [ ] **Step 3: Implement the exercise form**

```tsx
// src/app/journey/[stageSlug]/[lessonSlug]/ExerciseForm.tsx
'use client'

import { useState } from 'react'
import type { SubmitJournalEntryResult } from '@/lib/journal/submit-entry'

export function ExerciseForm({
  stageSlug,
  lessonSlug,
  onSubmit,
}: {
  stageSlug: string
  lessonSlug: string
  onSubmit: (stageSlug: string, lessonSlug: string, content: string) => Promise<SubmitJournalEntryResult>
}) {
  const [content, setContent] = useState('')
  const [result, setResult] = useState<SubmitJournalEntryResult | null>(null)
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const outcome = await onSubmit(stageSlug, lessonSlug, content)
    setResult(outcome)
    setSaving(false)
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={6}
        className="border rounded p-3"
        placeholder="Write freely — there's no wrong answer here."
      />
      <button type="submit" disabled={saving || content.trim().length === 0} className="self-start rounded bg-stone-800 text-white px-4 py-2 disabled:opacity-40">
        Save entry
      </button>

      {result && (
        <div className="mt-4 rounded border border-stone-200 bg-stone-50 p-4">
          <p>Entry saved.</p>
          {result.safetyFlagged && (
            <p className="mt-2 text-stone-700">
              What you wrote sounds heavy. There's no pressure to do anything right now — but if it would help,
              this might be a good time to talk to someone. <a href="/resources" className="underline">See some options</a>.
            </p>
          )}
        </div>
      )}
    </form>
  )
}
```

- [ ] **Step 4: Run to confirm it passes**

Run: `npm test -- ExerciseForm`
Expected: PASS (2 tests)

- [ ] **Step 5: Stage list page**

```tsx
// src/app/journey/page.tsx
import Link from 'next/link'
import { JOURNEY_STAGES } from '@/lib/content/journey-stages'

export default function JourneyPage() {
  return (
    <main className="mx-auto max-w-2xl py-16">
      <h1 className="text-2xl font-serif mb-8">The Journey</h1>
      <ul className="flex flex-col gap-4">
        {JOURNEY_STAGES.map((stage) => (
          <li key={stage.slug} className="rounded border border-stone-200 p-4">
            <Link href={`/journey/${stage.slug}`} className="text-lg font-medium">
              {stage.title}
            </Link>
            <p className="text-stone-600">{stage.description}</p>
          </li>
        ))}
      </ul>
    </main>
  )
}
```

- [ ] **Step 6: Stage detail page**

```tsx
// src/app/journey/[stageSlug]/page.tsx
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getStage } from '@/lib/content/journey-stages'

export default async function StagePage({ params }: { params: Promise<{ stageSlug: string }> }) {
  const { stageSlug } = await params
  const stage = getStage(stageSlug)
  if (!stage) notFound()

  return (
    <main className="mx-auto max-w-2xl py-16">
      <h1 className="text-2xl font-serif mb-2">{stage.title}</h1>
      <p className="text-stone-600 mb-8">{stage.description}</p>
      <ul className="flex flex-col gap-4">
        {stage.lessons.map((lesson) => (
          <li key={lesson.slug} className="rounded border border-stone-200 p-4">
            <Link href={`/journey/${stage.slug}/${lesson.slug}`} className="text-lg font-medium">
              {lesson.title}
            </Link>
          </li>
        ))}
      </ul>
    </main>
  )
}
```

- [ ] **Step 7: Lesson page**

```tsx
// src/app/journey/[stageSlug]/[lessonSlug]/page.tsx
import { notFound } from 'next/navigation'
import { getLesson } from '@/lib/content/journey-stages'
import { submitJournalEntryAction } from '../../actions'
import { ExerciseForm } from './ExerciseForm'

export default async function LessonPage({
  params,
}: {
  params: Promise<{ stageSlug: string; lessonSlug: string }>
}) {
  const { stageSlug, lessonSlug } = await params
  const lesson = getLesson(stageSlug, lessonSlug)
  if (!lesson) notFound()

  async function onSubmit(stage: string, slug: string, content: string) {
    'use server'
    return submitJournalEntryAction(stage, slug, content)
  }

  return (
    <main className="mx-auto max-w-2xl py-16">
      <h1 className="text-2xl font-serif mb-4">{lesson.title}</h1>
      <p className="text-stone-700 mb-8">{lesson.psychoeducation}</p>
      <p className="font-medium mb-4">{lesson.exercisePrompt}</p>
      <ExerciseForm stageSlug={stageSlug} lessonSlug={lessonSlug} onSubmit={onSubmit} />
    </main>
  )
}
```

- [ ] **Step 8: Manual verification**

Run `npm run dev`, sign in, visit `/journey`, open a lesson, submit a benign entry (confirm "Entry saved" only) and then a deliberately flagged test entry like "I don't want to be here anymore" (confirm the gentle safety message also appears, and the entry still saves).

- [ ] **Step 9: Commit**

```bash
git add src/app/journey
git commit -m "feat: add journey stage/lesson pages and exercise submission UI"
```

---

### Task 13: Daily Practice Check-In

**Files:**
- Create: `src/app/daily/actions.ts`
- Create: `src/app/daily/DailyCheckInForm.tsx`
- Create: `src/app/daily/page.tsx`

**Interfaces:**
- Consumes: `submitJournalEntry` (Task 11, reused with `stageSlug: 'daily'`), `calculateXpGain('daily_practice')` (Task 8).

- [ ] **Step 1: Add a daily-practice path through the existing orchestration function**

`submitJournalEntry` (Task 11) always awards `calculateXpGain('lesson_exercise')`. Daily Practice needs the smaller `daily_practice` amount, so this task adds an `activityType` input rather than duplicating the whole function.

Modify `src/lib/journal/submit-entry.ts`:
- Add `activityType: 'lesson_exercise' | 'daily_practice'` to `SubmitJournalEntryInput`.
- Replace the hardcoded `calculateXpGain('lesson_exercise')` call with `calculateXpGain(input.activityType)`.

Update the two existing call sites accordingly:
- `submit-entry.test.ts`: add `activityType: 'lesson_exercise'` to every existing test's input object.
- `src/app/journey/actions.ts`: pass `activityType: 'lesson_exercise'` in the object built for `submitJournalEntry`.

- [ ] **Step 2: Run the existing suite to confirm nothing broke**

Run: `npm test -- submit-entry`
Expected: PASS (3 tests, unchanged assertions)

- [ ] **Step 3: Write the failing test for the daily XP amount**

Add to `src/lib/journal/submit-entry.test.ts`:

```ts
it('awards the smaller daily-practice XP amount for a daily check-in', async () => {
  const { client } = createFakeSupabase({ existingEntryCount: 1, companion: { xp: 20, current_streak: 1, longest_streak: 1, streak_freezes_remaining: 3, last_activity_date: '2026-08-28' } })

  await submitJournalEntry(client as any, 'user-1', {
    content: 'A short daily reflection.',
    stageSlug: 'daily',
    lessonSlug: 'daily-checkin',
    activityType: 'daily_practice',
    today: '2026-08-29',
  })

  const companionUpsert = calls.upsert.find((c: any) => c.table === 'companion_state')
  expect(companionUpsert.rows.xp).toBe(30) // 20 existing + 10 for daily_practice
})
```

Note: this test needs `calls` in scope — restructure the test file so `createFakeSupabase` is called inside each `it`, assigning both `client` and `calls` locally (as the existing tests already do), then write the new test the same way.

- [ ] **Step 4: Run to confirm it fails**

Run: `npm test -- submit-entry`
Expected: FAIL — expected xp `30`, received `40` (still using the `lesson_exercise` amount)

- [ ] **Step 5: Apply the implementation change from Step 1**

(Code change described in Step 1 above — update `SubmitJournalEntryInput` and the `calculateXpGain` call.)

- [ ] **Step 6: Run to confirm all submit-entry tests pass**

Run: `npm test -- submit-entry`
Expected: PASS (4 tests)

- [ ] **Step 7: Daily check-in prompts and server action**

```ts
// src/app/daily/actions.ts
'use server'

import { createClient } from '@/lib/supabase/server'
import { submitJournalEntry, type SubmitJournalEntryResult } from '@/lib/journal/submit-entry'
import { redirect } from 'next/navigation'

const DAILY_PROMPTS = [
  'What emotion showed up most today, and where did you feel it in your body?',
  'Did anything today provoke a reaction bigger than the moment called for?',
  "What's one thing you did today that you'd rather not admit to?",
  'Who did you compare yourself to today, and what did that comparison reveal?',
]

export function getTodaysPrompt(dateSeed: string): string {
  const index = Array.from(dateSeed).reduce((sum, char) => sum + char.charCodeAt(0), 0) % DAILY_PROMPTS.length
  return DAILY_PROMPTS[index]
}

export async function submitDailyCheckInAction(content: string): Promise<SubmitJournalEntryResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/sign-in')

  const today = new Date().toISOString().slice(0, 10)
  return submitJournalEntry(supabase, user.id, {
    content,
    stageSlug: 'daily',
    lessonSlug: 'daily-checkin',
    activityType: 'daily_practice',
    today,
  })
}
```

- [ ] **Step 8: Write the failing test for prompt selection**

```ts
// src/app/daily/actions.test.ts
import { describe, it, expect } from 'vitest'
import { getTodaysPrompt } from './actions'

describe('getTodaysPrompt', () => {
  it('returns the same prompt for the same date seed', () => {
    expect(getTodaysPrompt('2026-08-29')).toBe(getTodaysPrompt('2026-08-29'))
  })

  it('returns a non-empty string', () => {
    expect(getTodaysPrompt('2026-08-29').length).toBeGreaterThan(0)
  })
})
```

- [ ] **Step 9: Run to confirm it fails, then passes**

Run: `npm test -- daily`
Expected: FAIL first (module doesn't export yet if written before Step 7) — since Step 7 already defines `getTodaysPrompt`, running now should PASS (2 tests). If it fails, double check Step 7 was applied before this step.

- [ ] **Step 10: Check-in form and page**

```tsx
// src/app/daily/DailyCheckInForm.tsx
'use client'

import { useState } from 'react'
import type { SubmitJournalEntryResult } from '@/lib/journal/submit-entry'

export function DailyCheckInForm({
  prompt,
  onSubmit,
}: {
  prompt: string
  onSubmit: (content: string) => Promise<SubmitJournalEntryResult>
}) {
  const [content, setContent] = useState('')
  const [result, setResult] = useState<SubmitJournalEntryResult | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setResult(await onSubmit(content))
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <p className="font-medium">{prompt}</p>
      <textarea value={content} onChange={(e) => setContent(e.target.value)} rows={4} className="border rounded p-3" />
      <button type="submit" disabled={content.trim().length === 0} className="self-start rounded bg-stone-800 text-white px-4 py-2 disabled:opacity-40">
        Check in
      </button>
      {result && <p className="mt-2 text-stone-700">Thanks for checking in today.</p>}
    </form>
  )
}
```

```tsx
// src/app/daily/page.tsx
import { getTodaysPrompt, submitDailyCheckInAction } from './actions'
import { DailyCheckInForm } from './DailyCheckInForm'

export default function DailyPage() {
  const today = new Date().toISOString().slice(0, 10)
  const prompt = getTodaysPrompt(today)

  return (
    <main className="mx-auto max-w-2xl py-16">
      <h1 className="text-2xl font-serif mb-8">Today's Check-In</h1>
      <DailyCheckInForm prompt={prompt} onSubmit={submitDailyCheckInAction} />
    </main>
  )
}
```

- [ ] **Step 11: Commit**

```bash
git add src/app/daily src/lib/journal/submit-entry.ts src/lib/journal/submit-entry.test.ts src/app/journey/actions.ts
git commit -m "feat: add Daily Practice check-in with its own XP amount"
```

---

### Task 14: Dashboard (companion, streak, badges)

**Files:**
- Create: `src/components/companion/CompanionView.tsx`
- Create: `src/components/badges/BadgeGrid.tsx`
- Create: `src/app/dashboard/page.tsx`
- Test: `src/components/companion/CompanionView.test.tsx`

**Interfaces:**
- Consumes: `GrowthStage` (Task 8), `createClient()` server (Task 3).

- [ ] **Step 1: Write the failing test for the companion view's copy**

```tsx
// src/components/companion/CompanionView.test.tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { CompanionView } from './CompanionView'

describe('CompanionView', () => {
  it('shows an encouraging label for each growth stage without ever showing a penalty', () => {
    render(<CompanionView growthStage="seed" currentStreak={0} />)
    expect(screen.getByText(/seedling/i)).toBeInTheDocument()
    expect(screen.queryByText(/broken/i)).not.toBeInTheDocument()
  })

  it('shows the current streak count when greater than zero', () => {
    render(<CompanionView growthStage="sprout" currentStreak={4} />)
    expect(screen.getByText(/4/)).toBeInTheDocument()
  })

  it('shows gentle copy instead of a number when the streak is zero', () => {
    render(<CompanionView growthStage="seed" currentStreak={0} />)
    expect(screen.getByText(/whenever you're ready/i)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run to confirm it fails**

Run: `npm test -- CompanionView`
Expected: FAIL — `Cannot find module './CompanionView'`

- [ ] **Step 3: Implement**

```tsx
// src/components/companion/CompanionView.tsx
import type { GrowthStage } from '@/lib/gamification/xp'

const STAGE_LABELS: Record<GrowthStage, string> = {
  seed: 'A seedling, just getting started',
  sprout: 'A young sprout, growing steadily',
  sapling: 'A sapling, putting down roots',
  bloom: 'In full bloom',
}

export function CompanionView({ growthStage, currentStreak }: { growthStage: GrowthStage; currentStreak: number }) {
  return (
    <div className="rounded border border-stone-200 p-6 text-center">
      <p className="text-lg">{STAGE_LABELS[growthStage]}</p>
      <p className="text-stone-600 mt-2">
        {currentStreak > 0 ? `${currentStreak}-day streak` : "No streak yet — that's okay, come back whenever you're ready."}
      </p>
    </div>
  )
}
```

- [ ] **Step 4: Run to confirm it passes**

Run: `npm test -- CompanionView`
Expected: PASS (3 tests)

- [ ] **Step 5: Badge grid component**

```tsx
// src/components/badges/BadgeGrid.tsx
interface EarnedBadge {
  id: string
  name: string
  description: string
}

export function BadgeGrid({ badges }: { badges: EarnedBadge[] }) {
  if (badges.length === 0) {
    return <p className="text-stone-600">No badges yet — they'll appear here as you go.</p>
  }
  return (
    <ul className="grid grid-cols-2 gap-4">
      {badges.map((badge) => (
        <li key={badge.id} className="rounded border border-stone-200 p-3">
          <p className="font-medium">{badge.name}</p>
          <p className="text-sm text-stone-600">{badge.description}</p>
        </li>
      ))}
    </ul>
  )
}
```

- [ ] **Step 6: Dashboard page**

```tsx
// src/app/dashboard/page.tsx
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { CompanionView } from '@/components/companion/CompanionView'
import { BadgeGrid } from '@/components/badges/BadgeGrid'
import type { GrowthStage } from '@/lib/gamification/xp'

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data: companion } = await supabase
    .from('companion_state')
    .select('growth_stage, current_streak')
    .eq('user_id', user.id)
    .single()

  const { data: earnedBadges } = await supabase
    .from('user_badges')
    .select('badges(id, name, description)')
    .eq('user_id', user.id)

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
      </div>
      <div>
        <h2 className="text-lg font-medium mb-4">Your badges</h2>
        <BadgeGrid badges={badges} />
      </div>
    </main>
  )
}
```

- [ ] **Step 7: Commit**

```bash
git add src/components/companion src/components/badges src/app/dashboard
git commit -m "feat: add dashboard with companion growth view and earned badges"
```

---

### Task 15: End-to-End Verification

**Files:** none created — this task verifies Tasks 1–14 together.

- [ ] **Step 1: Run the full automated test suite**

Run: `npm test`
Expected: all tests across every file pass (encryption, safety, xp, streak, badges, journey-stages, submit-entry, OnboardingForm, ExerciseForm, CompanionView, daily actions).

- [ ] **Step 2: Run the production build**

Run: `npm run build`
Expected: build completes with no type errors.

- [ ] **Step 3: Manual golden-path walkthrough in a browser**

Run `npm run dev` and, in order:
1. Sign up with a new account at `/sign-up`.
2. Complete the onboarding quiz; confirm redirect to `/journey`.
3. Open Recognition → "Noticing Your Triggers", submit a benign entry, confirm "Entry saved" with no safety message, and confirm the companion view on `/dashboard` now shows "A seedling, just getting started" is unaffected in wording but the streak shows 1 day.
4. Submit a second lesson exercise; confirm XP increases (companion stage logic can be spot-checked by temporarily logging `newXp` if not yet visually obvious at these thresholds).
5. Visit `/daily`, submit a check-in, confirm it succeeds.
6. Submit an entry containing "I don't want to be here anymore" and confirm the gentle safety message appears alongside "Entry saved" — and that it does **not** block submission or navigation.
7. Check `/dashboard` shows the "First Words" badge after the very first entry from step 3.
8. Sign out, sign back in, confirm the dashboard reflects the same state (data persisted correctly, RLS didn't block the owner's own reads).

- [ ] **Step 4: Spot-check RLS with a second account**

Create a second account via `/sign-up` in a private/incognito window. Confirm its `/dashboard` shows a fresh companion (seed, 0 streak, no badges) — proving the first account's data isn't visible to it.

- [ ] **Step 5: Commit any fixes found during verification**

If any step above surfaces a bug, fix it, re-run the relevant automated test, and commit with a `fix:` message before considering Phase 1 done.

---

## Self-Review Notes

- **Spec coverage**: onboarding quiz ✅ (Task 5), structured Journey with two stages ✅ (Task 10, 12), Daily Practice ✅ (Task 13), growth companion + forgiving streaks + badges ✅ (Tasks 8, 9, 14), baseline keyword safety check with non-blocking gentle response ✅ (Task 7, 12), encryption at rest ✅ (Task 6), RLS per-user isolation ✅ (Task 2). AI insights and the LLM safety classifier are correctly excluded per the Global Constraints — they're Phase 2.
- **Type consistency checked**: `SubmitJournalEntryResult` (Task 11) is the single shared type used by `ExerciseForm` (Task 12) and `DailyCheckInForm` (Task 13); `GrowthStage` (Task 8) is the single shared type used by `CompanionView` and the dashboard (Task 14); badge id strings match exactly between the Task 2 seed data and Task 9's `determineNewBadges`.
- **Known scope cuts for Phase 1** (intentional, not oversights): streak freezes do not replenish monthly (they only ever decrease from the initial 3); the pre-exercise "how are you feeling?" mood check-in gate is deferred to Phase 2 alongside the higher-intensity exercises (inner-child work, active imagination) it's meant to guard; a `/resources` page is linked from the safety message but its content is not built in this plan — add a minimal static page with a hotline/professional-help pointer before shipping Phase 1 to real users.
