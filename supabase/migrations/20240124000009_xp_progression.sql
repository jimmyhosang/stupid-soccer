-- Stupid Soccer - XP Progression System
-- Based on PRD v3.0: XP Progression with Bloodline Breeding

-- ============================================
-- ADD XP & LEVEL COLUMNS TO PLAYERS
-- ============================================
ALTER TABLE public.players
  ADD COLUMN level INTEGER DEFAULT 1 NOT NULL CHECK (level BETWEEN 1 AND 99),
  ADD COLUMN xp INTEGER DEFAULT 0 NOT NULL CHECK (xp >= 0),
  ADD COLUMN total_matches INTEGER DEFAULT 0 NOT NULL CHECK (total_matches >= 0),
  ADD COLUMN total_goals INTEGER DEFAULT 0 NOT NULL CHECK (total_goals >= 0),
  ADD COLUMN total_assists INTEGER DEFAULT 0 NOT NULL CHECK (total_assists >= 0),
  ADD COLUMN total_wins INTEGER DEFAULT 0 NOT NULL CHECK (total_wins >= 0);

-- DNA System: Growth potential
ALTER TABLE public.players
  ADD COLUMN growth_ceiling INTEGER DEFAULT 99 NOT NULL CHECK (growth_ceiling BETWEEN 50 AND 99),
  ADD COLUMN growth_rate DECIMAL(3,2) DEFAULT 1.0 NOT NULL CHECK (growth_rate BETWEEN 0.5 AND 1.5);

-- Bloodline tracking
ALTER TABLE public.players
  ADD COLUMN parent1_id UUID REFERENCES public.players(id) ON DELETE SET NULL,
  ADD COLUMN parent2_id UUID REFERENCES public.players(id) ON DELETE SET NULL,
  ADD COLUMN generation INTEGER DEFAULT 1 NOT NULL CHECK (generation >= 1),
  ADD COLUMN breeding_cooldown TIMESTAMPTZ;

-- Legacy system
ALTER TABLE public.players
  ADD COLUMN is_retired BOOLEAN DEFAULT FALSE NOT NULL,
  ADD COLUMN retired_at TIMESTAMPTZ;

-- Indexes for XP queries
CREATE INDEX idx_players_level ON public.players(level);
CREATE INDEX idx_players_xp ON public.players(xp);
CREATE INDEX idx_players_generation ON public.players(generation);
CREATE INDEX idx_players_retired ON public.players(is_retired) WHERE is_retired = TRUE;

-- ============================================
-- MATCH PERFORMANCES (per-player stats per match)
-- ============================================
CREATE TABLE public.match_performances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  goals INTEGER DEFAULT 0 NOT NULL CHECK (goals >= 0),
  assists INTEGER DEFAULT 0 NOT NULL CHECK (assists >= 0),
  xp_earned INTEGER DEFAULT 0 NOT NULL CHECK (xp_earned >= 0),
  level_before INTEGER NOT NULL,
  level_after INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(match_id, player_id)
);

CREATE INDEX idx_match_performances_player ON public.match_performances(player_id);
CREATE INDEX idx_match_performances_match ON public.match_performances(match_id);
CREATE INDEX idx_match_performances_user ON public.match_performances(user_id);

-- RLS for match_performances
ALTER TABLE public.match_performances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Match performances are viewable by everyone" ON public.match_performances
  FOR SELECT USING (true);

CREATE POLICY "Users can insert own match performances" ON public.match_performances
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================
-- LEVEL-UP HISTORY
-- ============================================
CREATE TABLE public.level_ups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  old_level INTEGER NOT NULL,
  new_level INTEGER NOT NULL,
  pace_increase INTEGER DEFAULT 0 NOT NULL,
  shooting_increase INTEGER DEFAULT 0 NOT NULL,
  passing_increase INTEGER DEFAULT 0 NOT NULL,
  defense_increase INTEGER DEFAULT 0 NOT NULL,
  stamina_increase INTEGER DEFAULT 0 NOT NULL,
  triggered_by_match UUID REFERENCES public.matches(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_level_ups_player ON public.level_ups(player_id);
CREATE INDEX idx_level_ups_user ON public.level_ups(user_id);

-- RLS for level_ups
ALTER TABLE public.level_ups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Level ups are viewable by everyone" ON public.level_ups
  FOR SELECT USING (true);

CREATE POLICY "Users can insert own level ups" ON public.level_ups
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================
-- BLOODLINE REGISTRY
-- ============================================
CREATE TABLE public.bloodline_registry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent1_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  parent2_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  offspring_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  inherited_traits JSONB DEFAULT '{}' NOT NULL,
  mutation_occurred BOOLEAN DEFAULT FALSE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(offspring_id)
);

