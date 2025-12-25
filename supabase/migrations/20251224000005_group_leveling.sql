-- ============================================================================
-- GROUP LEVELING SYSTEM MIGRATION
-- Adds: Group levels (Base/Mid/Advanced) with weekly XP thresholds
-- Adds: Profile stats aggregation function
-- ============================================================================

-- ============================================================================
-- GROUP LEVEL THRESHOLDS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.group_level_thresholds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    level TEXT UNIQUE NOT NULL,
    min_weekly_xp INTEGER NOT NULL,
    level_order INTEGER NOT NULL,
    color TEXT NOT NULL,
    icon TEXT DEFAULT NULL
);

-- Seed group level thresholds
INSERT INTO public.group_level_thresholds (level, min_weekly_xp, level_order, color) VALUES
    ('Base', 0, 1, '#94a3b8'),
    ('Mid', 200, 2, '#3b82f6'),
    ('Advanced', 500, 3, '#8b5cf6')
ON CONFLICT (level) DO NOTHING;

-- Create index for ordering
CREATE INDEX IF NOT EXISTS idx_group_level_thresholds_order ON public.group_level_thresholds(level_order);

-- Enable RLS
ALTER TABLE public.group_level_thresholds ENABLE ROW LEVEL SECURITY;

-- Everyone can view thresholds
DROP POLICY IF EXISTS "Group level thresholds viewable by everyone" ON public.group_level_thresholds;
CREATE POLICY "Group level thresholds viewable by everyone" ON public.group_level_thresholds
    FOR SELECT USING (true);

-- ============================================================================
-- ADD LEVEL TRACKING TO GROUPS TABLE
-- ============================================================================

ALTER TABLE public.groups
ADD COLUMN IF NOT EXISTS current_level TEXT DEFAULT 'Base',
ADD COLUMN IF NOT EXISTS weekly_xp INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS level_updated_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS week_start_date DATE DEFAULT date_trunc('week', CURRENT_DATE)::DATE;

-- Indexes for level queries
CREATE INDEX IF NOT EXISTS idx_groups_current_level ON public.groups(current_level);
CREATE INDEX IF NOT EXISTS idx_groups_weekly_xp ON public.groups(weekly_xp DESC);

-- ============================================================================
-- GET GROUP LEVEL INFO FUNCTION
-- Returns current level, weekly XP, and progress to next level
-- ============================================================================

