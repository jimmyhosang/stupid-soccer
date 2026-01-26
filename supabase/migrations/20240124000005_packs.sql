-- Packs Feature - Card packs that give random players
-- ============================================

-- PACK TYPES (predefined pack offerings)
CREATE TABLE public.pack_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  price INTEGER NOT NULL CHECK (price > 0),
  player_count INTEGER NOT NULL DEFAULT 1 CHECK (player_count BETWEEN 1 AND 5),
  rarity_weights JSONB NOT NULL DEFAULT '{"common": 70, "rare": 25, "legendary": 5}',
  is_active BOOLEAN DEFAULT TRUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- PACK PURCHASES (history of bought packs)
CREATE TABLE public.pack_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  pack_type_id UUID NOT NULL REFERENCES public.pack_types(id) ON DELETE CASCADE,
  price_paid INTEGER NOT NULL,
  opened_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Enable RLS
ALTER TABLE public.pack_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pack_purchases ENABLE ROW LEVEL SECURITY;

-- Pack types are viewable by everyone
CREATE POLICY "Pack types are viewable by everyone" ON public.pack_types
  FOR SELECT USING (true);

-- Users can view their own purchases
CREATE POLICY "Users can view own pack purchases" ON public.pack_purchases
  FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own purchases
CREATE POLICY "Users can insert own pack purchases" ON public.pack_purchases
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Index for user purchases
CREATE INDEX idx_pack_purchases_user ON public.pack_purchases(user_id);

-- ============================================
-- SEED DATA: Default pack types
-- ============================================
INSERT INTO public.pack_types (name, description, price, player_count, rarity_weights) VALUES
  ('Bronze Pack', 'A basic pack with 1 player. Good for beginners.', 50, 1, '{"common": 85, "rare": 14, "legendary": 1}'),
  ('Silver Pack', 'A better pack with 2 players. More chances for rare!', 150, 2, '{"common": 70, "rare": 25, "legendary": 5}'),
  ('Gold Pack', 'Premium pack with 3 players. Guaranteed rare or better!', 400, 3, '{"common": 40, "rare": 45, "legendary": 15}'),
  ('Diamond Pack', 'The ultimate pack! 5 players with high legendary chance.', 1000, 5, '{"common": 20, "rare": 50, "legendary": 30}');
