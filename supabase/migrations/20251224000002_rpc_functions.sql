-- ============================================================================
-- SERAPH BIBLE READER - RPC FUNCTIONS
-- Run this after 001_initial_schema.sql
-- ============================================================================

-- ============================================================================
-- USER QUERIES
-- ============================================================================

-- Get current user with profile data
CREATE OR REPLACE FUNCTION get_current_user()
RETURNS TABLE (
    id UUID,
    name TEXT,
    email TEXT,
    avatar_url TEXT,
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
        p.total_xp,
        p.current_streak,
        p.longest_streak,
        p.last_read_date,
        p.current_tier
    FROM public.profiles p
    WHERE p.id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- TIER FUNCTIONS (must be defined before functions that use them)
-- ============================================================================

-- Recalculate user tier based on rolling XP
CREATE OR REPLACE FUNCTION recalculate_user_tier(p_user_id UUID)
RETURNS TEXT AS $$
DECLARE
    v_rolling_xp INTEGER;
    v_tier TEXT;
    v_cutoff_date DATE := CURRENT_DATE - INTERVAL '14 days';
BEGIN
    -- Calculate 14-day rolling XP
    SELECT COALESCE(SUM(xp_earned), 0) INTO v_rolling_xp
    FROM public.rolling_xp
    WHERE user_id = p_user_id AND date >= v_cutoff_date;

    -- Find appropriate tier
    SELECT tier INTO v_tier
    FROM public.tier_thresholds
    WHERE min_xp <= v_rolling_xp
    ORDER BY tier_order DESC
    LIMIT 1;

    v_tier := COALESCE(v_tier, 'Bronze');

    -- Update user
    UPDATE public.profiles SET current_tier = v_tier WHERE id = p_user_id;

    RETURN v_tier;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- CHAPTER COMPLETION FUNCTIONS
-- ============================================================================

-- Complete a chapter
CREATE OR REPLACE FUNCTION complete_chapter(
    p_book TEXT,
    p_chapter INTEGER
)
RETURNS JSONB AS $$
DECLARE
    v_user_id UUID;
    v_existing RECORD;
    v_xp_per_chapter INTEGER := 10;
    v_new_total_xp INTEGER;
    v_today DATE := CURRENT_DATE;
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
            'xp_awarded', 0
        );
    END IF;

    -- Record completion
    INSERT INTO public.chapter_completions (user_id, book, chapter, xp_awarded)
    VALUES (v_user_id, p_book, p_chapter, v_xp_per_chapter);

    -- Update user XP
    UPDATE public.profiles
    SET total_xp = COALESCE(total_xp, 0) + v_xp_per_chapter
    WHERE id = v_user_id
    RETURNING total_xp INTO v_new_total_xp;

    -- Update rolling XP
    INSERT INTO public.rolling_xp (user_id, date, xp_earned)
    VALUES (v_user_id, v_today, v_xp_per_chapter)
    ON CONFLICT (user_id, date)
    DO UPDATE SET xp_earned = rolling_xp.xp_earned + v_xp_per_chapter;

    -- Recalculate tier
    PERFORM recalculate_user_tier(v_user_id);

    RETURN jsonb_build_object(
        'success', true,
        'already_completed', false,
        'xp_awarded', v_xp_per_chapter
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get completed chapters for a book
CREATE OR REPLACE FUNCTION get_completed_chapters_for_book(p_book TEXT)
RETURNS INTEGER[] AS $$
BEGIN
    RETURN ARRAY(
        SELECT chapter
        FROM public.chapter_completions
        WHERE user_id = auth.uid() AND book = p_book
        ORDER BY chapter
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get book progress
CREATE OR REPLACE FUNCTION get_book_progress(p_book TEXT, p_total_chapters INTEGER)
RETURNS JSONB AS $$
DECLARE
    v_completed INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_completed
    FROM public.chapter_completions
    WHERE user_id = auth.uid() AND book = p_book;

    RETURN jsonb_build_object(
        'completed', v_completed,
        'total', p_total_chapters,
        'percentage', ROUND((v_completed::NUMERIC / p_total_chapters) * 100),
        'is_complete', v_completed >= p_total_chapters
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- PROGRESS / STREAK FUNCTIONS
-- ============================================================================

-- Record verse read (updates streak and XP)
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

    RETURN jsonb_build_object(
        'xp_awarded', v_xp_per_verse,
        'total_xp', v_new_total_xp,
        'current_streak', v_new_streak,
        'streak_updated', v_streak_updated
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Record quiz answer
CREATE OR REPLACE FUNCTION record_quiz_answer(p_correct BOOLEAN, p_book TEXT, p_chapter INTEGER)
RETURNS JSONB AS $$
DECLARE
    v_user_id UUID;
    v_xp_per_correct INTEGER := 5;
    v_new_total_xp INTEGER;
    v_today DATE := CURRENT_DATE;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    IF NOT p_correct THEN
        SELECT total_xp INTO v_new_total_xp FROM public.profiles WHERE id = v_user_id;
        RETURN jsonb_build_object('xp_awarded', 0, 'total_xp', COALESCE(v_new_total_xp, 0));
    END IF;

    -- Update user XP
    UPDATE public.profiles
    SET total_xp = COALESCE(total_xp, 0) + v_xp_per_correct
    WHERE id = v_user_id
    RETURNING total_xp INTO v_new_total_xp;

    -- Update rolling XP
    INSERT INTO public.rolling_xp (user_id, date, xp_earned)
    VALUES (v_user_id, v_today, v_xp_per_correct)
    ON CONFLICT (user_id, date)
    DO UPDATE SET xp_earned = rolling_xp.xp_earned + v_xp_per_correct;

    -- Recalculate tier
    PERFORM recalculate_user_tier(v_user_id);

    RETURN jsonb_build_object(
        'xp_awarded', v_xp_per_correct,
        'total_xp', v_new_total_xp
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- MORE TIER FUNCTIONS
-- ============================================================================

-- Get current user tier info
CREATE OR REPLACE FUNCTION get_current_user_tier()
RETURNS JSONB AS $$
DECLARE
    v_user_id UUID;
    v_rolling_xp INTEGER;
    v_tier RECORD;
    v_next_tier RECORD;
    v_cutoff_date DATE := CURRENT_DATE - INTERVAL '14 days';
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN NULL;
    END IF;

    -- Calculate 14-day rolling XP
    SELECT COALESCE(SUM(xp_earned), 0) INTO v_rolling_xp
    FROM public.rolling_xp
    WHERE user_id = v_user_id AND date >= v_cutoff_date;

    -- Find current tier
    SELECT * INTO v_tier
    FROM public.tier_thresholds
    WHERE min_xp <= v_rolling_xp
    ORDER BY tier_order DESC
    LIMIT 1;

    -- Find next tier
    SELECT * INTO v_next_tier
    FROM public.tier_thresholds
    WHERE tier_order = v_tier.tier_order + 1;

    RETURN jsonb_build_object(
        'tier', v_tier.tier,
        'color', v_tier.color,
        'rolling_xp', v_rolling_xp,
        'next_tier', v_next_tier.tier,
        'xp_to_next_tier', CASE WHEN v_next_tier IS NOT NULL THEN v_next_tier.min_xp - v_rolling_xp ELSE NULL END
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get rolling XP history
CREATE OR REPLACE FUNCTION get_rolling_xp_history(p_days INTEGER DEFAULT 14)
RETURNS TABLE (date DATE, xp INTEGER) AS $$
DECLARE
    v_user_id UUID;
    v_cutoff_date DATE;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN;
    END IF;

    v_cutoff_date := CURRENT_DATE - (p_days || ' days')::INTERVAL;

    RETURN QUERY
    WITH date_series AS (
        SELECT generate_series(v_cutoff_date, CURRENT_DATE, '1 day'::INTERVAL)::DATE as d
    )
    SELECT
        ds.d as date,
        COALESCE(rx.xp_earned, 0)::INTEGER as xp
    FROM date_series ds
    LEFT JOIN public.rolling_xp rx ON rx.date = ds.d AND rx.user_id = v_user_id
    ORDER BY ds.d;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get global leaderboard
CREATE OR REPLACE FUNCTION get_global_leaderboard(p_limit INTEGER DEFAULT 50)
RETURNS TABLE (
    user_id UUID,
    name TEXT,
    avatar_url TEXT,
    rolling_xp BIGINT,
    tier TEXT,
    tier_color TEXT,
    rank BIGINT,
    is_current_user BOOLEAN
) AS $$
DECLARE
    v_current_user UUID;
    v_cutoff_date DATE := CURRENT_DATE - INTERVAL '14 days';
BEGIN
    v_current_user := auth.uid();

    RETURN QUERY
    WITH user_xp AS (
        SELECT
            rx.user_id,
            SUM(rx.xp_earned) as total_rolling_xp
        FROM public.rolling_xp rx
        WHERE rx.date >= v_cutoff_date
        GROUP BY rx.user_id
    ),
    ranked AS (
        SELECT
            p.id as user_id,
            p.name,
            p.avatar_url,
            COALESCE(ux.total_rolling_xp, 0) as rolling_xp,
            COALESCE(
                (SELECT t.tier FROM public.tier_thresholds t
                 WHERE t.min_xp <= COALESCE(ux.total_rolling_xp, 0)
                 ORDER BY t.tier_order DESC LIMIT 1),
                'Bronze'
            ) as tier,
            COALESCE(
                (SELECT t.color FROM public.tier_thresholds t
                 WHERE t.min_xp <= COALESCE(ux.total_rolling_xp, 0)
                 ORDER BY t.tier_order DESC LIMIT 1),
                '#CD7F32'
            ) as tier_color,
            ROW_NUMBER() OVER (ORDER BY COALESCE(ux.total_rolling_xp, 0) DESC) as rank,
            p.id = v_current_user as is_current_user
        FROM public.profiles p
        LEFT JOIN user_xp ux ON ux.user_id = p.id
    )
    SELECT * FROM ranked
    WHERE ranked.rolling_xp > 0
    ORDER BY ranked.rank
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- GROUP FUNCTIONS
-- ============================================================================

-- List user's groups
CREATE OR REPLACE FUNCTION list_my_groups()
RETURNS TABLE (
    id UUID,
    name TEXT,
    leader_id UUID,
    created_at TIMESTAMPTZ,
    is_leader BOOLEAN,
    member_count BIGINT
) AS $$
DECLARE
    v_user_id UUID;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN;
    END IF;

    RETURN QUERY
    SELECT
        g.id,
        g.name,
        g.leader_id,
        g.created_at,
        g.leader_id = v_user_id as is_leader,
        (SELECT COUNT(*) FROM public.group_memberships gm WHERE gm.group_id = g.id) as member_count
    FROM public.groups g
    INNER JOIN public.group_memberships gm ON gm.group_id = g.id
    WHERE gm.user_id = v_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get group details
CREATE OR REPLACE FUNCTION get_group(p_group_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_user_id UUID;
    v_group RECORD;
    v_leader RECORD;
    v_is_member BOOLEAN;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN NULL;
    END IF;

    SELECT * INTO v_group FROM public.groups WHERE id = p_group_id;
    IF v_group IS NULL THEN
        RETURN NULL;
    END IF;

    SELECT * INTO v_leader FROM public.profiles WHERE id = v_group.leader_id;

    SELECT EXISTS(
        SELECT 1 FROM public.group_memberships
        WHERE group_id = p_group_id AND user_id = v_user_id
    ) INTO v_is_member;

    RETURN jsonb_build_object(
        'id', v_group.id,
        'name', v_group.name,
        'leader_id', v_group.leader_id,
        'created_at', v_group.created_at,
        'leader_name', v_leader.name,
        'is_leader', v_group.leader_id = v_user_id,
        'is_member', v_is_member
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get group leaderboard
CREATE OR REPLACE FUNCTION get_group_leaderboard(p_group_id UUID)
RETURNS TABLE (
    user_id UUID,
    name TEXT,
    avatar_url TEXT,
    total_xp INTEGER,
    current_streak INTEGER,
    rank BIGINT,
    is_leader BOOLEAN,
    is_current_user BOOLEAN
) AS $$
DECLARE
    v_user_id UUID;
    v_group RECORD;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN;
    END IF;

    SELECT * INTO v_group FROM public.groups WHERE id = p_group_id;
    IF v_group IS NULL THEN
        RETURN;
    END IF;

    -- Verify user is a member
    IF NOT EXISTS (
        SELECT 1 FROM public.group_memberships
        WHERE group_id = p_group_id AND user_id = v_user_id
    ) THEN
        RETURN;
    END IF;

    RETURN QUERY
    SELECT
        p.id as user_id,
        p.name,
        p.avatar_url,
        COALESCE(p.total_xp, 0) as total_xp,
        COALESCE(p.current_streak, 0) as current_streak,
        ROW_NUMBER() OVER (ORDER BY COALESCE(p.total_xp, 0) DESC) as rank,
        p.id = v_group.leader_id as is_leader,
        p.id = v_user_id as is_current_user
    FROM public.profiles p
    INNER JOIN public.group_memberships gm ON gm.user_id = p.id
    WHERE gm.group_id = p_group_id
    ORDER BY COALESCE(p.total_xp, 0) DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create group
CREATE OR REPLACE FUNCTION create_group(p_name TEXT)
RETURNS UUID AS $$
DECLARE
    v_user_id UUID;
    v_group_id UUID;
    v_trimmed_name TEXT;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    v_trimmed_name := TRIM(p_name);
    IF LENGTH(v_trimmed_name) < 1 OR LENGTH(v_trimmed_name) > 50 THEN
        RAISE EXCEPTION 'Group name must be 1-50 characters';
    END IF;

    -- Create group
    INSERT INTO public.groups (name, leader_id)
    VALUES (v_trimmed_name, v_user_id)
    RETURNING id INTO v_group_id;

    -- Add creator as first member
    INSERT INTO public.group_memberships (group_id, user_id)
    VALUES (v_group_id, v_user_id);

    RETURN v_group_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Invite to group
CREATE OR REPLACE FUNCTION invite_to_group(p_group_id UUID, p_identifier TEXT)
RETURNS JSONB AS $$
DECLARE
    v_user_id UUID;
    v_group RECORD;
    v_invited_user RECORD;
    v_identifier TEXT;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    SELECT * INTO v_group FROM public.groups WHERE id = p_group_id;
    IF v_group IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Group not found');
    END IF;

    IF v_group.leader_id != v_user_id THEN
        RETURN jsonb_build_object('success', false, 'message', 'Only the group leader can invite members');
    END IF;

    v_identifier := TRIM(p_identifier);

    -- Try email first
    IF v_identifier LIKE '%@%' THEN
        SELECT * INTO v_invited_user FROM public.profiles WHERE email = v_identifier;
    END IF;

    -- Try name if not found
    IF v_invited_user IS NULL THEN
        SELECT * INTO v_invited_user FROM public.profiles WHERE name = v_identifier;
    END IF;

    IF v_invited_user IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'User not found');
    END IF;

    IF v_invited_user.id = v_user_id THEN
        RETURN jsonb_build_object('success', false, 'message', 'You cannot invite yourself');
    END IF;

    -- Check if already a member
    IF EXISTS (SELECT 1 FROM public.group_memberships WHERE group_id = p_group_id AND user_id = v_invited_user.id) THEN
        RETURN jsonb_build_object('success', false, 'message', 'User is already a member');
    END IF;

    -- Check for existing pending invite
    IF EXISTS (SELECT 1 FROM public.group_invites WHERE group_id = p_group_id AND invited_user_id = v_invited_user.id AND status = 'pending') THEN
        RETURN jsonb_build_object('success', false, 'message', 'Invite already sent');
    END IF;

    -- Create invite
    INSERT INTO public.group_invites (group_id, invited_user_id, invited_by_user_id)
    VALUES (p_group_id, v_invited_user.id, v_user_id)
    ON CONFLICT (group_id, invited_user_id)
    DO UPDATE SET status = 'pending', invited_by_user_id = v_user_id, created_at = NOW(), responded_at = NULL;

    RETURN jsonb_build_object('success', true, 'message', 'Invite sent');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Respond to invite
CREATE OR REPLACE FUNCTION respond_to_invite(p_invite_id UUID, p_accept BOOLEAN)
RETURNS VOID AS $$
DECLARE
    v_user_id UUID;
    v_invite RECORD;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    SELECT * INTO v_invite FROM public.group_invites WHERE id = p_invite_id;
    IF v_invite IS NULL THEN
        RAISE EXCEPTION 'Invite not found';
    END IF;

    IF v_invite.invited_user_id != v_user_id THEN
        RAISE EXCEPTION 'This invite is not for you';
    END IF;

    IF v_invite.status != 'pending' THEN
        RAISE EXCEPTION 'Invite already responded to';
    END IF;

    UPDATE public.group_invites SET
        status = CASE WHEN p_accept THEN 'accepted' ELSE 'declined' END,
        responded_at = NOW()
    WHERE id = p_invite_id;

    IF p_accept THEN
        INSERT INTO public.group_memberships (group_id, user_id)
        VALUES (v_invite.group_id, v_user_id);
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get pending invites for current user
CREATE OR REPLACE FUNCTION get_pending_invites()
RETURNS TABLE (
    id UUID,
    group_id UUID,
    group_name TEXT,
    invited_by_name TEXT,
    created_at TIMESTAMPTZ
) AS $$
DECLARE
    v_user_id UUID;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN;
    END IF;

    RETURN QUERY
    SELECT
        gi.id,
        gi.group_id,
        g.name as group_name,
        p.name as invited_by_name,
        gi.created_at
    FROM public.group_invites gi
    INNER JOIN public.groups g ON g.id = gi.group_id
    LEFT JOIN public.profiles p ON p.id = gi.invited_by_user_id
    WHERE gi.invited_user_id = v_user_id AND gi.status = 'pending';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Leave group
CREATE OR REPLACE FUNCTION leave_group(p_group_id UUID)
RETURNS VOID AS $$
DECLARE
    v_user_id UUID;
    v_group RECORD;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    SELECT * INTO v_group FROM public.groups WHERE id = p_group_id;
    IF v_group IS NULL THEN
        RAISE EXCEPTION 'Group not found';
    END IF;

    IF v_group.leader_id = v_user_id THEN
        RAISE EXCEPTION 'Transfer leadership before leaving the group';
    END IF;

    DELETE FROM public.group_memberships WHERE group_id = p_group_id AND user_id = v_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Transfer leadership
CREATE OR REPLACE FUNCTION transfer_leadership(p_group_id UUID, p_new_leader_id UUID)
RETURNS VOID AS $$
DECLARE
    v_user_id UUID;
    v_group RECORD;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    SELECT * INTO v_group FROM public.groups WHERE id = p_group_id;
    IF v_group IS NULL THEN
        RAISE EXCEPTION 'Group not found';
    END IF;

    IF v_group.leader_id != v_user_id THEN
        RAISE EXCEPTION 'Only the leader can transfer leadership';
    END IF;

    IF p_new_leader_id = v_user_id THEN
        RAISE EXCEPTION 'You are already the leader';
    END IF;

    -- Verify new leader is a member
    IF NOT EXISTS (SELECT 1 FROM public.group_memberships WHERE group_id = p_group_id AND user_id = p_new_leader_id) THEN
        RAISE EXCEPTION 'New leader must be a group member';
    END IF;

    UPDATE public.groups SET leader_id = p_new_leader_id WHERE id = p_group_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Delete group
CREATE OR REPLACE FUNCTION delete_group(p_group_id UUID)
RETURNS VOID AS $$
DECLARE
    v_user_id UUID;
    v_group RECORD;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    SELECT * INTO v_group FROM public.groups WHERE id = p_group_id;
    IF v_group IS NULL THEN
        RAISE EXCEPTION 'Group not found';
    END IF;

    IF v_group.leader_id != v_user_id THEN
        RAISE EXCEPTION 'Only the leader can delete the group';
    END IF;

    -- Delete group (CASCADE will handle memberships and invites)
    DELETE FROM public.groups WHERE id = p_group_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Remove member
CREATE OR REPLACE FUNCTION remove_member(p_group_id UUID, p_member_id UUID)
RETURNS VOID AS $$
DECLARE
    v_user_id UUID;
    v_group RECORD;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    SELECT * INTO v_group FROM public.groups WHERE id = p_group_id;
    IF v_group IS NULL THEN
        RAISE EXCEPTION 'Group not found';
    END IF;

    IF v_group.leader_id != v_user_id THEN
        RAISE EXCEPTION 'Only the leader can remove members';
    END IF;

    IF p_member_id = v_user_id THEN
        RAISE EXCEPTION 'Cannot remove yourself. Transfer leadership first.';
    END IF;

    DELETE FROM public.group_memberships WHERE group_id = p_group_id AND user_id = p_member_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Cancel invite
CREATE OR REPLACE FUNCTION cancel_invite(p_invite_id UUID)
RETURNS VOID AS $$
DECLARE
    v_user_id UUID;
    v_invite RECORD;
    v_group RECORD;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    SELECT * INTO v_invite FROM public.group_invites WHERE id = p_invite_id;
    IF v_invite IS NULL THEN
        RAISE EXCEPTION 'Invite not found';
    END IF;

    SELECT * INTO v_group FROM public.groups WHERE id = v_invite.group_id;
    IF v_group IS NULL OR v_group.leader_id != v_user_id THEN
        RAISE EXCEPTION 'Only the group leader can cancel invites';
    END IF;

    DELETE FROM public.group_invites WHERE id = p_invite_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get group pending invites (for leaders)
CREATE OR REPLACE FUNCTION get_group_pending_invites(p_group_id UUID)
RETURNS TABLE (
    id UUID,
    invited_user_name TEXT,
    invited_user_email TEXT,
    created_at TIMESTAMPTZ
) AS $$
DECLARE
    v_user_id UUID;
    v_group RECORD;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN;
    END IF;

    SELECT * INTO v_group FROM public.groups WHERE id = p_group_id;
    IF v_group IS NULL OR v_group.leader_id != v_user_id THEN
        RETURN;
    END IF;

    RETURN QUERY
    SELECT
        gi.id,
        p.name as invited_user_name,
        p.email as invited_user_email,
        gi.created_at
    FROM public.group_invites gi
    LEFT JOIN public.profiles p ON p.id = gi.invited_user_id
    WHERE gi.group_id = p_group_id AND gi.status = 'pending';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- ACHIEVEMENT FUNCTIONS
-- ============================================================================

-- Get all achievements with unlock status
CREATE OR REPLACE FUNCTION get_achievements_with_status()
RETURNS TABLE (
    id UUID,
    key TEXT,
    name TEXT,
    description TEXT,
    icon TEXT,
    category TEXT,
    xp_reward INTEGER,
    unlocked BOOLEAN,
    unlocked_at TIMESTAMPTZ
) AS $$
DECLARE
    v_user_id UUID;
BEGIN
    v_user_id := auth.uid();

    RETURN QUERY
    SELECT
        a.id,
        a.key,
        a.name,
        a.description,
        a.icon,
        a.category::TEXT,
        a.xp_reward,
        CASE WHEN ua.id IS NOT NULL THEN true ELSE false END as unlocked,
        ua.unlocked_at
    FROM public.achievements a
    LEFT JOIN public.user_achievements ua ON ua.achievement_id = a.id AND ua.user_id = v_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get achievement stats
CREATE OR REPLACE FUNCTION get_achievement_stats()
RETURNS JSONB AS $$
DECLARE
    v_user_id UUID;
    v_total INTEGER;
    v_unlocked INTEGER;
BEGIN
    v_user_id := auth.uid();

    SELECT COUNT(*) INTO v_total FROM public.achievements;

    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('unlocked', 0, 'total', v_total, 'percentage', 0);
    END IF;

    SELECT COUNT(*) INTO v_unlocked
    FROM public.user_achievements
    WHERE user_id = v_user_id;

    RETURN jsonb_build_object(
        'unlocked', v_unlocked,
        'total', v_total,
        'percentage', CASE WHEN v_total > 0 THEN ROUND((v_unlocked::NUMERIC / v_total) * 100) ELSE 0 END
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- CLEANUP FUNCTION (for scheduled jobs)
-- ============================================================================

-- Cleanup old rolling XP records (keep 30 days)
CREATE OR REPLACE FUNCTION cleanup_old_rolling_xp()
RETURNS INTEGER AS $$
DECLARE
    v_deleted INTEGER;
BEGIN
    DELETE FROM public.rolling_xp WHERE date < CURRENT_DATE - INTERVAL '30 days';
    GET DIAGNOSTICS v_deleted = ROW_COUNT;
    RETURN v_deleted;
END;
$$ LANGUAGE plpgsql;
