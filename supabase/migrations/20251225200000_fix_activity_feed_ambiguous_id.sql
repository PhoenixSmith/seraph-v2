-- Fix: Rename return column 'id' to 'activity_id' to avoid ambiguity with table columns
-- PostgreSQL RETURNS TABLE columns become local variables that shadow table columns

DROP FUNCTION IF EXISTS get_group_activity_feed(UUID, INTEGER);

CREATE OR REPLACE FUNCTION get_group_activity_feed(p_group_id UUID, p_limit INTEGER DEFAULT 50)
RETURNS TABLE (
    activity_id UUID,
    user_id UUID,
    user_name TEXT,
    user_avatar_url TEXT,
    user_avatar_config JSONB,
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
        WHERE group_memberships.group_id = p_group_id AND group_memberships.user_id = v_user_id
    ) THEN
        RETURN;
    END IF;

    RETURN QUERY
    SELECT
        ga.id AS activity_id,
        ga.user_id,
        p.name AS user_name,
        p.avatar_url AS user_avatar_url,
        p.avatar_config AS user_avatar_config,
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
