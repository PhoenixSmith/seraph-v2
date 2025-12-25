-- ============================================================================
-- AVATAR CONFIG MIGRATION
-- Adds avatar_config JSONB column to profiles for custom avatar customization
-- ============================================================================

-- Add avatar_config column to profiles (skip if already exists)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'avatar_config'
    ) THEN
        ALTER TABLE public.profiles
        ADD COLUMN avatar_config JSONB DEFAULT '{"face":"none","hat":"none","top":"none","bottom":"none","outfit":"none","misc":"none"}'::jsonb;
    END IF;
END $$;

-- ============================================================================
-- UPDATE RPC FUNCTIONS TO INCLUDE AVATAR_CONFIG
-- Must DROP first because return type is changing
-- ============================================================================

-- Drop existing functions to allow signature changes
DROP FUNCTION IF EXISTS get_group_leaderboard(UUID);
DROP FUNCTION IF EXISTS get_group_activity_feed(UUID, INTEGER);
DROP FUNCTION IF EXISTS get_current_user();
DROP FUNCTION IF EXISTS get_global_leaderboard(INTEGER);

-- Update get_group_leaderboard to return avatar_config
CREATE OR REPLACE FUNCTION get_group_leaderboard(p_group_id UUID)
RETURNS TABLE (
    user_id UUID,
    name TEXT,
    avatar_url TEXT,
    avatar_config JSONB,
    total_xp INTEGER,
    current_streak INTEGER,
    rank BIGINT,
    is_leader BOOLEAN,
    is_current_user BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        p.id AS user_id,
        p.name,
        p.avatar_url,
        COALESCE(p.avatar_config, '{"face":"none","hat":"none","top":"none","bottom":"none","outfit":"none","misc":"none"}'::jsonb) AS avatar_config,
        COALESCE(p.total_xp, 0) AS total_xp,
        COALESCE(p.current_streak, 0) AS current_streak,
        ROW_NUMBER() OVER (ORDER BY COALESCE(p.total_xp, 0) DESC) AS rank,
        (g.leader_id = p.id) AS is_leader,
        (p.id = auth.uid()) AS is_current_user
    FROM public.group_memberships gm
    JOIN public.profiles p ON p.id = gm.user_id
    JOIN public.groups g ON g.id = gm.group_id
    WHERE gm.group_id = p_group_id
    ORDER BY COALESCE(p.total_xp, 0) DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update get_group_activity_feed to return avatar_config
CREATE OR REPLACE FUNCTION get_group_activity_feed(p_group_id UUID, p_limit INTEGER DEFAULT 50)
RETURNS TABLE (
    id UUID,
    user_id UUID,
    user_name TEXT,
    user_avatar_url TEXT,
    user_avatar_config JSONB,
    activity_type TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        ga.id,
        ga.user_id,
        p.name AS user_name,
        p.avatar_url AS user_avatar_url,
        COALESCE(p.avatar_config, '{"face":"none","hat":"none","top":"none","bottom":"none","outfit":"none","misc":"none"}'::jsonb) AS user_avatar_config,
        ga.activity_type,
        ga.metadata,
        ga.created_at
    FROM public.group_activities ga
    JOIN public.profiles p ON p.id = ga.user_id
    WHERE ga.group_id = p_group_id
    ORDER BY ga.created_at DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update get_current_user to return avatar_config
CREATE OR REPLACE FUNCTION get_current_user()
RETURNS TABLE (
    id UUID,
    name TEXT,
    email TEXT,
    avatar_url TEXT,
    avatar_config JSONB,
    total_xp INTEGER,
    current_streak INTEGER,
    longest_streak INTEGER,
    last_read_date DATE,
    current_tier TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        p.id,
        p.name,
        p.email,
        p.avatar_url,
        COALESCE(p.avatar_config, '{"face":"none","hat":"none","top":"none","bottom":"none","outfit":"none","misc":"none"}'::jsonb) AS avatar_config,
        COALESCE(p.total_xp, 0) AS total_xp,
        COALESCE(p.current_streak, 0) AS current_streak,
        COALESCE(p.longest_streak, 0) AS longest_streak,
        p.last_read_date,
        COALESCE(p.current_tier, 'Bronze') AS current_tier
    FROM public.profiles p
    WHERE p.id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update avatar config
CREATE OR REPLACE FUNCTION update_avatar_config(p_config JSONB)
RETURNS JSONB AS $$
BEGIN
    UPDATE public.profiles
    SET avatar_config = p_config
    WHERE id = auth.uid();

    RETURN p_config;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update get_global_leaderboard to return avatar_config
CREATE OR REPLACE FUNCTION get_global_leaderboard(p_limit INTEGER DEFAULT 50)
RETURNS TABLE (
    user_id UUID,
    name TEXT,
    avatar_url TEXT,
    avatar_config JSONB,
    rolling_xp BIGINT,
    tier TEXT,
    tier_color TEXT,
    rank BIGINT,
    is_current_user BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    WITH user_rolling_xp AS (
        SELECT
            rx.user_id,
            SUM(rx.xp_earned) AS rolling_xp
        FROM public.rolling_xp rx
        WHERE rx.date >= CURRENT_DATE - INTERVAL '13 days'
        GROUP BY rx.user_id
    )
    SELECT
        p.id AS user_id,
        p.name,
        p.avatar_url,
        COALESCE(p.avatar_config, '{"face":"none","hat":"none","top":"none","bottom":"none","outfit":"none","misc":"none"}'::jsonb) AS avatar_config,
        COALESCE(urx.rolling_xp, 0) AS rolling_xp,
        COALESCE(
            (SELECT tt.tier FROM public.tier_thresholds tt
             WHERE tt.min_xp <= COALESCE(urx.rolling_xp, 0)
             ORDER BY tt.tier_order DESC LIMIT 1),
            'Bronze'
        ) AS tier,
        COALESCE(
            (SELECT tt.color FROM public.tier_thresholds tt
             WHERE tt.min_xp <= COALESCE(urx.rolling_xp, 0)
             ORDER BY tt.tier_order DESC LIMIT 1),
            '#CD7F32'
        ) AS tier_color,
        ROW_NUMBER() OVER (ORDER BY COALESCE(urx.rolling_xp, 0) DESC) AS rank,
        (p.id = auth.uid()) AS is_current_user
    FROM public.profiles p
    LEFT JOIN user_rolling_xp urx ON urx.user_id = p.id
    WHERE p.is_anonymous = false OR p.is_anonymous IS NULL
    ORDER BY COALESCE(urx.rolling_xp, 0) DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
