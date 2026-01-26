-- Stupid Soccer - Challenge Streak System
-- Adds streak tracking for daily challenges with bonus rewards

-- ============================================
-- ADD STREAK COLUMNS TO PROFILES
-- ============================================
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS challenge_streak INTEGER DEFAULT 0 NOT NULL,
ADD COLUMN IF NOT EXISTS last_challenge_completion_date DATE;

-- ============================================
-- FUNCTION: Check and update challenge streak
-- Called after claiming a reward to check if all 3 challenges are complete
-- ============================================
CREATE OR REPLACE FUNCTION public.check_challenge_streak(p_user_id UUID)
RETURNS TABLE(streak INTEGER, bonus_coins INTEGER, streak_updated BOOLEAN) AS $$
DECLARE
  v_today DATE := CURRENT_DATE;
  v_yesterday DATE := CURRENT_DATE - INTERVAL '1 day';
  v_total_today INTEGER;
  v_claimed_today INTEGER;
  v_current_streak INTEGER;
  v_last_completion DATE;
  v_bonus INTEGER := 0;
  v_streak_updated BOOLEAN := FALSE;
BEGIN
  -- Get user's current streak info
  SELECT challenge_streak, last_challenge_completion_date
  INTO v_current_streak, v_last_completion
  FROM public.profiles
  WHERE id = p_user_id;

  -- Count total and claimed challenges for today
  SELECT COUNT(*), COUNT(*) FILTER (WHERE is_claimed = TRUE)
  INTO v_total_today, v_claimed_today
  FROM public.user_daily_challenges
  WHERE user_id = p_user_id AND assigned_at = v_today;

  -- Check if all 3 challenges are claimed today
  IF v_total_today = 3 AND v_claimed_today = 3 THEN
    -- Only process if not already updated today
    IF v_last_completion IS NULL OR v_last_completion < v_today THEN
      v_streak_updated := TRUE;

      -- Check if streak continues from yesterday
      IF v_last_completion = v_yesterday THEN
        -- Increment streak
        v_current_streak := v_current_streak + 1;
      ELSIF v_last_completion < v_yesterday OR v_last_completion IS NULL THEN
        -- Streak broken, start fresh at 1
        v_current_streak := 1;
      END IF;

      -- Calculate bonus: +10 per streak day, capped at +50
      v_bonus := LEAST(v_current_streak * 10, 50);

      -- Update profile with new streak and bonus coins
      UPDATE public.profiles
      SET
        challenge_streak = v_current_streak,
        last_challenge_completion_date = v_today,
        coins = coins + v_bonus
      WHERE id = p_user_id;
    END IF;
  END IF;

  -- Return current streak info
  SELECT challenge_streak INTO v_current_streak FROM public.profiles WHERE id = p_user_id;

  RETURN QUERY SELECT v_current_streak, v_bonus, v_streak_updated;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- FUNCTION: Get user's streak info
-- ============================================
CREATE OR REPLACE FUNCTION public.get_user_streak(p_user_id UUID)
RETURNS TABLE(
  streak INTEGER,
  last_completion_date DATE,
  streak_active BOOLEAN,
  potential_bonus INTEGER
) AS $$
DECLARE
  v_today DATE := CURRENT_DATE;
  v_yesterday DATE := CURRENT_DATE - INTERVAL '1 day';
  v_current_streak INTEGER;
  v_last_completion DATE;
  v_is_active BOOLEAN;
BEGIN
  SELECT challenge_streak, last_challenge_completion_date
  INTO v_current_streak, v_last_completion
  FROM public.profiles
  WHERE id = p_user_id;

  -- Streak is active if completed yesterday or today
  v_is_active := v_last_completion >= v_yesterday;

  -- Calculate potential bonus for completing today
  -- If streak is active and not completed today, bonus would be for current_streak + 1
  -- If completed today, bonus is for current streak
  RETURN QUERY SELECT
    v_current_streak,
    v_last_completion,
    v_is_active,
    LEAST((CASE
      WHEN v_last_completion = v_today THEN v_current_streak
      WHEN v_is_active THEN v_current_streak + 1
      ELSE 1
    END) * 10, 50);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
