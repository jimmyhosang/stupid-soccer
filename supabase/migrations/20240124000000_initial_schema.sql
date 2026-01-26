-- Stupid Soccer - Initial Database Schema
-- Run with: supabase db push

-- ============================================
-- PROFILES (extends Supabase Auth)
-- ============================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  coins INTEGER DEFAULT 100 NOT NULL CHECK (coins >= 0),
  subscription_tier TEXT DEFAULT 'free' NOT NULL CHECK (subscription_tier IN ('free', 'manager_club')),
  subscription_expires_at TIMESTAMPTZ,
  ai_scout_uses_this_month INTEGER DEFAULT 0 NOT NULL,
  ai_scout_reset_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  stripe_customer_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ============================================
-- PLAYERS (AI-generated with unique souls)
-- ============================================
CREATE TABLE public.players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  generation_prompt TEXT,
  backstory TEXT,
  personality TEXT[] DEFAULT '{}',
  celebration TEXT,
  sprite_config JSONB NOT NULL DEFAULT '{"hair": "default", "skin": "default", "face": "default", "accessories": []}',
  pace INTEGER NOT NULL CHECK (pace BETWEEN 1 AND 99),
  shooting INTEGER NOT NULL CHECK (shooting BETWEEN 1 AND 99),
  passing INTEGER NOT NULL CHECK (passing BETWEEN 1 AND 99),
  defense INTEGER NOT NULL CHECK (defense BETWEEN 1 AND 99),
  stamina INTEGER NOT NULL CHECK (stamina BETWEEN 1 AND 99),
  rarity TEXT DEFAULT 'common' NOT NULL CHECK (rarity IN ('common', 'rare', 'legendary')),
  is_listed BOOLEAN DEFAULT FALSE NOT NULL,
  list_price INTEGER CHECK (list_price IS NULL OR list_price > 0),
  is_starter BOOLEAN DEFAULT FALSE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ============================================
-- PLAYER PROVENANCE (trading history)
-- ============================================
CREATE TABLE public.player_provenance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  from_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  to_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  trade_type TEXT NOT NULL CHECK (trade_type IN ('created', 'traded')),
  coins_exchanged INTEGER DEFAULT 0 NOT NULL,
  traded_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ============================================
-- TRADES (turn-based offers)
-- ============================================
CREATE TABLE public.trades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  offered_player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  requested_player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  coins_offered INTEGER DEFAULT 0 NOT NULL CHECK (coins_offered >= 0),
  status TEXT DEFAULT 'pending' NOT NULL CHECK (status IN ('pending', 'accepted', 'rejected', 'cancelled', 'expired')),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '24 hours') NOT NULL,
  CONSTRAINT different_players CHECK (offered_player_id != requested_player_id),
  CONSTRAINT different_users CHECK (proposer_id != recipient_id)
);

-- ============================================
-- SQUADS (active 3-player lineup)
-- ============================================
CREATE TABLE public.squads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  position INTEGER NOT NULL CHECK (position BETWEEN 1 AND 3),
  UNIQUE (user_id, position),
  UNIQUE (user_id, player_id)
);

-- ============================================
-- MATCHES (game history)
-- ============================================
CREATE TABLE public.matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  difficulty TEXT NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')),
  user_score INTEGER DEFAULT 0 NOT NULL,
  ai_score INTEGER DEFAULT 0 NOT NULL,
  coins_earned INTEGER DEFAULT 0 NOT NULL,
  squad_snapshot JSONB,
  played_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX idx_players_owner ON public.players(owner_id);
CREATE INDEX idx_players_listed ON public.players(is_listed) WHERE is_listed = TRUE;
CREATE INDEX idx_players_rarity ON public.players(rarity);
CREATE INDEX idx_trades_proposer ON public.trades(proposer_id);
CREATE INDEX idx_trades_recipient ON public.trades(recipient_id);
CREATE INDEX idx_trades_status ON public.trades(status) WHERE status = 'pending';
CREATE INDEX idx_matches_user ON public.matches(user_id);
CREATE INDEX idx_provenance_player ON public.player_provenance(player_id);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_provenance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.squads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;

-- PROFILES: Users can read all, update own
CREATE POLICY "Profiles are viewable by everyone" ON public.profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- PLAYERS: Anyone can read, owners can update
CREATE POLICY "Players are viewable by everyone" ON public.players
  FOR SELECT USING (true);

CREATE POLICY "Users can insert their own players" ON public.players
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update own players" ON public.players
  FOR UPDATE USING (auth.uid() = owner_id);

-- PLAYER_PROVENANCE: Public read
CREATE POLICY "Provenance is viewable by everyone" ON public.player_provenance
  FOR SELECT USING (true);

CREATE POLICY "System can insert provenance" ON public.player_provenance
  FOR INSERT WITH CHECK (auth.uid() = to_user_id);

-- TRADES: Participants can view and manage
CREATE POLICY "Users can view their trades" ON public.trades
  FOR SELECT USING (auth.uid() = proposer_id OR auth.uid() = recipient_id);

CREATE POLICY "Users can create trades" ON public.trades
  FOR INSERT WITH CHECK (auth.uid() = proposer_id);

CREATE POLICY "Proposers can cancel, recipients can accept/reject" ON public.trades
  FOR UPDATE USING (
    (auth.uid() = proposer_id AND status = 'pending') OR
    (auth.uid() = recipient_id AND status = 'pending')
  );

-- SQUADS: Users manage own squads
CREATE POLICY "Users can view own squads" ON public.squads
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own squads" ON public.squads
  FOR ALL USING (auth.uid() = user_id);

-- MATCHES: Users view own matches
CREATE POLICY "Users can view own matches" ON public.matches
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own matches" ON public.matches
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', 'Player_' || LEFT(NEW.id::text, 8))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Reset AI Scout uses monthly
CREATE OR REPLACE FUNCTION public.check_ai_scout_reset()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.ai_scout_reset_at < NOW() - INTERVAL '1 month' THEN
    NEW.ai_scout_uses_this_month := 0;
    NEW.ai_scout_reset_at := NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ai_scout_monthly_reset
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.check_ai_scout_reset();
