-- Update group levels to angel hierarchy theme
-- Angels -> Archangels -> Virtues -> Cherubim -> Seraphim

-- Clear and re-insert with angel names
DELETE FROM public.group_level_thresholds;

INSERT INTO public.group_level_thresholds (level, min_weekly_xp, level_order, color) VALUES
    ('Angels', 0, 1, '#94a3b8'),
    ('Archangels', 500, 2, '#3b82f6'),
    ('Virtues', 1000, 3, '#8b5cf6'),
    ('Cherubim', 2000, 4, '#f59e0b'),
    ('Seraphim', 5000, 5, '#f97316');

-- Reset all groups to Angels (starting level)
UPDATE public.groups SET current_level = 'Angels';

-- Update function default to 'Angels'
CREATE OR REPLACE FUNCTION get_group_level_info(p_group_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_user_id UUID;
    v_group RECORD;
    v_level RECORD;
    v_next_level RECORD;
    v_weekly_xp BIGINT;
    v_week_start DATE;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN NULL;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM public.group_memberships
        WHERE group_id = p_group_id AND user_id = v_user_id
    ) THEN
        RETURN NULL;
    END IF;

    SELECT * INTO v_group FROM public.groups WHERE id = p_group_id;
    IF v_group IS NULL THEN
        RETURN NULL;
    END IF;

    v_week_start := date_trunc('week', CURRENT_DATE)::DATE;

    SELECT COALESCE(SUM(rx.xp_earned), 0) INTO v_weekly_xp
    FROM public.rolling_xp rx
    INNER JOIN public.group_memberships gm ON gm.user_id = rx.user_id
    WHERE gm.group_id = p_group_id
    AND rx.date >= v_week_start;

    SELECT * INTO v_level
    FROM public.group_level_thresholds
    WHERE min_weekly_xp <= v_weekly_xp
    ORDER BY level_order DESC
    LIMIT 1;

    IF v_level IS NULL THEN
        SELECT * INTO v_level
        FROM public.group_level_thresholds
        WHERE level = 'Angels';
    END IF;

    SELECT * INTO v_next_level
    FROM public.group_level_thresholds
    WHERE level_order = v_level.level_order + 1;

    RETURN jsonb_build_object(
        'group_id', p_group_id,
        'current_level', v_level.level,
        'level_color', v_level.color,
        'weekly_xp', v_weekly_xp,
        'xp_to_next_level', CASE
            WHEN v_next_level IS NOT NULL
            THEN v_next_level.min_weekly_xp - v_weekly_xp
            ELSE NULL
        END,
        'next_level', v_next_level.level,
        'next_level_threshold', v_next_level.min_weekly_xp,
        'week_start', v_week_start
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION recalculate_group_levels()
RETURNS INTEGER AS $$
DECLARE
    v_group RECORD;
    v_weekly_xp BIGINT;
    v_new_level TEXT;
    v_level_color TEXT;
    v_week_start DATE;
    v_count INTEGER := 0;
BEGIN
    v_week_start := date_trunc('week', CURRENT_DATE)::DATE;

    FOR v_group IN SELECT id FROM public.groups
    LOOP
        SELECT COALESCE(SUM(rx.xp_earned), 0) INTO v_weekly_xp
        FROM public.rolling_xp rx
        INNER JOIN public.group_memberships gm ON gm.user_id = rx.user_id
        WHERE gm.group_id = v_group.id
        AND rx.date >= v_week_start;

        SELECT level, color INTO v_new_level, v_level_color
        FROM public.group_level_thresholds
        WHERE min_weekly_xp <= v_weekly_xp
        ORDER BY level_order DESC
        LIMIT 1;

        UPDATE public.groups SET
            current_level = COALESCE(v_new_level, 'Angels'),
            weekly_xp = v_weekly_xp,
            level_updated_at = NOW(),
            week_start_date = v_week_start
        WHERE id = v_group.id;

        v_count := v_count + 1;
    END LOOP;

    RETURN v_count;
END;
$$ LANGUAGE plpgsql;
