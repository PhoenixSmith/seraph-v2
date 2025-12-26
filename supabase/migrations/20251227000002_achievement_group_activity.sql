-- ============================================================================
-- LOG ACHIEVEMENTS TO GROUP ACTIVITY FEED
-- ============================================================================

-- UPDATE: check_book_completion_achievement to log to group activity
CREATE OR REPLACE FUNCTION check_book_completion_achievement(
    p_user_id UUID,
    p_book TEXT
)
RETURNS JSONB AS $$
DECLARE
    v_achievement RECORD;
    v_completed_chapters INTEGER;
    v_required_chapters INTEGER;
    v_unlocked_item JSONB;
    v_group_record RECORD;
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

    -- Count completed chapters for this book
    SELECT COUNT(*) INTO v_completed_chapters
    FROM public.chapter_completions
    WHERE user_id = p_user_id AND book = p_book;

    -- Not enough chapters completed
    IF v_completed_chapters < v_required_chapters THEN
        RETURN jsonb_build_object(
            'awarded', false,
            'reason', 'Not enough chapters completed',
            'completed', v_completed_chapters,
            'required', v_required_chapters
        );
    END IF;

    -- Check if user already has this achievement
    IF EXISTS (
        SELECT 1 FROM public.user_achievements
        WHERE user_id = p_user_id AND achievement_id = v_achievement.id
    ) THEN
        RETURN jsonb_build_object('awarded', false, 'reason', 'Already has achievement');
    END IF;

    -- Award the achievement!
    INSERT INTO public.user_achievements (user_id, achievement_id)
    VALUES (p_user_id, v_achievement.id);

    -- Award XP for the achievement
    UPDATE public.profiles
    SET total_xp = COALESCE(total_xp, 0) + v_achievement.xp_reward
    WHERE id = p_user_id;

    INSERT INTO public.rolling_xp (user_id, date, xp_earned)
    VALUES (p_user_id, CURRENT_DATE, v_achievement.xp_reward)
    ON CONFLICT (user_id, date)
    DO UPDATE SET xp_earned = rolling_xp.xp_earned + v_achievement.xp_reward;

    -- Recalculate tier
    PERFORM recalculate_user_tier(p_user_id);

    -- Check for linked item unlock
    v_unlocked_item := unlock_achievement_item(p_user_id, v_achievement.id);

    -- Log to group activity for all groups the user is in
    FOR v_group_record IN
        SELECT group_id FROM public.group_memberships WHERE user_id = p_user_id
    LOOP
        INSERT INTO public.group_activities (group_id, user_id, activity_type, metadata)
        VALUES (
            v_group_record.group_id,
            p_user_id,
            'achievement',
            jsonb_build_object(
                'achievement_id', v_achievement.id,
                'achievement_key', v_achievement.key,
                'achievement_name', v_achievement.name,
                'achievement_icon', v_achievement.icon
            )
        );
    END LOOP;

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


-- UPDATE: check_streak_achievement to log to group activity
CREATE OR REPLACE FUNCTION check_streak_achievement(p_user_id UUID, p_streak INTEGER)
RETURNS JSONB AS $$
DECLARE
    v_achievement RECORD;
    v_results JSONB := '[]'::JSONB;
    v_unlocked_item JSONB;
    v_group_record RECORD;
