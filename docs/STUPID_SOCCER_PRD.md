# Stupid Soccer PRD
### Product Requirements Document | Science-Fair Level
### Generated: January 2025 | PMF Score: 9.0/10

---

## 1. Executive Summary

**Stupid Soccer** is a browser-based 3v3 pixel football game that flips the script on traditional sports games: instead of sweaty competition, it delivers hilarious AI-generated players created from user prompts. Players write creative prompts like "a defender who apologizes after every tackle," and our AI generates unique characters with absurd backstories, weird stats, and ridiculous celebrations. With built-in social sharing, async PvP leagues, and a content-creator-friendly design, Stupid Soccer targets the massive casual gaming market while carving out a unique niche as "the anti-FIFA." Monetization through subscriptions, season passes, and creator collaborations provides multiple sustainable revenue streams.

**Tagline:** *"FIFA made me angry, Stupid Soccer makes me laugh."*

---

## 2. Problem Statement

### Pain Points

| Pain Point | Evidence |
|------------|----------|
| **FIFA/sports games are stressful** | r/FIFA has 500K+ members complaining about "scripting" and rage-inducing gameplay. "FIFA made me break my controller" is a meme |
| **Gacha/collectible games lack personality** | Most games generate random stats, not characters. Players feel no attachment |
| **Pack openings are boring** | Millions watch pack opening videos but actual pack UX is underwhelming |
| **No creative outlet in sports games** | You pick from existing players, never CREATE |

### Current Solutions & Gaps

| Solution | Gap |
|----------|-----|
| FIFA Ultimate Team | Stressful, expensive ($1.6B/year from players), no creativity |
| Hades/Roguelikes | Great characters but no collection/trading |
| AI Art Tools | Creative but no game loop |
| Idle Games | Low engagement, forgettable |

### Why Now?

1. **AI Peak Hype**: "AI-generated" is a marketing superpower in 2024-2025
2. **Creator Economy Boom**: 50M+ content creators need fresh content
3. **Browser Gaming Renaissance**: WebGL/Phaser.js enables console-quality browser games
4. **Burnout from Competitive Games**: Rising demand for "cozy" and casual experiences

---

## 3. Target Users

### Primary Persona: "Casual Charlie"

| Attribute | Details |
|-----------|---------|
| **Age** | 22-35 |
| **Gaming Habits** | 30-60 min/day, mobile + browser, avoids ranked/competitive |
| **Motivations** | Relaxation, humor, collecting, light competition |
| **Frustrations** | Games that demand hours daily, toxic communities, pay-to-win |
| **Platforms** | iPhone, Chrome, Discord |
| **Spending** | $5-20/month on games they love |

### Secondary Persona: "Creator Casey"

| Attribute | Details |
|-----------|---------|
| **Age** | 18-30 |
| **Platform** | YouTube, TikTok, Twitch |
| **Content** | Pack openings, funny compilations, challenge videos |
| **Motivations** | Fresh content, engaged audience, monetizable moments |
| **Needs** | Shareable moments, unique content others can't replicate |

### User Journey Map

```
AWARENESS          ACQUISITION         ACTIVATION           RETENTION            REVENUE
    |                  |                   |                    |                   |
    v                  v                   v                    v                   v
See viral         Click link,         Create first        Daily challenges,   Hit scout limit,
player card   ->  play instantly  ->  AI Scout player  -> async PvP,       -> subscribe for
on Twitter        (no download)       (WOW moment)        pack openings        unlimited
```

---

## 4. Solution Overview

### Core Value Proposition

> **"The first football game where YOUR creativity makes the players."**

Write a prompt -> AI generates a unique player -> Collect, trade, compete, share.

### Key Differentiators

| Us | Them |
|----|------|
| YOU create players with prompts | Pick from pre-made players |
| Hilarious, memorable characters | Generic stat blocks |
| Async PvP (play anytime) | Real-time sweat fests |
| Built for sharing/content | Sharing is afterthought |
| Browser + PWA (instant play) | Heavy downloads |

---

## 5. Feature Requirements

### MVP Features (P0) - Must Have for Launch

| Feature | Description | Complexity | Status |
|---------|-------------|------------|--------|
| **AI Scout** | Write prompt -> generate unique player with stats, backstory, personality, celebration | High | Done |
| **Card Packs** | Open packs with random players (Bronze/Silver/Gold/Diamond tiers) | Medium | Done |
| **Squad Management** | Build 3-player squad, manage bench | Medium | Done |
| **Match Play (vs AI)** | 3v3 pixel football with Phaser.js | High | Done |
| **Player Marketplace** | Buy/sell/trade players with coins | Medium | Done |
| **User Authentication** | Sign up, login, profile | Low | Done |
| **Coin Economy** | Earn from matches, spend on packs/marketplace | Low | Partial |

### Phase 1 Features (P1) - Post-Launch Priority

