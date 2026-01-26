# Stupid Soccer Architecture Plan
### Implementation Roadmap for P1 Features
### Generated: January 2025

---

## 1. Current Tech Stack (Already Built)

| Layer | Technology | Status |
|-------|------------|--------|
| **Frontend** | SvelteKit + Svelte 5 | ✅ Done |
| **Game Engine** | Phaser.js 3 | ✅ Done |
| **Styling** | TailwindCSS v4 | ✅ Done |
| **Database** | Supabase (Postgres) | ✅ Done |
| **Auth** | Supabase Auth | ✅ Done |
| **AI** | Claude API | ✅ Done |
| **Payments** | Stripe | 🔜 TODO |
| **Deployment** | Vercel | 🔜 TODO |
| **Image Gen** | html2canvas | 🔜 TODO |

---

## 2. System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         BROWSER                                  │
├─────────────────────────────────────────────────────────────────┤
│  SvelteKit App                    │  Phaser.js Game             │
│  ├── /packs (buy packs)           │  ├── MainScene (gameplay)   │
│  ├── /squad (manage team)         │  ├── Match simulation       │
│  ├── /marketplace (trading)       │  └── → Emit match results   │
│  ├── /scout (AI generation)       │                             │
│  ├── /play (game wrapper)  ←──────┼──────────────────┘          │
│  ├── /leaderboard (rankings)      │                             │
│  ├── /challenges (daily tasks)    │                             │
│  └── /profile (user stats)        │                             │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 │ API Calls
                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                    SVELTEKIT SERVER                             │
│  ├── +page.server.ts (load functions, form actions)             │
│  ├── /api/match/save (save match results)                       │
│  ├── /api/share/generate (generate share image)                 │
│  ├── /api/pvp/simulate (async PvP simulation)                   │
│  └── /api/webhooks/stripe (payment webhooks)                    │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 │ Database + Auth
                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                      SUPABASE                                    │
│  ├── Auth (users, sessions)                                     │
│  ├── Database (Postgres)                                        │
│  │   ├── profiles, players, matches, squads                     │
│  │   ├── challenges, user_daily_challenges                      │
│  │   ├── leaderboards, pvp_leagues, pvp_matches                 │
│  │   └── subscriptions                                          │
│  ├── Storage (share images cache)                               │
│  └── Edge Functions (cron jobs for PvP)                         │
└─────────────────────────────────────────────────────────────────┘
                 │
                 │ External Services
                 ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│   Claude     │  │   Stripe     │  │   Vercel     │
│   (AI Gen)   │  │  (Payments)  │  │  (Hosting)   │
└──────────────┘  └──────────────┘  └──────────────┘
```

---

## 3. Database Schema Updates

### Match Results (update existing)
```sql
-- Already exists, need to populate it
ALTER TABLE matches ADD COLUMN IF NOT EXISTS
  goals_scored INTEGER DEFAULT 0,
  goals_conceded INTEGER DEFAULT 0;
```

### Async PvP System
```sql
-- PvP Leagues (weekly seasons)
CREATE TABLE pvp_leagues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  season_number INTEGER NOT NULL,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN DEFAULT FALSE
);

-- PvP Entries (user joins a league)
CREATE TABLE pvp_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id UUID REFERENCES pvp_leagues(id),
  user_id UUID REFERENCES profiles(id),
  squad_snapshot JSONB NOT NULL, -- frozen squad at entry time
  wins INTEGER DEFAULT 0,
  losses INTEGER DEFAULT 0,
  points INTEGER DEFAULT 0,
  rank INTEGER,
  UNIQUE(league_id, user_id)
);

-- PvP Matches (simulated battles)
CREATE TABLE pvp_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id UUID REFERENCES pvp_leagues(id),
  player1_id UUID REFERENCES profiles(id),
  player2_id UUID REFERENCES profiles(id),
  player1_score INTEGER NOT NULL,
  player2_score INTEGER NOT NULL,
  simulated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Leaderboards
```sql
-- Leaderboard entries (cached rankings)
CREATE TABLE leaderboard_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
  leaderboard_type TEXT NOT NULL, -- 'wins', 'goals', 'coins', 'pvp'
  score INTEGER NOT NULL,
  rank INTEGER,
  period TEXT NOT NULL, -- 'all_time', 'weekly', 'daily'
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, leaderboard_type, period)
);
```

---

## 4. Implementation Phases

