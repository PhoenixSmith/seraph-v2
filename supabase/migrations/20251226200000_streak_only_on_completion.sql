-- ============================================================================
-- Remove streak logic from record_verse_read
-- Streaks should only update on chapter completion (with quiz passed)
-- ============================================================================

CREATE OR REPLACE FUNCTION record_verse_read()
RETURNS JSONB AS $$
DECLARE
    v_user_id UUID;
    v_xp_per_verse INTEGER := 1;
    v_today DATE := CURRENT_DATE;
    v_new_total_xp INTEGER;
    v_new_verses_read INTEGER;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- Update user XP and verses_read only (no streak changes)
    UPDATE public.profiles SET
        total_xp = COALESCE(total_xp, 0) + v_xp_per_verse,
        verses_read = COALESCE(verses_read, 0) + 1
    WHERE id = v_user_id
    RETURNING total_xp, verses_read INTO v_new_total_xp, v_new_verses_read;

    -- Update rolling XP
    INSERT INTO public.rolling_xp (user_id, date, xp_earned)
    VALUES (v_user_id, v_today, v_xp_per_verse)
    ON CONFLICT (user_id, date)
    DO UPDATE SET xp_earned = rolling_xp.xp_earned + v_xp_per_verse;

    -- Recalculate tier
    PERFORM recalculate_user_tier(v_user_id);

    RETURN jsonb_build_object(
        'xp_awarded', v_xp_per_verse,
        'total_xp', v_new_total_xp,
        'verses_read', v_new_verses_read
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
