-- ============================================================================
-- ACHIEVEMENT ITEM UNLOCKS
-- Automatically unlock avatar items when their linked achievement is earned
-- ============================================================================

-- ============================================================================
-- HELPER: Unlock item for achievement (returns item info if unlocked)
-- ============================================================================
CREATE OR REPLACE FUNCTION unlock_achievement_item(p_user_id UUID, p_achievement_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_item RECORD;
BEGIN
    -- Find item linked to this achievement
    SELECT * INTO v_item
    FROM public.avatar_items
    WHERE achievement_id = p_achievement_id;

    -- No item linked to this achievement
    IF v_item IS NULL THEN
        RETURN NULL;
    END IF;

    -- Check if user already owns this item
    IF EXISTS (
        SELECT 1 FROM public.user_avatar_items
        WHERE user_id = p_user_id AND item_id = v_item.id
    ) THEN
        RETURN NULL;
    END IF;

    -- Unlock the item
    INSERT INTO public.user_avatar_items (user_id, item_id, unlocked_via)
    VALUES (p_user_id, v_item.id, 'achievement');

    RETURN jsonb_build_object(
        'item_key', v_item.item_key,
        'category', v_item.category,
        'name', v_item.name,
        'description', v_item.description,
        'rarity', v_item.rarity
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- UPDATE: check_book_completion_achievement to include item unlocks
-- ============================================================================
CREATE OR REPLACE FUNCTION check_book_completion_achievement(
    p_user_id UUID,
    p_book TEXT
)
RETURNS JSONB AS $$
DECLARE
    v_achievement RECORD;
    v_required_chapters INTEGER;
    v_completed_chapters INTEGER;
    v_already_has BOOLEAN;
    v_result JSONB;
    v_unlocked_item JSONB;
BEGIN
    -- Find the achievement for this book
    SELECT * INTO v_achievement
    FROM public.achievements
    WHERE category = 'book_completion'
      AND requirement->>'book' = p_book;

    IF v_achievement IS NULL THEN
        RETURN jsonb_build_object('awarded', false, 'reason', 'No achievement found for this book');
    END IF;

    -- Get required chapters from the achievement requirement
    v_required_chapters := (v_achievement.requirement->>'chapters')::INTEGER;

    -- Count completed chapters for this user and book
    SELECT COUNT(*) INTO v_completed_chapters
    FROM public.chapter_completions
    WHERE user_id = p_user_id AND book = p_book;

    -- Check if all chapters are completed
    IF v_completed_chapters < v_required_chapters THEN
        RETURN jsonb_build_object(
            'awarded', false,
            'reason', 'Not all chapters completed',
            'completed', v_completed_chapters,
            'required', v_required_chapters
        );
    END IF;

    -- Check if user already has this achievement
    SELECT EXISTS(
        SELECT 1 FROM public.user_achievements
        WHERE user_id = p_user_id AND achievement_id = v_achievement.id
    ) INTO v_already_has;

    IF v_already_has THEN
        RETURN jsonb_build_object('awarded', false, 'reason', 'Already unlocked');
    END IF;

    -- Award the achievement!
    INSERT INTO public.user_achievements (user_id, achievement_id)
    VALUES (p_user_id, v_achievement.id);

    -- Award XP for the achievement
    UPDATE public.profiles
    SET total_xp = COALESCE(total_xp, 0) + v_achievement.xp_reward
    WHERE id = p_user_id;

    -- Update rolling XP
    INSERT INTO public.rolling_xp (user_id, date, xp_earned)
    VALUES (p_user_id, CURRENT_DATE, v_achievement.xp_reward)
    ON CONFLICT (user_id, date)
    DO UPDATE SET xp_earned = rolling_xp.xp_earned + v_achievement.xp_reward;

    -- Recalculate tier
    PERFORM recalculate_user_tier(p_user_id);

    -- Unlock linked item (if any)
    v_unlocked_item := unlock_achievement_item(p_user_id, v_achievement.id);

    RETURN jsonb_build_object(
        'awarded', true,
        'achievement', jsonb_build_object(
            'id', v_achievement.id,
            'key', v_achievement.key,
            'name', v_achievement.name,
            'description', v_achievement.description,
            'icon', v_achievement.icon,
            'xp_reward', v_achievement.xp_reward
        ),
        'unlocked_item', v_unlocked_item
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- UPDATE: check_streak_achievement to include item unlocks
-- ============================================================================
CREATE OR REPLACE FUNCTION check_streak_achievement(p_user_id UUID, p_streak INTEGER)
RETURNS JSONB AS $$
DECLARE
    v_achievement RECORD;
    v_already_has BOOLEAN;
    v_awarded JSONB := '[]'::JSONB;
    v_unlocked_item JSONB;
BEGIN
    -- Check all streak achievements that the user qualifies for
    FOR v_achievement IN
        SELECT * FROM public.achievements
        WHERE category = 'streak'
          AND (requirement->>'days')::INTEGER <= p_streak
        ORDER BY (requirement->>'days')::INTEGER
    LOOP
        -- Check if user already has this achievement
        SELECT EXISTS(
            SELECT 1 FROM public.user_achievements
            WHERE user_id = p_user_id AND achievement_id = v_achievement.id
        ) INTO v_already_has;

        IF NOT v_already_has THEN
            -- Award the achievement
            INSERT INTO public.user_achievements (user_id, achievement_id)
            VALUES (p_user_id, v_achievement.id);

            -- Award XP
            UPDATE public.profiles
            SET total_xp = COALESCE(total_xp, 0) + v_achievement.xp_reward
            WHERE id = p_user_id;

            -- Update rolling XP
            INSERT INTO public.rolling_xp (user_id, date, xp_earned)
            VALUES (p_user_id, CURRENT_DATE, v_achievement.xp_reward)
            ON CONFLICT (user_id, date)
            DO UPDATE SET xp_earned = rolling_xp.xp_earned + v_achievement.xp_reward;

            -- Unlock linked item (if any)
            v_unlocked_item := unlock_achievement_item(p_user_id, v_achievement.id);

            -- Add to awarded list
            v_awarded := v_awarded || jsonb_build_object(
                'id', v_achievement.id,
                'key', v_achievement.key,
                'name', v_achievement.name,
                'description', v_achievement.description,
                'icon', v_achievement.icon,
                'xp_reward', v_achievement.xp_reward,
                'unlocked_item', v_unlocked_item
            );
        END IF;
    END LOOP;

    -- Recalculate tier if any achievements were awarded
    IF jsonb_array_length(v_awarded) > 0 THEN
        PERFORM recalculate_user_tier(p_user_id);
    END IF;

    RETURN jsonb_build_object(
        'checked_streak', p_streak,
        'newly_awarded', v_awarded
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- UPDATE: check_challenge_win_achievement to include item unlocks (future-proofing)
-- ============================================================================
CREATE OR REPLACE FUNCTION check_challenge_win_achievement(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_win_count INTEGER;
    v_achievement RECORD;
    v_already_has BOOLEAN;
    v_awarded JSONB := '[]'::JSONB;
    v_unlocked_item JSONB;
BEGIN
    -- Count wins for groups where user is a member
    SELECT COUNT(DISTINCT gc.id) INTO v_win_count
    FROM public.group_challenges gc
    INNER JOIN public.group_memberships gm ON (
        gm.group_id = gc.winner_group_id AND gm.user_id = p_user_id
    )
    WHERE gc.status = 'completed' AND gc.winner_group_id IS NOT NULL;

    -- Check all challenge win achievements
    FOR v_achievement IN
        SELECT * FROM public.achievements
        WHERE category = 'special'
          AND requirement ? 'challenge_wins'
          AND (requirement->>'challenge_wins')::INTEGER <= v_win_count
        ORDER BY (requirement->>'challenge_wins')::INTEGER
    LOOP
        -- Check if user already has this achievement
        SELECT EXISTS(
            SELECT 1 FROM public.user_achievements
            WHERE user_id = p_user_id AND achievement_id = v_achievement.id
        ) INTO v_already_has;

        IF NOT v_already_has THEN
            -- Award the achievement
            INSERT INTO public.user_achievements (user_id, achievement_id)
            VALUES (p_user_id, v_achievement.id);

            -- Award XP
            UPDATE public.profiles
            SET total_xp = COALESCE(total_xp, 0) + v_achievement.xp_reward
            WHERE id = p_user_id;

            -- Update rolling XP
            INSERT INTO public.rolling_xp (user_id, date, xp_earned)
            VALUES (p_user_id, CURRENT_DATE, v_achievement.xp_reward)
            ON CONFLICT (user_id, date)
            DO UPDATE SET xp_earned = rolling_xp.xp_earned + v_achievement.xp_reward;

            -- Unlock linked item (if any)
            v_unlocked_item := unlock_achievement_item(p_user_id, v_achievement.id);

            -- Add to awarded list
            v_awarded := v_awarded || jsonb_build_object(
                'id', v_achievement.id,
                'key', v_achievement.key,
                'name', v_achievement.name,
                'description', v_achievement.description,
                'icon', v_achievement.icon,
                'xp_reward', v_achievement.xp_reward,
                'unlocked_item', v_unlocked_item
            );
        END IF;
    END LOOP;

    -- Recalculate tier if any achievements were awarded
    IF jsonb_array_length(v_awarded) > 0 THEN
        PERFORM recalculate_user_tier(p_user_id);
    END IF;

    RETURN jsonb_build_object(
        'total_wins', v_win_count,
        'newly_awarded', v_awarded
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
