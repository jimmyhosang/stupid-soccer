-- PvP Rewards Notifications Table
-- Stores pending notifications for users about their league rewards

CREATE TABLE IF NOT EXISTS pvp_reward_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    league_id UUID NOT NULL REFERENCES pvp_leagues(id) ON DELETE CASCADE,
    season_number INTEGER NOT NULL,
    final_rank INTEGER NOT NULL,
    coins_awarded INTEGER NOT NULL,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_pvp_rewards_user ON pvp_reward_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_pvp_rewards_unread ON pvp_reward_notifications(user_id, is_read) WHERE is_read = false;

-- RLS
ALTER TABLE pvp_reward_notifications ENABLE ROW LEVEL SECURITY;

-- Users can only read their own notifications
CREATE POLICY "Users can read own notifications"
    ON pvp_reward_notifications FOR SELECT
    USING (auth.uid() = user_id);

-- Users can mark their own notifications as read
CREATE POLICY "Users can update own notifications"
    ON pvp_reward_notifications FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Function to create reward notification
CREATE OR REPLACE FUNCTION create_pvp_reward_notification(
    p_user_id UUID,
    p_league_id UUID,
    p_season_number INTEGER,
    p_final_rank INTEGER,
    p_coins_awarded INTEGER
)
RETURNS void AS $$
BEGIN
    INSERT INTO pvp_reward_notifications (user_id, league_id, season_number, final_rank, coins_awarded)
    VALUES (p_user_id, p_league_id, p_season_number, p_final_rank, p_coins_awarded);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get unread reward notifications for a user
CREATE OR REPLACE FUNCTION get_unread_pvp_rewards(p_user_id UUID)
RETURNS TABLE (
    notification_id UUID,
    season_number INTEGER,
    final_rank INTEGER,
    coins_awarded INTEGER,
    created_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        n.id as notification_id,
        n.season_number,
        n.final_rank,
        n.coins_awarded,
        n.created_at
    FROM pvp_reward_notifications n
    WHERE n.user_id = p_user_id AND n.is_read = false
    ORDER BY n.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark notification as read
CREATE OR REPLACE FUNCTION mark_pvp_reward_read(p_notification_id UUID, p_user_id UUID)
RETURNS void AS $$
BEGIN
    UPDATE pvp_reward_notifications
    SET is_read = true
    WHERE id = p_notification_id AND user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
