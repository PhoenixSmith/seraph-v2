-- ============================================================================
-- Add verses_read tracking to profiles
-- ============================================================================

-- Add verses_read column to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS verses_read INTEGER DEFAULT 0;

-- Backfill: Set verses_read equal to total_xp since each verse read gives 1 XP
-- This gives us an accurate count for existing users
UPDATE public.profiles
SET verses_read = COALESCE(total_xp, 0)
WHERE verses_read = 0 OR verses_read IS NULL;

-- ============================================================================
-- Update record_verse_read to increment verses_read
-- ============================================================================

CREATE OR REPLACE FUNCTION record_verse_read()
RETURNS JSONB AS $$
DECLARE
    v_user_id UUID;
    v_user RECORD;
    v_xp_per_verse INTEGER := 1;
    v_today DATE := CURRENT_DATE;
    v_yesterday DATE := CURRENT_DATE - INTERVAL '1 day';
    v_new_streak INTEGER;
    v_streak_updated BOOLEAN := false;
    v_new_total_xp INTEGER;
    v_new_verses_read INTEGER;
    v_streak_achievements JSONB;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    SELECT * INTO v_user FROM public.profiles WHERE id = v_user_id;

    -- Calculate new streak
    IF v_user.last_read_date IS NULL THEN
        v_new_streak := 1;
        v_streak_updated := true;
    ELSIF v_user.last_read_date = v_today THEN
        v_new_streak := COALESCE(v_user.current_streak, 0);
        v_streak_updated := false;
    ELSIF v_user.last_read_date = v_yesterday THEN
        v_new_streak := COALESCE(v_user.current_streak, 0) + 1;
        v_streak_updated := true;
    ELSE
        v_new_streak := 1;
        v_streak_updated := true;
    END IF;

    -- Update user (now including verses_read)
    UPDATE public.profiles SET
        total_xp = COALESCE(total_xp, 0) + v_xp_per_verse,
        verses_read = COALESCE(verses_read, 0) + 1,
        current_streak = v_new_streak,
        longest_streak = GREATEST(COALESCE(longest_streak, 0), v_new_streak),
        last_read_date = v_today
    WHERE id = v_user_id
    RETURNING total_xp, verses_read INTO v_new_total_xp, v_new_verses_read;

    -- Update rolling XP
    INSERT INTO public.rolling_xp (user_id, date, xp_earned)
    VALUES (v_user_id, v_today, v_xp_per_verse)
    ON CONFLICT (user_id, date)
    DO UPDATE SET xp_earned = rolling_xp.xp_earned + v_xp_per_verse;

    -- Recalculate tier
    PERFORM recalculate_user_tier(v_user_id);

    -- Check for streak achievements if streak was updated
    IF v_streak_updated THEN
        v_streak_achievements := check_streak_achievements(v_user_id, v_new_streak);
    END IF;

    RETURN jsonb_build_object(
        'xp_awarded', v_xp_per_verse,
        'total_xp', v_new_total_xp,
        'verses_read', v_new_verses_read,
        'current_streak', v_new_streak,
        'streak_updated', v_streak_updated,
        'streak_achievements', v_streak_achievements
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Update get_profile_stats to include verses_read
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
        'verses_read', COALESCE(v_profile.verses_read, 0),
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
