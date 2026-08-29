# Umbra — Shadow-Work Web App Design

## Context

The user wants to build a web application that helps people learn and practice shadow-work
(Jungian-rooted self-reflection focused on recognizing and integrating disowned/repressed
parts of the self) — signup, learn, and heal. The explicit brief: make it engaging through
gamification, but keep the overall feel calm and easy rather than gamified-app aggressive.
This is a greenfield project (empty directory, Vercel-oriented environment).

Research into shadow-work practice and calm-gamification patterns (Duolingo streak freezes,
Headspace's non-shaming lapse messaging, Finch's punishment-free pet-growth model) informed
the design below, along with review of real reference products (Calm, Aura Health, Day One,
Rosebud, Finch, How We Feel). The user chose **Rosebud** (AI-powered journaling, soft
minimal/editorial visual style) as the closest aesthetic and interaction-model reference.

Key constraint surfaced by research: shadow work can surface real emotional/trauma material.
Safety and pacing are treated as first-class product requirements, not an afterthought —
this shaped the AI-insights architecture (see below) as much as the content design did.

Decisions confirmed with the user during brainstorming:
- **Audience**: broad/adaptive — app adapts depth/pacing per user rather than targeting one segment.
- **Content model**: blended — a structured Journey (curriculum) plus a lightweight Daily Practice layer.
- **Gamification**: growth-visual companion + milestones/badges + a private (non-competitive) XP/level system.
- **Personalization**: onboarding quiz + ongoing AI insights derived from journal entries over time.
- **Monetization**: freemium.
- **Scope**: full vision speced in one document (not MVP-only), with a phased build roadmap inside it.
- **Visual direction**: soft minimal/editorial, Rosebud-inspired.

## Product Pillars

A shadow-work companion structured enough to teach real psychological technique, paced so it
never feels like homework or a grind. Progress is shown as *growth*, never as *streaks you can
break*. Working name: **Umbra** (Latin for "shadow" — placeholder, easy to change).

## Onboarding & Personalization

- Short onboarding quiz (5-7 questions): prior familiarity with shadow work/therapy, current
  emotional bandwidth, what's drawing them in right now (a relationship pattern, self-criticism,
  a recurring trigger, general curiosity). Sets starting depth and first few days of content.
- From there, the AI insight layer (see below) refines future suggestions based on actual
  journal patterns, not just the one-time quiz answers.

## Content Model — Structured Journey + Daily Practice

- **The Journey**: a sequential curriculum built around the five-stage shadow-work arc —
  Recognition → Acceptance → Dialogue → Integration → Transformation. Each stage: short
  psychoeducation (what this stage is, why it matters) + 2-4 guided exercises (trigger-mapping,
  projection journaling, inner-child dialogue, mirror work). Delivered in small chunks —
  never a wall of content at once (directly informed by the pacing/safety research).
- **Daily Practice**: once a user has started the Journey, a 2-3 minute daily check-in prompt
  (sometimes tied to current Journey content, sometimes a standalone reflection) keeps a light
  daily touchpoint without demanding a full session every day.

## Gamification & Companion System

- **Growth companion** (Finch-style visual — plant/creature, exact form TBD in visual design
  pass) that matures as the user engages, fed by both Journey progress and Daily Practice.
  Never shrinks, wilts, or produces guilt for a missed day — only grows.
- **Milestones & badges** tied to real depth ("completed your first trigger-mapping exercise,"
  "finished the Acceptance stage"), not raw activity counts.
- **Streaks with grace**: visible but forgiving — a small number of monthly "freeze" days,
  gentle non-shaming copy on a missed day, no scary broken-chain visual.
- **Private XP/level**: exists under the hood to drive companion growth, never shown as a
  leaderboard or public comparison.

## AI Insights (async layer)

