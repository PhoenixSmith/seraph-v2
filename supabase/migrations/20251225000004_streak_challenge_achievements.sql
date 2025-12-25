-- ============================================================================
-- SERAPH BIBLE READER - STREAK & CHALLENGE ACHIEVEMENTS
-- Achievements for reading streaks and group challenge victories
-- ============================================================================

-- ============================================================================
-- STREAK ACHIEVEMENTS (6 total)
-- ============================================================================

INSERT INTO public.achievements (key, name, description, icon, category, requirement, xp_reward) VALUES
('streak_10', 'Double Digits', '10 days in a row - you''re building a habit!', '🔥', 'streak', '{"days": 10}', 25),
('streak_15', 'Halfway to a Month', '15 days straight - the Word is taking root!', '🌱', 'streak', '{"days": 15}', 40),
('streak_40', 'Wilderness Survivor', '40 days like Jesus in the desert - absolute dedication!', '🏜️', 'streak', '{"days": 40}', 100),
('streak_100', 'Century Club', '100 days! You''re in the top tier of readers', '💯', 'streak', '{"days": 100}', 200),
('streak_200', 'Unstoppable Force', '200 days - at this point, it''s just who you are', '⚡', 'streak', '{"days": 200}', 350),
('streak_365', 'Year of the Word', '365 days - a full year of daily reading. Legendary!', '👑', 'streak', '{"days": 365}', 500);

-- ============================================================================
-- CHALLENGE WIN ACHIEVEMENTS (3 total)
-- ============================================================================

INSERT INTO public.achievements (key, name, description, icon, category, requirement, xp_reward) VALUES
('challenge_wins_1', 'First Blood', 'Won your first group challenge - taste of victory!', '🏆', 'special', '{"challenge_wins": 1}', 25),
('challenge_wins_5', 'Veteran Champion', '5 challenge wins - your group fears no one', '⚔️', 'special', '{"challenge_wins": 5}', 75),
('challenge_wins_10', 'Legendary Conqueror', '10 challenge wins - absolute domination!', '🦅', 'special', '{"challenge_wins": 10}', 150);

-- ============================================================================
-- FUNCTION: Check and award streak achievement
-- ============================================================================
CREATE OR REPLACE FUNCTION check_streak_achievement(p_user_id UUID, p_streak INTEGER)
RETURNS JSONB AS $$
DECLARE
    v_achievement RECORD;
    v_already_has BOOLEAN;
    v_awarded JSONB := '[]'::JSONB;
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

            -- Add to awarded list
            v_awarded := v_awarded || jsonb_build_object(
                'id', v_achievement.id,
                'key', v_achievement.key,
                'name', v_achievement.name,
                'description', v_achievement.description,
                'icon', v_achievement.icon,
                'xp_reward', v_achievement.xp_reward
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
-- FUNCTION: Check and award challenge win achievements
-- ============================================================================
CREATE OR REPLACE FUNCTION check_challenge_win_achievement(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_win_count INTEGER;
    v_achievement RECORD;
    v_already_has BOOLEAN;
    v_awarded JSONB := '[]'::JSONB;
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

            -- Add to awarded list
            v_awarded := v_awarded || jsonb_build_object(
                'id', v_achievement.id,
                'key', v_achievement.key,
                'name', v_achievement.name,
                'description', v_achievement.description,
                'icon', v_achievement.icon,
                'xp_reward', v_achievement.xp_reward
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

-- ============================================================================
-- UPDATE: Modify record_verse_read to check streak achievements
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

    -- Update user
    UPDATE public.profiles SET
        total_xp = COALESCE(total_xp, 0) + v_xp_per_verse,
        current_streak = v_new_streak,
        longest_streak = GREATEST(COALESCE(longest_streak, 0), v_new_streak),
        last_read_date = v_today
    WHERE id = v_user_id
    RETURNING total_xp INTO v_new_total_xp;

    -- Update rolling XP
    INSERT INTO public.rolling_xp (user_id, date, xp_earned)
    VALUES (v_user_id, v_today, v_xp_per_verse)
    ON CONFLICT (user_id, date)
    DO UPDATE SET xp_earned = rolling_xp.xp_earned + v_xp_per_verse;

    -- Recalculate tier
    PERFORM recalculate_user_tier(v_user_id);

    -- Check for streak achievements if streak was updated
    IF v_streak_updated THEN
        v_streak_achievements := check_streak_achievement(v_user_id, v_new_streak);
    ELSE
        v_streak_achievements := NULL;
    END IF;

    RETURN jsonb_build_object(
        'xp_awarded', v_xp_per_verse,
        'total_xp', v_new_total_xp,
        'current_streak', v_new_streak,
        'streak_updated', v_streak_updated,
        'streak_achievements', v_streak_achievements
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- UPDATE: Add trigger to check challenge wins when challenge completes
-- ============================================================================
CREATE OR REPLACE FUNCTION on_challenge_complete()
RETURNS TRIGGER AS $$
DECLARE
    v_member RECORD;
BEGIN
    -- Only trigger when status changes to 'completed' and there's a winner
    IF NEW.status = 'completed' AND NEW.winner_group_id IS NOT NULL
       AND (OLD.status IS DISTINCT FROM 'completed' OR OLD.winner_group_id IS NULL) THEN

        -- Check achievements for all members of the winning group
        FOR v_member IN
            SELECT user_id FROM public.group_memberships
            WHERE group_id = NEW.winner_group_id
        LOOP
            PERFORM check_challenge_win_achievement(v_member.user_id);
        END LOOP;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger if it doesn't exist
DROP TRIGGER IF EXISTS trigger_challenge_complete ON public.group_challenges;
CREATE TRIGGER trigger_challenge_complete
    AFTER UPDATE ON public.group_challenges
    FOR EACH ROW
    EXECUTE FUNCTION on_challenge_complete();

-- ============================================================================
-- FUNCTION: Check all streak/challenge achievements (retroactive)
-- ============================================================================
CREATE OR REPLACE FUNCTION check_all_misc_achievements()
RETURNS JSONB AS $$
DECLARE
    v_user_id UUID;
    v_user RECORD;
    v_streak_result JSONB;
    v_challenge_result JSONB;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    SELECT * INTO v_user FROM public.profiles WHERE id = v_user_id;

    -- Check streak achievements based on longest streak
    v_streak_result := check_streak_achievement(v_user_id, COALESCE(v_user.longest_streak, 0));

    -- Check challenge win achievements
    v_challenge_result := check_challenge_win_achievement(v_user_id);

    RETURN jsonb_build_object(
        'streak', v_streak_result,
        'challenges', v_challenge_result
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
