# Claude-Tag Loop Runbook

**Status:** Process doc | Repo: `stupid-soccer` | Default branch: `master`

This runbook describes the "@mention Claude with a slice" loop for **Stupid Soccer** — the 3v3 pixel football game built with SvelteKit + Phaser + Tailwind + Supabase + Claude API. It complements the existing autonomous Ralph loop (`.ralph/`) by giving a human a fast, deterministic way to hand Claude a single, well-scoped slice of work and get back a draft PR.

---

## How the loop works

1. **A human @mentions Claude** in the channel/thread with a slice. Two ways to specify it:
   - Paste the [in-thread spec template](#in-thread-spec-template) below, filled in, OR
   - Point at the current **Now** slice in [`STATE.md`](../STATE.md) at the repo root ("take the Now slice").
2. **Claude breaks the task into stages** — it reads the relevant files, plans the work, and works through the stages using the repo and its tools.
3. **Claude runs [the gate](#the-gate)** — the commands that must pass before a PR is opened.
4. **Claude opens a draft PR** on a new branch, with the description linked back to the originating thread.
5. **(Optional) Claude schedules itself** to run a periodic triage/heartbeat pass — for example, to re-read [`.ralph/@fix_plan.md`](../.ralph/@fix_plan.md), check CI on open PRs, or pick up the next Now slice autonomously.

One @mention → one slice → one draft PR. Keep slices small enough to land in a single review.

---

## In-thread spec template

Copy this block into the thread, fill it in, and @mention Claude with it. Keep it short and practical — Claude reads the repo for the rest.

```
Slice: <one-line goal — what should exist after this PR>
Why: <impact — why this is the next most valuable thing>
Acceptance criteria:
  - <observable, checkable outcome>
  - <observable, checkable outcome>
Files / area: <where to work, e.g. src/lib/game/, src/routes/squad/>
Out of scope: <what NOT to touch this slice>
Gate: <which commands must pass — defaults to: npm run check, npm run lint, npm run build>
```

---

## The gate

"The gate" is the set of commands that must pass **before a draft PR is opened**. Mapped to this repo's real `package.json` scripts:

| Command | What it does | Must pass |
|---------|--------------|-----------|
| `npm run check` | `svelte-kit sync && svelte-check` (Svelte + `tsc` typecheck) | No **new** errors vs. `master` |
| `npm run lint` | `eslint .` | Clean |
| `npm run build` | `vite build` | Succeeds |
| `npm test` | `vitest` | Pass **when tests exist** |

### Current reality (be accurate, don't overstate)

- **There are no automated tests yet.** `npm test` / `npm run test:unit` (`vitest run`) have nothing to run, so the test step is a no-op for now. Add tests only for new functionality you implement (see the testing guidance in [`.ralph/PROMPT.md`](../.ralph/PROMPT.md)).
- **`npm run lint` and `npm run build` need a companion fix to be green.** There is no ESLint config committed yet, and the build needs an env fix. A separate companion PR adds the ESLint config + build env fix; treat that PR as the **CI-green prerequisite**. Until it lands, `npm run check` is the most reliable signal — it is `svelte-kit sync && svelte-check` and works today.
- For a **docs-only** change (like this file), the gate is just confirming you added no code — `npm run check` is unchanged.

---

## Relationship to the Ralph loop

This runbook does not replace the autonomous Ralph loop in `.ralph/` — it complements it.

- [`.ralph/@fix_plan.md`](../.ralph/@fix_plan.md) is the **backlog and priority source** (GAME FIRST → Squad Management → Trading → Polish).
- [`STATE.md`](../STATE.md) is the current **"Now" pointer** — the single highest-impact slice to pick up next, written as a filled-in instance of the spec template above.
- [`.ralph/PROMPT.md`](../.ralph/PROMPT.md) and [`.ralph/@AGENT.md`](../.ralph/@AGENT.md) define the autonomous-loop process rules (one task per loop, search before assuming, status reporting).

A human can **@mention Claude with a specific slice** instead of — or alongside — the autonomous Ralph pass. The Ralph loop picks the next item by judgment; the Claude-tag loop lets a human hand-pick and hand-scope a slice. Both draw from the same backlog, so they stay consistent.

---

## Conventions

- **One task per PR.** Keep each PR scoped to a single slice so it is easy to review and revert.
- **Conventional commit messages** — `feat:`, `fix:`, `docs:`, `test:`, `refactor:`, with a scope when useful (`feat(game):`, `fix(squad):`).
- **Open PRs as drafts** until the gate is green and the slice is review-ready.
- **Link the PR back to the originating thread** in the description, so the conversation and the change stay connected.
- **Update [`STATE.md`](../STATE.md)** when a slice completes — move it from Now to Recently shipped and point Now at the next slice.
