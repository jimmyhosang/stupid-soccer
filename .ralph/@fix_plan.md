# Stupid Soccer - Fix Plan & Task List

## Phase 1: Foundation ✅ DONE

### Project Setup ✅
- [x] Initialize SvelteKit project with TypeScript
- [x] Configure Tailwind CSS with design tokens from DESIGN.md
- [x] Set up project structure (src/lib/components, src/lib/game, src/lib/stores, etc.)
- [x] Add Google Fonts (Press Start 2P + Inter)
- [x] Create base layout with dark theme

### Supabase Setup ✅
- [x] Create database schema (profiles, players, trades, squads, matches, provenance)
- [x] Set up Row Level Security (RLS) policies for all tables
- [x] Generate TypeScript types from schema

### Authentication ✅
- [x] Create auth UI components (login/signup pages)
- [x] Create auth callback handler

### Landing Page ✅
- [x] Build hero section
- [x] Create basic landing page structure

## Phase 2: Core Features - GAME PRIORITY 🎮

### Phaser Game (TOP PRIORITY)
- [x] Set up Phaser canvas embedded in SvelteKit
- [x] Create 3v3 pitch layout
- [ ] **Implement proper player sprites (pixel art characters)**
- [ ] **Add smooth player movement with acceleration/deceleration**
- [ ] **Improve ball physics (more realistic bouncing)**
- [ ] **Make AI opponent actually play (chase ball, pass, shoot)**
- [ ] **Add player switching indicator (highlight selected player)**
- [ ] **Implement tackling/stealing ball mechanic**
- [ ] **Add goal celebrations**
- [ ] **Create halftime/fulltime screens**
- [ ] Add match timer display on screen
- [ ] Implement difficulty-based AI behavior
- [ ] Create match result screen with stats

### AI Scout ✅
- [x] Create Claude API integration (SvelteKit API route)
- [x] Design player generation prompt (structured JSON output)
- [x] Create PlayerCard component with all states
- [ ] Build sprite composer (layer modular PNG components)
- [ ] Add social share functionality (Twitter/X card)

### Squad Management
- [ ] Build squad view page with 3 starter slots
- [ ] Create player detail modal (stats, backstory, provenance)
- [ ] Implement drag-and-drop lineup editor
- [ ] Add starter player assignment

### Trading Marketplace
- [ ] Build marketplace browse page with filters
- [ ] Create "list player for trade" functionality
- [ ] Implement trade offer creation flow
- [ ] Build trade acceptance/rejection UI
- [ ] Add player provenance display

## Phase 3: Polish

### Game Polish (FOCUS HERE)
- [ ] Add coins reward animation after wins
- [ ] Implement player celebration animations
- [ ] Add kick/tackle sound effects
- [ ] Add crowd cheering on goals
- [ ] Create pixel art player sprites (different hair, skin, accessories)
- [ ] Add ball trail effect
- [ ] Improve pitch graphics (grass texture, lines)

### UI Polish
- [ ] Add loading states everywhere
- [ ] Test mobile responsiveness
- [ ] Optimize performance
- [ ] Create 404 and error pages

## Priority Order (GAME FIRST!)

1. **🎮 Phaser Game Improvements** - Make gameplay fun!
2. **Player Sprites** - Visual identity
3. **Squad Management** - Use your players
4. **Trading** - Social features
5. **Polish** - Launch ready

## Completed
- [x] Project initialization (Ralph setup)
- [x] PRD documentation
- [x] Architecture documentation
- [x] Design specification
- [x] SvelteKit + Tailwind setup
- [x] Database types
- [x] Auth pages
- [x] AI Scout API
- [x] Basic Phaser game
- [x] Play page with difficulty selection

## REMOVED (Free Product)
- ~~Stripe Integration~~ - No longer needed
- ~~Manager Club subscription~~ - Everything is free

## Notes
- Focus on making the GAME fun first
- The game should feel like Sensible Soccer - fast, responsive, fun
- AI players need to actually play football, not just stand there
- See .ralph/specs/PRD.md for full requirements