CREATE INDEX idx_bloodline_parent1 ON public.bloodline_registry(parent1_id);
CREATE INDEX idx_bloodline_parent2 ON public.bloodline_registry(parent2_id);

-- RLS for bloodline_registry
ALTER TABLE public.bloodline_registry ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Bloodline registry is viewable by everyone" ON public.bloodline_registry
  FOR SELECT USING (true);

-- ============================================
-- LEGACY MONUMENTS (retired player statues)
-- ============================================
CREATE TABLE public.legacy_monuments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE UNIQUE,
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  monument_type TEXT NOT NULL CHECK (monument_type IN ('statue', 'mural', 'banner')),
  bonus_type TEXT NOT NULL CHECK (bonus_type IN ('xp_boost', 'coin_boost', 'luck_boost')),
  bonus_value DECIMAL(3,2) DEFAULT 0.05 NOT NULL CHECK (bonus_value BETWEEN 0.01 AND 0.25),
  career_stats JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_monuments_owner ON public.legacy_monuments(owner_id);

-- RLS for legacy_monuments
ALTER TABLE public.legacy_monuments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Monuments are viewable by everyone" ON public.legacy_monuments
  FOR SELECT USING (true);

CREATE POLICY "Users can insert own monuments" ON public.legacy_monuments
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

-- ============================================
-- XP THRESHOLD FUNCTION
-- ============================================
-- Returns XP required to reach a given level
CREATE OR REPLACE FUNCTION public.xp_for_level(target_level INTEGER)
RETURNS INTEGER AS $$
BEGIN
  -- XP curve from PRD v3: exponential growth
  -- Level 1: 0, Level 5: 1000, Level 10: 5000, Level 20: 25000, Level 50: 175000, Level 99: 500000
  IF target_level <= 1 THEN
    RETURN 0;
  ELSIF target_level <= 10 THEN
    RETURN FLOOR(50 * POWER(target_level, 2));
  ELSIF target_level <= 50 THEN
    RETURN FLOOR(500 + 100 * POWER(target_level - 10, 2));
  ELSE
    RETURN FLOOR(175000 + 6500 * (target_level - 50));
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================
-- TRADE VALUE FUNCTION
-- ============================================
-- Calculate trade value based on level, rarity, stats, and history
CREATE OR REPLACE FUNCTION public.calculate_trade_value(
  p_level INTEGER,
  p_rarity TEXT,
  p_pace INTEGER,
  p_shooting INTEGER,
  p_passing INTEGER,
  p_defense INTEGER,
  p_stamina INTEGER,
  p_total_matches INTEGER,
  p_generation INTEGER
)
RETURNS INTEGER AS $$
DECLARE
  base_value INTEGER := 100;
  level_multiplier DECIMAL;
  rarity_multiplier DECIMAL;
  skill_bonus DECIMAL;
  history_bonus DECIMAL;
  legacy_bonus DECIMAL;
BEGIN
  -- Level multiplier: 10% per level
  level_multiplier := 1 + (p_level * 0.1);

  -- Rarity multiplier
  rarity_multiplier := CASE p_rarity
    WHEN 'common' THEN 1
    WHEN 'rare' THEN 2
    WHEN 'legendary' THEN 8
    ELSE 1
  END;

  -- Skill bonus: average stat / 100
  skill_bonus := (p_pace + p_shooting + p_passing + p_defense + p_stamina) / 500.0;

  -- History bonus: 0.1% per match played (capped at 50%)
  history_bonus := 1 + LEAST(p_total_matches * 0.001, 0.5);

  -- Legacy bonus: 5% per generation above 1
  legacy_bonus := 1 + GREATEST(p_generation - 1, 0) * 0.05;

  RETURN FLOOR(base_value * level_multiplier * rarity_multiplier * skill_bonus * history_bonus * legacy_bonus);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================
-- UPDATE MATCHES TABLE
-- ============================================
-- Add XP tracking to matches
ALTER TABLE public.matches
  ADD COLUMN total_xp_earned INTEGER DEFAULT 0 NOT NULL CHECK (total_xp_earned >= 0);

-- ============================================
-- INITIALIZE EXISTING PLAYERS
-- ============================================
-- Set random growth ceilings for existing players based on rarity
UPDATE public.players SET
  growth_ceiling = CASE rarity
    WHEN 'legendary' THEN 95 + FLOOR(RANDOM() * 5)::INTEGER  -- 95-99
    WHEN 'rare' THEN 85 + FLOOR(RANDOM() * 10)::INTEGER      -- 85-94
    ELSE 70 + FLOOR(RANDOM() * 15)::INTEGER                   -- 70-84
  END,
  growth_rate = 0.8 + (RANDOM() * 0.4)  -- 0.8-1.2
WHERE growth_ceiling = 99;  -- Only update those with default
