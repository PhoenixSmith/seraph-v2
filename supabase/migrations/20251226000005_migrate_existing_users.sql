-- ============================================================================
-- MIGRATE EXISTING USERS
-- Grants free items, retroactive talents, and grandfathers current outfits
-- ============================================================================

-- ============================================================================
-- 1. GRANT FREE ITEMS TO ALL EXISTING USERS
-- ============================================================================

INSERT INTO public.user_avatar_items (user_id, item_id, unlocked_via)
SELECT p.id, ai.id, 'free'
FROM public.profiles p
CROSS JOIN public.avatar_items ai
WHERE ai.unlock_method = 'free'
ON CONFLICT (user_id, item_id) DO NOTHING;

-- ============================================================================
-- 2. GRANT ACHIEVEMENT ITEMS TO USERS WHO ALREADY HAVE THOSE ACHIEVEMENTS
-- ============================================================================

INSERT INTO public.user_avatar_items (user_id, item_id, unlocked_via)
SELECT ua.user_id, ai.id, 'achievement'
FROM public.user_achievements ua
JOIN public.avatar_items ai ON ai.achievement_id = ua.achievement_id
WHERE ai.achievement_id IS NOT NULL
ON CONFLICT (user_id, item_id) DO NOTHING;

-- ============================================================================
-- 3. GRANDFATHER CLAUSE: USERS KEEP ITEMS THEY'RE CURRENTLY WEARING
-- If a user is wearing an accessory that's now locked, they keep it
-- ============================================================================

-- Face accessories
INSERT INTO public.user_avatar_items (user_id, item_id, unlocked_via)
SELECT p.id, ai.id, 'grandfathered'
FROM public.profiles p
JOIN public.avatar_items ai ON ai.category = 'face'
    AND ai.item_key = p.avatar_config->>'face'
WHERE p.avatar_config->>'face' IS NOT NULL
    AND p.avatar_config->>'face' != 'none'
ON CONFLICT (user_id, item_id) DO NOTHING;

-- Hat accessories
INSERT INTO public.user_avatar_items (user_id, item_id, unlocked_via)
SELECT p.id, ai.id, 'grandfathered'
FROM public.profiles p
JOIN public.avatar_items ai ON ai.category = 'hat'
    AND ai.item_key = p.avatar_config->>'hat'
WHERE p.avatar_config->>'hat' IS NOT NULL
    AND p.avatar_config->>'hat' != 'none'
ON CONFLICT (user_id, item_id) DO NOTHING;

-- Top accessories
INSERT INTO public.user_avatar_items (user_id, item_id, unlocked_via)
SELECT p.id, ai.id, 'grandfathered'
FROM public.profiles p
JOIN public.avatar_items ai ON ai.category = 'top'
    AND ai.item_key = p.avatar_config->>'top'
WHERE p.avatar_config->>'top' IS NOT NULL
    AND p.avatar_config->>'top' != 'none'
ON CONFLICT (user_id, item_id) DO NOTHING;

-- Bottom accessories
INSERT INTO public.user_avatar_items (user_id, item_id, unlocked_via)
SELECT p.id, ai.id, 'grandfathered'
FROM public.profiles p
JOIN public.avatar_items ai ON ai.category = 'bottom'
    AND ai.item_key = p.avatar_config->>'bottom'
WHERE p.avatar_config->>'bottom' IS NOT NULL
    AND p.avatar_config->>'bottom' != 'none'
ON CONFLICT (user_id, item_id) DO NOTHING;

-- Outfit accessories
INSERT INTO public.user_avatar_items (user_id, item_id, unlocked_via)
SELECT p.id, ai.id, 'grandfathered'
FROM public.profiles p
JOIN public.avatar_items ai ON ai.category = 'outfit'
    AND ai.item_key = p.avatar_config->>'outfit'
WHERE p.avatar_config->>'outfit' IS NOT NULL
    AND p.avatar_config->>'outfit' != 'none'
ON CONFLICT (user_id, item_id) DO NOTHING;

-- Misc accessories
INSERT INTO public.user_avatar_items (user_id, item_id, unlocked_via)
SELECT p.id, ai.id, 'grandfathered'
FROM public.profiles p
JOIN public.avatar_items ai ON ai.category = 'misc'
    AND ai.item_key = p.avatar_config->>'misc'
WHERE p.avatar_config->>'misc' IS NOT NULL
    AND p.avatar_config->>'misc' != 'none'
ON CONFLICT (user_id, item_id) DO NOTHING;

-- ============================================================================
-- 4. RETROACTIVE TALENTS: 1 PER COMPLETED CHAPTER
-- ============================================================================

UPDATE public.profiles p
SET talents = COALESCE(talents, 0) + (
    SELECT COUNT(*)
    FROM public.chapter_completions cc
    WHERE cc.user_id = p.id
);

-- ============================================================================
-- 5. UPDATE complete_chapter TO AWARD TALENTS
-- Drops and recreates function with talent awarding
-- ============================================================================

CREATE OR REPLACE FUNCTION complete_chapter(
    p_book TEXT,
    p_chapter INTEGER
)
RETURNS JSONB AS $$
DECLARE
    v_user_id UUID;
    v_existing RECORD;
    v_xp_per_chapter INTEGER := 10;
    v_talents_per_chapter INTEGER := 1;
    v_new_total_xp INTEGER;
    v_new_talents INTEGER;
    v_today DATE := CURRENT_DATE;
    v_achievement_result JSONB;
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

    -- Record completion
    INSERT INTO public.chapter_completions (user_id, book, chapter, xp_awarded)
    VALUES (v_user_id, p_book, p_chapter, v_xp_per_chapter);

    -- Update user XP and Talents
    UPDATE public.profiles
    SET total_xp = COALESCE(total_xp, 0) + v_xp_per_chapter,
        talents = COALESCE(talents, 0) + v_talents_per_chapter
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

    RETURN jsonb_build_object(
        'success', true,
        'already_completed', false,
        'xp_awarded', v_xp_per_chapter,
        'talents_awarded', v_talents_per_chapter,
        'new_talents', v_new_talents,
        'achievement', v_achievement_result
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
