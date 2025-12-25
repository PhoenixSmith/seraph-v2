-- ============================================================================
-- GROUP CHALLENGES MIGRATION
-- Adds: 1v1 group challenges with per-capita XP scoring
-- ============================================================================

-- ============================================================================
-- GROUP CHALLENGES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.group_challenges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    challenger_group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
    challenged_group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES public.profiles(id),
    status TEXT NOT NULL DEFAULT 'pending', -- pending, active, completed, declined, cancelled

    -- Timing
    created_at TIMESTAMPTZ DEFAULT NOW(),
    responded_at TIMESTAMPTZ,
    start_time TIMESTAMPTZ,  -- Set when accepted
    end_time TIMESTAMPTZ,    -- start_time + 7 days

    -- Active member counts (snapshot at challenge start for per-capita calculation)
    -- Only counts members active in last 7 days to not penalize groups with inactive members
    challenger_member_count INTEGER DEFAULT 0,
    challenged_member_count INTEGER DEFAULT 0,

    -- Result
    winner_group_id UUID REFERENCES public.groups(id),

    CONSTRAINT different_groups CHECK (challenger_group_id != challenged_group_id)
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_challenges_challenger ON public.group_challenges(challenger_group_id);
CREATE INDEX IF NOT EXISTS idx_challenges_challenged ON public.group_challenges(challenged_group_id);
CREATE INDEX IF NOT EXISTS idx_challenges_status ON public.group_challenges(status);
CREATE INDEX IF NOT EXISTS idx_challenges_end_time ON public.group_challenges(end_time) WHERE status = 'active';

-- Enable RLS
ALTER TABLE public.group_challenges ENABLE ROW LEVEL SECURITY;

-- Members of either group can view challenges
DROP POLICY IF EXISTS "Members can view challenges" ON public.group_challenges;
CREATE POLICY "Members can view challenges" ON public.group_challenges
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.group_memberships
            WHERE user_id = auth.uid()
            AND group_id IN (challenger_group_id, challenged_group_id)
        )
    );

-- Insert/update via SECURITY DEFINER functions only
DROP POLICY IF EXISTS "System can manage challenges" ON public.group_challenges;
CREATE POLICY "System can manage challenges" ON public.group_challenges
    FOR ALL USING (true) WITH CHECK (true);

-- ============================================================================
-- HELPER: Get group XP earned during a date range
-- ============================================================================

CREATE OR REPLACE FUNCTION get_group_xp_in_range(
    p_group_id UUID,
    p_start_date DATE,
    p_end_date DATE
)
RETURNS BIGINT AS $$
DECLARE
    v_total_xp BIGINT;
BEGIN
    SELECT COALESCE(SUM(rx.xp_earned), 0) INTO v_total_xp
    FROM public.rolling_xp rx
    INNER JOIN public.group_memberships gm ON gm.user_id = rx.user_id
    WHERE gm.group_id = p_group_id
    AND rx.date >= p_start_date
    AND rx.date <= p_end_date;

    RETURN v_total_xp;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- CREATE CHALLENGE
-- Only group leader can create a challenge
-- ============================================================================

