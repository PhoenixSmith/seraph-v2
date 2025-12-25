-- ============================================================================
-- GROUP FEATURES MIGRATION
-- Adds: description, invite codes, activity feed, statistics
-- ============================================================================

-- ============================================================================
-- SCHEMA CHANGES
-- ============================================================================

-- Add description and invite_code to groups
ALTER TABLE public.groups
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS invite_code TEXT UNIQUE;

-- Create index on invite_code for fast lookups
CREATE INDEX IF NOT EXISTS idx_groups_invite_code ON public.groups(invite_code);

-- ============================================================================
-- GROUP ACTIVITY TABLE
-- Tracks member reading activity for the activity feed
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.group_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    activity_type TEXT NOT NULL, -- 'chapter_completed', 'joined', 'achievement'
    metadata JSONB NOT NULL DEFAULT '{}', -- { book: string, chapter: number } for chapters
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_group_activities_group ON public.group_activities(group_id);
CREATE INDEX IF NOT EXISTS idx_group_activities_created ON public.group_activities(group_id, created_at DESC);

-- Enable RLS on group_activities
ALTER TABLE public.group_activities ENABLE ROW LEVEL SECURITY;

-- Group members can view activities in their groups
DROP POLICY IF EXISTS "Members can view group activities" ON public.group_activities;
CREATE POLICY "Members can view group activities" ON public.group_activities
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.group_memberships
            WHERE group_id = group_activities.group_id AND user_id = auth.uid()
        )
    );

-- System can insert activities (via SECURITY DEFINER functions)
DROP POLICY IF EXISTS "System can insert activities" ON public.group_activities;
CREATE POLICY "System can insert activities" ON public.group_activities
    FOR INSERT WITH CHECK (true);

-- ============================================================================
-- GENERATE INVITE CODE FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION generate_invite_code()
RETURNS TEXT AS $$
DECLARE
    v_code TEXT;
    v_exists BOOLEAN;
BEGIN
    LOOP
        -- Generate 8-character alphanumeric code
        v_code := upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 8));

        -- Check if code already exists
        SELECT EXISTS(SELECT 1 FROM public.groups WHERE invite_code = v_code) INTO v_exists;

        IF NOT v_exists THEN
            RETURN v_code;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- UPDATE CREATE_GROUP TO INCLUDE DESCRIPTION
-- ============================================================================

-- Drop existing function first (signature changed)
DROP FUNCTION IF EXISTS public.create_group(TEXT);

CREATE OR REPLACE FUNCTION create_group(p_name TEXT, p_description TEXT DEFAULT NULL)
RETURNS UUID AS $$
DECLARE
    v_user_id UUID;
    v_group_id UUID;
    v_trimmed_name TEXT;
    v_invite_code TEXT;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    v_trimmed_name := TRIM(p_name);
    IF LENGTH(v_trimmed_name) < 1 OR LENGTH(v_trimmed_name) > 50 THEN
        RAISE EXCEPTION 'Group name must be 1-50 characters';
    END IF;

    -- Generate unique invite code
    v_invite_code := generate_invite_code();

    -- Create group
    INSERT INTO public.groups (name, description, leader_id, invite_code)
    VALUES (v_trimmed_name, NULLIF(TRIM(COALESCE(p_description, '')), ''), v_user_id, v_invite_code)
    RETURNING id INTO v_group_id;

    -- Add creator as first member
    INSERT INTO public.group_memberships (group_id, user_id)
    VALUES (v_group_id, v_user_id);

    RETURN v_group_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- UPDATE GROUP FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION update_group(p_group_id UUID, p_name TEXT, p_description TEXT DEFAULT NULL)
