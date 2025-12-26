-- ============================================================================
-- UPDATE COMPLETE_CHAPTER TO INCLUDE STREAK TRACKING
-- ============================================================================
-- This migration updates the complete_chapter function to:
-- 1. Update the user's streak (once per day, on first chapter completion)
-- 2. Return streak information in the response for display in the completion popup

CREATE OR REPLACE FUNCTION complete_chapter(
    p_book TEXT,
    p_chapter INTEGER
)
RETURNS JSONB AS $$
DECLARE
    v_user_id UUID;
    v_existing RECORD;
    v_user RECORD;
    v_xp_per_chapter INTEGER := 10;
    v_talents_per_chapter INTEGER := 1;
    v_new_total_xp INTEGER;
    v_new_talents INTEGER;
    v_today DATE := CURRENT_DATE;
    v_achievement_result JSONB;
    v_new_streak INTEGER;
    v_streak_increased BOOLEAN := false;
    v_streak_achievements JSONB;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- Check if already completed
    SELECT * INTO v_existing
    FROM public.chapter_completions
    WHERE user_id = v_user_id AND book = p_book AND chapter = p_chapter;

    IF v_existing IS NOT NULL THEN
        RETURN jsonb_build_object(
            'success', true,
            'already_completed', true,
            'xp_awarded', 0,
            'talents_awarded', 0
        );
    END IF;

    -- Get current user data for streak calculation
    SELECT * INTO v_user FROM public.profiles WHERE id = v_user_id;

    -- Calculate new streak based on last_read_at
    -- Same logic as record_verse_read
    IF v_user.last_read_at IS NULL THEN
        -- First time reading
        v_new_streak := 1;
        v_streak_increased := true;
    ELSIF v_user.last_read_at::DATE = v_today THEN
        -- Already read today - keep current streak
        v_new_streak := COALESCE(v_user.current_streak, 0);
        v_streak_increased := false;
    ELSIF v_user.last_read_at::DATE = v_today - INTERVAL '1 day' THEN
        -- Read yesterday - increment streak
        v_new_streak := COALESCE(v_user.current_streak, 0) + 1;
        v_streak_increased := true;
    ELSE
        -- Streak broken - reset to 1
        v_new_streak := 1;
        v_streak_increased := true;
    END IF;

    -- Record completion
    INSERT INTO public.chapter_completions (user_id, book, chapter, xp_awarded)
    VALUES (v_user_id, p_book, p_chapter, v_xp_per_chapter);

    -- Update user XP, Talents, and Streak
    UPDATE public.profiles
    SET total_xp = COALESCE(total_xp, 0) + v_xp_per_chapter,
        talents = COALESCE(talents, 0) + v_talents_per_chapter,
        current_streak = v_new_streak,
        longest_streak = GREATEST(COALESCE(longest_streak, 0), v_new_streak),
        last_read_at = NOW()
    WHERE id = v_user_id
    RETURNING total_xp, talents INTO v_new_total_xp, v_new_talents;

    -- Update rolling XP
    INSERT INTO public.rolling_xp (user_id, date, xp_earned)
    VALUES (v_user_id, v_today, v_xp_per_chapter)
    ON CONFLICT (user_id, date)
    DO UPDATE SET xp_earned = rolling_xp.xp_earned + v_xp_per_chapter;

    -- Recalculate tier
    PERFORM recalculate_user_tier(v_user_id);

    -- Check for book completion achievement
    v_achievement_result := check_book_completion_achievement(v_user_id, p_book);

    -- Check for streak achievements if streak was increased
    IF v_streak_increased THEN
        v_streak_achievements := check_streak_achievement(v_user_id, v_new_streak);
    ELSE
        v_streak_achievements := NULL;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'already_completed', false,
        'xp_awarded', v_xp_per_chapter,
        'talents_awarded', v_talents_per_chapter,
        'new_talents', v_new_talents,
        'achievement', v_achievement_result,
        'current_streak', v_new_streak,
        'streak_increased', v_streak_increased,
        'streak_achievements', v_streak_achievements
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