| Feature | Description | Impact | Status |
|---------|-------------|--------|--------|
| **Share Your Pull** | Auto-generate shareable player card image for social | Virality | TODO |
| **Async PvP Leagues** | Squad auto-battles others, weekly rankings | Retention | TODO |
| **Player Lore/History** | Track ownership chain, total goals, games played | Defensibility | Partial |
| **Daily Challenges** | Complete tasks for bonus coins/packs | Retention | TODO |
| **Leaderboards** | Global and friends rankings | Competition | TODO |
| **Save Match Results** | Record wins/losses, coins earned | Progression | TODO |

### Phase 2 Features (P2) - Growth

| Feature | Description | Impact |
|---------|-------------|--------|
| **Community Gallery** | Browse/vote on best player creations | UGC moat |
| **Season Pass** | Exclusive styles, early access, bonus rewards | Revenue |
| **Creator Prompt Packs** | Collab packs with comedians/streamers | Revenue + Marketing |
| **PWA Mobile** | Install as app on phone (no app store) | Market expansion |
| **Clubs/Teams** | Join clubs, club vs club leagues | Social/retention |

### Nice-to-Haves (P3)

- Real-time PvP matches
- Tournaments with prizes
- Player breeding/fusion
- Stadium customization
- Sponsorship deals (in-game brands)

---

## 6. User Stories

### US-1: First AI Scout Experience
**As a** new player
**I want to** create my first AI-generated player
**So that** I experience the magic of the game

**Acceptance Criteria:**
- [ ] User can enter a custom prompt (max 200 chars)
- [ ] AI generates player within 10 seconds
- [ ] Player has: name, backstory, 3 personality traits, celebration, 5 stats, rarity
- [ ] Dramatic reveal animation plays
- [ ] Player is added to user's squad

---

### US-2: Open a Pack
**As a** collector
**I want to** open card packs
**So that** I can discover new players and feel excitement

**Acceptance Criteria:**
- [x] User can buy packs with coins (Bronze 50, Silver 150, Gold 400, Diamond 1000)
- [x] Pack opening has satisfying animation
- [x] Rarity odds displayed before purchase
- [x] Players revealed one by one with rarity glow effects
- [x] All players added to squad automatically

---

### US-3: Share My Pull
**As a** player who got an amazing pull
**I want to** share it on social media
**So that** my friends see how cool/funny my player is

**Acceptance Criteria:**
- [ ] "Share" button appears after pack opening or on player card
- [ ] Generates image with: player sprite, name, stats, rarity, backstory snippet
- [ ] One-click share to Twitter, Discord, or download image
- [ ] Image includes subtle "stupidsoccer.gg" branding

---

### US-4: Compete in Async League
**As a** competitive player
**I want to** test my squad against others
**So that** I can climb rankings without real-time stress

**Acceptance Criteria:**
- [ ] User enters weekly league with their 3-player squad
- [ ] System simulates 10 matches against other squads overnight
- [ ] Results shown next morning with highlights
- [ ] Weekly rankings with coin rewards for top players
- [ ] Can view opponent squads and match replays

---

### US-5: Trade a Player
**As a** collector
**I want to** trade players with other users
**So that** I can complete my collection or profit

**Acceptance Criteria:**
- [x] Can list player on marketplace with asking price
- [x] Can browse marketplace with filters (rarity, stats, price)
- [x] Can buy listed players with coins
- [x] Trade history recorded in player's lore
- [ ] Seller receives coins minus 5% fee

---

### US-6: Complete Daily Challenge
**As a** daily player
**I want to** complete challenges for rewards
**So that** I have goals and earn bonus coins

**Acceptance Criteria:**
- [ ] 3 daily challenges refresh at midnight UTC
- [ ] Examples: "Win 2 matches", "Open a pack", "Score with a rare player"
- [ ] Progress tracked in real-time
- [ ] Rewards: coins, sometimes free packs
- [ ] Streak bonus for consecutive days

---

### US-7: Subscribe to Manager Club
**As a** power user
**I want to** unlock unlimited AI Scout
**So that** I can create as many players as I want

**Acceptance Criteria:**
- [x] Clear upgrade prompt when free scout is used
- [ ] $5/month subscription via Stripe
- [x] Unlimited scouts while subscribed
- [ ] Badge on profile showing membership
- [ ] Can cancel anytime, access until period ends

---

## 7. Technical Considerations

### Current Stack

| Layer | Technology | Status |
|-------|------------|--------|
| **Frontend** | SvelteKit + Svelte 5 | Done |
| **Game Engine** | Phaser.js 3 | Done |
| **Styling** | TailwindCSS v4 | Done |
| **Database** | Supabase (Postgres) | Done |
| **AI** | Anthropic Claude | Done |
| **Payments** | Stripe | TODO |
| **Hosting** | Vercel | TODO |
| **Image Gen** | Canvas API / html2canvas | TODO |

### Key Integrations

| Integration | Purpose | Status |
|-------------|---------|--------|
| **Supabase Auth** | Google OAuth, email/password | Done |
| **Supabase Realtime** | Live marketplace updates | TODO |
| **Claude API** | AI player generation | Done |
| **Stripe** | Subscriptions, payments | TODO |
| **Twitter/Discord APIs** | Social sharing | TODO |

