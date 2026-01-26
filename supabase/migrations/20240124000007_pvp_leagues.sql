-- PvP Leagues System

-- Leagues table (weekly seasons)
CREATE TABLE IF NOT EXISTS pvp_leagues (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    season_number INTEGER NOT NULL,
    starts_at TIMESTAMPTZ NOT NULL,
    ends_at TIMESTAMPTZ NOT NULL,
    is_active BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Unique constraint on season number
CREATE UNIQUE INDEX IF NOT EXISTS idx_pvp_leagues_season ON pvp_leagues(season_number);

-- Index for active league lookup
CREATE INDEX IF NOT EXISTS idx_pvp_leagues_active ON pvp_leagues(is_active) WHERE is_active = true;

-- League entries (user participation)
CREATE TABLE IF NOT EXISTS pvp_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    league_id UUID NOT NULL REFERENCES pvp_leagues(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    squad_snapshot JSONB NOT NULL, -- Snapshot of 3 players at join time
    wins INTEGER DEFAULT 0,
    losses INTEGER DEFAULT 0,
    draws INTEGER DEFAULT 0,
    points INTEGER DEFAULT 0, -- 3 for win, 1 for draw, 0 for loss
    rank INTEGER,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(league_id, user_id)
);

-- Indexes for entries
CREATE INDEX IF NOT EXISTS idx_pvp_entries_league ON pvp_entries(league_id);
CREATE INDEX IF NOT EXISTS idx_pvp_entries_user ON pvp_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_pvp_entries_rank ON pvp_entries(league_id, points DESC, wins DESC);

-- PvP matches (simulated battles)
CREATE TABLE IF NOT EXISTS pvp_matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    league_id UUID NOT NULL REFERENCES pvp_leagues(id) ON DELETE CASCADE,
    player1_entry_id UUID NOT NULL REFERENCES pvp_entries(id) ON DELETE CASCADE,
    player2_entry_id UUID NOT NULL REFERENCES pvp_entries(id) ON DELETE CASCADE,
    player1_score INTEGER NOT NULL,
    player2_score INTEGER NOT NULL,
    match_seed TEXT, -- For deterministic replay
    simulated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for matches
CREATE INDEX IF NOT EXISTS idx_pvp_matches_league ON pvp_matches(league_id);
CREATE INDEX IF NOT EXISTS idx_pvp_matches_player1 ON pvp_matches(player1_entry_id);
CREATE INDEX IF NOT EXISTS idx_pvp_matches_player2 ON pvp_matches(player2_entry_id);

-- Row Level Security
ALTER TABLE pvp_leagues ENABLE ROW LEVEL SECURITY;
ALTER TABLE pvp_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE pvp_matches ENABLE ROW LEVEL SECURITY;

-- Leagues: Everyone can read
CREATE POLICY "Leagues are publicly readable"
    ON pvp_leagues FOR SELECT
    USING (true);

-- Entries: Everyone can read, users can insert own
CREATE POLICY "Entries are publicly readable"
    ON pvp_entries FOR SELECT
    USING (true);

CREATE POLICY "Users can join leagues"
    ON pvp_entries FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Matches: Everyone can read
CREATE POLICY "Matches are publicly readable"
    ON pvp_matches FOR SELECT
    USING (true);

-- Function to get or create current week's league
CREATE OR REPLACE FUNCTION get_or_create_current_league()
RETURNS pvp_leagues AS $$
DECLARE
    current_league pvp_leagues;
    week_start TIMESTAMPTZ;
    week_end TIMESTAMPTZ;
    new_season INTEGER;
BEGIN
    -- Find Monday of current week (start) and Sunday (end)
    week_start := date_trunc('week', now());
    week_end := week_start + interval '6 days 23 hours 59 minutes 59 seconds';

    -- Check for active league in current week
    SELECT * INTO current_league
    FROM pvp_leagues
    WHERE starts_at <= now() AND ends_at >= now()
    LIMIT 1;

    IF current_league IS NOT NULL THEN
        RETURN current_league;
    END IF;

    -- Create new league
    SELECT COALESCE(MAX(season_number), 0) + 1 INTO new_season FROM pvp_leagues;

    INSERT INTO pvp_leagues (season_number, starts_at, ends_at, is_active)
    VALUES (new_season, week_start, week_end, true)
    RETURNING * INTO current_league;

    -- Deactivate old leagues
    UPDATE pvp_leagues SET is_active = false WHERE id != current_league.id;

    RETURN current_league;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update rankings after matches
CREATE OR REPLACE FUNCTION update_pvp_rankings(p_league_id UUID)
RETURNS void AS $$
BEGIN
    WITH ranked AS (
        SELECT
            id,
            ROW_NUMBER() OVER (ORDER BY points DESC, wins DESC, (wins - losses) DESC) as new_rank
        FROM pvp_entries
        WHERE league_id = p_league_id
    )
    UPDATE pvp_entries e
    SET rank = r.new_rank
    FROM ranked r
    WHERE e.id = r.id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's entry for current league
CREATE OR REPLACE FUNCTION get_user_pvp_entry(p_user_id UUID)
RETURNS TABLE (
    entry_id UUID,
    league_id UUID,
    season_number INTEGER,
    wins INTEGER,
    losses INTEGER,
    draws INTEGER,
    points INTEGER,
    rank INTEGER,
    squad_snapshot JSONB,
    league_ends_at TIMESTAMPTZ
) AS $$
DECLARE
    current_league pvp_leagues;
BEGIN
    current_league := get_or_create_current_league();

    RETURN QUERY
    SELECT
        e.id as entry_id,
        e.league_id,
        l.season_number,
        e.wins,
        e.losses,
        e.draws,
        e.points,
        e.rank,
        e.squad_snapshot,
        l.ends_at as league_ends_at
    FROM pvp_entries e
    JOIN pvp_leagues l ON l.id = e.league_id
    WHERE e.user_id = p_user_id AND e.league_id = current_league.id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
