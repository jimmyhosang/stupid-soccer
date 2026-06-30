# STATE — Stupid Soccer

Living "current state / Now slice" pointer for the repo. This file is updated as slices complete (move the Now slice to **Recently shipped**, then point **Now** at the next item from [`.ralph/@fix_plan.md`](.ralph/@fix_plan.md)).

See [`docs/CLAUDE-TAG-RUNBOOK.md`](docs/CLAUDE-TAG-RUNBOOK.md) for how the @mention-Claude loop, the spec template, and the gate work.

---

## Now

The "GAME FIRST" top-priority tier is now largely complete — see **Recently shipped** below (PRs #2–#5), and AI play, smooth player movement, difficulty-based AI, half/full-time screens, and the match timer were already built into the base game. The next tier in the priority order is **Squad Management**. The most concrete, foundational item is the squad view page with starter slots — everything else in that tier (player detail modal, drag-and-drop editor, starter assignment) builds on it.

```
Slice: Build the squad view page with 3 starter slots
Why: Players can generate players via AI Scout but have no place to see/manage their squad. This is the foundation for the whole Squad Management tier (detail modal, drag-and-drop lineup, starter assignment).
Acceptance criteria:
  - A /squad route renders the signed-in user's owned players from Supabase
  - Three clearly-labelled starter slots are shown for a 3v3 lineup
  - Empty slots and an empty squad render a sensible empty state
  - Uses Svelte 5 runes and existing PlayerCard component; matches the dark violet/emerald/slate theme
Files / area: src/routes/squad/, src/lib/components/ (reuse PlayerCard), src/lib/stores/
Out of scope: drag-and-drop reordering, player detail modal, trading — those are follow-up slices
Gate: npm run check, npm run lint, npm run build (npm test once tests exist)
```

---

## Recently shipped

Recently completed top-priority "GAME FIRST" game slices (draft PRs):

- **#2 — Goal celebrations**: celebration on scoring a goal.
- **#3 — Full-time match stats**: match result screen with stats at full time.
- **#4 — Tackling / stealing**: tackle-and-steal-the-ball mechanic.
- **#5 — Pixel-art player sprites**: proper pixel-art player sprites for visual identity.

---

## Backlog

Mirrors the priority order in [`.ralph/@fix_plan.md`](.ralph/@fix_plan.md): **GAME FIRST (mostly done) → Squad Management → Trading → Polish.**

### 1. 🎮 Phaser Game — mostly done
- [x] Player sprites — pixel art (PR #5)
- [x] Smooth player movement (accel/decel) — built into base game
- [x] AI opponent actually plays (chase / pass / shoot) — built into base game
- [x] Tackling / stealing mechanic (PR #4)
- [x] Goal celebrations (PR #2)
- [x] Halftime / full-time screens — built into base game
- [x] Match timer display — built into base game
- [x] Difficulty-based AI behaviour — built into base game
- [x] Match result screen with stats (PR #3)
- [ ] Improve ball physics (more realistic bouncing)
- [ ] Player switching indicator (highlight selected player)

### 2. Squad Management — next tier (Now points here)
- [ ] **Build squad view page with 3 starter slots** ← current Now slice
- [ ] Player detail modal (stats, backstory, provenance)
- [ ] Drag-and-drop lineup editor
- [ ] Starter player assignment

### 3. Trading Marketplace
- [ ] Marketplace browse page with filters
- [ ] "List player for trade" functionality
- [ ] Trade offer creation flow
- [ ] Trade acceptance / rejection UI
- [ ] Player provenance display

### 4. Polish
- [ ] Coins reward animation after wins
- [ ] Player celebration animations
- [ ] Kick / tackle sound effects, crowd cheering on goals
- [ ] Ball trail effect, improved pitch graphics
- [ ] Loading states, mobile responsiveness, perf, 404 / error pages

### Also outstanding (AI Scout)
- [ ] Sprite composer (layer modular PNG components)
- [ ] Social share functionality (Twitter/X card)

---

_Note: `STATE.md` is updated as slices complete._