### Phase 1: Match Results & Progression (Sprint 1)
Save match outcomes and reward players

| Task | File(s) | Complexity |
|------|---------|------------|
| Emit match results from Phaser | `MainScene.ts` | Low |
| Create match save API | `/api/match/save/+server.ts` | Medium |
| Award coins for wins | API + profiles update | Low |
| Update profile stats | Profile page | Low |
| Show match history | `/profile` or `/matches` | Medium |

**Data Flow:**
```
Game Ends → Phaser emits event → SvelteKit receives →
API saves to matches table → Updates profile coins/stats
```

**Coin Rewards:**
- Win: +25 coins
- Draw: +10 coins
- Loss: +5 coins (participation)
- Bonus: +5 per goal scored

---

### Phase 2: Daily Challenges (Sprint 2)
Give players daily goals

| Task | File(s) | Complexity |
|------|---------|------------|
| Create challenges page UI | `/challenges/+page.svelte` | Medium |
| Server loader for user challenges | `/challenges/+page.server.ts` | Medium |
| Challenge progress tracking | Update on match/pack/trade | Medium |
| Auto-assign daily challenges | Cron or on-login | Medium |
| Reward completion | API endpoint | Low |

**Challenge Types:**
- Win X matches
- Open X packs
- Score X goals
- Trade a player
- Create a player with AI Scout

---

### Phase 3: Leaderboards (Sprint 2)
Show rankings and competition

| Task | File(s) | Complexity |
|------|---------|------------|
| Leaderboards page UI | `/leaderboard/+page.svelte` | Medium |
| Server loader with rankings | `/leaderboard/+page.server.ts` | Medium |
| Multiple leaderboard types | Tabs: Wins, Goals, Coins, PvP | Low |
| Weekly/All-time periods | Filter toggle | Low |
| Rank calculation (cron or realtime) | Supabase function | Medium |

---

### Phase 4: Share Your Pull (Sprint 3)
Viral sharing feature

| Task | File(s) | Complexity |
|------|---------|------------|
| Player card component | `ShareCard.svelte` | Medium |
| Image generation API | `/api/share/generate/+server.ts` | High |
| html2canvas integration | Client-side rendering | Medium |
| Share buttons (Twitter, Discord, Download) | UI component | Low |
| Branding overlay | "stupidsoccer.gg" watermark | Low |

**Tech Approach:**
```
1. Render PlayerCard in hidden div with specific dimensions
2. Use html2canvas to capture as PNG
3. Either: download directly OR upload to Supabase Storage
4. Generate share URL / open Twitter intent
```

---

### Phase 5: Async PvP Leagues (Sprint 4)
Compete while you sleep

| Task | File(s) | Complexity |
|------|---------|------------|
| PvP database migrations | `migrations/pvp.sql` | Medium |
| Join league UI | `/pvp/+page.svelte` | Medium |
| Squad snapshot on join | Server action | Low |
| Match simulation logic | `/api/pvp/simulate` | High |
| Cron job for daily sims | Supabase Edge Function | High |
| Results & rankings UI | `/pvp/results` | Medium |
| Weekly rewards distribution | Cron job | Medium |

**Simulation Logic:**
```typescript
// Simplified stat-based simulation
function simulateMatch(squad1: Player[], squad2: Player[]): [number, number] {
  const team1Power = squad1.reduce((sum, p) => sum + getOverall(p), 0);
  const team2Power = squad2.reduce((sum, p) => sum + getOverall(p), 0);

  // Add randomness (±20%)
  const team1Score = Math.floor((team1Power / 100) * (0.8 + Math.random() * 0.4));
  const team2Score = Math.floor((team2Power / 100) * (0.8 + Math.random() * 0.4));

  return [Math.min(team1Score, 5), Math.min(team2Score, 5)];
}
```

---

### Phase 6: Stripe Subscriptions (Sprint 5)
Monetization

| Task | File(s) | Complexity |
|------|---------|------------|
| Stripe account setup | External | Low |
| Checkout session API | `/api/stripe/checkout/+server.ts` | Medium |
| Webhook handler | `/api/webhooks/stripe/+server.ts` | High |
| Subscription status in DB | `profiles.subscription_tier` | Low |
| Manager Club UI | `/subscribe/+page.svelte` | Medium |
| Billing portal link | API endpoint | Low |

---

## 5. Key Technical Decisions