CREATE OR REPLACE FUNCTION get_group_level_info(p_group_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_user_id UUID;
    v_group RECORD;
    v_level RECORD;
    v_next_level RECORD;
    v_weekly_xp BIGINT;
    v_week_start DATE;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN NULL;
    END IF;

    -- Verify membership
    IF NOT EXISTS (
        SELECT 1 FROM public.group_memberships
        WHERE group_id = p_group_id AND user_id = v_user_id
    ) THEN
        RETURN NULL;
    END IF;

    SELECT * INTO v_group FROM public.groups WHERE id = p_group_id;
    IF v_group IS NULL THEN
        RETURN NULL;
    END IF;

    -- Calculate current week's XP from all members
    v_week_start := date_trunc('week', CURRENT_DATE)::DATE;

    SELECT COALESCE(SUM(rx.xp_earned), 0) INTO v_weekly_xp
    FROM public.rolling_xp rx
    INNER JOIN public.group_memberships gm ON gm.user_id = rx.user_id
    WHERE gm.group_id = p_group_id
    AND rx.date >= v_week_start;

    -- Get current level based on weekly XP
    SELECT * INTO v_level
    FROM public.group_level_thresholds
    WHERE min_weekly_xp <= v_weekly_xp
    ORDER BY level_order DESC
    LIMIT 1;

    -- Default to Base if no level found
    IF v_level IS NULL THEN
        SELECT * INTO v_level
        FROM public.group_level_thresholds
        WHERE level = 'Base';
    END IF;

    -- Get next level info
    SELECT * INTO v_next_level
    FROM public.group_level_thresholds
    WHERE level_order = v_level.level_order + 1;

    RETURN jsonb_build_object(
        'group_id', p_group_id,
        'current_level', v_level.level,
        'level_color', v_level.color,
        'weekly_xp', v_weekly_xp,
        'xp_to_next_level', CASE
            WHEN v_next_level IS NOT NULL
            THEN v_next_level.min_weekly_xp - v_weekly_xp
            ELSE NULL
        END,
        'next_level', v_next_level.level,
        'next_level_threshold', v_next_level.min_weekly_xp,
        'week_start', v_week_start
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- RECALCULATE ALL GROUP LEVELS
-- For scheduled job or manual trigger at week boundary
-- ============================================================================

CREATE OR REPLACE FUNCTION recalculate_group_levels()
RETURNS INTEGER AS $$
DECLARE
    v_group RECORD;
    v_weekly_xp BIGINT;
    v_new_level TEXT;
    v_level_color TEXT;
    v_week_start DATE;
    v_count INTEGER := 0;
BEGIN
    v_week_start := date_trunc('week', CURRENT_DATE)::DATE;

    FOR v_group IN SELECT id FROM public.groups
    LOOP
        -- Calculate weekly XP from all members
        SELECT COALESCE(SUM(rx.xp_earned), 0) INTO v_weekly_xp
        FROM public.rolling_xp rx
        INNER JOIN public.group_memberships gm ON gm.user_id = rx.user_id
        WHERE gm.group_id = v_group.id
        AND rx.date >= v_week_start;

        -- Find appropriate level
        SELECT level, color INTO v_new_level, v_level_color
        FROM public.group_level_thresholds
        WHERE min_weekly_xp <= v_weekly_xp
        ORDER BY level_order DESC
        LIMIT 1;

        -- Update group
        UPDATE public.groups SET
            current_level = COALESCE(v_new_level, 'Base'),
            weekly_xp = v_weekly_xp,
            level_updated_at = NOW(),
            week_start_date = v_week_start
        WHERE id = v_group.id;

        v_count := v_count + 1;
    END LOOP;

    RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- GET PROFILE STATS
-- Aggregated stats for the profile page
-- ============================================================================

CREATE OR REPLACE FUNCTION get_profile_stats()
RETURNS JSONB AS $$
DECLARE
    v_user_id UUID;
    v_profile RECORD;
    v_tier RECORD;
    v_next_tier RECORD;
    v_rolling_xp INTEGER;
    v_books_started INTEGER;
    v_chapters_completed INTEGER;
    v_achievements_unlocked INTEGER;
    v_achievements_total INTEGER;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN NULL;
    END IF;

    SELECT * INTO v_profile FROM public.profiles WHERE id = v_user_id;
    IF v_profile IS NULL THEN
        RETURN NULL;
    END IF;

    -- Calculate rolling XP (14 days)
    SELECT COALESCE(SUM(xp_earned), 0) INTO v_rolling_xp
    FROM public.rolling_xp
    WHERE user_id = v_user_id
    AND date >= CURRENT_DATE - INTERVAL '14 days';

    -- Get current tier based on rolling XP
    SELECT * INTO v_tier
    FROM public.tier_thresholds
    WHERE min_xp <= v_rolling_xp
    ORDER BY tier_order DESC
    LIMIT 1;

    -- Default to Bronze if no tier found
    IF v_tier IS NULL THEN
        SELECT * INTO v_tier
        FROM public.tier_thresholds
        WHERE tier = 'Bronze';
    END IF;

    -- Get next tier
    SELECT * INTO v_next_tier
    FROM public.tier_thresholds
    WHERE tier_order = v_tier.tier_order + 1;

    -- Count distinct books with at least one completion
    SELECT COUNT(DISTINCT book) INTO v_books_started
    FROM public.chapter_completions
    WHERE user_id = v_user_id;

    -- Count total chapters completed
    SELECT COUNT(*) INTO v_chapters_completed
    FROM public.chapter_completions
    WHERE user_id = v_user_id;

    -- Achievement stats
    SELECT COUNT(*) INTO v_achievements_total FROM public.achievements;
    SELECT COUNT(*) INTO v_achievements_unlocked
    FROM public.user_achievements
    WHERE user_id = v_user_id;

    RETURN jsonb_build_object(
        'total_xp', COALESCE(v_profile.total_xp, 0),
        'rolling_xp', v_rolling_xp,
        'current_streak', COALESCE(v_profile.current_streak, 0),
        'longest_streak', COALESCE(v_profile.longest_streak, 0),
        'current_tier', COALESCE(v_tier.tier, 'Bronze'),
        'tier_color', COALESCE(v_tier.color, '#CD7F32'),
        'next_tier', v_next_tier.tier,
        'xp_to_next_tier', CASE
            WHEN v_next_tier IS NOT NULL
            THEN v_next_tier.min_xp - v_rolling_xp
            ELSE NULL
        END,
        'next_tier_threshold', v_next_tier.min_xp,
        'books_started', COALESCE(v_books_started, 0),
        'chapters_completed', COALESCE(v_chapters_completed, 0),
        'achievements_unlocked', COALESCE(v_achievements_unlocked, 0),
        'achievements_total', COALESCE(v_achievements_total, 0)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- GET GROUP LEVEL THRESHOLDS
-- Returns all level thresholds for UI display
-- ============================================================================

CREATE OR REPLACE FUNCTION get_group_level_thresholds()
RETURNS TABLE (
    level TEXT,
    min_weekly_xp INTEGER,
    level_order INTEGER,
    color TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        glt.level,
        glt.min_weekly_xp,
        glt.level_order,
        glt.color
    FROM public.group_level_thresholds glt
    ORDER BY glt.level_order;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
