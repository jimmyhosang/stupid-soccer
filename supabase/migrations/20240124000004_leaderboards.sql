-- Stupid Soccer - Leaderboards
-- Views for weekly and monthly leaderboards

-- ============================================
-- WEEKLY LEADERBOARD VIEW
-- ============================================
CREATE OR REPLACE VIEW public.leaderboard_weekly AS
SELECT
  p.id as user_id,
  p.username,
  COUNT(CASE WHEN m.user_score > m.ai_score THEN 1 END) as wins,
  COUNT(CASE WHEN m.user_score < m.ai_score THEN 1 END) as losses,
  COUNT(CASE WHEN m.user_score = m.ai_score THEN 1 END) as draws,
  COUNT(*) as total_matches,
  COALESCE(SUM(m.user_score), 0) as total_goals,
  COALESCE(SUM(m.coins_earned), 0) as coins_earned,
  ROUND(
    CASE
      WHEN COUNT(*) > 0 THEN
        (COUNT(CASE WHEN m.user_score > m.ai_score THEN 1 END)::DECIMAL / COUNT(*)) * 100
      ELSE 0
    END,
    1
  ) as win_rate
FROM public.profiles p
LEFT JOIN public.matches m ON m.user_id = p.id
  AND m.played_at >= date_trunc('week', CURRENT_TIMESTAMP)
GROUP BY p.id, p.username
HAVING COUNT(m.id) > 0
ORDER BY wins DESC, total_goals DESC, coins_earned DESC
LIMIT 100;

-- ============================================
-- MONTHLY LEADERBOARD VIEW
-- ============================================
CREATE OR REPLACE VIEW public.leaderboard_monthly AS
SELECT
  p.id as user_id,
  p.username,
  COUNT(CASE WHEN m.user_score > m.ai_score THEN 1 END) as wins,
  COUNT(CASE WHEN m.user_score < m.ai_score THEN 1 END) as losses,
  COUNT(CASE WHEN m.user_score = m.ai_score THEN 1 END) as draws,
  COUNT(*) as total_matches,
  COALESCE(SUM(m.user_score), 0) as total_goals,
  COALESCE(SUM(m.coins_earned), 0) as coins_earned,
  ROUND(
    CASE
      WHEN COUNT(*) > 0 THEN
        (COUNT(CASE WHEN m.user_score > m.ai_score THEN 1 END)::DECIMAL / COUNT(*)) * 100
      ELSE 0
    END,
    1
  ) as win_rate
FROM public.profiles p
LEFT JOIN public.matches m ON m.user_id = p.id
  AND m.played_at >= date_trunc('month', CURRENT_TIMESTAMP)
GROUP BY p.id, p.username
HAVING COUNT(m.id) > 0
ORDER BY wins DESC, total_goals DESC, coins_earned DESC
LIMIT 100;

-- ============================================
-- ALL-TIME LEADERBOARD VIEW
-- ============================================
CREATE OR REPLACE VIEW public.leaderboard_alltime AS
SELECT
  p.id as user_id,
  p.username,
  COUNT(CASE WHEN m.user_score > m.ai_score THEN 1 END) as wins,
  COUNT(CASE WHEN m.user_score < m.ai_score THEN 1 END) as losses,
  COUNT(CASE WHEN m.user_score = m.ai_score THEN 1 END) as draws,
  COUNT(*) as total_matches,
  COALESCE(SUM(m.user_score), 0) as total_goals,
  COALESCE(SUM(m.coins_earned), 0) as coins_earned,
  ROUND(
    CASE
      WHEN COUNT(*) > 0 THEN
        (COUNT(CASE WHEN m.user_score > m.ai_score THEN 1 END)::DECIMAL / COUNT(*)) * 100
      ELSE 0
    END,
    1
  ) as win_rate
FROM public.profiles p
LEFT JOIN public.matches m ON m.user_id = p.id
GROUP BY p.id, p.username
HAVING COUNT(m.id) > 0
ORDER BY wins DESC, total_goals DESC, coins_earned DESC
LIMIT 100;

-- ============================================
-- FUNCTION: Get user's rank
-- ============================================
CREATE OR REPLACE FUNCTION public.get_user_rank(p_user_id UUID, p_period TEXT DEFAULT 'weekly')
RETURNS TABLE (rank BIGINT, wins BIGINT, total_matches BIGINT) AS $$
BEGIN
  IF p_period = 'weekly' THEN
    RETURN QUERY
    WITH ranked AS (
      SELECT
        user_id,
        leaderboard_weekly.wins,
        total_matches,
        ROW_NUMBER() OVER (ORDER BY leaderboard_weekly.wins DESC, total_goals DESC) as rank
      FROM public.leaderboard_weekly
    )
    SELECT r.rank, r.wins, r.total_matches
    FROM ranked r
    WHERE r.user_id = p_user_id;
  ELSIF p_period = 'monthly' THEN
    RETURN QUERY
    WITH ranked AS (
      SELECT
        user_id,
        leaderboard_monthly.wins,
        total_matches,
        ROW_NUMBER() OVER (ORDER BY leaderboard_monthly.wins DESC, total_goals DESC) as rank
      FROM public.leaderboard_monthly
    )
    SELECT r.rank, r.wins, r.total_matches
    FROM ranked r
    WHERE r.user_id = p_user_id;
  ELSE
    RETURN QUERY
    WITH ranked AS (
      SELECT
        user_id,
        leaderboard_alltime.wins,
        total_matches,
        ROW_NUMBER() OVER (ORDER BY leaderboard_alltime.wins DESC, total_goals DESC) as rank
      FROM public.leaderboard_alltime
    )
    SELECT r.rank, r.wins, r.total_matches
    FROM ranked r
    WHERE r.user_id = p_user_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
