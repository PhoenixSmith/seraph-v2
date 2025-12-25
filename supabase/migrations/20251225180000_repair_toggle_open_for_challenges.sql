-- Repair: Recreate toggle_open_for_challenges function if missing

CREATE OR REPLACE FUNCTION public.toggle_open_for_challenges(p_group_id UUID, p_open BOOLEAN)
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
