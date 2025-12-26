-- ============================================================================
-- SERAPH BIBLE READER - TALENT REWARDS FOR ACHIEVEMENTS
-- Awards talents alongside XP when achievements are unlocked
-- ============================================================================

-- ============================================================================
-- 1. Add talent_reward column to achievements table
-- ============================================================================
ALTER TABLE public.achievements
ADD COLUMN IF NOT EXISTS talent_reward INTEGER DEFAULT 0 NOT NULL;

-- ============================================================================
-- 2. Set talent values for streak achievements
-- ============================================================================
UPDATE public.achievements SET talent_reward = 5 WHERE key = 'streak_10';
UPDATE public.achievements SET talent_reward = 10 WHERE key = 'streak_15';
UPDATE public.achievements SET talent_reward = 25 WHERE key = 'streak_40';
UPDATE public.achievements SET talent_reward = 50 WHERE key = 'streak_100';
UPDATE public.achievements SET talent_reward = 100 WHERE key = 'streak_200';
UPDATE public.achievements SET talent_reward = 200 WHERE key = 'streak_365';

-- ============================================================================
-- 3. Set base talent values for all other achievements based on XP tiers
-- ============================================================================
UPDATE public.achievements
SET talent_reward = CASE
  WHEN xp_reward >= 100 THEN 2  -- Higher tier achievements
  ELSE 1                         -- Base tier achievements
END
WHERE talent_reward = 0;

-- ============================================================================
-- 4. Update check_streak_achievement to award and return talents
-- ============================================================================
CREATE OR REPLACE FUNCTION check_streak_achievement(p_user_id UUID, p_streak INTEGER)
RETURNS JSONB AS $$
DECLARE
    v_achievement RECORD;
    v_already_has BOOLEAN;
    v_awarded JSONB := '[]'::JSONB;
    v_total_talents_awarded INTEGER := 0;
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

            -- Award Talents
            IF v_achievement.talent_reward > 0 THEN
                PERFORM award_talents(p_user_id, v_achievement.talent_reward);
                v_total_talents_awarded := v_total_talents_awarded + v_achievement.talent_reward;
            END IF;

            -- Update rolling XP
            INSERT INTO public.rolling_xp (user_id, date, xp_earned)
            VALUES (p_user_id, CURRENT_DATE, v_achievement.xp_reward)
            ON CONFLICT (user_id, date)
            DO UPDATE SET xp_earned = rolling_xp.xp_earned + v_achievement.xp_reward;

            -- Add to awarded list (including talent_reward)
            v_awarded := v_awarded || jsonb_build_object(
                'id', v_achievement.id,
                'key', v_achievement.key,
                'name', v_achievement.name,
                'description', v_achievement.description,
                'icon', v_achievement.icon,
                'xp_reward', v_achievement.xp_reward,
                'talent_reward', v_achievement.talent_reward
            );
        END IF;
    END LOOP;

    -- Recalculate tier if any achievements were awarded
    IF jsonb_array_length(v_awarded) > 0 THEN
        PERFORM recalculate_user_tier(p_user_id);
    END IF;

    RETURN jsonb_build_object(
        'checked_streak', p_streak,
        'newly_awarded', v_awarded,
        'talents_awarded', v_total_talents_awarded
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 5. Update check_challenge_win_achievement to award and return talents
-- ============================================================================
CREATE OR REPLACE FUNCTION check_challenge_win_achievement(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_win_count INTEGER;
    v_achievement RECORD;
    v_already_has BOOLEAN;
    v_awarded JSONB := '[]'::JSONB;
    v_total_talents_awarded INTEGER := 0;
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

            -- Award Talents
            IF v_achievement.talent_reward > 0 THEN
                PERFORM award_talents(p_user_id, v_achievement.talent_reward);
                v_total_talents_awarded := v_total_talents_awarded + v_achievement.talent_reward;
            END IF;

            -- Update rolling XP
            INSERT INTO public.rolling_xp (user_id, date, xp_earned)
            VALUES (p_user_id, CURRENT_DATE, v_achievement.xp_reward)
            ON CONFLICT (user_id, date)
            DO UPDATE SET xp_earned = rolling_xp.xp_earned + v_achievement.xp_reward;

            -- Add to awarded list (including talent_reward)
            v_awarded := v_awarded || jsonb_build_object(
                'id', v_achievement.id,
                'key', v_achievement.key,
                'name', v_achievement.name,
                'description', v_achievement.description,
                'icon', v_achievement.icon,
                'xp_reward', v_achievement.xp_reward,
                'talent_reward', v_achievement.talent_reward
            );
        END IF;
    END LOOP;

    -- Recalculate tier if any achievements were awarded
    IF jsonb_array_length(v_awarded) > 0 THEN
        PERFORM recalculate_user_tier(p_user_id);
    END IF;

    RETURN jsonb_build_object(
        'total_wins', v_win_count,
        'newly_awarded', v_awarded,
        'talents_awarded', v_total_talents_awarded
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 6. Update check_book_completion_achievement to award and return talents
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

    -- Award Talents for the achievement
    IF v_achievement.talent_reward > 0 THEN
        PERFORM award_talents(p_user_id, v_achievement.talent_reward);
    END IF;

    -- Update rolling XP
    INSERT INTO public.rolling_xp (user_id, date, xp_earned)
    VALUES (p_user_id, CURRENT_DATE, v_achievement.xp_reward)
    ON CONFLICT (user_id, date)
    DO UPDATE SET xp_earned = rolling_xp.xp_earned + v_achievement.xp_reward;

    -- Recalculate tier
    PERFORM recalculate_user_tier(p_user_id);

    -- Check for unlockable items (if function exists)
    BEGIN
        v_unlocked_item := unlock_achievement_item(p_user_id, v_achievement.id);
    EXCEPTION WHEN undefined_function THEN
        v_unlocked_item := NULL;
    END;

    RETURN jsonb_build_object(
        'awarded', true,
        'achievement', jsonb_build_object(
            'id', v_achievement.id,
            'key', v_achievement.key,
            'name', v_achievement.name,
            'description', v_achievement.description,
            'icon', v_achievement.icon,
            'xp_reward', v_achievement.xp_reward,
            'talent_reward', v_achievement.talent_reward
        ),
        'talents_awarded', v_achievement.talent_reward,
        'unlocked_item', v_unlocked_item
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
