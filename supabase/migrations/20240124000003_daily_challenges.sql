-- Stupid Soccer - Daily Challenges System
-- Adds daily challenges that refresh every 24 hours

-- ============================================
-- CHALLENGES TABLE (predefined challenge types)
-- ============================================
CREATE TABLE public.challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('win_matches', 'score_goals', 'win_streak', 'play_difficulty', 'use_scout')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  target_count INTEGER NOT NULL DEFAULT 1,
  difficulty_required TEXT CHECK (difficulty_required IN ('easy', 'medium', 'hard') OR difficulty_required IS NULL),
  coin_reward INTEGER NOT NULL DEFAULT 50,
  is_active BOOLEAN DEFAULT TRUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ============================================
-- USER DAILY CHALLENGES (assigned challenges)
-- ============================================
CREATE TABLE public.user_daily_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  challenge_id UUID NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  progress INTEGER DEFAULT 0 NOT NULL,
  is_completed BOOLEAN DEFAULT FALSE NOT NULL,
  is_claimed BOOLEAN DEFAULT FALSE NOT NULL,
  assigned_at DATE DEFAULT CURRENT_DATE NOT NULL,
  completed_at TIMESTAMPTZ,
  UNIQUE (user_id, challenge_id, assigned_at)
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX idx_user_challenges_user ON public.user_daily_challenges(user_id);
CREATE INDEX idx_user_challenges_date ON public.user_daily_challenges(assigned_at);
CREATE INDEX idx_challenges_active ON public.challenges(is_active) WHERE is_active = TRUE;

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_daily_challenges ENABLE ROW LEVEL SECURITY;

-- Challenges are readable by everyone
CREATE POLICY "Challenges are viewable by everyone" ON public.challenges
  FOR SELECT USING (true);

-- Users can only see and manage their own daily challenges
CREATE POLICY "Users can view own challenges" ON public.user_daily_challenges
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own challenges" ON public.user_daily_challenges
  FOR UPDATE USING (auth.uid() = user_id);

-- ============================================
-- SEED CHALLENGES
-- ============================================
INSERT INTO public.challenges (type, title, description, target_count, difficulty_required, coin_reward) VALUES
  ('win_matches', 'First Victory', 'Win 1 match', 1, NULL, 25),
  ('win_matches', 'Triple Threat', 'Win 3 matches', 3, NULL, 75),
  ('win_matches', 'Dominator', 'Win 5 matches', 5, NULL, 150),
  ('score_goals', 'Net Finder', 'Score 5 goals', 5, NULL, 30),
  ('score_goals', 'Goal Machine', 'Score 15 goals', 15, NULL, 100),
  ('win_streak', 'On Fire', 'Win 2 matches in a row', 2, NULL, 50),
  ('play_difficulty', 'Brave Soul', 'Win a match on Hard', 1, 'hard', 100),
  ('play_difficulty', 'Medium Rare', 'Win 2 matches on Medium', 2, 'medium', 60),
  ('use_scout', 'Talent Spotter', 'Generate a player with AI Scout', 1, NULL, 50);

-- ============================================
-- FUNCTION: Assign daily challenges to user
-- ============================================
CREATE OR REPLACE FUNCTION public.assign_daily_challenges(p_user_id UUID)
RETURNS SETOF public.user_daily_challenges AS $$
DECLARE
  v_today DATE := CURRENT_DATE;
  v_existing_count INTEGER;
  v_challenge_ids UUID[];
BEGIN
  -- Check if user already has challenges for today
  SELECT COUNT(*) INTO v_existing_count
  FROM public.user_daily_challenges
  WHERE user_id = p_user_id AND assigned_at = v_today;

  -- If already assigned, return existing
  IF v_existing_count > 0 THEN
    RETURN QUERY SELECT * FROM public.user_daily_challenges
    WHERE user_id = p_user_id AND assigned_at = v_today;
    RETURN;
  END IF;

  -- Select 3 random active challenges
  SELECT ARRAY_AGG(id) INTO v_challenge_ids
  FROM (
    SELECT id FROM public.challenges
    WHERE is_active = TRUE
    ORDER BY RANDOM()
    LIMIT 3
  ) sub;

  -- Insert new challenges for today
  INSERT INTO public.user_daily_challenges (user_id, challenge_id, assigned_at)
  SELECT p_user_id, unnest(v_challenge_ids), v_today;

  -- Return the newly assigned challenges
  RETURN QUERY SELECT * FROM public.user_daily_challenges
  WHERE user_id = p_user_id AND assigned_at = v_today;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- FUNCTION: Update challenge progress
-- ============================================
CREATE OR REPLACE FUNCTION public.update_challenge_progress(
  p_user_id UUID,
  p_challenge_type TEXT,
  p_increment INTEGER DEFAULT 1,
  p_difficulty TEXT DEFAULT NULL
)
RETURNS void AS $$
DECLARE
  v_today DATE := CURRENT_DATE;
BEGIN
  -- Update progress for matching challenges
  UPDATE public.user_daily_challenges udc
  SET
    progress = LEAST(progress + p_increment, c.target_count),
    is_completed = CASE
      WHEN progress + p_increment >= c.target_count THEN TRUE
      ELSE is_completed
    END,
    completed_at = CASE
      WHEN progress + p_increment >= c.target_count AND completed_at IS NULL THEN NOW()
      ELSE completed_at
    END
  FROM public.challenges c
  WHERE udc.challenge_id = c.id
    AND udc.user_id = p_user_id
    AND udc.assigned_at = v_today
    AND udc.is_completed = FALSE
    AND c.type = p_challenge_type
    AND (c.difficulty_required IS NULL OR c.difficulty_required = p_difficulty);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- FUNCTION: Claim challenge reward
-- ============================================
CREATE OR REPLACE FUNCTION public.claim_challenge_reward(p_challenge_assignment_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_user_id UUID;
  v_reward INTEGER;
  v_is_completed BOOLEAN;
  v_is_claimed BOOLEAN;
BEGIN
  -- Get challenge details
  SELECT udc.user_id, c.coin_reward, udc.is_completed, udc.is_claimed
  INTO v_user_id, v_reward, v_is_completed, v_is_claimed
  FROM public.user_daily_challenges udc
  JOIN public.challenges c ON c.id = udc.challenge_id
  WHERE udc.id = p_challenge_assignment_id;

  -- Verify ownership and completion
  IF v_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  IF NOT v_is_completed THEN
    RAISE EXCEPTION 'Challenge not completed';
  END IF;

  IF v_is_claimed THEN
    RAISE EXCEPTION 'Reward already claimed';
  END IF;

  -- Mark as claimed
  UPDATE public.user_daily_challenges
  SET is_claimed = TRUE
  WHERE id = p_challenge_assignment_id;

  -- Add coins to user
  UPDATE public.profiles
  SET coins = coins + v_reward
  WHERE id = v_user_id;

  RETURN v_reward;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