BEGIN
    -- Check all streak achievements that the user qualifies for
    FOR v_achievement IN
        SELECT * FROM public.achievements
        WHERE category = 'streak'
        AND (requirement->>'days')::INTEGER <= p_streak
        ORDER BY (requirement->>'days')::INTEGER
    LOOP
        -- Check if user already has this achievement
        IF NOT EXISTS (
            SELECT 1 FROM public.user_achievements
            WHERE user_id = p_user_id AND achievement_id = v_achievement.id
        ) THEN
            -- Award the achievement
            INSERT INTO public.user_achievements (user_id, achievement_id)
            VALUES (p_user_id, v_achievement.id);

            -- Award XP
            UPDATE public.profiles
            SET total_xp = COALESCE(total_xp, 0) + v_achievement.xp_reward
            WHERE id = p_user_id;

            INSERT INTO public.rolling_xp (user_id, date, xp_earned)
            VALUES (p_user_id, CURRENT_DATE, v_achievement.xp_reward)
            ON CONFLICT (user_id, date)
            DO UPDATE SET xp_earned = rolling_xp.xp_earned + v_achievement.xp_reward;

            -- Check for linked item unlock
            v_unlocked_item := unlock_achievement_item(p_user_id, v_achievement.id);

            -- Log to group activity for all groups the user is in
            FOR v_group_record IN
                SELECT group_id FROM public.group_memberships WHERE user_id = p_user_id
            LOOP
                INSERT INTO public.group_activities (group_id, user_id, activity_type, metadata)
                VALUES (
                    v_group_record.group_id,
                    p_user_id,
                    'achievement',
                    jsonb_build_object(
                        'achievement_id', v_achievement.id,
                        'achievement_key', v_achievement.key,
                        'achievement_name', v_achievement.name,
                        'achievement_icon', v_achievement.icon
                    )
                );
            END LOOP;

            v_results := v_results || jsonb_build_object(
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
    IF jsonb_array_length(v_results) > 0 THEN
        PERFORM recalculate_user_tier(p_user_id);
    END IF;

    RETURN CASE WHEN jsonb_array_length(v_results) > 0 THEN v_results ELSE NULL END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- UPDATE: check_challenge_win_achievement to log to group activity
CREATE OR REPLACE FUNCTION check_challenge_win_achievement(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_win_count INTEGER;
    v_achievement RECORD;
    v_results JSONB := '[]'::JSONB;
    v_unlocked_item JSONB;
    v_group_record RECORD;
BEGIN
    -- Count challenge wins
    SELECT COUNT(*) INTO v_win_count
    FROM public.challenge_participants cp
    JOIN public.challenges c ON c.id = cp.challenge_id
    WHERE cp.user_id = p_user_id
    AND c.status = 'completed'
    AND cp.is_winner = true;

    -- Check all challenge win achievements
    FOR v_achievement IN
        SELECT * FROM public.achievements
        WHERE category = 'challenge'
        AND (requirement->>'wins')::INTEGER <= v_win_count
        ORDER BY (requirement->>'wins')::INTEGER
    LOOP
        -- Check if user already has this achievement
        IF NOT EXISTS (
            SELECT 1 FROM public.user_achievements
            WHERE user_id = p_user_id AND achievement_id = v_achievement.id
        ) THEN
            -- Award the achievement
            INSERT INTO public.user_achievements (user_id, achievement_id)
            VALUES (p_user_id, v_achievement.id);

            -- Award XP
            UPDATE public.profiles
            SET total_xp = COALESCE(total_xp, 0) + v_achievement.xp_reward
            WHERE id = p_user_id;

            INSERT INTO public.rolling_xp (user_id, date, xp_earned)
            VALUES (p_user_id, CURRENT_DATE, v_achievement.xp_reward)
            ON CONFLICT (user_id, date)
            DO UPDATE SET xp_earned = rolling_xp.xp_earned + v_achievement.xp_reward;

            -- Check for linked item unlock
            v_unlocked_item := unlock_achievement_item(p_user_id, v_achievement.id);

            -- Log to group activity for all groups the user is in
            FOR v_group_record IN
                SELECT group_id FROM public.group_memberships WHERE user_id = p_user_id
            LOOP
                INSERT INTO public.group_activities (group_id, user_id, activity_type, metadata)
                VALUES (
                    v_group_record.group_id,
                    p_user_id,
                    'achievement',
                    jsonb_build_object(
                        'achievement_id', v_achievement.id,
                        'achievement_key', v_achievement.key,
                        'achievement_name', v_achievement.name,
                        'achievement_icon', v_achievement.icon
                    )
                );
            END LOOP;

            v_results := v_results || jsonb_build_object(
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
    IF jsonb_array_length(v_results) > 0 THEN
        PERFORM recalculate_user_tier(p_user_id);
    END IF;

    RETURN CASE WHEN jsonb_array_length(v_results) > 0 THEN v_results ELSE NULL END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