CREATE OR REPLACE FUNCTION create_challenge(
    p_challenger_group_id UUID,
    p_challenged_group_id UUID
)
RETURNS JSONB AS $$
DECLARE
    v_user_id UUID;
    v_challenger_group RECORD;
    v_challenged_group RECORD;
    v_challenge_id UUID;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- Verify challenger group exists and user is leader
    SELECT * INTO v_challenger_group FROM public.groups WHERE id = p_challenger_group_id;
    IF v_challenger_group IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Challenger group not found');
    END IF;

    IF v_challenger_group.leader_id != v_user_id THEN
        RETURN jsonb_build_object('success', false, 'message', 'Only the group leader can create challenges');
    END IF;

    -- Verify challenged group exists
    SELECT * INTO v_challenged_group FROM public.groups WHERE id = p_challenged_group_id;
    IF v_challenged_group IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Challenged group not found');
    END IF;

    -- Check not challenging self
    IF p_challenger_group_id = p_challenged_group_id THEN
        RETURN jsonb_build_object('success', false, 'message', 'Cannot challenge your own group');
    END IF;

    -- Check for existing pending/active challenge between these groups
    IF EXISTS (
        SELECT 1 FROM public.group_challenges
        WHERE status IN ('pending', 'active')
        AND (
            (challenger_group_id = p_challenger_group_id AND challenged_group_id = p_challenged_group_id)
            OR (challenger_group_id = p_challenged_group_id AND challenged_group_id = p_challenger_group_id)
        )
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'There is already an active or pending challenge between these groups');
    END IF;

    -- Create the challenge
    INSERT INTO public.group_challenges (
        challenger_group_id,
        challenged_group_id,
        created_by,
        status
    ) VALUES (
        p_challenger_group_id,
        p_challenged_group_id,
        v_user_id,
        'pending'
    ) RETURNING id INTO v_challenge_id;

    RETURN jsonb_build_object(
        'success', true,
        'challenge_id', v_challenge_id,
        'message', 'Challenge sent to ' || v_challenged_group.name
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- RESPOND TO CHALLENGE
-- Only challenged group leader can accept/decline
-- ============================================================================

CREATE OR REPLACE FUNCTION respond_to_challenge(
    p_challenge_id UUID,
    p_accept BOOLEAN
)
RETURNS JSONB AS $$
DECLARE
    v_user_id UUID;
    v_challenge RECORD;
    v_challenged_group RECORD;
    v_challenger_count INTEGER;
    v_challenged_count INTEGER;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- Get the challenge
    SELECT * INTO v_challenge FROM public.group_challenges WHERE id = p_challenge_id;
    IF v_challenge IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Challenge not found');
    END IF;

    IF v_challenge.status != 'pending' THEN
        RETURN jsonb_build_object('success', false, 'message', 'This challenge is no longer pending');
    END IF;

    -- Verify user is leader of challenged group
    SELECT * INTO v_challenged_group FROM public.groups WHERE id = v_challenge.challenged_group_id;
    IF v_challenged_group.leader_id != v_user_id THEN
        RETURN jsonb_build_object('success', false, 'message', 'Only the challenged group leader can respond');
    END IF;

    IF p_accept THEN
        -- Get ACTIVE member counts at start of challenge (active in last 7 days)
        -- This ensures groups aren't penalized for having inactive members
        SELECT COUNT(DISTINCT gm.user_id) INTO v_challenger_count
        FROM public.group_memberships gm
        INNER JOIN public.profiles p ON p.id = gm.user_id
        WHERE gm.group_id = v_challenge.challenger_group_id
        AND p.last_read_date >= CURRENT_DATE - INTERVAL '7 days';

        SELECT COUNT(DISTINCT gm.user_id) INTO v_challenged_count
        FROM public.group_memberships gm
        INNER JOIN public.profiles p ON p.id = gm.user_id
        WHERE gm.group_id = v_challenge.challenged_group_id
        AND p.last_read_date >= CURRENT_DATE - INTERVAL '7 days';

        -- Ensure at least 1 active member per group to avoid division by zero
        v_challenger_count := GREATEST(v_challenger_count, 1);
        v_challenged_count := GREATEST(v_challenged_count, 1);

        -- Accept and start the challenge
        UPDATE public.group_challenges SET
            status = 'active',
            responded_at = NOW(),
            start_time = NOW(),
            end_time = NOW() + INTERVAL '7 days',
            challenger_member_count = v_challenger_count,
            challenged_member_count = v_challenged_count
        WHERE id = p_challenge_id;

        RETURN jsonb_build_object('success', true, 'message', 'Challenge accepted! The battle begins now.');
    ELSE
        -- Decline the challenge
        UPDATE public.group_challenges SET
            status = 'declined',
            responded_at = NOW()
        WHERE id = p_challenge_id;

        RETURN jsonb_build_object('success', true, 'message', 'Challenge declined');
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- CANCEL CHALLENGE
-- Only challenger leader can cancel pending challenges
-- ============================================================================

CREATE OR REPLACE FUNCTION cancel_challenge(p_challenge_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_user_id UUID;
    v_challenge RECORD;
    v_challenger_group RECORD;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- Get the challenge
    SELECT * INTO v_challenge FROM public.group_challenges WHERE id = p_challenge_id;
    IF v_challenge IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Challenge not found');
    END IF;

    IF v_challenge.status != 'pending' THEN
        RETURN jsonb_build_object('success', false, 'message', 'Can only cancel pending challenges');
    END IF;

    -- Verify user is leader of challenger group
    SELECT * INTO v_challenger_group FROM public.groups WHERE id = v_challenge.challenger_group_id;
    IF v_challenger_group.leader_id != v_user_id THEN
        RETURN jsonb_build_object('success', false, 'message', 'Only the challenger group leader can cancel');
    END IF;

    UPDATE public.group_challenges SET status = 'cancelled' WHERE id = p_challenge_id;

    RETURN jsonb_build_object('success', true, 'message', 'Challenge cancelled');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- GET GROUP CHALLENGES
-- Returns all challenges for a group with calculated scores
-- ============================================================================

CREATE OR REPLACE FUNCTION get_group_challenges(p_group_id UUID)
RETURNS TABLE (
    id UUID,
    challenger_group_id UUID,
    challenger_group_name TEXT,
    challenged_group_id UUID,
    challenged_group_name TEXT,
    status TEXT,
    created_at TIMESTAMPTZ,
    start_time TIMESTAMPTZ,
    end_time TIMESTAMPTZ,
    challenger_member_count INTEGER,
    challenged_member_count INTEGER,
    challenger_xp_earned BIGINT,
    challenged_xp_earned BIGINT,
    challenger_score NUMERIC,
    challenged_score NUMERIC,
    winner_group_id UUID,
    is_challenger BOOLEAN,
    is_challenged BOOLEAN,
    can_respond BOOLEAN,
    can_cancel BOOLEAN
) AS $$
DECLARE
    v_user_id UUID;
    v_is_member BOOLEAN;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN;
    END IF;

    -- Verify user is a member of this group
    SELECT EXISTS(
        SELECT 1 FROM public.group_memberships
        WHERE group_id = p_group_id AND user_id = v_user_id
    ) INTO v_is_member;

    IF NOT v_is_member THEN
        RETURN;
    END IF;

    RETURN QUERY
    SELECT
        c.id,
        c.challenger_group_id,
        g1.name as challenger_group_name,
        c.challenged_group_id,
        g2.name as challenged_group_name,
        c.status,
        c.created_at,
        c.start_time,
        c.end_time,
        c.challenger_member_count,
        c.challenged_member_count,
        -- Calculate XP earned during challenge period
        CASE WHEN c.status = 'active' OR c.status = 'completed' THEN
            get_group_xp_in_range(c.challenger_group_id, c.start_time::DATE, LEAST(c.end_time, NOW())::DATE)
        ELSE 0::BIGINT END as challenger_xp_earned,
        CASE WHEN c.status = 'active' OR c.status = 'completed' THEN
            get_group_xp_in_range(c.challenged_group_id, c.start_time::DATE, LEAST(c.end_time, NOW())::DATE)
        ELSE 0::BIGINT END as challenged_xp_earned,
        -- Calculate per-capita scores
        CASE WHEN c.status IN ('active', 'completed') AND c.challenger_member_count > 0 THEN
            ROUND(get_group_xp_in_range(c.challenger_group_id, c.start_time::DATE, LEAST(c.end_time, NOW())::DATE)::NUMERIC / c.challenger_member_count, 1)
        ELSE 0::NUMERIC END as challenger_score,
        CASE WHEN c.status IN ('active', 'completed') AND c.challenged_member_count > 0 THEN
            ROUND(get_group_xp_in_range(c.challenged_group_id, c.start_time::DATE, LEAST(c.end_time, NOW())::DATE)::NUMERIC / c.challenged_member_count, 1)
        ELSE 0::NUMERIC END as challenged_score,
        c.winner_group_id,
        c.challenger_group_id = p_group_id as is_challenger,
        c.challenged_group_id = p_group_id as is_challenged,
        -- Can respond if user is leader of challenged group and status is pending
        (c.challenged_group_id = p_group_id AND c.status = 'pending' AND g2.leader_id = v_user_id) as can_respond,
        -- Can cancel if user is leader of challenger group and status is pending
        (c.challenger_group_id = p_group_id AND c.status = 'pending' AND g1.leader_id = v_user_id) as can_cancel
    FROM public.group_challenges c
    INNER JOIN public.groups g1 ON g1.id = c.challenger_group_id
    INNER JOIN public.groups g2 ON g2.id = c.challenged_group_id
    WHERE c.challenger_group_id = p_group_id OR c.challenged_group_id = p_group_id
    ORDER BY
        CASE c.status
            WHEN 'active' THEN 1
            WHEN 'pending' THEN 2
            WHEN 'completed' THEN 3
            ELSE 4
        END,
        c.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- COMPLETE EXPIRED CHALLENGES
-- Should be called periodically (e.g., by cron job)
-- ============================================================================

CREATE OR REPLACE FUNCTION complete_expired_challenges()
RETURNS INTEGER AS $$
DECLARE
    v_challenge RECORD;
    v_challenger_xp BIGINT;
    v_challenged_xp BIGINT;
    v_challenger_score NUMERIC;
    v_challenged_score NUMERIC;
    v_winner_id UUID;
    v_count INTEGER := 0;
BEGIN
    FOR v_challenge IN
        SELECT * FROM public.group_challenges
        WHERE status = 'active' AND end_time <= NOW()
    LOOP
        -- Calculate final XP for each group
        v_challenger_xp := get_group_xp_in_range(
            v_challenge.challenger_group_id,
            v_challenge.start_time::DATE,
            v_challenge.end_time::DATE
        );
        v_challenged_xp := get_group_xp_in_range(
            v_challenge.challenged_group_id,
            v_challenge.start_time::DATE,
            v_challenge.end_time::DATE
        );

        -- Calculate per-capita scores
        v_challenger_score := CASE
            WHEN v_challenge.challenger_member_count > 0
            THEN v_challenger_xp::NUMERIC / v_challenge.challenger_member_count
            ELSE 0
        END;
        v_challenged_score := CASE
            WHEN v_challenge.challenged_member_count > 0
            THEN v_challenged_xp::NUMERIC / v_challenge.challenged_member_count
            ELSE 0
        END;

        -- Determine winner (NULL if tie)
        IF v_challenger_score > v_challenged_score THEN
            v_winner_id := v_challenge.challenger_group_id;
        ELSIF v_challenged_score > v_challenger_score THEN
            v_winner_id := v_challenge.challenged_group_id;
        ELSE
            v_winner_id := NULL; -- Tie
        END IF;

        -- Update challenge
        UPDATE public.group_challenges SET
            status = 'completed',
            winner_group_id = v_winner_id
        WHERE id = v_challenge.id;

        v_count := v_count + 1;
    END LOOP;

    RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- LOOKUP GROUP BY ID (for challenge creation)
-- Returns basic group info for validation
-- ============================================================================

CREATE OR REPLACE FUNCTION lookup_group_for_challenge(p_group_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_group RECORD;
BEGIN
    SELECT id, name INTO v_group FROM public.groups WHERE id = p_group_id;

    IF v_group IS NULL THEN
        RETURN jsonb_build_object('found', false);
    END IF;

    RETURN jsonb_build_object(
        'found', true,
        'id', v_group.id,
        'name', v_group.name
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- OPEN FOR CHALLENGES FEATURE
-- Allows groups to be discoverable for challenges
-- ============================================================================

-- Add open_for_challenges column to groups
ALTER TABLE public.groups
ADD COLUMN IF NOT EXISTS open_for_challenges BOOLEAN DEFAULT false;

-- Index for efficient lookup of open groups
CREATE INDEX IF NOT EXISTS idx_groups_open_for_challenges
ON public.groups(open_for_challenges) WHERE open_for_challenges = true;

-- ============================================================================
-- TOGGLE OPEN FOR CHALLENGES
-- Only group leader can toggle
-- ============================================================================

CREATE OR REPLACE FUNCTION toggle_open_for_challenges(p_group_id UUID, p_open BOOLEAN)
RETURNS JSONB AS $$
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
        RETURN jsonb_build_object('success', false, 'message', 'Group not found');
    END IF;

    IF v_group.leader_id != v_user_id THEN
        RETURN jsonb_build_object('success', false, 'message', 'Only the group leader can change this setting');
    END IF;

    UPDATE public.groups SET open_for_challenges = p_open WHERE id = p_group_id;

    RETURN jsonb_build_object(
        'success', true,
        'open_for_challenges', p_open,
        'message', CASE WHEN p_open THEN 'Your group is now open for challenges!' ELSE 'Your group is now hidden from challenge browser' END
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- BROWSE OPEN GROUPS
-- Returns groups that are open for challenges (excludes user's own groups)
-- ============================================================================

CREATE OR REPLACE FUNCTION browse_open_groups(p_exclude_group_id UUID DEFAULT NULL)
RETURNS TABLE (
    id UUID,
    name TEXT,
    description TEXT,
    member_count BIGINT,
    total_xp BIGINT,
    weekly_xp BIGINT,
    win_count BIGINT,
    loss_count BIGINT
) AS $$
DECLARE
    v_user_id UUID;
    v_week_start DATE;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN;
    END IF;

    v_week_start := date_trunc('week', CURRENT_DATE)::DATE;

    RETURN QUERY
    SELECT
        g.id,
        g.name,
        g.description,
        (SELECT COUNT(*) FROM public.group_memberships gm WHERE gm.group_id = g.id) as member_count,
        (SELECT COALESCE(SUM(p.total_xp), 0)
         FROM public.profiles p
         INNER JOIN public.group_memberships gm ON gm.user_id = p.id
         WHERE gm.group_id = g.id) as total_xp,
        (SELECT COALESCE(SUM(rx.xp_earned), 0)
         FROM public.rolling_xp rx
         INNER JOIN public.group_memberships gm ON gm.user_id = rx.user_id
         WHERE gm.group_id = g.id AND rx.date >= v_week_start) as weekly_xp,
        (SELECT COUNT(*) FROM public.group_challenges c
         WHERE c.status = 'completed' AND c.winner_group_id = g.id) as win_count,
        (SELECT COUNT(*) FROM public.group_challenges c
         WHERE c.status = 'completed'
         AND c.winner_group_id IS NOT NULL
         AND c.winner_group_id != g.id
         AND (c.challenger_group_id = g.id OR c.challenged_group_id = g.id)) as loss_count
    FROM public.groups g
    WHERE g.open_for_challenges = true
    AND g.id != COALESCE(p_exclude_group_id, '00000000-0000-0000-0000-000000000000'::UUID)
    -- Exclude groups where user is already a member
    AND NOT EXISTS (
        SELECT 1 FROM public.group_memberships gm
        WHERE gm.group_id = g.id AND gm.user_id = v_user_id
    )
    -- Exclude groups with pending/active challenge with the excluded group
    AND NOT EXISTS (
        SELECT 1 FROM public.group_challenges c
        WHERE c.status IN ('pending', 'active')
        AND p_exclude_group_id IS NOT NULL
        AND (
            (c.challenger_group_id = p_exclude_group_id AND c.challenged_group_id = g.id)
            OR (c.challenger_group_id = g.id AND c.challenged_group_id = p_exclude_group_id)
        )
    )
    ORDER BY weekly_xp DESC, total_xp DESC
    LIMIT 50;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- UPDATE GET_GROUP TO INCLUDE OPEN_FOR_CHALLENGES
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
        'is_member', v_is_member,
        'open_for_challenges', COALESCE(v_group.open_for_challenges, false)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