After each entry saves, a background job tags it for theme/emotion/trigger type. Every ~5
entries (or weekly, whichever comes first) these accumulate into an **Insights space** —
pattern-level reflections ("you've mentioned feeling dismissed by authority a few times this
month") framed as observation, inviting the user toward relevant Journey content — never
framed as diagnosis.

## Safety Pathway (real-time layer)

- A fast, lightweight classifier runs **synchronously** on every entry save, checking only for
  crisis-level language (self-harm, acute distress). Invisible unless it trips.
- If it trips: a calm, non-alarming in-app moment — a grounding option, explicit permission to
  pause, and a clearly signposted (not buried-in-ToS) path to professional/crisis resources.
  Never a jump-scare popup; never blocks the user from continuing to write.
- Before higher-intensity exercises specifically (inner-child work, active imagination), a soft
  "how are you feeling right now?" check-in gates entry, so someone in a rough place isn't
  dropped into deep work unprompted.
- Journal entries are encrypted at rest; AI calls route through a provider path with
  zero/minimal data retention given the sensitivity of the content.
- **The safety pathway is never paywalled**, regardless of subscription tier — a stated product
  principle, not just a feature.

### Why this architecture (real-time safety vs. async insights)
Two options were weighed: (a) real-time analysis of everything, or (b) a weekly batch digest
for everything including safety. Batch-only was rejected for safety specifically — research
was clear that a concerning entry sitting unflagged for days is unacceptable — but applying
that same real-time cost/latency to the deeper pattern-insight generation would make journaling
itself feel surveilled and would put AI cost/latency on the critical writing path. The chosen
hybrid runs the cheap safety check synchronously (non-negotiable, invisible) and defers the
more expensive pattern-insight generation to an async job surfaced later in a separate Insights
space — keeping the core writing experience calm and fast while keeping the safety net immediate.

## Monetization — Freemium

- **Free**: full onboarding + quiz, Journey stages 1-2 (Recognition, Acceptance) in full, Daily
  Practice, the growth companion + badges, weekly-digest insights.
- **Paid** (working name: *Umbra+*): remaining Journey stages (Dialogue, Integration,
  Transformation), immediate per-entry reflections instead of weekly digests, advanced
  exercises (dream journal, active-imagination guides), companion customization.
- No feature-gating ever touches the safety pathway or crisis resources.

## Visual Direction (Rosebud-inspired)

Warm off-white backgrounds (never stark white), muted palette (dusty rose, sage, warm neutral
browns), a serif+humanist-sans pairing — serif for reflective/journal content, clean sans for
UI chrome. Generous whitespace, soft grain texture, rounded corners, gentle layered shadows
rather than flat cards. The companion character rendered in a soft illustrated style matching
the palette. Motion stays subtle — gentle fades/reveals, nothing jarring, compositor-friendly
properties only. Light theme is primary; a soft "dusk" theme (muted twilight tones, not a stark
dark mode) is a nice-to-have for a later phase, not launch-critical.

## Tech Architecture

- **Next.js (App Router) on Vercel**, Fluid Compute default.
- **Auth + database**: provisioned through the Vercel Marketplace at implementation time
  (exact provider selected via that discovery flow — not locked in during this design pass).
- **AI layer**: Vercel AI Gateway + AI SDK for both the safety classifier and pattern-insight
  generation, using zero-data-retention routing given the sensitivity of journal content.
- **Billing**: a Marketplace payment provider for the freemium subscription, also selected at
  implementation time.
- **Core data model**: User, OnboardingProfile, JourneyProgress (stage/lesson completion),
  JournalEntry (encrypted content, tags, safety-flag status), CompanionState (xp/growth stage),
  Badge/Milestone records, InsightDigest records, Subscription/Tier record.
- **Background processing**: a queue/scheduled job handles async insight-tagging and periodic
  digest generation, decoupled from the entry-save path.
- **Encryption**: journal entry content encrypted at rest at the application level (not just
  relying on DB-level encryption); the safety classifier processes plaintext only transiently,
  in-memory, during the synchronous check.

## Phased Roadmap

1. **MVP core**: signup, onboarding quiz, Journey stages 1-2, Daily Practice, growth companion +
   badges + forgiving streaks, a baseline (keyword-level, pre-LLM) safety check.
2. **AI layer**: LLM-based safety classifier, async pattern insights + Insights space, remaining
   Journey stages (Dialogue, Integration, Transformation).
3. **Monetization**: Umbra+ paywall, companion customization, advanced exercises (dream
   journal, active-imagination guides).
4. **Polish**: dusk theme, deeper "ask your journal" AI synthesis across entry history.

## Next Steps / Verification

This document is a product+architecture design. Immediate next step: invoke the writing-plans
skill to turn Phase 1 (MVP core) into a concrete implementation plan — file/component
breakdown, build order, and test plan. Before any external service is wired in (auth,
database, AI provider, payments), load the marketplace skill to discover and provision real
integrations rather than assuming a specific vendor. Verification of the eventual
implementation should include: running the app locally and walking the golden path in a
browser (signup → onboarding quiz → first Journey lesson → first journal entry → companion
growth reflected → safety check exercised with a benign and a flagged test entry), plus
automated tests per the project's TDD workflow.