RETURNS JSONB AS $$
DECLARE
    v_user_id UUID;
    v_group RECORD;
    v_trimmed_name TEXT;
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
        RETURN jsonb_build_object('success', false, 'message', 'Only the leader can edit the group');
    END IF;

    v_trimmed_name := TRIM(p_name);
    IF LENGTH(v_trimmed_name) < 1 OR LENGTH(v_trimmed_name) > 50 THEN
        RETURN jsonb_build_object('success', false, 'message', 'Group name must be 1-50 characters');
    END IF;

    UPDATE public.groups SET
        name = v_trimmed_name,
        description = NULLIF(TRIM(COALESCE(p_description, '')), '')
    WHERE id = p_group_id;

    RETURN jsonb_build_object('success', true, 'message', 'Group updated');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- REGENERATE INVITE CODE
-- ============================================================================

CREATE OR REPLACE FUNCTION regenerate_invite_code(p_group_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_user_id UUID;
    v_group RECORD;
    v_new_code TEXT;
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
        RETURN jsonb_build_object('success', false, 'message', 'Only the leader can regenerate the invite code');
    END IF;

    v_new_code := generate_invite_code();

    UPDATE public.groups SET invite_code = v_new_code WHERE id = p_group_id;

    RETURN jsonb_build_object('success', true, 'invite_code', v_new_code);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- JOIN GROUP BY INVITE CODE
-- ============================================================================

CREATE OR REPLACE FUNCTION join_group_by_code(p_invite_code TEXT)
RETURNS JSONB AS $$
DECLARE
    v_user_id UUID;
    v_group RECORD;
    v_code TEXT;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    v_code := UPPER(TRIM(p_invite_code));

    SELECT * INTO v_group FROM public.groups WHERE invite_code = v_code;
    IF v_group IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Invalid invite code');
    END IF;

    -- Check if already a member
    IF EXISTS (SELECT 1 FROM public.group_memberships WHERE group_id = v_group.id AND user_id = v_user_id) THEN
        RETURN jsonb_build_object('success', false, 'message', 'You are already a member of this group');
    END IF;

    -- Add user to group
    INSERT INTO public.group_memberships (group_id, user_id)
    VALUES (v_group.id, v_user_id);

    -- Record activity
    INSERT INTO public.group_activities (group_id, user_id, activity_type, metadata)
    VALUES (v_group.id, v_user_id, 'joined', '{}'::jsonb);

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Successfully joined the group',
        'group_id', v_group.id,
        'group_name', v_group.name
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- UPDATE GET_GROUP TO INCLUDE NEW FIELDS
-- ============================================================================

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
        'description', v_group.description,
        'leader_id', v_group.leader_id,
        'created_at', v_group.created_at,
        'invite_code', CASE WHEN v_group.leader_id = v_user_id THEN v_group.invite_code ELSE NULL END,
        'leader_name', v_leader.name,
        'is_leader', v_group.leader_id = v_user_id,
        'is_member', v_is_member
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- UPDATE LIST_MY_GROUPS TO INCLUDE DESCRIPTION
-- ============================================================================

-- Drop existing function first (return type changed)
DROP FUNCTION IF EXISTS list_my_groups();

CREATE OR REPLACE FUNCTION list_my_groups()
RETURNS TABLE (
    id UUID,
    name TEXT,
    description TEXT,
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
        g.description,
        g.leader_id,
        g.created_at,
        g.leader_id = v_user_id as is_leader,
        (SELECT COUNT(*) FROM public.group_memberships gm WHERE gm.group_id = g.id) as member_count
    FROM public.groups g
    INNER JOIN public.group_memberships gm ON gm.group_id = g.id
    WHERE gm.user_id = v_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- GET GROUP ACTIVITY FEED
-- ============================================================================

CREATE OR REPLACE FUNCTION get_group_activity_feed(p_group_id UUID, p_limit INTEGER DEFAULT 50)
RETURNS TABLE (
    id UUID,
    user_id UUID,
    user_name TEXT,
    user_avatar_url TEXT,
    activity_type TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ
) AS $$
DECLARE
    v_user_id UUID;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
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
        ga.id,
        ga.user_id,
        p.name as user_name,
        p.avatar_url as user_avatar_url,
        ga.activity_type,
        ga.metadata,
        ga.created_at
    FROM public.group_activities ga
    INNER JOIN public.profiles p ON p.id = ga.user_id
    WHERE ga.group_id = p_group_id
    ORDER BY ga.created_at DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- GET GROUP STATISTICS
-- ============================================================================

CREATE OR REPLACE FUNCTION get_group_statistics(p_group_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_user_id UUID;
    v_total_xp BIGINT;
    v_total_chapters BIGINT;
    v_chapters_this_week BIGINT;
    v_member_count BIGINT;
    v_active_members BIGINT;
    v_week_start DATE;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN NULL;
    END IF;

    -- Verify user is a member
    IF NOT EXISTS (
        SELECT 1 FROM public.group_memberships
        WHERE group_id = p_group_id AND user_id = v_user_id
    ) THEN
        RETURN NULL;
    END IF;

    v_week_start := date_trunc('week', CURRENT_DATE)::DATE;

    -- Get member count
    SELECT COUNT(*) INTO v_member_count
    FROM public.group_memberships
    WHERE group_id = p_group_id;

    -- Get total XP of all members
    SELECT COALESCE(SUM(p.total_xp), 0) INTO v_total_xp
    FROM public.profiles p
    INNER JOIN public.group_memberships gm ON gm.user_id = p.id
    WHERE gm.group_id = p_group_id;

    -- Get total chapters completed by all members (all time)
    SELECT COUNT(*) INTO v_total_chapters
    FROM public.chapter_completions cc
    INNER JOIN public.group_memberships gm ON gm.user_id = cc.user_id
    WHERE gm.group_id = p_group_id;

    -- Get chapters completed this week
    SELECT COUNT(*) INTO v_chapters_this_week
    FROM public.chapter_completions cc
    INNER JOIN public.group_memberships gm ON gm.user_id = cc.user_id
    WHERE gm.group_id = p_group_id
    AND cc.completed_at >= v_week_start;

    -- Get active members (read in the last 7 days)
    SELECT COUNT(DISTINCT p.id) INTO v_active_members
    FROM public.profiles p
    INNER JOIN public.group_memberships gm ON gm.user_id = p.id
    WHERE gm.group_id = p_group_id
    AND p.last_read_date >= CURRENT_DATE - INTERVAL '7 days';

    RETURN jsonb_build_object(
        'member_count', v_member_count,
        'total_xp', v_total_xp,
        'total_chapters', v_total_chapters,
        'chapters_this_week', v_chapters_this_week,
        'active_members', v_active_members
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- UPDATE COMPLETE_CHAPTER TO LOG GROUP ACTIVITY
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
    v_new_total_xp INTEGER;
    v_today DATE := CURRENT_DATE;
    v_group_record RECORD;
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

    -- Log activity for all groups the user is a member of
    FOR v_group_record IN
        SELECT group_id FROM public.group_memberships WHERE user_id = v_user_id
    LOOP
        INSERT INTO public.group_activities (group_id, user_id, activity_type, metadata)
        VALUES (
            v_group_record.group_id,
            v_user_id,
            'chapter_completed',
            jsonb_build_object('book', p_book, 'chapter', p_chapter)
        );
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'already_completed', false,
        'xp_awarded', v_xp_per_chapter
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- UPDATE RESPOND_TO_INVITE TO LOG ACTIVITY
-- ============================================================================

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

        -- Log activity
        INSERT INTO public.group_activities (group_id, user_id, activity_type, metadata)
        VALUES (v_invite.group_id, v_user_id, 'joined', '{}'::jsonb);
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- GENERATE INVITE CODES FOR EXISTING GROUPS
-- ============================================================================

DO $$
DECLARE
    v_group RECORD;
    v_new_code TEXT;
BEGIN
    FOR v_group IN SELECT id FROM public.groups WHERE invite_code IS NULL
    LOOP
        v_new_code := generate_invite_code();
        UPDATE public.groups SET invite_code = v_new_code WHERE id = v_group.id;
    END LOOP;
END $$;
