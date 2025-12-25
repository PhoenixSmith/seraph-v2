-- Replace chapters_this_week with xp_this_week in get_group_statistics

CREATE OR REPLACE FUNCTION get_group_statistics(p_group_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_user_id UUID;
    v_total_xp BIGINT;
    v_total_chapters BIGINT;
    v_xp_this_week BIGINT;
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

    -- Get XP earned this week by all members
    SELECT COALESCE(SUM(cc.xp_awarded), 0) INTO v_xp_this_week
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
        'xp_this_week', v_xp_this_week,
        'active_members', v_active_members
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