### Decision 1: Stat-Based PvP Simulation (not Phaser)
**Why:** Running actual Phaser games server-side is complex and slow. Stat-based simulation with randomness is:
- Fast (simulate 1000 matches in seconds)
- Deterministic enough to feel fair
- Easy to debug and balance

### Decision 2: Client-Side Image Generation
**Why:** Server-side image generation (Puppeteer, etc.) is expensive and slow. html2canvas on client:
- No server costs
- Instant generation
- User can preview before sharing

### Decision 3: Supabase Edge Functions for Cron
**Why:** Need scheduled jobs for PvP simulation and challenge resets. Supabase Edge Functions:
- Already in our stack
- Can access database directly
- Free tier is generous

### Decision 4: Weekly PvP Seasons
**Why:** Creates natural reset points, urgency, and fresh competition. Players who fall behind get a fresh start.

---

## 6. File Structure for New Features

```
src/routes/
├── challenges/
│   ├── +page.svelte          # Daily challenges UI
│   └── +page.server.ts       # Load user challenges
├── leaderboard/
│   ├── +page.svelte          # Rankings UI
│   └── +page.server.ts       # Load rankings
├── pvp/
│   ├── +page.svelte          # Join league, view status
│   ├── +page.server.ts       # Load league data
│   └── results/
│       └── +page.svelte      # Match results
├── api/
│   ├── match/
│   │   └── save/+server.ts   # Save match results
│   ├── share/
│   │   └── generate/+server.ts # Generate share image
│   ├── pvp/
│   │   └── simulate/+server.ts # Manual sim trigger
│   └── webhooks/
│       └── stripe/+server.ts # Payment webhooks

src/lib/
├── components/
│   ├── ShareCard.svelte      # Shareable player card
│   ├── ChallengeCard.svelte  # Challenge progress
│   └── LeaderboardRow.svelte # Ranking entry
├── server/
│   ├── pvp-simulation.ts     # Simulation logic
│   └── challenge-tracker.ts  # Progress tracking

supabase/
├── migrations/
│   └── 20240124000006_pvp_leagues.sql
└── functions/
    └── daily-pvp-sim/        # Edge function for cron
```

---

## 7. API Endpoints

### POST /api/match/save
Save match results after game ends.

**Request:**
```typescript
{
  difficulty: 'easy' | 'medium' | 'hard',
  userScore: number,
  aiScore: number,
  squadSnapshot: Player[]
}
```

**Response:**
```typescript
{
  success: boolean,
  coinsEarned: number,
  newBalance: number,
  matchId: string
}
```

### POST /api/share/generate
Generate shareable player card image.

**Request:**
```typescript
{
  playerId: string
}
```

**Response:**
```typescript
{
  imageUrl: string // base64 or Supabase Storage URL
}
```

### POST /api/pvp/join
Join current PvP league.

**Request:**
```typescript
{
  squadPlayerIds: string[] // 3 player IDs
}
```

**Response:**
```typescript
{
  success: boolean,
  leagueId: string,
  entryId: string
}
```

---

## 8. Priority Order

| Priority | Feature | Impact | Effort |
|----------|---------|--------|--------|
| 🔴 P0 | Save Match Results | Critical - connects gameplay to progression | Low |
| 🔴 P0 | Award Coins for Wins | Critical - reward loop | Low |
| 🟠 P1 | Leaderboards | Competition, engagement | Medium |
| 🟠 P1 | Daily Challenges | Retention hook | Medium |
| 🟡 P2 | Share Your Pull | Virality | Medium |
| 🟡 P2 | Async PvP | High engagement, complex | High |
| 🟢 P3 | Stripe Subscriptions | Revenue | Medium |

---

## 9. Environment Variables Needed

```env
# Already have
PUBLIC_SUPABASE_URL=
PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
ANTHROPIC_API_KEY=

# Need to add
STRIPE_SECRET_KEY=
PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_WEBHOOK_SECRET=
PUBLIC_APP_URL=https://stupidsoccer.gg
```

---

## 10. Deployment Checklist

- [ ] Set up Vercel project
- [ ] Configure environment variables
- [ ] Set up Supabase production project
- [ ] Run migrations on production
- [ ] Configure Stripe webhooks
- [ ] Set up custom domain
- [ ] Enable Supabase Edge Functions
- [ ] Configure cron jobs

---

*Architecture Plan | Stupid Soccer*
*Last Updated: January 2025*