### Database Schema

**Tables:**
- `profiles` - User accounts, coins, subscription status
- `players` - AI-generated players with stats and lore
- `player_provenance` - Ownership history chain
- `trades` - Trade offers between users
- `squads` - User's active 3-player lineup
- `matches` - Game history and results
- `pack_types` - Available pack offerings
- `pack_purchases` - Purchase history
- `challenges` - Daily challenge definitions
- `user_daily_challenges` - User progress on challenges
- `leaderboards` - Rankings

### Scalability Notes

- **AI Scout**: Queue heavy requests, cache similar prompts
- **Async PvP**: Run simulations in background jobs (cron)
- **Images**: Generate shareable cards on-demand, cache 24h
- **Database**: Index on `owner_id`, `is_listed`, `rarity`

---

## 8. Success Metrics & KPIs

### North Star Metric

> **Weekly Active Creators (WAC)**: Users who generate or share at least 1 player per week

*Why*: Captures both engagement AND virality potential

### Leading Indicators

| Metric | Target (Month 3) | Target (Month 12) |
|--------|------------------|-------------------|
| **DAU** | 1,000 | 25,000 |
| **WAU** | 3,000 | 75,000 |
| **D7 Retention** | 25% | 35% |
| **D30 Retention** | 10% | 18% |
| **Viral Coefficient** | 0.3 | 0.7 |
| **ARPU** | $0.50 | $1.50 |
| **Conversion to Paid** | 2% | 5% |

### Monetization KPIs

| Revenue Stream | Month 3 Target | Month 12 Target |
|----------------|----------------|-----------------|
| Manager Club Subs | $500 MRR | $15,000 MRR |
| Season Pass | - | $5,000/season |
| Creator Packs | - | $2,000/month |

---

## 9. Go-to-Market Strategy

### Launch Approach: "Creator-Led Seeding"

**Phase 1: Soft Launch (Week 1-2)**
- Private beta with 50 Discord members
- Collect feedback, fix bugs
- Build content backlog

**Phase 2: Creator Seeding (Week 3-4)**
- Gift access to 10-20 micro-influencers (10K-100K followers)
- Focus on: gaming TikTok, YouTube shorts, Twitter gaming
- Encourage pack opening content

**Phase 3: Public Launch (Week 5)**
- Product Hunt launch
- Reddit posts (r/webgames, r/incremental_games, r/soccer)
- Twitter announcement with best player compilation

### Initial Channels

| Channel | Tactic | Expected CAC |
|---------|--------|--------------|
| **TikTok** | Viral pack opening clips | $0.50 |
| **Twitter/X** | Share Your Pull virality | $0 (organic) |
| **Discord** | Gaming server partnerships | $0.25 |
| **Product Hunt** | Launch day push | $0 |
| **Reddit** | Community engagement | $0 |

---

## 10. Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| **AI costs too high** | Medium | High | Cache similar prompts, rate limit free tier, optimize prompts |
| **Low retention** | Medium | High | Daily challenges, async PvP, streak rewards |
| **Content moderation** | Medium | Medium | Filter prompts, report system, review flagged players |
| **Copycat competitors** | Low | Medium | Build community moat, first-mover brand, creator relationships |
| **Stripe/payment issues** | Low | High | Clear ToS, fraud detection, support channel |

---

## 11. Open Questions

1. **Moderation**: How strictly do we filter AI prompts? Allow edgy humor or keep PG?
2. **Economy balance**: How many coins per match win? How to prevent inflation?
3. **Async PvP simulation**: Use actual game engine or simplified stat-based simulation?
4. **Creator collabs**: Revenue share model? Flat fee? Hybrid?
5. **Mobile priority**: PWA first or native app eventually?

---

## 12. Implementation Roadmap

### Sprint 1: Core Loop Completion
- [ ] Save match results to database
- [ ] Award coins for wins
- [ ] Track wins/losses on profile

### Sprint 2: Retention Features
- [ ] Daily challenges UI
- [ ] Challenge progress tracking
- [ ] Leaderboards page

### Sprint 3: Virality Features
- [ ] Share Your Pull image generation
- [ ] Social sharing buttons
- [ ] Player card templates

### Sprint 4: Competition
- [ ] Async PvP league system
- [ ] Weekly rankings
- [ ] League rewards

### Sprint 5: Monetization
- [ ] Stripe integration
- [ ] Manager Club subscription
- [ ] Season Pass system

---

## Appendix: PMF Scorecard

| Dimension | Score |
|-----------|-------|
| Problem Clarity | 9/10 |
| Market Size | 9/10 |
| Uniqueness | 9/10 |
| Feasibility | 9/10 |
| Monetization | 9/10 |
| Timing | 9/10 |
| Virality | 9/10 |
| Defensibility | 8/10 |
| Team Fit | 9/10 |
| Ralph Factor | 10/10 |
| **Average** | **9.0/10** |

---

*Generated by Ralph | IdeaRalph PRD Engine*
*Last Updated: January 2025*
